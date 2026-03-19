import { pool, withTransaction } from '../db';
import type { Job, DeliveryAttempt } from '../models';

export async function enqueueJob({
  pipelineId,
  payload,
  maxAttempts,
}: {
  pipelineId: string;
  payload: any;
  maxAttempts: number;
}) {
  const result = await pool.query(
    `INSERT INTO jobs (
      id,
      pipeline_id,
      payload,
      status,
      max_attempts,
      next_run_at
    )
    VALUES (
      uuid_generate_v4(),
      $1,
      $2,
      $3,
      $4,
      NOW()
    )
    RETURNING *`,
    [pipelineId, payload, 'pending', maxAttempts]
  );

  return result.rows[0];
}

export async function getJob(id: string): Promise<Job | null> {
  const { rows } = await pool.query(
    `
      SELECT id, pipeline_id, payload, status, attempts, max_attempts, next_run_at,
             last_error, created_at, completed_at
      FROM jobs
      WHERE id = $1
    `,
    [id],
  );
  if (!rows[0]) return null;
  return mapJob(rows[0]);
}

export async function listJobsForPipeline(pipelineId: string): Promise<Job[]> {
  const { rows } = await pool.query(
    `
      SELECT id, pipeline_id, payload, status, attempts, max_attempts, next_run_at,
             last_error, created_at, completed_at
      FROM jobs
      WHERE pipeline_id = $1
      ORDER BY created_at DESC
      LIMIT 100
    `,
    [pipelineId],
  );
  return rows.map(mapJob);
}

export async function recordDeliveryAttempt(input: {
  jobId: string;
  subscriberId: string;
  status: DeliveryAttempt['status'];
  httpStatus?: number;
  responseBody?: string;
  error?: string;
  attemptNumber: number;
}): Promise<DeliveryAttempt> {
  const { rows } = await pool.query(
    `
      INSERT INTO delivery_attempts
        (job_id, subscriber_id, status, http_status, response_body, error, attempt_number)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, job_id, subscriber_id, status, http_status, response_body,
                error, attempt_number, created_at
    `,
    [
      input.jobId,
      input.subscriberId,
      input.status,
      input.httpStatus ?? null,
      input.responseBody ?? null,
      input.error ?? null,
      input.attemptNumber,
    ],
  );
  return mapDelivery(rows[0]);
}

export async function listDeliveryAttempts(jobId: string): Promise<DeliveryAttempt[]> {
  const { rows } = await pool.query(
    `
      SELECT id, job_id, subscriber_id, status, http_status, response_body,
             error, attempt_number, created_at
      FROM delivery_attempts
      WHERE job_id = $1
      ORDER BY created_at ASC
    `,
    [jobId],
  );
  return rows.map(mapDelivery);
}

export async function fetchPendingJobs(limit: number): Promise<Job[]> {
  const now = new Date();
  const { rows } = await pool.query(
    `
      SELECT id, pipeline_id, payload, status, attempts, max_attempts, next_run_at,
             last_error, created_at, completed_at
      FROM jobs
      WHERE status IN ('pending', 'failed')
        AND next_run_at <= $1
      ORDER BY next_run_at ASC
      LIMIT $2
    `,
    [now, limit],
  );
  return rows.map(mapJob);
}

export async function markJobProcessing(jobId: string, expectedAttempts: number): Promise<boolean> {
  const { rowCount } = await pool.query(
    `
      UPDATE jobs
      SET status = 'processing'
      WHERE id = $1
        AND attempts = $2
        AND status IN ('pending', 'failed')
    `,
    [jobId, expectedAttempts],
  );
return (rowCount ?? 0) > 0;}

export async function completeJob(jobId: string): Promise<void> {
  await pool.query(
    `
      UPDATE jobs
      SET status = 'completed',
          completed_at = now()
      WHERE id = $1
    `,
    [jobId],
  );
}

export async function failJob(options: {
  jobId: string;
  attempts: number;
  maxAttempts: number;
  error: string;
}): Promise<void> {
  const { jobId, attempts, maxAttempts, error } = options;
  const nextAttempts = attempts + 1;
  const willDeadLetter = nextAttempts >= maxAttempts;
  const backoffSeconds = Math.min(60 * 10, 5 * Math.pow(2, nextAttempts)); // up to 10m
  await pool.query(
    `
      UPDATE jobs
      SET attempts = $2,
          status = $3,
          next_run_at = now() + make_interval(secs := $4),
          last_error = $5
      WHERE id = $1
    `,
    [jobId, nextAttempts, willDeadLetter ? 'dead_letter' : 'failed', backoffSeconds, error],
  );
}

function mapJob(row: any): Job {
  return {
    id: row.id,
    pipelineId: row.pipeline_id,
    payload: row.payload,
    status: row.status,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    nextRunAt: row.next_run_at,
    lastError: row.last_error,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

function mapDelivery(row: any): DeliveryAttempt {
  return {
    id: row.id,
    jobId: row.job_id,
    subscriberId: row.subscriber_id,
    status: row.status,
    httpStatus: row.http_status,
    responseBody: row.response_body,
    error: row.error,
    attemptNumber: row.attempt_number,
    createdAt: row.created_at,
  };
}

