import { test, expect } from 'vitest';

import type { Pipeline } from '../src/models';
import { processPayload } from '../src/services/processing';

function makePipeline(overrides: Partial<Pipeline> = {}): Pipeline {
  return {
    id: 'pipeline-1',
    name: 'Echo pipeline',
    description: null,
    sourceToken: 'token-1',
    actionType: 'echo',
    actionConfig: {},
    createdAt: new Date(),
    ...overrides,
  };
}

test('processPayload - echo returns payload as-is', () => {
  const pipeline = makePipeline({ actionType: 'echo' });
  const payload = { foo: 'bar', nested: { a: 1 } };

  const { processedPayload } = processPayload(pipeline, payload);

  expect(processedPayload).toEqual(payload);
});

