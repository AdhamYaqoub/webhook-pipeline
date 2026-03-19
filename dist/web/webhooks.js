"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerWebhookRoutes = registerWebhookRoutes;
const jobs_1 = require("../services/jobs");
const pipelines_1 = require("../services/pipelines");
const config_1 = require("../config");
function registerWebhookRoutes(app) {
    app.post('/hooks/:token', async (req, res) => {
        const token = req.params.token;
        const pipeline = await (0, pipelines_1.getPipelineByToken)(token);
        if (!pipeline) {
            res.status(404).json({ error: 'Pipeline not found' });
            return;
        }
        const job = await (0, jobs_1.enqueueJob)({
            pipelineId: pipeline.id,
            payload: req.body,
            maxAttempts: config_1.config.worker.maxAttempts,
        });
        res.status(202).json({
            jobId: job.id,
            pipelineId: job.pipelineId,
            status: job.status,
        });
    });
}
