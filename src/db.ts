import pg from 'pg';

import { config } from './config';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.db.connectionString,
});

export type DbClient = pg.PoolClient;

export async function withTransaction<T>(
  fn: (client: DbClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

