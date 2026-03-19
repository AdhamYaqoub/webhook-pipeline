import type { Express, Request, Response } from 'express';

import { enqueueJob } from '../services/jobs';
import { getPipelineByToken } from '../services/pipelines';
import { config } from '../config';

export function registerWebhookRoutes(app: Express): void {
  app.post('/hooks/:token', async (req: Request, res: Response) => {
    const token = req.params.token;
    const pipeline = await getPipelineByToken(token);
    if (!pipeline) {
      res.status(404).json({ error: 'Pipeline not found' });
      return;
    }

    const job = await enqueueJob({
      pipelineId: pipeline.id,
      payload: req.body,
      maxAttempts: config.worker.maxAttempts,
    });

    res.status(202).json({
      jobId: job.id,
      pipelineId: job.pipelineId,
      status: job.status,
    });
  });
}

