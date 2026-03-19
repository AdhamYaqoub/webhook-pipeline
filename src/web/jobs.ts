import type { Express, Request, Response } from 'express';

import { getJob, listDeliveryAttempts, listJobsForPipeline } from '../services/jobs';
import { getPipeline } from '../services/pipelines';

export function registerJobRoutes(app: Express): void {
  app.get('/jobs/:id', async (req: Request, res: Response) => {
    const job = await getJob(req.params.id);
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    res.json(job);
  });

  app.get('/pipelines/:id/jobs', async (req: Request, res: Response) => {
    const pipeline = await getPipeline(req.params.id);
    if (!pipeline) {
      res.status(404).json({ error: 'Pipeline not found' });
      return;
    }
    const jobs = await listJobsForPipeline(pipeline.id);
    res.json(jobs);
  });

  app.get('/jobs/:id/deliveries', async (req: Request, res: Response) => {
    const job = await getJob(req.params.id);
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    const deliveries = await listDeliveryAttempts(job.id);
    res.json(deliveries);
  });
}

