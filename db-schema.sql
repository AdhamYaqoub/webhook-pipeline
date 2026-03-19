CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS pipelines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  source_token TEXT NOT NULL UNIQUE,
  signing_secret TEXT,
  action_type TEXT NOT NULL,
  action_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscribers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  target_url TEXT NOT NULL,
  headers JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE jobs (
    id UUID PRIMARY KEY,
    pipeline_id UUID REFERENCES pipelines(id),
    payload JSONB,
    status TEXT,
    attempts INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT now(),
    max_attempts INT DEFAULT 5,
    next_run_at TIMESTAMP,
    last_error TEXT,
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_jobs_status_next_run
  ON jobs (status, next_run_at);

CREATE TABLE IF NOT EXISTS delivery_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  subscriber_id UUID NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  http_status INT,
  response_body TEXT,
  error TEXT,
  attempt_number INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

