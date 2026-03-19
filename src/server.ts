import express from 'express';
import morgan from 'morgan';
import { registerPipelineRoutes } from './web/pipelines';
import { registerWebhookRoutes } from './web/webhooks';
import { registerJobRoutes } from './web/jobs';

export function createServer() {
  const app = express();

  app.use(express.json({ limit: '1mb' }));
  app.use(morgan('dev'));

  app.get('/healthz', (_req, res) => {
    res.json({ ok: true });
  });

  registerPipelineRoutes(app);
  registerWebhookRoutes(app);
  registerJobRoutes(app);

  return app;
}