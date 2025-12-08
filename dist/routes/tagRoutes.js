"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const TagController_1 = require("../controllers/TagController");
const router = (0, express_1.Router)();
// GET /tags
router.get("/", TagController_1.TagController.getAll);
// POST /tags
router.post("/", TagController_1.TagController.create);
exports.default = router;
