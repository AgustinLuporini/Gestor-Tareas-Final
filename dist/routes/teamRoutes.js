"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const TeamController_1 = require("../controllers/TeamController");
const router = (0, express_1.Router)();
//Obtener todos los equipos
router.get("/", TeamController_1.TeamController.getAll);
//Crear un nuevo equipo
router.post("/", TeamController_1.TeamController.create);
//Eliminar un equipo
router.delete("/:id", TeamController_1.TeamController.delete);
//Actualizar un equipo
router.patch('/:id', TeamController_1.TeamController.update);
router.get("/user/:userId", TeamController_1.TeamController.getTeamsForUser); // O una ruta similar
exports.default = router;
