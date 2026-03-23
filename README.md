# Webhook-Driven Task Processing Pipeline

A simplified **Zapier-style service** built with **TypeScript**, **PostgreSQL**, **Docker**, and **GitHub Actions**.  
It receives webhooks, enqueues background jobs, processes them with configurable actions, and delivers results to subscribers with retry logic.

---

## High-Level Architecture

### API Server (`src/server.ts`, `src/web/*`)
- CRUD for **pipelines** and **subscribers**.
- Webhook ingestion endpoint: `/hooks/:token` enqueues jobs asynchronously.
- Job inspection endpoints to check **status** and **delivery history**.

### Worker (`src/worker.ts`)
- Polls the `jobs` table for **pending** or **failed** jobs.
- Locks and processes jobs **one by one**.
- Applies pipeline **processing actions** and delivers results to subscribers with **retries** and **exponential backoff**.

### Database (`db/init/init.sql`)
- `pipelines`: pipeline definition with `actionType`, `actionConfig`, and `source_token`.
- `subscribers`: destinations that receive processed results.
- `jobs`: queued work units with `status`, `attempts`, `backoff`, `error`.
- `delivery_attempts`: history of delivery attempts per job + subscriber.

### Infrastructure
- **Dockerfile + docker-compose.yml**: run API, worker, and Postgres in one command.
- **GitHub Actions** workflow: lint, build, and tests.

---

## Processing Actions

| Action Type       | Description |
|------------------|-------------|
| `echo`            | Forwards the payload exactly as received. |
| `extract_field`   | Extracts a nested field from JSON payload (e.g., `"user.email"`). |
| `template`        | Interpolates payload values into a text template (returns `{ text: "..." }`). |

---

## Setup

### With Docker

```bash
docker compose up --build

Services:

API: http://localhost:3000
Dashboard UI: http://localhost:3000/
Postgres: localhost:5432 (user: postgres, password: postgres, db: webhook_pipeline)

Schema is applied automatically from db/init/init.sql.

Without Docker (Optional)
Start Postgres manually and create database:
psql postgres://postgres:postgres@localhost:5432/webhook_pipeline -f db/init/init.sql
Install dependencies and run API:
npm install
npm run dev
(Optional) Run worker in a separate terminal:
npm run worker
Core API Endpoints

Base URL: http://localhost:3000

Health
GET /healthz
Pipelines
GET /pipelines
POST /pipelines
GET /pipelines/:id
PUT /pipelines/:id
DELETE /pipelines/:id

Pipeline fields:

name (string, required)
description (string, optional)
signingSecret (string, optional)
actionType (echo | extract_field | template)
actionConfig (object, optional)

Webhook URL:

POST /hooks/:sourceToken
Subscribers
POST /pipelines/:id/subscribers
GET /pipelines/:id/subscribers
POST /subscribers/:id/activate
POST /subscribers/:id/deactivate
Webhook Ingestion
POST /hooks/:token
Accepts arbitrary JSON payload.
Headers for signature verification:
X-Signature: sha256=<hex>
X-Hub-Signature-256: sha256=<hex>
X-Webhook-Signature: sha256=<hex>
Enqueues a job with status pending.
Returns:
{
  "jobId": "uuid",
  "pipelineId": "uuid",
  "status": "pending"
}

Signature Example:

payload='{"foo":"bar"}'
secret='my-secret'
signature=$(printf "%s" "$payload" | openssl dgst -sha256 -hmac "$secret" | cut -d" " -f2)

curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-Signature: sha256=$signature" \
  -d "$payload" \
  http://localhost:3000/hooks/<token>
Jobs & Delivery History
GET /jobs/:id – single job status, attempts, errors.
GET /pipelines/:id/jobs – recent jobs for a pipeline.
GET /jobs/:id/deliveries – all delivery attempts.
Worker & Retry Logic
Polls jobs with status IN ('pending', 'failed') and next_run_at <= now().
Locks jobs using markJobProcessing.
Applies processing via processPayload.
Sends POST to subscribers with processed payload and subscriber-specific headers.
Records each attempt in delivery_attempts.
Retries failed jobs with exponential backoff (up to 10 minutes).
Marks jobs as dead_letter after max attempts.
Design Decisions
Postgres as the queue: simple infra with retries, backoff, inspection.
Stateless worker: all state in DB; supports horizontal scaling.
Processing actions as pure functions: easy to test & extend.
Idempotent delivery recording: makes debugging easy.
Configurable via env:
DATABASE_URL, PORT, WORKER_ENABLED, poll interval, batch size, max attempts.
Rate limit: RATE_LIMIT_ENABLED, RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW_SECONDS.

## GitHub Actions CI

Workflow: .github/workflows/ci.yml

Runs on push/PR to main/master.
Starts Postgres and applies schema.
Runs:
npm install
npm run lint
npm run build
npm run test:processing:echo
npm run test:processing:extract
npm run test:processing:template
npm run test:signature
npm run test:rate-limit
