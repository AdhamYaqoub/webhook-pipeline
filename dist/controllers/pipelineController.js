"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPipeline = void 0;
const db_1 = require("../db/db");
const uuid_1 = require("uuid");
const createPipeline = async (req, res) => {
    try {
        const { name, actionType, subscribers } = req.body;
        const pipelineId = (0, uuid_1.v4)();
        await db_1.pool.query("INSERT INTO pipelines (id, name, action_type) VALUES ($1,$2,$3)", [pipelineId, name, actionType]);
        for (const url of subscribers) {
            await db_1.pool.query("INSERT INTO subscribers (id, pipeline_id, url) VALUES ($1,$2,$3)", [(0, uuid_1.v4)(), pipelineId, url]);
        }
        res.json({
            id: pipelineId,
            name,
            actionType,
            subscribers
        });
    }
    catch (error) {
        res.status(500).json({ error: "failed to create pipeline" });
    }
};
exports.createPipeline = createPipeline;
