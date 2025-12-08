// src/dtos/TaskDependencyDTO.ts

import { DependencyType } from "../entities/TaskDependency";

// --- DTO 1: Para la respuesta "ligera" de la tarea relacionada ---
// Cuando listamos dependencias, no queremos toda la info de la otra tarea, solo lo básico.
export interface IRelatedTaskMinimalDTO {
  id: number;
  title: string;
  status: string; // Útil para mostrar si está bloqueada o completada
}

// --- DTO 2: Respuesta completa de una Dependencia (GET) ---
export interface ITaskDependencyResponseDTO {
  id: number;
  type: DependencyType;
  note: string | null;
  createdAt: Date;
  
  // Incluimos la tarea relacionada ya formateada
  relatedTask: IRelatedTaskMinimalDTO; 
}

// --- DTO 3: Para Crear o Actualizar una Dependencia (POST/PUT) ---
export interface ICreateTaskDependencyDTO {
  sourceTaskId: number;  // ID de la tarea que tiene la dependencia
  targetTaskId: number;  // ID de la tarea de la que depende
  type: DependencyType; 
  note?: string; 
  createdById: number;   // ID del usuario que crea el vínculo
}

// --- DTO 4: Filtros para el listado (Query Params) ---
export interface ITaskDependencyFilters {
  // Filtrar por tipo (ej. ver solo los BLOQUEOS)
  type?: DependencyType; 
  
  // Filtrar por dirección:
  // 'outgoing' -> Cosas que YO necesito (Depende de...)
  // 'incoming' -> Cosas que ME necesitan (Bloqueada por...)
  direction?: 'outgoing' | 'incoming'; 
}