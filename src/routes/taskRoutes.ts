import { Router } from "express";
import { TaskController } from "../controllers/TaskController";
import { TaskDependencyController } from "../controllers/TaskDependencyController";

const router = Router();

// ==========================================
// 1. RUTAS DE TAREAS (TaskController)
// ==========================================

// GET /tasks/ (Obtener todas con filtros y paginación)
router.get("/", TaskController.getAll);

// POST /tasks/ (Crear tarea)
router.post("/", TaskController.create);

// PUT /tasks/:id/tags (Actualizar etiquetas - IMPORTANTE: Ir antes de /:id)
router.put("/:id/tags", TaskController.assignTags);

// PATCH /tasks/:id (Actualizar tarea - Estado, Título, etc.)
// Nota: Usamos PATCH porque TaskController.update maneja actualizaciones parciales
router.patch("/:id", TaskController.update);

// DELETE /tasks/:id (Eliminar tarea)
router.delete("/:id", TaskController.delete);

// GET /tasks/:id (Obtener una tarea específica)
// Nota: Debe ir al final de las rutas de tareas para no "robar" rutas como /dependencies
router.get("/:id", TaskController.getOneById);


// ==========================================
// 2. RUTAS DE DEPENDENCIAS
// ==========================================

// GET /tasks/:taskId/dependencies
// Lista las dependencias (bloqueos o dependencias) de una tarea
router.get("/:taskId/dependencies", TaskDependencyController.listDependencies);

// POST /tasks/:taskId/dependencies
// Crea una nueva dependencia. La tarea de la URL es la 'source' (origen)
router.post("/:taskId/dependencies", TaskDependencyController.createDependency);

// PATCH /tasks/dependencies/:id
// Actualiza una dependencia existente (nota o tipo)
// Nota: Agregamos 'dependencies/' al path para diferenciarlo de una tarea normal
router.patch("/dependencies/:id", TaskDependencyController.updateDependency);

// DELETE /tasks/dependencies/:id
// Elimina una dependencia específica
router.delete("/dependencies/:id", TaskDependencyController.deleteDependency);



export default router;