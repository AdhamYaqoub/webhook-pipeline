import type { Express, Request, Response } from 'express';
import { z } from 'zod';

import {
  addSubscriber,
  createPipeline,
  deletePipeline,
  getPipeline,
  listPipelines,
  listSubscribers,
  setSubscriberActive,
  updatePipeline,
} from '../services/pipelines';

const pipelineCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  signingSecret: z.string().min(1).optional(),
  actionType: z.enum(['echo', 'extract_field', 'template']),
  actionConfig: z.any().optional(),
});

const pipelineUpdateSchema = pipelineCreateSchema.partial();

const subscriberCreateSchema = z.object({
  targetUrl: z.string().url(),
  headers: z.record(z.string()).optional(),
});

export function registerPipelineRoutes(app: Express): void {
  app.get('/pipelines', async (_req: Request, res: Response) => {
    const pipelines = await listPipelines();
    res.json(pipelines);
  });

  app.post('/pipelines', async (req: Request, res: Response) => {
    const parsed = pipelineCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const pipeline = await createPipeline(parsed.data);
    res.status(201).json(pipeline);
  });

  app.get('/pipelines/:id', async (req: Request, res: Response) => {
    const pipeline = await getPipeline(req.params.id);
    if (!pipeline) {
      res.status(404).json({ error: 'Pipeline not found' });
      return;
    }
    res.json(pipeline);
  });

  app.put('/pipelines/:id', async (req: Request, res: Response) => {
    const parsed = pipelineUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const pipeline = await updatePipeline(req.params.id, parsed.data);
    if (!pipeline) {
      res.status(404).json({ error: 'Pipeline not found' });
      return;
    }
    res.json(pipeline);
  });

  app.delete('/pipelines/:id', async (req: Request, res: Response) => {
    const ok = await deletePipeline(req.params.id);
    if (!ok) {
      res.status(404).json({ error: 'Pipeline not found' });
      return;
    }
    res.status(204).send();
  });

  app.post('/pipelines/:id/subscribers', async (req: Request, res: Response) => {
    const parsed = subscriberCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const pipeline = await getPipeline(req.params.id);
    if (!pipeline) {
      res.status(404).json({ error: 'Pipeline not found' });
      return;
    }
    const subscriber = await addSubscriber({
      pipelineId: pipeline.id,
      targetUrl: parsed.data.targetUrl,
      headers: parsed.data.headers,
    });
    res.status(201).json(subscriber);
  });

  app.get('/pipelines/:id/subscribers', async (req: Request, res: Response) => {
    const pipeline = await getPipeline(req.params.id);
    if (!pipeline) {
      res.status(404).json({ error: 'Pipeline not found' });
      return;
    }
    const subscribers = await listSubscribers(pipeline.id);
    res.json(subscribers);
  });

  app.post('/subscribers/:id/activate', async (req: Request, res: Response) => {
    const subscriber = await setSubscriberActive(req.params.id, true);
    if (!subscriber) {
      res.status(404).json({ error: 'Subscriber not found' });
      return;
    }
    res.json(subscriber);
  });

  app.post('/subscribers/:id/deactivate', async (req: Request, res: Response) => {
    const subscriber = await setSubscriberActive(req.params.id, false);
    if (!subscriber) {
      res.status(404).json({ error: 'Subscriber not found' });
      return;
    }
    res.json(subscriber);
  });
}

