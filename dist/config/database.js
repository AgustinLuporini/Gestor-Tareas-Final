"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
require("reflect-metadata");
const typeorm_1 = require("typeorm");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const User_1 = require("../entities/User");
const Team_1 = require("../entities/Team");
const TeamMembership_1 = require("../entities/TeamMembership");
const Task_1 = require("../entities/Task");
const Comment_1 = require("../entities/Comment");
const TaskTag_1 = require("../entities/TaskTag");
const Tag_1 = require("../entities/Tag");
const Activity_1 = require("../entities/Activity");
const StatusHistory_1 = require("../entities/StatusHistory");
const defaultPort = 5432;
exports.AppDataSource = new typeorm_1.DataSource({
    type: "postgres",
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || defaultPort),
    username: process.env.DB_USER || "postgres",
    password: process.env.DB_PASS || "postgres",
    database: process.env.DB_NAME || "gestor_tareas",
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
    synchronize: false,
    logging: false,
    entities: [
        User_1.User,
        Team_1.Team,
        TeamMembership_1.TeamMembership,
        Task_1.Task,
        Comment_1.Comment,
        Tag_1.Tag,
        TaskTag_1.TaskTag,
        Activity_1.Activity,
        StatusHistory_1.StatusHistory,
    ],
    migrations: ["src/migrations/*.ts"],
    subscribers: [],
});
