// src/controllers/TaskDependencyController.ts

import { Request, Response } from "express";
import { 
    TaskDependencyService, 
    RuleViolationError, 
    NotFoundError,
    CycleDetectionError
} from "../services/TaskDependencyService";
import { DependencyType } from "../entities/TaskDependency";
import { ITaskDependencyFilters } from "../dtos/TaskDependencyDTO";

const dependencyService = new TaskDependencyService();

export class TaskDependencyController {

    /**
     * GET /tasks/:taskId/dependencies
     * 3.1: Listar dependencias de una tarea (filtrado por tipo y dirección).
     */
    static async listDependencies(req: Request, res: Response) {
        try {
            // :taskId es la task cuya dependencia queremos ver (es la base de la consulta)
            const taskId = parseInt(req.params.taskId); 
            
            // Extracción y validación de filtros de query
            const { type, direction } = req.query;

            if (type && !Object.values(DependencyType).includes(type as DependencyType)) {
                // 400 Bad Request por query param inválido
                return res.status(400).json({ message: "Tipo de dependencia inválido." });
            }
            
            const filters: ITaskDependencyFilters = {
                type: type as DependencyType,
                direction: direction as 'outgoing' | 'incoming'
            };

            const data = await dependencyService.getDependenciesByTaskId(taskId, filters);

            res.json({
                message: "Dependencias obtenidas con éxito.",
                data
            });
        } catch (error) {
            console.error("Error al listar dependencias:", error);
            res.status(500).json({ message: "Error al listar dependencias." });
        }
    }

    /**
     * POST /tasks/:taskId/dependencies
     * 3.2: Crear una nueva dependencia para una tarea.
     */
    static async createDependency(req: Request, res: Response) {
        try {
            const sourceTaskId = parseInt(req.params.taskId); // La task de la URL es la SOURCE
            const { targetTaskId, type, note, createdById } = req.body;

            const dto = { 
                sourceTaskId, 
                targetTaskId: Number(targetTaskId), 
                type: type as DependencyType, 
                note, 
                createdById: Number(createdById) 
            };

            if (!targetTaskId || !type || !createdById) {
                return res.status(400).json({ message: "Faltan campos obligatorios (targetTaskId, type, createdById)." });
            }

            const savedDep = await dependencyService.createDependency(dto);

            res.status(201).json({ // 201 Created
                message: "Dependencia creada con éxito.",
                data: savedDep
            });

        } catch (error: any) {
            // Manejo de errores específicos de negocio
            if (error instanceof CycleDetectionError) {
                return res.status(409).json({ message: error.message }); // 409 Conflict (para ciclo)
            }
            if (error instanceof RuleViolationError) {
                return res.status(400).json({ message: error.message }); // 400 Bad Request
            }
            if (error instanceof NotFoundError) {
                 return res.status(404).json({ message: error.message }); // 404 Not Found
            }
            console.error("Error al crear dependencia:", error);
            res.status(500).json({ message: "Error al crear dependencia." });
        }
    }

    /**
     * PATCH /dependencies/:id
     * 3.3: Actualizar una dependencia (cambio de nota o tipo).
     */
    static async updateDependency(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id);
            const { type, note, userId } = req.body; // Necesitamos el userId para la re-validación de reglas

            const updates: any = {};
            if (type !== undefined) updates.type = type;
            if (note !== undefined) updates.note = note;

            if (Object.keys(updates).length === 0) {
                 return res.status(400).json({ message: "No se proporcionaron campos para actualizar." });
            }
            if (!userId) {
                 return res.status(400).json({ message: "Se requiere el ID del usuario para auditoría." });
            }
            
            const updatedDep = await dependencyService.updateDependency(id, updates, userId);
            
            res.json({ // 200 OK
                message: "Dependencia actualizada con éxito.",
                data: updatedDep
            });
        } catch (error: any) {
            if (error instanceof NotFoundError) {
                return res.status(404).json({ message: error.message });
            }
            if (error instanceof RuleViolationError) {
                return res.status(400).json({ message: error.message }); 
            }
            console.error("Error al actualizar dependencia:", error);
            res.status(500).json({ message: "Error al actualizar dependencia." });
        }
    }

    /**
     * DELETE /dependencies/:id
     * 3.4: Eliminar una dependencia específica.
     */
    static async deleteDependency(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id);
            await dependencyService.deleteDependency(id);
            res.status(204).send(); // 204 No Content para DELETE exitoso
        } catch (error: any) {
            if (error instanceof NotFoundError) {
                return res.status(404).json({ message: error.message });
            }
            console.error("Error al eliminar dependencia:", error);
            res.status(500).json({ message: "Error al eliminar dependencia." });
        }
    }
}