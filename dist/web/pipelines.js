"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerPipelineRoutes = registerPipelineRoutes;
const zod_1 = require("zod");
const pipelines_1 = require("../services/pipelines");
const pipelineCreateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    actionType: zod_1.z.enum(['echo', 'extract_field', 'template']),
    actionConfig: zod_1.z.any().optional(),
});
const pipelineUpdateSchema = pipelineCreateSchema.partial();
const subscriberCreateSchema = zod_1.z.object({
    targetUrl: zod_1.z.string().url(),
    headers: zod_1.z.record(zod_1.z.string()).optional(),
});
function registerPipelineRoutes(app) {
    app.get('/pipelines', async (_req, res) => {
        const pipelines = await (0, pipelines_1.listPipelines)();
        res.json(pipelines);
    });
    app.post('/pipelines', async (req, res) => {
        const parsed = pipelineCreateSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: parsed.error.flatten() });
            return;
        }
        const pipeline = await (0, pipelines_1.createPipeline)(parsed.data);
        res.status(201).json(pipeline);
    });
    app.get('/pipelines/:id', async (req, res) => {
        const pipeline = await (0, pipelines_1.getPipeline)(req.params.id);
        if (!pipeline) {
            res.status(404).json({ error: 'Pipeline not found' });
            return;
        }
        res.json(pipeline);
    });
    app.put('/pipelines/:id', async (req, res) => {
        const parsed = pipelineUpdateSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: parsed.error.flatten() });
            return;
        }
        const pipeline = await (0, pipelines_1.updatePipeline)(req.params.id, parsed.data);
        if (!pipeline) {
            res.status(404).json({ error: 'Pipeline not found' });
            return;
        }
        res.json(pipeline);
    });
    app.delete('/pipelines/:id', async (req, res) => {
        const ok = await (0, pipelines_1.deletePipeline)(req.params.id);
        if (!ok) {
            res.status(404).json({ error: 'Pipeline not found' });
            return;
        }
        res.status(204).send();
    });
    app.post('/pipelines/:id/subscribers', async (req, res) => {
        const parsed = subscriberCreateSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: parsed.error.flatten() });
            return;
        }
        const pipeline = await (0, pipelines_1.getPipeline)(req.params.id);
        if (!pipeline) {
            res.status(404).json({ error: 'Pipeline not found' });
            return;
        }
        const subscriber = await (0, pipelines_1.addSubscriber)({
            pipelineId: pipeline.id,
            targetUrl: parsed.data.targetUrl,
            headers: parsed.data.headers,
        });
        res.status(201).json(subscriber);
    });
    app.get('/pipelines/:id/subscribers', async (req, res) => {
        const pipeline = await (0, pipelines_1.getPipeline)(req.params.id);
        if (!pipeline) {
            res.status(404).json({ error: 'Pipeline not found' });
            return;
        }
        const subscribers = await (0, pipelines_1.listSubscribers)(pipeline.id);
        res.json(subscribers);
    });
    app.post('/subscribers/:id/activate', async (req, res) => {
        const subscriber = await (0, pipelines_1.setSubscriberActive)(req.params.id, true);
        if (!subscriber) {
            res.status(404).json({ error: 'Subscriber not found' });
            return;
        }
        res.json(subscriber);
    });
    app.post('/subscribers/:id/deactivate', async (req, res) => {
        const subscriber = await (0, pipelines_1.setSubscriberActive)(req.params.id, false);
        if (!subscriber) {
            res.status(404).json({ error: 'Subscriber not found' });
            return;
        }
        res.json(subscriber);
    });
}
