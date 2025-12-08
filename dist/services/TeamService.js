"use strict";
// src/services/TeamService.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamService = void 0;
const typeorm_1 = require("typeorm");
const database_1 = require("../config/database");
const Team_1 = require("../entities/Team");
const User_1 = require("../entities/User"); // Necesario para buscar al owner/miembro
const TeamMembership_1 = require("../entities/TeamMembership"); // ⭐️ Asumimos esta entidad para las membresías
const Task_1 = require("../entities/Task");
const ActivityService_1 = require("./ActivityService"); // Para el log
class TeamService {
    constructor() {
        this.teamRepository = database_1.AppDataSource.getRepository(Team_1.Team);
        this.taskRepository = database_1.AppDataSource.getRepository(Task_1.Task);
        this.userRepository = database_1.AppDataSource.getRepository(User_1.User);
        this.teamMembershipRepository = database_1.AppDataSource.getRepository(TeamMembership_1.TeamMembership); // ⭐️ Para la nueva funcionalidad
        this.activityService = new ActivityService_1.ActivityService();
    }
    // --- NUEVO MÉTODO 1: Obtener Equipos por Usuario (para el filtro) ---
    async getTeamsByUserId(userId) {
        // Buscamos las membresías del usuario y cargamos la información del equipo
        const memberships = await this.teamMembershipRepository.find({
            where: { user: { id: userId } },
            relations: ["team"],
        });
        // Mapeamos para devolver solo la información necesaria (id y name)
        return memberships
            .map(membership => membership.team)
            .filter((team) => !!team)
            .map(team => ({ id: team.id, name: team.name }));
    }
    // --- NUEVO MÉTODO 2: getAll (Refactorizado) ---
    async getAllTeams() {
        return this.teamRepository.find({
            relations: ["owner"],
        });
    }
    // --- NUEVO MÉTODO 3: createTeam (Refactorizado con Log) ---
    async createTeam(name, description, ownerId) {
        const owner = await this.userRepository.findOneBy({ id: ownerId });
        if (!owner) {
            throw new Error("No se encontró el usuario propietario");
        }
        const newTeam = this.teamRepository.create({
            name,
            description,
            ownerId
        });
        const savedTeam = await this.teamRepository.save(newTeam);
        // ⭐️ LOG DE ACTIVIDAD: Equipo Creado
        await this.activityService.createActivity({
            type: ActivityService_1.ActivityType.TEAM_CREATED,
            description: `Equipo "${savedTeam.name}" creado por ${owner.firstName}.`,
            actorId: ownerId,
            teamId: savedTeam.id,
        });
        // NOTA: Aquí deberías crear una membresía para el owner si no lo haces en otro servicio.
        return this.teamRepository.findOneOrFail({
            where: { id: savedTeam.id },
            relations: ["owner"]
        });
    }
    // --- NUEVO MÉTODO 4: updateTeam (Refactorizado) ---
    async updateTeam(id, name, description) {
        const team = await this.teamRepository.findOne({ where: { id } });
        if (!team) {
            throw new Error("Equipo no encontrado");
        }
        if (name !== undefined)
            team.name = name;
        if (description !== undefined)
            team.description = description;
        return this.teamRepository.save(team);
    }
    /**
     * Elimina un equipo solo si no tiene tareas pendientes o en curso (Mantiene lógica original).
     */
    async deleteTeam(id) {
        // ... (Tu lógica deleteTeam original aquí)
        const team = await this.teamRepository.findOneBy({ id });
        if (!team) {
            throw new Error("Equipo no encontrado");
        }
        // --- REGLA DE NEGOCIO: No eliminar si hay tareas activas ---
        const activeTasksCount = await this.taskRepository.count({
            where: {
                teamId: id,
                status: (0, typeorm_1.In)([Task_1.TaskStatus.PENDING, Task_1.TaskStatus.IN_PROGRESS]),
            },
        });
        if (activeTasksCount > 0) {
            throw new Error(`No se puede eliminar el equipo porque tiene ${activeTasksCount} tarea(s) pendiente(s) o en curso.`);
        }
        const result = await this.teamRepository.delete(id);
        if (result.affected === 0) {
            throw new Error("No se pudo eliminar el equipo, puede que ya haya sido borrado.");
        }
    }
}
exports.TeamService = TeamService;
