"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ActivityController_1 = require("../controllers/ActivityController");
const router = (0, express_1.Router)();
// Endpoint: GET /activity?teamId=... (Feed global o filtrado)
// Cumple con la ruta /activity del FRONTEND-TAREAS.md (con filtro opcional)
router.get("/", ActivityController_1.ActivityController.getGlobalFeed);
// Endpoint: GET /activity/team/:teamId 
// Cumple con la ruta /teams/:id/activity (si se monta este router en '/activity')
router.get("/team/:teamId", ActivityController_1.ActivityController.getTeamFeed);
exports.default = router;
// En tu archivo principal (app.ts/index.ts) añade:
// import activityRoutes from './routes/activityRoutes';
// app.use('/activity', activityRoutes);
