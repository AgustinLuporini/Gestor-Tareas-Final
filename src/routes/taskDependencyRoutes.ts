// src/routes/taskDependencyRoutes.ts

import { Router } from "express";
import { TaskDependencyController } from "../controllers/TaskDependencyController";

const router = Router();

// 3.1 & 3.2: Listar y Crear dependencias asociadas a una Tarea (Nested Resource)
// GET /api/tasks/:taskId/dependencies
// POST /api/tasks/:taskId/dependencies
router.route("/:taskId/dependencies")
    .get(TaskDependencyController.listDependencies)
    .post(TaskDependencyController.createDependency);


// 3.3 & 3.4: Operar sobre una Dependencia específica (Top-level Resource)
// PATCH /api/dependencies/:id (Actualiza nota o tipo)
// DELETE /api/dependencies/:id
router.route("/dependencies/:id")
    .patch(TaskDependencyController.updateDependency)
    .delete(TaskDependencyController.deleteDependency);

export default router;