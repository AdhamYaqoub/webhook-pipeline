"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processJob = void 0;
const db_1 = require("../db/db");
const delivery_1 = require("../queue/delivery");
const runAction_1 = require("../actions/runAction");
const processJob = async (job) => {
    const { id, pipeline_id, payload } = job;
    try {
        // mark as processing
        await db_1.pool.query("UPDATE jobs SET status='processing' WHERE id=$1", [id]);
        // جلب نوع action من pipeline
        const pipelineRes = await db_1.pool.query("SELECT action_type FROM pipelines WHERE id=$1", [pipeline_id]);
        const actionType = pipelineRes.rows[0].action_type;
        // تنفيذ action
        const result = await (0, runAction_1.runAction)(actionType, payload);
        // إرسال للمشتركين
        await (0, delivery_1.sendToSubscribers)(id, pipeline_id, result);
        // تحديث job كـ completed
        await db_1.pool.query("UPDATE jobs SET status='completed', processed_at=NOW() WHERE id=$1", [id]);
    }
    catch (err) {
        console.error("Job processing failed:", err);
        await db_1.pool.query("UPDATE jobs SET status='failed', attempts=attempts+1 WHERE id=$1", [id]);
    }
};
exports.processJob = processJob;
