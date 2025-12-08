"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const CommentController_1 = require("../controllers/CommentController");
const router = (0, express_1.Router)();
//Crear un nuevo comentario
router.post("/", CommentController_1.CommentController.create);
//Obtener todos los comentarios
router.get("/", CommentController_1.CommentController.getAll);
//Obtener comentarios de una tarea específica
router.get("/task/:taskId", CommentController_1.CommentController.getByTask);
router.put("/:id", CommentController_1.CommentController.update);
router.delete("/:id", CommentController_1.CommentController.remove);
exports.default = router;
