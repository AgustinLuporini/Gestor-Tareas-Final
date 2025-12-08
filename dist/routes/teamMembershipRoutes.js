"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const TeamMembershipController_1 = require("../controllers/TeamMembershipController");
const router = (0, express_1.Router)();
// Agregar usuario a equipo
router.post("/", TeamMembershipController_1.TeamMembershipController.addMember);
// Miembros de un equipo
router.get("/team/:teamId", TeamMembershipController_1.TeamMembershipController.getTeamMembers);
// Equipos de un usuario
router.get("/user/:userId", TeamMembershipController_1.TeamMembershipController.getUserTeams);
// Eliminar un usuario de un equipo
router.delete("/team/:teamId/user/:userId", TeamMembershipController_1.TeamMembershipController.removeMember);
exports.default = router;
