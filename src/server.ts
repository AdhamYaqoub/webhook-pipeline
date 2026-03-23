import express from 'express';
import morgan from 'morgan';
import path from 'path';
import { registerPipelineRoutes } from './web/pipelines';
import { registerWebhookRoutes } from './web/webhooks';
import { registerJobRoutes } from './web/jobs';

export function createServer() {
  const app = express();

  app.use(express.json({
    limit: '1mb',
    verify: (req, _res, buf) => {
      // Store raw body for webhook signature verification.
      (req as any).rawBody = buf;
    },
  }));
  app.use(morgan('dev'));

  app.get('/healthz', (_req, res) => {
    res.json({ ok: true });
  });

  // Serve dashboard UI
  app.use(express.static(path.join(__dirname, '../public')));

  registerPipelineRoutes(app);
  registerWebhookRoutes(app);
  registerJobRoutes(app);

  return app;
}