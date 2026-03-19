import fetch from 'node-fetch';

import { pool } from './db';
import { config } from './config';
import type { Job, Subscriber } from './models';
import {
  completeJob,
  failJob,
  fetchPendingJobs,
  markJobProcessing,
  recordDeliveryAttempt,
} from './services/jobs';
import { processPayload } from './services/processing';

let isRunning = false;

export async function workerTick(): Promise<void> {
  if (isRunning) return;
  isRunning = true;
  try {
    const jobs = await fetchPendingJobs(config.worker.batchSize);
    for (const job of jobs) {
      // eslint-disable-next-line no-await-in-loop
      await handleJob(job);
    }
  } finally {
    isRunning = false;
  }
}

async function handleJob(job: Job): Promise<void> {
  const locked = await markJobProcessing(job.id, job.attempts);
  if (!locked) {
    return;
  }

  const { rows: pipelineRows } = await pool.query(
    `
      SELECT id, name, description, source_token, action_type, action_config, created_at
      FROM pipelines
      WHERE id = $1
    `,
    [job.pipelineId],
  );
  if (!pipelineRows[0]) {
    await failJob({
      jobId: job.id,
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
      error: 'Pipeline not found',
    });
    return;
  }
  const pipeline = {
    id: pipelineRows[0].id,
    name: pipelineRows[0].name,
    description: pipelineRows[0].description,
    sourceToken: pipelineRows[0].source_token,
    actionType: pipelineRows[0].action_type,
    actionConfig: pipelineRows[0].action_config,
    createdAt: pipelineRows[0].created_at,
  };

  const { processedPayload } = processPayload(pipeline, job.payload);

  const { rows: subscriberRows } = await pool.query(
    `
      SELECT id, pipeline_id, target_url, headers, is_active, created_at
      FROM subscribers
      WHERE pipeline_id = $1 AND is_active = TRUE
    `,
    [job.pipelineId],
  );

  const subscribers: Subscriber[] = subscriberRows.map((row: any) => ({
    id: row.id,
    pipelineId: row.pipeline_id,
    targetUrl: row.target_url,
    headers: row.headers,
    isActive: row.is_active,
    createdAt: row.created_at,
  }));

  try {
    for (const sub of subscribers) {
      // eslint-disable-next-line no-await-in-loop
      await deliverToSubscriber(job, sub, processedPayload);
    }
    await completeJob(job.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await failJob({
      jobId: job.id,
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
      error: message,
    });
  }
}

async function deliverToSubscriber(
  job: Job,
  subscriber: Subscriber,
  processedPayload: unknown,
): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  let status: number | undefined;
  let body: string | undefined;
  let error: string | undefined;
  try {
    const res = await fetch(subscriber.targetUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...subscriber.headers,
      },
      body: JSON.stringify({
        jobId: job.id,
        pipelineId: job.pipelineId,
        payload: processedPayload,
      }),
      signal: controller.signal,
    });
    status = res.status;
    body = await res.text();
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    await recordDeliveryAttempt({
      jobId: job.id,
      subscriberId: subscriber.id,
      status: 'success',
      httpStatus: status,
      responseBody: body.slice(0, 2000),
      attemptNumber: job.attempts + 1,
    });
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
    await recordDeliveryAttempt({
      jobId: job.id,
      subscriberId: subscriber.id,
      status: 'failed',
      httpStatus: status,
      responseBody: body?.slice(0, 2000),
      error,
      attemptNumber: job.attempts + 1,
    });
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export function startWorkerLoop(): void {
  if (!config.worker.enabled) return;
  setInterval(() => {
    void workerTick();
  }, config.worker.pollIntervalMs);
}

