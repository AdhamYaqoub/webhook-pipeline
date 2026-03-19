import { test, expect } from 'vitest';

import type { Pipeline } from '../src/models';
import { processPayload } from '../src/services/processing';

function makePipeline(overrides: Partial<Pipeline> = {}): Pipeline {
  return {
    id: 'pipeline-1',
    name: 'Extract pipeline',
    description: null,
    sourceToken: 'token-1',
    actionType: 'extract_field',
    actionConfig: { fieldPath: 'user.email' },
    createdAt: new Date(),
    ...overrides,
  };
}

test('processPayload - extract_field extracts nested field', () => {
  const pipeline = makePipeline({
    actionType: 'extract_field',
    actionConfig: { fieldPath: 'user.email' },
  });
  const payload = { user: { email: 'test@example.com' } };

  const { processedPayload } = processPayload(pipeline, payload);

  expect(processedPayload).toBe('test@example.com');
});

test('processPayload - extract_field returns null when missing', () => {
  const pipeline = makePipeline({
    actionType: 'extract_field',
    actionConfig: { fieldPath: 'user.phone' },
  });
  const payload = { user: { email: 'test@example.com' } };

  const { processedPayload } = processPayload(pipeline, payload);

  expect(processedPayload).toBeNull();
});

