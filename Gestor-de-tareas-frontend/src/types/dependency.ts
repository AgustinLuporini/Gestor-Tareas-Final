// Agregamos "type" después de import
import type { Task } from "./task"; 

export enum DependencyType {
  DEPENDS_ON = "DEPENDS_ON",         // "Depende de"
  BLOCKED_BY = "BLOCKED_BY",         // "Es Bloqueada por"
  DUPLICATED_WITH = "DUPLICATED_WITH" // "Duplicada con"
}

export interface TaskDependency {
  id: number;
  sourceTaskId: number;
  targetTaskId: number;
  sourceTask?: Task; 
  targetTask?: Task; 
  type: DependencyType;
  note?: string;
}