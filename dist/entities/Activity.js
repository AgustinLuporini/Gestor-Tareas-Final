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
exports.Activity = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
const Team_1 = require("./Team");
const Task_1 = require("./Task");
let Activity = class Activity {
};
exports.Activity = Activity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Activity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Activity.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], Activity.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, (user) => user.activities, { nullable: true }),
    __metadata("design:type", User_1.User)
], Activity.prototype, "actor", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Team_1.Team, (team) => team.activities, { nullable: true }),
    __metadata("design:type", Team_1.Team)
], Activity.prototype, "team", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Task_1.Task, (task) => task.activities, { nullable: true }),
    __metadata("design:type", Task_1.Task)
], Activity.prototype, "task", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Activity.prototype, "createdAt", void 0);
exports.Activity = Activity = __decorate([
    (0, typeorm_1.Entity)("activity")
], Activity);
