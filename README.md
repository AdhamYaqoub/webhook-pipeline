## Webhook-Driven Task Processing Pipeline

This project is a simplified Zapier-style service built with **TypeScript**, **PostgreSQL**, **Docker**, and **GitHub Actions**.  
It receives webhooks, enqueues background jobs, processes them with configurable actions, and delivers results to subscribers with retry logic.

### High-Level Architecture

- **API server (`src/server.ts`, `src/web/*`)**
  - CRUD for pipelines and subscribers.
  - Webhook ingestion endpoint `/hooks/:token` that enqueues jobs instead of processing synchronously.
  - Job inspection endpoints to check status and delivery history.
- **Worker (`src/worker.ts`)**
  - Polls the `jobs` table for pending/failed jobs.
  - Locks and processes jobs one by one.
  - Applies the pipeline processing action and delivers results to all active subscribers with retries and exponential backoff.
- **Database (`db/init/init.sql`)**
  - `pipelines`: definition of a pipeline, including action type/config and a unique `source_token` used as the webhook URL.
  - `subscribers`: destinations that receive processed results for a pipeline.
  - `jobs`: queued units of work with status, attempts, backoff, and error fields.
  - `delivery_attempts`: history of all delivery attempts per job + subscriber.
- **Infrastructure**
  - `Dockerfile` + `docker-compose.yml` to run API, worker, and Postgres with one command.
  - GitHub Actions workflow `.github/workflows/ci.yml` for lint, build, and tests.

### Processing Actions

Defined in `src/models.ts` and implemented in `src/services/processing.ts`:

- **`echo`**: forwards the payload exactly as received.
- **`extract_field`**: extracts a nested field from the JSON payload using a dot path (e.g. `"user.email"`).
- **`template`**: interpolates payload values into a text template, returning `{ text: "..." }`.

You can extend this easily by adding more `actionType` values and handling them in `processPayload`.

### Running Locally with Docker

Prerequisites:

- Docker + Docker Compose installed.

Steps:

1. Build and start all services:

```bash
docker compose up --build
```

2. Services:
   - API: `http://localhost:3000`
   - Dashboard UI: `http://localhost:3000/` (single-page UI for pipelines + jobs)
   - Postgres: `localhost:5432` (user `postgres`, password `postgres`, db `webhook_pipeline`)

The database schema is created automatically from `db/init/init.sql` when Postgres starts.

### Running Locally without Docker (optional)

1. Start Postgres yourself and create a database `webhook_pipeline`.
2. Apply schema:

```bash
psql postgres://postgres:postgres@localhost:5432/webhook_pipeline -f db/init/init.sql
```

3. Install dependencies and run in dev mode:

```bash
npm install
npm run dev
```

4. (Optional) run worker in a second terminal:

```bash
npm run worker
```

### Core API Endpoints

Base URL (default): `http://localhost:3000`

#### Health

- **GET** `/healthz`

#### Pipelines

- **GET** `/pipelines` – list pipelines.
- **POST** `/pipelines`
  - Body:
    - `name` (string, required)
    - `description` (string, optional)
    - `signingSecret` (string, optional) - if provided, incoming webhooks must include `X-Signature` (HMAC SHA256)
    - `actionType` (`"echo" | "extract_field" | "template"`)
    - `actionConfig` (object, optional; depends on `actionType`)
- **GET** `/pipelines/:id` – get a single pipeline.
- **PUT** `/pipelines/:id` – update pipeline fields (same shape as create, but all optional).
- **DELETE** `/pipelines/:id` – delete a pipeline.

Each pipeline has a `sourceToken` field which is used to construct the webhook URL:

- Webhook URL: `POST /hooks/:token`

#### Subscribers

- **POST** `/pipelines/:id/subscribers`
  - Body:
    - `targetUrl` (string, URL)
    - `headers` (record of string → string, optional)
- **GET** `/pipelines/:id/subscribers` – list subscribers for a pipeline.
- **POST** `/subscribers/:id/activate`
- **POST** `/subscribers/:id/deactivate`

#### Webhook Ingestion

- **POST** `/hooks/:token`
  - Body: arbitrary JSON payload.
  - Behavior:
    - Looks up pipeline by `source_token`.
    - Expects one of the following headers (the signing secret is either the pipeline `signingSecret` or the pipeline `sourceToken`):
      - `X-Signature: sha256=<hex>`
      - `X-Hub-Signature-256: sha256=<hex>`
      - `X-Webhook-Signature: sha256=<hex>`
    - If the request exceeds the configured rate limit it responds with 429 `Rate limit exceeded`.
    - Enqueues a job in `jobs` with status `pending`.
    - Returns:
      - `jobId`, `pipelineId`, `status`.

##### Signature Example

If a pipeline has a signing secret (e.g. `my-secret`), compute the signature from the raw JSON string:

```bash
payload='{"foo":"bar"}'
secret='my-secret'
signature=$(printf "%s" "$payload" | openssl dgst -sha256 -hmac "$secret" | cut -d" " -f2)

curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-Signature: sha256=$signature" \
  -d "$payload" \
  http://localhost:3000/hooks/<token>
```

The actual processing and delivery happens in the worker process.

#### Jobs and Delivery History

- **GET** `/jobs/:id` – get a single job with status, attempts, error, etc.
- **GET** `/pipelines/:id/jobs` – list recent jobs for a pipeline.
- **GET** `/jobs/:id/deliveries` – list all delivery attempts for a job.

### Worker and Retry Logic

File: `src/worker.ts`

- Polls for jobs with `status IN ('pending', 'failed')` and `next_run_at <= now()`.
- Locks the job using `markJobProcessing` to avoid double-processing.
- Loads the pipeline and subscribers from DB.
- Applies processing via `processPayload`.
- Sends HTTP POST to each subscriber with:
  - JSON body: `{ jobId, pipelineId, payload: processedPayload }`
  - Subscriber-specific headers.
- Records each attempt in `delivery_attempts`.
- On failure:
  - Uses `failJob` with exponential backoff (up to 10 minutes).
  - Marks job `dead_letter` after `maxAttempts` is reached.

### Design Decisions (for your 10‑minute video)

- **Postgres as the queue**: Jobs are stored in SQL with indexes, which keeps infra simple while still supporting retries, backoff, and inspection.
- **Stateless worker**: All state (status, attempts, errors) lives in the DB, so you can scale workers horizontally.
- **Processing actions as pure functions**: `processPayload` is easy to test and extend with new action types.
- **Idempotent delivery recording**: Each delivery attempt is stored with timestamp and attempt number, making debugging easy.
- **Configuration via env**:
  - `DATABASE_URL`, `PORT`, and worker settings (`WORKER_ENABLED`, poll interval, batch size, max attempts).
  - `RATE_LIMIT_ENABLED`, `RATE_LIMIT_REQUESTS`, `RATE_LIMIT_WINDOW_SECONDS` (defaults to 60 req per 60 seconds).

### GitHub Actions CI

Workflow: `.github/workflows/ci.yml`

- Runs on each push/PR to `main`/`master`.
- Starts a Postgres service and applies `db/init/init.sql`.
- Runs:
  - `npm install`
  - `npm run lint`
  - `npm run build`
  - `npm run test:processing:echo`
  - `npm run test:processing:extract`
  - `npm run test:processing:template`
  - `npm run test:signature`
    - `npm run test:rate-limit`
2. **Add a subscriber** that points to a simple request bin or a local echo server.
3. **Trigger the webhook** by `POST`ing JSON to `/hooks/:token`.
4. Show:
   - The **job** in `/jobs/:id`.
   - The **delivery attempts** in `/jobs/:id/deliveries`.
   - The payload received by the subscriber.
5. Show how retries behave by pointing to a subscriber URL that fails once, then recovers.

