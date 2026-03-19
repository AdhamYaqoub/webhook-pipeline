"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerJobRoutes = registerJobRoutes;
const jobs_1 = require("../services/jobs");
const pipelines_1 = require("../services/pipelines");
function registerJobRoutes(app) {
    app.get('/jobs/:id', async (req, res) => {
        const job = await (0, jobs_1.getJob)(req.params.id);
        if (!job) {
            res.status(404).json({ error: 'Job not found' });
            return;
        }
        res.json(job);
    });
    app.get('/pipelines/:id/jobs', async (req, res) => {
        const pipeline = await (0, pipelines_1.getPipeline)(req.params.id);
        if (!pipeline) {
            res.status(404).json({ error: 'Pipeline not found' });
            return;
        }
        const jobs = await (0, jobs_1.listJobsForPipeline)(pipeline.id);
        res.json(jobs);
    });
    app.get('/jobs/:id/deliveries', async (req, res) => {
        const job = await (0, jobs_1.getJob)(req.params.id);
        if (!job) {
            res.status(404).json({ error: 'Job not found' });
            return;
        }
        const deliveries = await (0, jobs_1.listDeliveryAttempts)(job.id);
        res.json(deliveries);
    });
}
