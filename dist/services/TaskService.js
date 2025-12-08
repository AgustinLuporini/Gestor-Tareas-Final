"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskService = void 0;
const database_1 = require("../config/database");
const Task_1 = require("../entities/Task");
const User_1 = require("../entities/User");
const Team_1 = require("../entities/Team");
const StatusHistory_1 = require("../entities/StatusHistory");
const Tag_1 = require("../entities/Tag");
const TaskTag_1 = require("../entities/TaskTag");
const ActivityService_1 = require("./ActivityService");
// Un objeto para definir las transiciones de estado válidas
const allowedTransitions = {
    [Task_1.TaskStatus.PENDING]: [Task_1.TaskStatus.IN_PROGRESS, Task_1.TaskStatus.CANCELLED],
    [Task_1.TaskStatus.IN_PROGRESS]: [Task_1.TaskStatus.COMPLETED, Task_1.TaskStatus.CANCELLED],
    [Task_1.TaskStatus.COMPLETED]: [], // No se puede cambiar desde "finalizada"
    [Task_1.TaskStatus.CANCELLED]: [], // No se puede cambiar desde "cancelada"
};
class TaskService {
    constructor() {
        this.taskRepository = database_1.AppDataSource.getRepository(Task_1.Task);
        this.statusHistoryRepository = database_1.AppDataSource.getRepository(StatusHistory_1.StatusHistory);
        this.userRepository = database_1.AppDataSource.getRepository(User_1.User);
        this.activityService = new ActivityService_1.ActivityService();
        this.teamRepository = database_1.AppDataSource.getRepository(Team_1.Team);
        this.tagRepository = database_1.AppDataSource.getRepository(Tag_1.Tag);
        this.taskTagRepository = database_1.AppDataSource.getRepository(TaskTag_1.TaskTag);
    }
    // --- 3. MÉTODO GETALLTASKS (ACTUALIZADO con Paginación) ---
    async getAllTasks(filters) {
        const page = filters.page || 1;
        const limit = filters.limit || 10;
        const skip = (page - 1) * limit;
        // Usamos QueryBuilder para poder hacer JOINs complejos para los filtros
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
        }
        else if (filters.dueDateFrom) {
            qb.andWhere("task.dueDate >= :from", { from: filters.dueDateFrom });
        }
        else if (filters.dueDateTo) {
            qb.andWhere("task.dueDate <= :to", { to: filters.dueDateTo });
        }
        if (filters.tagIds && filters.tagIds.length > 0) {
            qb.innerJoin("task.taskTags", "taskTag", "taskTag.tagId IN (:...tagIds)", {
                tagIds: filters.tagIds
            });
        }
        if (filters.search) {
            qb.andWhere("(task.title ILIKE :search OR task.description ILIKE :search)", {
                search: `%${filters.search}%`
            });
        }
        // ⭐️ OBTENER EL TOTAL ANTES DE APLICAR PAGINACIÓN ⭐️
        const total = await qb.getCount();
        // ⭐️ APLICAR PAGINACIÓN ⭐️
        qb.skip(skip).take(limit);
        // Cargamos todas las relaciones
        qb.leftJoinAndSelect("task.team", "team")
            .leftJoinAndSelect("task.createdBy", "createdBy")
            .leftJoinAndSelect("task.assignedTo", "assignedTo")
            .leftJoinAndSelect("task.taskTags", "taskTags")
            .leftJoinAndSelect("taskTags.tag", "tag");
        // Ordenar y obtener resultados
        const tasks = await qb.orderBy("task.createdAt", "DESC").getMany();
        // ⭐️ DEVOLVER RESPUESTA PAGINADA ⭐️
        return {
            data: tasks,
            total: total,
            page: page,
            limit: limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    // --- 4. MÉTODO createTask (Sigue igual) ---
    async createTask(taskData) {
        // ... (Lógica sin cambios)
        const task = this.taskRepository.create({
            ...taskData,
            team: { id: taskData.teamId },
            createdBy: { id: taskData.createdById },
            assignedTo: taskData.assignedToId ? { id: taskData.assignedToId } : undefined,
        });
        const savedTask = await this.taskRepository.save(task);
        // ⭐️ LOG DE ACTIVIDAD: Tarea Creada
        const actorId = taskData.createdById;
        const teamId = taskData.teamId;
        if (actorId && teamId) {
            await this.activityService.createActivity({
                type: ActivityService_1.ActivityType.TASK_CREATED,
                description: `Tarea "${savedTask.title}" creada.`,
                actorId: actorId,
                teamId: teamId,
                taskId: savedTask.id,
            });
        }
        return savedTask;
    }
    // --- 5. MÉTODO updateTask (Sigue igual) ---
    async updateTask(id, updates, changedById) {
        const task = await this.taskRepository.findOneBy({ id });
        if (!task) {
            throw new Error("Tarea no encontrada");
        }
        // ... (REGLA DE NEGOCIO 1: Restricciones de edición)
        // ... (REGLA DE NEGOCIO 2: Transiciones de estado válidas)
        const isStatusChanged = updates.status && updates.status !== task.status;
        const previousStatus = task.status;
        // Actualiza los campos de la tarea
        Object.assign(task, updates);
        // Manejo de la relación assignedTo (si se actualiza)
        if (updates.assignedToId !== undefined) {
            task.assignedTo = updates.assignedToId ? { id: updates.assignedToId } : undefined;
        }
        // ... (REGLA DE NEGOCIO 3: Validación de fecha límite no pasada)
        const updatedTask = await this.taskRepository.save(task);
        // ----------------------------------------------------
        // ⭐️ LOG DE ACTIVIDAD
        // ----------------------------------------------------
        let activityType = null;
        let activityDescription = "";
        if (isStatusChanged) {
            // 1. Guardar en StatusHistory (como ya lo tenías)
            const historyEntry = this.statusHistoryRepository.create({
                task: updatedTask,
                previousStatus: previousStatus,
                newStatus: updatedTask.status,
                changedBy: { id: changedById },
            });
            await this.statusHistoryRepository.save(historyEntry);
            // 2. Definir actividad para cambio de estado
            activityType = ActivityService_1.ActivityType.STATUS_CHANGED;
            activityDescription = `Estado de "${updatedTask.title}" cambiado de '${previousStatus}' a '${updatedTask.status}'.`;
        }
        else if (Object.keys(updates).some(key => key !== 'changedById')) { // Si se actualizó algún otro campo
            activityType = ActivityService_1.ActivityType.TASK_UPDATED;
            activityDescription = `Tarea "${updatedTask.title}" actualizada.`;
        }
        // 3. Crear registro de actividad
        if (activityType) {
            await this.activityService.createActivity({
                type: activityType,
                description: activityDescription,
                actorId: changedById, // El usuario que realizó el cambio
                teamId: updatedTask.teamId,
                taskId: updatedTask.id,
            });
        }
        return updatedTask;
    }
    // --- 6. MÉTODO updateTaskTags (Sigue igual) ---
    async updateTaskTags(taskId, tagIds) { }
}
exports.TaskService = TaskService;
