import { randomUUID } from 'crypto';

import type { DbClient } from '../db';
import { withTransaction, pool } from '../db';
import type { Pipeline, Subscriber } from '../models';

export async function createPipeline(input: {
  name: string;
  description?: string;
  actionType: Pipeline['actionType'];
  actionConfig?: unknown;
}): Promise<Pipeline> {
  const sourceToken = randomUUID();
  const { rows } = await pool.query(
    `
      INSERT INTO pipelines (name, description, source_token, action_type, action_config)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, description, source_token, action_type, action_config, created_at
    `,
    [input.name, input.description ?? null, sourceToken, input.actionType, input.actionConfig ?? {}],
  );
  const row = rows[0];
  return mapPipeline(row);
}

export async function listPipelines(): Promise<Pipeline[]> {
  const { rows } = await pool.query(
    `
      SELECT id, name, description, source_token, action_type, action_config, created_at
      FROM pipelines
      ORDER BY created_at DESC
    `,
  );
  return rows.map(mapPipeline);
}

export async function getPipeline(id: string): Promise<Pipeline | null> {
  const { rows } = await pool.query(
    `
      SELECT id, name, description, source_token, action_type, action_config, created_at
      FROM pipelines
      WHERE id = $1
    `,
    [id],
  );
  if (!rows[0]) return null;
  return mapPipeline(rows[0]);
}

export async function getPipelineByToken(token: string): Promise<Pipeline | null> {
  const { rows } = await pool.query(
    `
      SELECT id, name, description, source_token, action_type, action_config, created_at
      FROM pipelines
      WHERE source_token = $1
    `,
    [token],
  );
  if (!rows[0]) return null;
  return mapPipeline(rows[0]);
}

export async function updatePipeline(
  id: string,
  input: {
    name?: string;
    description?: string | null;
    actionType?: Pipeline['actionType'];
    actionConfig?: unknown;
  },
): Promise<Pipeline | null> {
  return withTransaction(async (client: DbClient) => {
    const existing = await client.query(
      `SELECT * FROM pipelines WHERE id = $1 FOR UPDATE`,
      [id],
    );
    if (!existing.rows[0]) return null;
    const row = existing.rows[0];
    const next = {
      name: input.name ?? row.name,
      description: input.description ?? row.description,
      action_type: input.actionType ?? row.action_type,
      action_config: input.actionConfig ?? row.action_config,
    };
    const updated = await client.query(
      `
        UPDATE pipelines
        SET name = $2,
            description = $3,
            action_type = $4,
            action_config = $5
        WHERE id = $1
        RETURNING id, name, description, source_token, action_type, action_config, created_at
      `,
      [id, next.name, next.description, next.action_type, next.action_config],
    );
    return mapPipeline(updated.rows[0]);
  });
}

export async function deletePipeline(id: string): Promise<boolean> {
  const { rowCount } = await pool.query(`DELETE FROM pipelines WHERE id = $1`, [id]);
return (rowCount ?? 0) > 0;}

export async function addSubscriber(input: {
  pipelineId: string;
  targetUrl: string;
  headers?: Record<string, string>;
}): Promise<Subscriber> {
  const { rows } = await pool.query(
    `
      INSERT INTO subscribers (pipeline_id, target_url, headers)
      VALUES ($1, $2, $3)
      RETURNING id, pipeline_id, target_url, headers, is_active, created_at
    `,
    [input.pipelineId, input.targetUrl, input.headers ?? {}],
  );
  return mapSubscriber(rows[0]);
}

export async function listSubscribers(pipelineId: string): Promise<Subscriber[]> {
  const { rows } = await pool.query(
    `
      SELECT id, pipeline_id, target_url, headers, is_active, created_at
      FROM subscribers
      WHERE pipeline_id = $1
      ORDER BY created_at ASC
    `,
    [pipelineId],
  );
  return rows.map(mapSubscriber);
}

export async function setSubscriberActive(
  id: string,
  isActive: boolean,
): Promise<Subscriber | null> {
  const { rows } = await pool.query(
    `
      UPDATE subscribers
      SET is_active = $2
      WHERE id = $1
      RETURNING id, pipeline_id, target_url, headers, is_active, created_at
    `,
    [id, isActive],
  );
  if (!rows[0]) return null;
  return mapSubscriber(rows[0]);
}

function mapPipeline(row: any): Pipeline {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    sourceToken: row.source_token,
    actionType: row.action_type,
    actionConfig: row.action_config,
    createdAt: row.created_at,
  };
}

function mapSubscriber(row: any): Subscriber {
  return {
    id: row.id,
    pipelineId: row.pipeline_id,
    targetUrl: row.target_url,
    headers: row.headers,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

