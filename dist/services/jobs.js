"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enqueueJob = enqueueJob;
exports.getJob = getJob;
exports.listJobsForPipeline = listJobsForPipeline;
exports.recordDeliveryAttempt = recordDeliveryAttempt;
exports.listDeliveryAttempts = listDeliveryAttempts;
exports.fetchPendingJobs = fetchPendingJobs;
exports.markJobProcessing = markJobProcessing;
exports.completeJob = completeJob;
exports.failJob = failJob;
const db_1 = require("../db");
async function enqueueJob(input) {
    const { rows } = await db_1.pool.query(`
      INSERT INTO jobs (pipeline_id, payload, max_attempts)
      VALUES ($1, $2, $3)
      RETURNING id, pipeline_id, payload, status, attempts, max_attempts, next_run_at,
                last_error, created_at, completed_at
    `, [input.pipelineId, input.payload, input.maxAttempts]);
    return mapJob(rows[0]);
}
async function getJob(id) {
    const { rows } = await db_1.pool.query(`
      SELECT id, pipeline_id, payload, status, attempts, max_attempts, next_run_at,
             last_error, created_at, completed_at
      FROM jobs
      WHERE id = $1
    `, [id]);
    if (!rows[0])
        return null;
    return mapJob(rows[0]);
}
async function listJobsForPipeline(pipelineId) {
    const { rows } = await db_1.pool.query(`
      SELECT id, pipeline_id, payload, status, attempts, max_attempts, next_run_at,
             last_error, created_at, completed_at
      FROM jobs
      WHERE pipeline_id = $1
      ORDER BY created_at DESC
      LIMIT 100
    `, [pipelineId]);
    return rows.map(mapJob);
}
async function recordDeliveryAttempt(input) {
    const { rows } = await db_1.pool.query(`
      INSERT INTO delivery_attempts
        (job_id, subscriber_id, status, http_status, response_body, error, attempt_number)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, job_id, subscriber_id, status, http_status, response_body,
                error, attempt_number, created_at
    `, [
        input.jobId,
        input.subscriberId,
        input.status,
        input.httpStatus ?? null,
        input.responseBody ?? null,
        input.error ?? null,
        input.attemptNumber,
    ]);
    return mapDelivery(rows[0]);
}
async function listDeliveryAttempts(jobId) {
    const { rows } = await db_1.pool.query(`
      SELECT id, job_id, subscriber_id, status, http_status, response_body,
             error, attempt_number, created_at
      FROM delivery_attempts
      WHERE job_id = $1
      ORDER BY created_at ASC
    `, [jobId]);
    return rows.map(mapDelivery);
}
async function fetchPendingJobs(limit) {
    const now = new Date();
    const { rows } = await db_1.pool.query(`
      SELECT id, pipeline_id, payload, status, attempts, max_attempts, next_run_at,
             last_error, created_at, completed_at
      FROM jobs
      WHERE status IN ('pending', 'failed')
        AND next_run_at <= $1
      ORDER BY next_run_at ASC
      LIMIT $2
    `, [now, limit]);
    return rows.map(mapJob);
}
async function markJobProcessing(jobId, expectedAttempts) {
    const { rowCount } = await db_1.pool.query(`
      UPDATE jobs
      SET status = 'processing'
      WHERE id = $1
        AND attempts = $2
        AND status IN ('pending', 'failed')
    `, [jobId, expectedAttempts]);
    return (rowCount ?? 0) > 0;
}
async function completeJob(jobId) {
    await db_1.pool.query(`
      UPDATE jobs
      SET status = 'completed',
          completed_at = now()
      WHERE id = $1
    `, [jobId]);
}
async function failJob(options) {
    const { jobId, attempts, maxAttempts, error } = options;
    const nextAttempts = attempts + 1;
    const willDeadLetter = nextAttempts >= maxAttempts;
    const backoffSeconds = Math.min(60 * 10, 5 * Math.pow(2, nextAttempts)); // up to 10m
    await db_1.pool.query(`
      UPDATE jobs
      SET attempts = $2,
          status = $3,
          next_run_at = now() + make_interval(secs := $4),
          last_error = $5
      WHERE id = $1
    `, [jobId, nextAttempts, willDeadLetter ? 'dead_letter' : 'failed', backoffSeconds, error]);
}
function mapJob(row) {
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
function mapDelivery(row) {
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
