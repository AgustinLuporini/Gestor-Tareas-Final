"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TagController = void 0;
const database_1 = require("../config/database");
const Tag_1 = require("../entities/Tag");
const typeorm_1 = require("typeorm");
class TagController {
    /**
     * Obtener todas las etiquetas
     */
    static async getAll(req, res) {
        try {
            const tagRepository = database_1.AppDataSource.getRepository(Tag_1.Tag);
            const tags = await tagRepository.find({
                order: { name: "ASC" }
            });
            res.json({
                message: "Etiquetas obtenidas con éxito",
                data: tags
            });
        }
        catch (error) {
            res.status(500).json({
                message: "Error al obtener etiquetas",
                error
            });
        }
    }
    /**
     * Crear una nueva etiqueta
     */
    static async create(req, res) {
        try {
            const { name } = req.body;
            if (!name || name.trim() === "") {
                return res.status(400).json({ message: "El nombre es obligatorio" });
            }
            const tagRepository = database_1.AppDataSource.getRepository(Tag_1.Tag);
            // Verificar si ya existe (ignorando mayúsculas/minúsculas)
            const existingTag = await tagRepository.findOne({
                where: { name: name.trim() }
            });
            if (existingTag) {
                return res.status(400).json({ message: "Esa etiqueta ya existe" });
            }
            const newTag = tagRepository.create({
                name: name.trim()
                // 'color' no está en tu entidad Tag.ts, así que no lo incluimos
            });
            const savedTag = await tagRepository.save(newTag);
            res.status(201).json({
                message: "Etiqueta creada con éxito",
                data: savedTag
            });
        }
        catch (error) {
            res.status(500).json({
                message: "Error al crear la etiqueta",
                error
            });
        }
    }
    /**
     * Obtener etiquetas por un array de IDs
     * (Lo usaremos internamente en TaskService)
     */
    static async getTagsByIds(ids) {
        if (!ids || ids.length === 0) {
            return [];
        }
        const tagRepository = database_1.AppDataSource.getRepository(Tag_1.Tag);
        return await tagRepository.findBy({ id: (0, typeorm_1.In)(ids) });
    }
}
exports.TagController = TagController;
