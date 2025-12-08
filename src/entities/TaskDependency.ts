// src/entities/TaskDependency.ts

import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  ManyToOne, 
  CreateDateColumn, 
  UpdateDateColumn, 
  JoinColumn, 
  Unique 
} from "typeorm";
import { Task } from "./Task";
import { User } from "./User";

// Definimos los tipos de dependencia según el PDF
export enum DependencyType {
  DEPENDS_ON = "DEPENDS_ON",        // "Depende de"
  BLOCKED_BY = "BLOCKED_BY",        // "Bloqueada por"
  DUPLICATED_WITH = "DUPLICATED_WITH" // "Duplicada con"
}

@Entity("task_dependencies")
// Regla de integridad: Evitar duplicados exactos del mismo tipo entre dos tareas
@Unique(["sourceTaskId", "targetTaskId", "type"]) 
export class TaskDependency {
  
  @PrimaryGeneratedColumn()
  id!: number;

  // --- Relación: Task Origen (Quién declara la dependencia) ---
  @ManyToOne(() => Task, (task) => task.outgoingDependencies, { 
    onDelete: "CASCADE" // Si se borra la tarea origen, se borra la dependencia
  })
  @JoinColumn({ name: "source_task_id" })
  sourceTask!: Task;

  @Column({ name: "source_task_id" })
  sourceTaskId!: number;

  // --- Relación: Task Objetivo (A quién apunta la dependencia) ---
  @ManyToOne(() => Task, (task) => task.incomingDependencies, { 
    onDelete: "CASCADE" // Si se borra la tarea objetivo, se borra la dependencia
  })
  @JoinColumn({ name: "target_task_id" })
  targetTask!: Task;

  @Column({ name: "target_task_id" })
  targetTaskId!: number;

  // --- Tipo y Nota ---
  @Column({
    type: "simple-enum",
    enum: DependencyType
  })
  type!: DependencyType;

  @Column({ length: 255, nullable: true }) // Regla: Nota opcional (máx. 255 chars)
  note?: string;

  // --- Auditoría ---
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "created_by" })
  createdBy?: User; 

  @Column({ name: "created_by", nullable: true })
  createdById?: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}