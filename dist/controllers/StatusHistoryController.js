"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusHistoryController = void 0;
const database_1 = require("../config/database");
const StatusHistory_1 = require("../entities/StatusHistory");
const Task_1 = require("../entities/Task");
class StatusHistoryController {
    /**
     * Obtener el historial de cambios de estado para una tarea específica
     */
    static async getByTask(req, res) {
        try {
            const { taskId } = req.params;
            const historyRepository = database_1.AppDataSource.getRepository(StatusHistory_1.StatusHistory);
            const taskRepository = database_1.AppDataSource.getRepository(Task_1.Task);
            // 1. Validar que la tarea exista
            const task = await taskRepository.findOne({ where: { id: parseInt(taskId) } });
            if (!task) {
                return res.status(404).json({ message: "Tarea no encontrada" });
            }
            // 2. Buscar el historial
            const history = await historyRepository.find({
                where: { task: { id: parseInt(taskId) } },
                // ¡Importante! Incluimos la relación con "changedBy" (User)
                relations: ["changedBy"],
                // Ordenamos por el más reciente primero
                order: { changedAt: "DESC" }
            });
            res.json({
                message: "Historial obtenido con éxito",
                data: history
            });
        }
        catch (error) {
            res.status(500).json({
                message: "Error al obtener el historial de la tarea",
                error
            });
        }
    }
}
exports.StatusHistoryController = StatusHistoryController;
