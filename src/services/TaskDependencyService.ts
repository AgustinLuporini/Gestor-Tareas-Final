// src/services/TaskDependencyService.ts

import { AppDataSource } from "../config/database";
import { Task, TaskStatus } from "../entities/Task";
import { TaskDependency, DependencyType } from "../entities/TaskDependency";
import { User } from "../entities/User";
import { In, Not, Repository } from "typeorm";
import { 
    ICreateTaskDependencyDTO, 
    ITaskDependencyResponseDTO, 
    ITaskDependencyFilters,
    IRelatedTaskMinimalDTO
} from "../dtos/TaskDependencyDTO"; 
import { ActivityService, ActivityType } from "./ActivityService";


// --- Clases de Error Personalizadas ---
export class RuleViolationError extends Error {}
export class NotFoundError extends Error {}
export class CycleDetectionError extends RuleViolationError {}

export class TaskDependencyService {
    private taskRepository: Repository<Task>;
    private dependencyRepository: Repository<TaskDependency>;
    private activityService: ActivityService;

    constructor() {
        this.taskRepository = AppDataSource.getRepository(Task);
        this.dependencyRepository = AppDataSource.getRepository(TaskDependency);
        this.activityService = new ActivityService();
    }

    // --- UTILITY: Mapear Entidad a DTO de Respuesta ---
    private async buildDependencyResponse(dependency: TaskDependency, currentTaskId: number): Promise<ITaskDependencyResponseDTO> {
        const relatedTask = dependency.sourceTaskId === currentTaskId 
            ? dependency.targetTask 
            : dependency.sourceTask;

        if (!relatedTask) {
            throw new Error("Relación de tarea no cargada correctamente.");
        }

        const relatedTaskMinimal: IRelatedTaskMinimalDTO = {
            id: relatedTask.id,
            title: relatedTask.title,
            status: relatedTask.status
        };

        return {
            id: dependency.id,
            type: dependency.type,
            note: dependency.note || null,
            createdAt: dependency.createdAt,
            relatedTask: relatedTaskMinimal
        };
    }
    
    // --- LÓGICA DE VALIDACIÓN CENTRAL ---
    private async validateDependencyCreation(dto: ICreateTaskDependencyDTO, currentDependencyId?: number): Promise<void> {
        const { sourceTaskId, targetTaskId, type } = dto;

        if (sourceTaskId === targetTaskId) {
            throw new RuleViolationError("Una tarea no puede depender de sí misma.");
        }

        if (type === DependencyType.DEPENDS_ON) {
            const inverseDep = await this.dependencyRepository.findOne({
                where: {
                    sourceTaskId: targetTaskId,
                    targetTaskId: sourceTaskId,
                    type: DependencyType.DEPENDS_ON,
                    ...(currentDependencyId && { id: Not(currentDependencyId) })
                }
            });

            if (inverseDep) {
                throw new CycleDetectionError(`Ciclo directo detectado: La tarea #${targetTaskId} ya depende de #${sourceTaskId}.`);
            }
        }
        
        const [sourceTask, targetTask] = await Promise.all([
            this.taskRepository.findOneBy({ id: dto.sourceTaskId }),
            this.taskRepository.findOneBy({ id: dto.targetTaskId })
        ]);
        
        if (!sourceTask || !targetTask) {
             throw new NotFoundError("La tarea origen o la tarea objetivo no existe.");
        }
    }

    // ====================================================================
    // CRUD Operations
    // ====================================================================

// src/services/TaskDependencyService.ts

async getDependenciesByTaskId(taskId: number, filters: ITaskDependencyFilters) {
    const dependencyRepo = AppDataSource.getRepository(TaskDependency);

    // ... lógica de filtros que ya tengas ...

    const dependencies = await dependencyRepo.find({
        where: [
            // Aquí tu lógica de where (sourceTaskId: taskId, etc.)
            // Asegúrate de mantener tu lógica de filtrado actual
             { sourceTaskId: taskId }, 
             { targetTaskId: taskId }
        ],
        // 🔥 ESTA ES LA LÍNEA MÁGICA QUE FALTA:
        relations: ["sourceTask", "targetTask"], 
        
        // Opcional: ordenar por fecha
        order: { createdAt: "DESC" }
    });

    return dependencies;
}
    
    async createDependency(dto: ICreateTaskDependencyDTO): Promise<TaskDependency> {
        await this.validateDependencyCreation(dto);
        
        const newDependency = this.dependencyRepository.create(dto);
        const savedDep = await this.dependencyRepository.save(newDependency);
        
        const typeLabel = savedDep.type.replace('_', ' ');
        // Nota: Asegúrate de que el ActivityService maneje que 'teamId' pueda ser undefined si no encuentra la task
        const task = await this.taskRepository.findOneBy({ id: savedDep.sourceTaskId });
        
        if (task && task.teamId) {
            this.activityService.createActivity({
                type: ActivityType.TASK_UPDATED,
                description: `Añadió la dependencia '${typeLabel}' con la tarea #${savedDep.targetTaskId}.`,
                actorId: savedDep.createdById!,
                teamId: task.teamId,
                taskId: savedDep.sourceTaskId,
            });
        }

        return savedDep;
    }
    
    async updateDependency(id: number, updates: Partial<ICreateTaskDependencyDTO>, userId: number): Promise<TaskDependency> {
        const dependency = await this.dependencyRepository.findOne({ 
            where: { id },
            relations: ["sourceTask", "targetTask"]
        });
        
        if (!dependency) {
            throw new NotFoundError("Dependencia no encontrada.");
        }

        const validationDto: ICreateTaskDependencyDTO = {
            sourceTaskId: updates.sourceTaskId || dependency.sourceTaskId,
            targetTaskId: updates.targetTaskId || dependency.targetTaskId,
            type: updates.type || dependency.type,
            createdById: userId,
        };

        await this.validateDependencyCreation(validationDto, id); 

        Object.assign(dependency, updates);
        return this.dependencyRepository.save(dependency);
    }
    
    async deleteDependency(id: number): Promise<void> {
        const result = await this.dependencyRepository.delete(id);
        if (result.affected === 0) {
            throw new NotFoundError("Dependencia no encontrada.");
        }
    }

    // ====================================================================
    // BUSINESS RULES
    // ====================================================================

    // --- ⭐️ MÉTODO AGREGADO PARA COMPATIBILIDAD CON TASKSERVICE ⭐️ ---
    /**
     * Valida si una tarea puede ser completada.
     * Lanza un error RuleViolationError si tiene dependencias pendientes.
     * Reutiliza la lógica de validateTaskClosing.
     */
    async validateTaskCompletion(taskId: number): Promise<void> {
        const { isBlocked, blockingTasks } = await this.validateTaskClosing(taskId);

        if (isBlocked) {
            const blockingTitles = blockingTasks.map(t => t.title).join(", ");
            throw new RuleViolationError(
                `No se puede completar la tarea. Está bloqueada por las siguientes tareas pendientes: ${blockingTitles}`
            );
        }
    }
    // ------------------------------------------------------------------

    public async validateTaskClosing(taskId: number): Promise<{ isBlocked: boolean, blockingTasks: IRelatedTaskMinimalDTO[] }> {
        const blockingDeps = await this.dependencyRepository.find({
            where: [
                { sourceTaskId: taskId, type: DependencyType.DEPENDS_ON },
                { targetTaskId: taskId, type: DependencyType.BLOCKED_BY }
            ],
            relations: ["sourceTask", "targetTask"]
        });
        
        const incompleteStatuses = [TaskStatus.PENDING, TaskStatus.IN_PROGRESS];
        const blockingTasks: IRelatedTaskMinimalDTO[] = [];
        const checkedTaskIds = new Set<number>(); 
        
        for (const dep of blockingDeps) {
            let taskToCheck: Task;

            if (dep.type === DependencyType.DEPENDS_ON) {
                taskToCheck = dep.targetTask;
            } else { 
                taskToCheck = dep.sourceTask;
            }

            if (!checkedTaskIds.has(taskToCheck.id) && incompleteStatuses.includes(taskToCheck.status as TaskStatus)) {
                blockingTasks.push({
                    id: taskToCheck.id,
                    title: taskToCheck.title,
                    status: taskToCheck.status
                });
                checkedTaskIds.add(taskToCheck.id);
            }
        }

        return {
            isBlocked: blockingTasks.length > 0,
            blockingTasks: blockingTasks
        };
    }

    public async synchronizeDuplicatedStatus(changedTask: Task, changedById: number): Promise<void> {
        const { id: changedTaskId, status: newStatus } = changedTask;
        
        if (newStatus !== TaskStatus.COMPLETED && newStatus !== TaskStatus.CANCELLED) {
            return;
        }

        const duplicatedLinks = await this.dependencyRepository.find({
            where: [
                { sourceTaskId: changedTaskId, type: DependencyType.DUPLICATED_WITH },
                { targetTaskId: changedTaskId, type: DependencyType.DUPLICATED_WITH },
            ],
            relations: ["sourceTask", "targetTask"] 
        });

        const tasksToUpdate: Task[] = [];
        
        for (const link of duplicatedLinks) {
            const partnerTask = link.sourceTaskId === changedTaskId ? link.targetTask : link.sourceTask;
            
            if (partnerTask.status !== TaskStatus.COMPLETED && partnerTask.status !== TaskStatus.CANCELLED) {
                partnerTask.status = newStatus;
                tasksToUpdate.push(partnerTask);
            }
        }

        if (tasksToUpdate.length > 0) {
            await this.taskRepository.save(tasksToUpdate);
            console.log(`[SYNC] ${tasksToUpdate.length} tareas duplicadas sincronizadas a estado: ${newStatus}`);

            tasksToUpdate.forEach(task => {
                // Validación rápida por si teamId es nulo
                if (task.teamId) {
                    this.activityService.createActivity({
                        type: ActivityType.STATUS_CHANGED,
                        description: `Estado de "${task.title}" cambiado automáticamente a '${newStatus}' por sincronización de duplicados.`,
                        actorId: changedById, 
                        teamId: task.teamId,
                        taskId: task.id,
                    });
                }
            });
        }
    }
}