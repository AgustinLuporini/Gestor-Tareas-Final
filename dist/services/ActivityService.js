"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityService = exports.ActivityType = void 0;
const database_1 = require("../config/database");
const Activity_1 = require("../entities/Activity");
// Definimos los tipos de actividad que usaremos
var ActivityType;
(function (ActivityType) {
    ActivityType["TASK_CREATED"] = "TASK_CREATED";
    ActivityType["TASK_UPDATED"] = "TASK_UPDATED";
    ActivityType["STATUS_CHANGED"] = "STATUS_CHANGED";
    ActivityType["COMMENT_ADDED"] = "COMMENT_ADDED";
    ActivityType["TEAM_CREATED"] = "TEAM_CREATED";
    ActivityType["MEMBER_ADDED"] = "MEMBER_ADDED";
})(ActivityType || (exports.ActivityType = ActivityType = {}));
class ActivityService {
    constructor() {
        this.activityRepository = database_1.AppDataSource.getRepository(Activity_1.Activity);
    }
    async createActivity({ type, description, actorId, teamId, taskId, }) {
        const activity = this.activityRepository.create({
            type,
            description,
            // TypeORM usa el ID para establecer la relación
            actor: { id: actorId },
            team: teamId ? { id: teamId } : undefined,
            task: taskId ? { id: taskId } : undefined,
        });
        try {
            return await this.activityRepository.save(activity);
        }
        catch (error) {
            // Logueamos el error, pero no interrumpimos la operación principal (ej: creación de tarea)
            console.error("Error al guardar la actividad:", error);
            throw new Error("Fallo al registrar la actividad");
        }
    }
    async getFeed(teamId, activityType) {
        const qb = this.activityRepository.createQueryBuilder("activity");
        // Lógica para filtrar por teamId
        if (teamId) {
            qb.where("activity.teamId = :teamId", { teamId: teamId });
        }
        // Lógica para filtrar por tipo de actividad
        if (activityType) {
            // Si ya aplicamos un filtro (teamId), usamos AND. Si no, usamos WHERE.
            if (teamId) {
                qb.andWhere("activity.type = :type", { type: activityType });
            }
            else {
                qb.where("activity.type = :type", { type: activityType });
            }
        }
        // 2. RELACIONES: Cargar las entidades relacionadas (actor y task)
        qb.leftJoinAndSelect("activity.actor", "actor")
            .leftJoinAndSelect("activity.task", "task");
        // 3. ORDEN y Paginación
        qb.orderBy("activity.createdAt", "DESC");
        qb.take(50);
        // 4. Ejecutar y retornar
        return qb.getMany();
    }
}
exports.ActivityService = ActivityService;
