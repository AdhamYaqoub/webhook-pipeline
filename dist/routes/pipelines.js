"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPipeline = createPipeline;
const uuid_1 = require("uuid");
const db_1 = require("../db/db");
async function createPipeline(req, res) {
    try {
        const { name, action_type } = req.body;
        const id = (0, uuid_1.v4)();
        await db_1.pool.query("INSERT INTO pipelines (id,name,action_type) VALUES ($1,$2,$3)", [id, name, action_type]);
        res.json({ id });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "failed to create pipeline" });
    }
}
