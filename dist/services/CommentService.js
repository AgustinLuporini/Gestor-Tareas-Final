"use strict";
// src/services/CommentService.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommentService = void 0;
const database_1 = require("../config/database");
const Comment_1 = require("../entities/Comment");
const Task_1 = require("../entities/Task");
const User_1 = require("../entities/User");
const ActivityService_1 = require("./ActivityService");
class CommentService {
    constructor() {
        this.commentRepository = database_1.AppDataSource.getRepository(Comment_1.Comment);
        this.taskRepository = database_1.AppDataSource.getRepository(Task_1.Task);
        this.userRepository = database_1.AppDataSource.getRepository(User_1.User); // Repositorio del usuario para buscar el nombre
        this.activityService = new ActivityService_1.ActivityService();
    }
    // --- 1. MÉTODO: createComment (Con Log de Actividad y Formato de Descripción Ajustado) ---
    async createComment(data) {
        // 1. Verificar la existencia de la Tarea y obtener el teamId/title
        const task = await this.taskRepository.findOne({
            where: { id: data.taskId },
            select: ['id', 'title', 'teamId'],
        });
        if (!task) {
            throw new Error("Tarea no encontrada para el comentario.");
        }
        // 2. Buscar al autor para obtener su nombre (necesario solo si se requiere para otra validación,
        //    pero es bueno para asegurar la existencia)
        const author = await this.userRepository.findOne({
            where: { id: data.authorId },
            select: ['firstName', 'lastName'],
        });
        if (!author) {
            throw new Error("Autor del comentario no encontrado.");
        }
        // 3. Crear y guardar el comentario
        const comment = this.commentRepository.create({
            content: data.content,
            task: { id: data.taskId },
            author: { id: data.authorId },
        });
        const savedComment = await this.commentRepository.save(comment);
        // 4. LOG DE ACTIVIDAD
        if (task.teamId) {
            await this.activityService.createActivity({
                type: ActivityService_1.ActivityType.COMMENT_ADDED,
                // ⭐️ AJUSTE CLAVE: La descripción SÓLO contiene la acción,
                // para que el frontend pueda añadir el @[Actor Name] sin duplicar.
                description: `comentó en la tarea "${task.title || 'sin título'}".`,
                actorId: data.authorId,
                teamId: task.teamId,
                taskId: data.taskId,
            });
        }
        // Retornar con relaciones para el Controller
        return this.commentRepository.findOneOrFail({
            where: { id: savedComment.id },
            relations: ["author", "task"],
        });
    }
    // --- 2. getCommentsByTaskId (Para CommentController.getByTask) ---
    async getCommentsByTaskId(taskId) {
        return this.commentRepository.find({
            where: { taskId: taskId },
            relations: ["author", "task"],
            order: { createdAt: "ASC" },
        });
    }
    // --- 3. getAllComments (Para CommentController.getAll) ---
    async getAllComments() {
        return this.commentRepository.find({
            relations: ["task", "author"],
            order: { createdAt: "DESC" },
        });
    }
    // --- 4. updateComment (Para CommentController.update) ---
    async updateComment(id, content) {
        const comment = await this.commentRepository.findOne({ where: { id } });
        if (!comment) {
            throw new Error("Comentario no encontrado");
        }
        comment.content = content;
        await this.commentRepository.save(comment);
        // Retornar con relaciones para el Controller
        return this.commentRepository.findOneOrFail({
            where: { id: comment.id },
            relations: ["author", "task"],
        });
    }
    // --- 5. removeComment (Para CommentController.remove) ---
    async removeComment(id) {
        const comment = await this.commentRepository.findOne({ where: { id } });
        if (!comment) {
            throw new Error("Comentario no encontrado");
        }
        await this.commentRepository.remove(comment);
    }
}
exports.CommentService = CommentService;
