"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.receiveWebhook = void 0;
const db_1 = require("../db/db");
const uuid_1 = require("uuid");
const receiveWebhook = async (req, res) => {
    try {
        const { pipelineId } = req.params;
        const payload = req.body;
        // أنشئ job جديد في queue
        const jobId = (0, uuid_1.v4)();
        await db_1.pool.query("INSERT INTO jobs (id, pipeline_id, payload, status, attempts) VALUES ($1,$2,$3,'pending',0)", [jobId, pipelineId, payload]);
        res.status(202).json({ message: "Webhook received and queued", jobId });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to queue webhook" });
    }
};
exports.receiveWebhook = receiveWebhook;
