"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/index.ts
require("reflect-metadata");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const database_1 = require("./config/database");
// --- Importaciones de Swagger y Comentarios/Historial ---
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_json_1 = __importDefault(require("../swagger.json"));
// --- Importaciones de rutas ---
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const teamRoutes_1 = __importDefault(require("./routes/teamRoutes"));
const taskRoutes_1 = __importDefault(require("./routes/taskRoutes"));
const commentRoutes_1 = __importDefault(require("./routes/commentRoutes"));
const teamMembershipRoutes_1 = __importDefault(require("./routes/teamMembershipRoutes"));
const statusHistoryRoutes_1 = __importDefault(require("./routes/statusHistoryRoutes"));
const tagRoutes_1 = __importDefault(require("./routes/tagRoutes"));
const activityRoutes_1 = __importDefault(require("./routes/activityRoutes"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Middlewares
app.use((0, cors_1.default)());
app.use((0, helmet_1.default)());
app.use(express_1.default.json());
// Ruta de prueba
app.get("/", (req, res) => {
    res.json({ message: "El gestor está funcionando..." });
});
// --- Rutas de tu API ---
app.use("/docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_json_1.default));
app.use("/users", userRoutes_1.default);
app.use("/teams", teamRoutes_1.default);
app.use("/tasks", taskRoutes_1.default);
app.use("/comments", commentRoutes_1.default);
app.use("/memberships", teamMembershipRoutes_1.default);
app.use("/history", statusHistoryRoutes_1.default);
app.use("/tags", tagRoutes_1.default);
app.use("/activity", activityRoutes_1.default); // <-- 2. USAR LA NUEVA RUTA
// Probar conexión a la base de datos (sigue igual)
app.get("/test-db", async (req, res) => { });
// Inicializar la conexión a la base de datos y arrancar el servidor (sigue igual)
database_1.AppDataSource.initialize()
    .then(() => {
    console.log("Conectado a la base de datos (PostgreSQL)...");
    app.listen(PORT, () => {
        console.log(`Servidor activo en: http://localhost:${PORT}`);
        console.log(`Documentación de API disponible en: http://localhost:${PORT}/docs`);
    });
})
    .catch((err) => {
    console.error("No se pudo conectar con la base de datos:", err);
});
