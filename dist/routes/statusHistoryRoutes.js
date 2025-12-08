"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const StatusHistoryController_1 = require("../controllers/StatusHistoryController");
const router = (0, express_1.Router)();
// Definimos la ruta para obtener el historial de una tarea
// GET /history/task/42
router.get("/task/:taskId", StatusHistoryController_1.StatusHistoryController.getByTask);
exports.default = router;
