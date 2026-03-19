export interface AppConfig {
  port: number;
  db: {
    connectionString: string;
  };
  worker: {
    enabled: boolean;
    pollIntervalMs: number;
    batchSize: number;
    maxAttempts: number;
  };
}

export const config: AppConfig = {
  port: Number(process.env.PORT) || 3000,
  db: {
    connectionString:
      process.env.DATABASE_URL ||
      'postgres://postgres:postgres@postgres:5432/webhook_pipeline',
  },
  worker: {
    enabled: process.env.WORKER_ENABLED !== 'false',
    pollIntervalMs: Number(process.env.WORKER_POLL_INTERVAL_MS) || 5000,
    batchSize: Number(process.env.WORKER_BATCH_SIZE) || 10,
    maxAttempts: Number(process.env.WORKER_MAX_ATTEMPTS) || 5,
  },
};

