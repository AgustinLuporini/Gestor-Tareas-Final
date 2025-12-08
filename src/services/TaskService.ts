import { AppDataSource } from "../config/database";
import { Task, TaskStatus, TaskPriority } from "../entities/Task"; 
import { User } from "../entities/User"; 
import { Team } from "../entities/Team"; 
import { StatusHistory } from "../entities/StatusHistory"; 
import { Tag } from "../entities/Tag"; 
import { TaskTag } from "../entities/TaskTag"; 
import { ActivityService, ActivityType } from "./ActivityService"; 
import { In } from "typeorm"; 
import { TaskDependencyService } from "./TaskDependencyService"; 
import { TaskDependency, DependencyType } from "../entities/TaskDependency";

const allowedTransitions: Record<TaskStatus, TaskStatus[]> = {
  [TaskStatus.PENDING]: [TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED],
  [TaskStatus.IN_PROGRESS]: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
  [TaskStatus.COMPLETED]: [],
  [TaskStatus.CANCELLED]: [],
};

export interface ITaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  search?: string; 
  teamId?: number;
  dueDateFrom?: string; 
  dueDateTo?: string;   
  tagIds?: number[]; 
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export class TaskService {
  private taskRepository = AppDataSource.getRepository(Task);
  private statusHistoryRepository = AppDataSource.getRepository(StatusHistory);
  private userRepository = AppDataSource.getRepository(User);
  private activityService = new ActivityService();
  private teamRepository = AppDataSource.getRepository(Team); 
  private tagRepository = AppDataSource.getRepository(Tag);
  private taskTagRepository = AppDataSource.getRepository(TaskTag);
  private taskDependencyService = new TaskDependencyService();

  // --- 3. MÉTODO GETALLTASKS ---
  async getAllTasks(filters: ITaskFilters): Promise<PaginatedResponse<Task>> {
    
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;
    
    const qb = this.taskRepository.createQueryBuilder("task");

    // --- APLICAR FILTROS (AND) ---
    if (filters.status) {
      qb.andWhere("task.status = :status", { status: filters.status });
    }
    if (filters.priority) {
      qb.andWhere("task.priority = :priority", { priority: filters.priority });
    }
    if (filters.teamId) {
      qb.andWhere("task.teamId = :teamId", { teamId: filters.teamId });
    }
    if (filters.dueDateFrom && filters.dueDateTo) {
      qb.andWhere("task.dueDate BETWEEN :from AND :to", { from: filters.dueDateFrom, to: filters.dueDateTo });
    } else if (filters.dueDateFrom) {
      qb.andWhere("task.dueDate >= :from", { from: filters.dueDateFrom });
    } else if (filters.dueDateTo) {
      qb.andWhere("task.dueDate <= :to", { to: filters.dueDateTo });
    }
    
    // Filtro por etiquetas
    if (filters.tagIds && filters.tagIds.length > 0) {
      qb.innerJoin("task.taskTags", "taskTagFilter", "taskTagFilter.tagId IN (:...tagIds)", { 
        tagIds: filters.tagIds 
      });
    }

    if (filters.search) {
      qb.andWhere("(task.title ILIKE :search OR task.description ILIKE :search)", {
        search: `%${filters.search}%`
      });
    }
    
    // OBTENER EL TOTAL
    const total = await qb.getCount();

    // APLICAR PAGINACIÓN
    qb.skip(skip).take(limit);

    // 🔥🔥 RELACIONES 🔥🔥
    qb.leftJoinAndSelect("task.team", "team")
      .leftJoinAndSelect("task.createdBy", "createdBy")
      .leftJoinAndSelect("task.assignedTo", "assignedTo")
      .leftJoinAndSelect("task.taskTags", "taskTags") 
      .leftJoinAndSelect("taskTags.tag", "tag")
      // 👇 IMPORTANTE: AGREGADO PARA QUE FUNCIONEN LOS ICONOS DE DEPENDENCIAS 👇
      .leftJoinAndSelect("task.outgoingDependencies", "outgoingDependencies")
      .leftJoinAndSelect("task.incomingDependencies", "incomingDependencies");

    // Ordenar y obtener resultados
    const tasks = await qb.orderBy("task.createdAt", "DESC").getMany();
    
    return {
        data: tasks,
        total: total,
        page: page,
        limit: limit,
        totalPages: Math.ceil(total / limit),
    };
  }

  // --- 4. MÉTODO createTask ---
  async createTask(taskData: Partial<Task>): Promise<Task> {
    let assignedUser: User | undefined = undefined;
    if ((taskData as any).assignedToId) {
        const userFound = await this.userRepository.findOneBy({ id: (taskData as any).assignedToId });
        if (!userFound) {
            throw new Error("El usuario asignado no existe");
        }
        assignedUser = userFound; 
    }

    const task = this.taskRepository.create({
        ...taskData,
        team: { id: (taskData as any).teamId } as Team,
        createdBy: { id: (taskData as any).createdById } as User,
        assignedTo: assignedUser,
        status: TaskStatus.PENDING 
    });

    const savedTask = await this.taskRepository.save(task);

    const actorId = (taskData as any).createdById;
    const teamId = (taskData as any).teamId;
    
    if (actorId && teamId) {
        await this.activityService.createActivity({
            type: ActivityType.TASK_CREATED,
            description: `Tarea "${savedTask.title}" creada.`,
            actorId: actorId,
            teamId: teamId,
            taskId: savedTask.id,
        });
    }

    return savedTask;
  }

  // --- 5. MÉTODO updateTask ---
  async updateTask(id: number, updates: Partial<Task>, changedById: number): Promise<Task> {
    const task = await this.taskRepository.findOneBy({ id });

    if (!task) {
      throw new Error("Tarea no encontrada");
    }

    const previousStatus = task.status;
    const isStatusChanged = updates.status && updates.status !== task.status;

    // REGLA 1: Restricciones de edición
    if ((task.status === TaskStatus.COMPLETED || task.status === TaskStatus.CANCELLED) && !isStatusChanged) {
        throw new Error(`No se puede editar una tarea que está en estado ${task.status}.`);
    }

    // REGLA 2: Transiciones y Validaciones
    if (isStatusChanged && updates.status) {
        const allowed = allowedTransitions[task.status];
        if (!allowed.includes(updates.status)) {
            throw new Error(`Transición de estado inválida: de ${task.status} a ${updates.status}`);
        }
        
        if (updates.status === TaskStatus.COMPLETED) {
             await this.taskDependencyService.validateTaskCompletion(id);
        }
    }
    
    Object.assign(task, updates); 
    
    if ((updates as any).assignedToId !== undefined) {
        task.assignedTo = (updates as any).assignedToId ? { id: (updates as any).assignedToId } as User : undefined;
    }
    
    // REGLA 3: Fechas
    if (updates.dueDate) {
        const now = new Date();
        const newDate = new Date(updates.dueDate);
        if (newDate < now && task.status !== TaskStatus.COMPLETED) {
             // Opcional: lanzar error
        }
    }

    const updatedTask = await this.taskRepository.save(task);

    // ⭐️ SINCRONIZACIÓN DE DUPLICADOS ⭐️
    if (isStatusChanged) {
        await this.syncDuplicateStatus(updatedTask.id, updatedTask.status, changedById);
    }

    // LOGS DE ACTIVIDAD
    let activityType: ActivityType | null = null;
    let activityDescription: string = "";

    if (isStatusChanged) {
        const historyEntry = this.statusHistoryRepository.create({
            task: updatedTask,
            previousStatus: previousStatus,
            newStatus: updatedTask.status,
            changedBy: { id: changedById } as User,
        });
        await this.statusHistoryRepository.save(historyEntry);

        activityType = ActivityType.STATUS_CHANGED;
        activityDescription = `Estado de "${updatedTask.title}" cambiado de '${previousStatus}' a '${updatedTask.status}'.`;
    } else if (Object.keys(updates).some(key => key !== 'changedById')) { 
        activityType = ActivityType.TASK_UPDATED;
        activityDescription = `Tarea "${updatedTask.title}" actualizada.`;
    }

    if (activityType) {
        await this.activityService.createActivity({
            type: activityType,
            description: activityDescription,
            actorId: changedById,
            teamId: updatedTask.teamId,
            taskId: updatedTask.id,
        });
    }

    return updatedTask;
  }

  // --- 6. MÉTODO updateTaskTags ---
  async updateTaskTags(taskId: number, tagIds: number[]): Promise<void> {
    const task = await this.taskRepository.findOne({ 
        where: { id: taskId },
        relations: ["taskTags"] 
    });

    if (!task) throw new Error("Tarea no encontrada");

    if (task.taskTags && task.taskTags.length > 0) {
        await this.taskTagRepository.remove(task.taskTags);
    }

    if (tagIds && tagIds.length > 0) {
        const tags = await this.tagRepository.findBy({ id: In(tagIds) });
        
        if (tags.length !== tagIds.length) {
             throw new Error("Una o más etiquetas no existen.");
        }

        const newTaskTags = tags.map(tag => {
            return this.taskTagRepository.create({
                task: task,
                tag: tag
            });
        });

        await this.taskTagRepository.save(newTaskTags);
    }
  }

  // --- MÉTODO PRIVADO: Sincronizar duplicados ---
  private async syncDuplicateStatus(taskId: number, newStatus: TaskStatus, userId: number) {
    if (newStatus !== TaskStatus.COMPLETED && newStatus !== TaskStatus.CANCELLED) {
      return;
    }

    const dependencyRepo = AppDataSource.getRepository(TaskDependency);
    const taskRepo = AppDataSource.getRepository(Task);

    const duplicates = await dependencyRepo.find({
      where: [
        { sourceTaskId: taskId, type: DependencyType.DUPLICATED_WITH },
        { targetTaskId: taskId, type: DependencyType.DUPLICATED_WITH }
      ],
      relations: ["sourceTask", "targetTask"]
    });

    for (const dep of duplicates) {
      const isSource = dep.sourceTaskId === taskId;
      const otherTask = isSource ? dep.targetTask : dep.sourceTask;

      if (otherTask.status !== newStatus) {
        console.log(`🔄 Sincronizando tarea duplicada #${otherTask.id} a estado ${newStatus}`);
        
        otherTask.status = newStatus;
        await taskRepo.save(otherTask);
      }
    }
  }
}