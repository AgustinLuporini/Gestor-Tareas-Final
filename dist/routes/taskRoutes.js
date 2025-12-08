"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const TaskController_1 = require("../controllers/TaskController");
const router = (0, express_1.Router)();
// Obtener todas las tareas
router.get("/", TaskController_1.TaskController.getAll);
// Crear una nueva tarea
router.post("/", TaskController_1.TaskController.create);
// --- AÑADIR ESTA NUEVA RUTA ---
// Actualizar/Asignar etiquetas (Debe ir ANTES de /:id para que no colisione)
router.put("/:id/tags", TaskController_1.TaskController.assignTags);
// Actualizar estado de tarea (OBSOLETA?)
// Nota: Tu TaskController.update (PATCH /:id) ya maneja el status. 
// Esta ruta PUT /:id/status parece no usarse en el servicio.
router.put("/:id/status", TaskController_1.TaskController.update);
// Rutas para un recurso de tarea específico
router.get("/:id", TaskController_1.TaskController.getOneById);
router.patch("/:id", TaskController_1.TaskController.update); // Esta es la que usa el frontend
router.delete("/:id", TaskController_1.TaskController.delete);
exports.default = router;
