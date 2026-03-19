import type { Express, Request, Response } from 'express';

import { enqueueJob } from '../services/jobs';
import { getPipelineByToken } from '../services/pipelines';
import { verifyHmacSha256Signature } from '../services/signature';
import { config } from '../config';

export function registerWebhookRoutes(app: Express): void {
  app.post('/hooks/:token', async (req: Request, res: Response) => {
    const token = req.params.token;
    const pipeline = await getPipelineByToken(token);
    if (!pipeline) {
      res.status(404).json({ error: 'Pipeline not found' });
      return;
    }

    // Webhook signature verification (optional)
    // If a signing secret is configured for the pipeline, require a valid HMAC-SHA256 signature.
    if (pipeline.signingSecret) {
      const rawBody = (req as any).rawBody || JSON.stringify(req.body);
      let signatureHeader = req.get('x-signature');
      if (!signatureHeader) {
        signatureHeader = req.get('x-hub-signature-256') || req.get('x-hub-signature');
      }
      if (!verifyHmacSha256Signature(pipeline.signingSecret, rawBody, signatureHeader)) {
        res.status(401).json({ error: 'Invalid webhook signature' });
        return;
      }
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

