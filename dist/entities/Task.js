"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Task = exports.TaskPriority = exports.TaskStatus = void 0;
// Importa las entidades necesarias
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
const Team_1 = require("./Team");
const StatusHistory_1 = require("./StatusHistory");
const TaskTag_1 = require("./TaskTag");
const Comment_1 = require("./Comment");
const Activity_1 = require("./Activity");
// Enums para los estados y prioridades
var TaskStatus;
(function (TaskStatus) {
    TaskStatus["PENDING"] = "pendiente";
    TaskStatus["IN_PROGRESS"] = "en_curso";
    TaskStatus["COMPLETED"] = "finalizada";
    TaskStatus["CANCELLED"] = "cancelada";
})(TaskStatus || (exports.TaskStatus = TaskStatus = {}));
var TaskPriority;
(function (TaskPriority) {
    TaskPriority["HIGH"] = "alta";
    TaskPriority["MEDIUM"] = "media";
    TaskPriority["LOW"] = "baja";
})(TaskPriority || (exports.TaskPriority = TaskPriority = {}));
let Task = class Task {
};
exports.Task = Task;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Task.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Task.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)("text", { nullable: true }),
    __metadata("design:type", String)
], Task.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "simple-enum",
        enum: TaskStatus,
        default: TaskStatus.PENDING
    }),
    __metadata("design:type", String)
], Task.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "simple-enum",
        enum: TaskPriority,
        default: TaskPriority.MEDIUM
    }),
    __metadata("design:type", String)
], Task.prototype, "priority", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], Task.prototype, "dueDate", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Task.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Task.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Team_1.Team),
    (0, typeorm_1.JoinColumn)({ name: "team_id" }),
    __metadata("design:type", Team_1.Team)
], Task.prototype, "team", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "team_id" }),
    __metadata("design:type", Number)
], Task.prototype, "teamId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User),
    (0, typeorm_1.JoinColumn)({ name: "created_by" }),
    __metadata("design:type", User_1.User)
], Task.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "created_by" }),
    __metadata("design:type", Number)
], Task.prototype, "createdById", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: "assigned_to" }),
    __metadata("design:type", User_1.User)
], Task.prototype, "assignedTo", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "assigned_to", nullable: true }),
    __metadata("design:type", Number)
], Task.prototype, "assignedToId", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Comment_1.Comment, (comment) => comment.task),
    __metadata("design:type", Array)
], Task.prototype, "comments", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => StatusHistory_1.StatusHistory, (history) => history.task),
    __metadata("design:type", Array)
], Task.prototype, "statusHistory", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => TaskTag_1.TaskTag, (taskTag) => taskTag.task),
    __metadata("design:type", Array)
], Task.prototype, "taskTags", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Activity_1.Activity, (activity) => activity.actor),
    __metadata("design:type", Array)
], Task.prototype, "activities", void 0);
exports.Task = Task = __decorate([
    (0, typeorm_1.Entity)("tasks")
], Task);
