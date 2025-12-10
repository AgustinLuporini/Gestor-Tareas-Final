import "reflect-metadata";
import { DataSource } from "typeorm";
import dotenv from "dotenv";

dotenv.config();

import { User } from "../entities/User";
import { Team } from "../entities/Team";
import { TeamMembership } from "../entities/TeamMembership";
import { Task } from "../entities/Task";
import { Comment } from "../entities/Comment";
import { TaskTag } from "../entities/TaskTag";
import { Tag } from "../entities/Tag";
import { Activity } from "../entities/Activity";
import { StatusHistory } from "../entities/StatusHistory";
// 1. IMPORT AGREGADO
import { TaskDependency } from "../entities/TaskDependency";

const defaultPort = 5432;

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || defaultPort),
  username: process.env.DB_USER || "postgres",
  password: process.env.DB_PASS || "postgres",
  database: process.env.DB_NAME || "gestor_tareas",
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  // NOTA: Si las tablas no existen en tu DB todavía, cambia esto a "true" temporalmente
  synchronize: false, 
  logging: false,
  entities: [
    User,
    Team,
    TeamMembership,
    Task,
    Comment,
    Tag,
    TaskTag,
    Activity,
    StatusHistory,
    TaskDependency, // 2. ENTIDAD AGREGADA A LA LISTA
  ],
  migrations: ["src/migrations/*.ts"],
  subscribers: [],
});