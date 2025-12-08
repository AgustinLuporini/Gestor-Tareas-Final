"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const UserController_1 = require("../controllers/UserController");
const router = (0, express_1.Router)();
//Obtener usuarios
router.get("/", UserController_1.UserController.getAll);
//Crear un nuevo usuario
router.post("/", UserController_1.UserController.create);
// PUT /users/:id - Actualizar un usuario
router.put("/:id", UserController_1.UserController.update);
// DELETE /users/:id - Borrar un usuario
router.delete("/:id", UserController_1.UserController.delete);
exports.default = router;
