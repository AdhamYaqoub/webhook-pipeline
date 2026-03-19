"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.workerTick = workerTick;
exports.startWorkerLoop = startWorkerLoop;
const node_fetch_1 = __importDefault(require("node-fetch"));
const db_1 = require("./db");
const config_1 = require("./config");
const jobs_1 = require("./services/jobs");
const processing_1 = require("./services/processing");
let isRunning = false;
async function workerTick() {
    if (isRunning)
        return;
    isRunning = true;
    try {
        const jobs = await (0, jobs_1.fetchPendingJobs)(config_1.config.worker.batchSize);
        for (const job of jobs) {
            // eslint-disable-next-line no-await-in-loop
            await handleJob(job);
        }
    }
    finally {
        isRunning = false;
    }
}
async function handleJob(job) {
    const locked = await (0, jobs_1.markJobProcessing)(job.id, job.attempts);
    if (!locked) {
        return;
    }
    const { rows: pipelineRows } = await db_1.pool.query(`
      SELECT id, name, description, source_token, action_type, action_config, created_at
      FROM pipelines
      WHERE id = $1
    `, [job.pipelineId]);
    if (!pipelineRows[0]) {
        await (0, jobs_1.failJob)({
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
    const { processedPayload } = (0, processing_1.processPayload)(pipeline, job.payload);
    const { rows: subscriberRows } = await db_1.pool.query(`
      SELECT id, pipeline_id, target_url, headers, is_active, created_at
      FROM subscribers
      WHERE pipeline_id = $1 AND is_active = TRUE
    `, [job.pipelineId]);
    const subscribers = subscriberRows.map((row) => ({
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
        await (0, jobs_1.completeJob)(job.id);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await (0, jobs_1.failJob)({
            jobId: job.id,
            attempts: job.attempts,
            maxAttempts: job.maxAttempts,
            error: message,
        });
    }
}
async function deliverToSubscriber(job, subscriber, processedPayload) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    let status;
    let body;
    let error;
    try {
        const res = await (0, node_fetch_1.default)(subscriber.targetUrl, {
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
        await (0, jobs_1.recordDeliveryAttempt)({
            jobId: job.id,
            subscriberId: subscriber.id,
            status: 'success',
            httpStatus: status,
            responseBody: body.slice(0, 2000),
            attemptNumber: job.attempts + 1,
        });
    }
    catch (err) {
        error = err instanceof Error ? err.message : String(err);
        await (0, jobs_1.recordDeliveryAttempt)({
            jobId: job.id,
            subscriberId: subscriber.id,
            status: 'failed',
            httpStatus: status,
            responseBody: body?.slice(0, 2000),
            error,
            attemptNumber: job.attempts + 1,
        });
        throw err;
    }
    finally {
        clearTimeout(timeout);
    }
}
function startWorkerLoop() {
    if (!config_1.config.worker.enabled)
        return;
    setInterval(() => {
        void workerTick();
    }, config_1.config.worker.pollIntervalMs);
}
