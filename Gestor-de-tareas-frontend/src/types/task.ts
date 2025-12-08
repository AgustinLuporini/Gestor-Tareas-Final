// src/types/task.ts

import { type User } from './user'; // (Tus imports actuales)
import { type Team } from './team';
// ⭐️ IMPORTANTE: Importa el tipo de dependencia
import { type TaskDependency } from './dependency'; 

export enum TaskStatus {
  PENDING = "pendiente",
  IN_PROGRESS = "en_curso", 
  COMPLETED = "finalizada",
  CANCELLED = "cancelada"
}

export enum TaskPriority {
  HIGH = "alta",
  MEDIUM = "media",
  LOW = "baja"
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string; // O Date, según como lo tengas
  createdAt: string;
  updatedAt: string;
  
  // Relaciones existentes
  teamId: number;
  team?: Team;
  createdById: number;
  createdBy?: User;
  assignedToId?: number | null;
  assignedTo?: User;

  // ... otros campos que tengas ...

  // ⭐️ AGREGA ESTAS DOS LÍNEAS AL FINAL:
  outgoingDependencies?: TaskDependency[];
  incomingDependencies?: TaskDependency[];
}