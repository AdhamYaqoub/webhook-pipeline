import { describe, it, expect } from 'vitest';
import type { Pipeline } from '../src/models';
import { processPayload } from '../src/services/processing';

function makePipeline(overrides: Partial<Pipeline> = {}): Pipeline {
  return {
    id: 'pipeline-1',
    name: 'Template pipeline',
    description: null,
    sourceToken: 'token-1',
    actionType: 'template',
    actionConfig: { template: 'User {{ payload.user.email }} signed up' },
    createdAt: new Date(),
    ...overrides,
  };
}

describe('processPayload - template', () => {
  it('renders payload fields correctly', () => {
    const pipeline = makePipeline();
    const payload = { user: { email: 'test@example.com' } };
    const { processedPayload } = processPayload(pipeline, payload);

    expect(processedPayload).toEqual({
      text: 'User test@example.com signed up',
    });
  });

  it('uses empty string for missing fields', () => {
    const pipeline = makePipeline({
      actionConfig: { template: 'Phone: {{ payload.user.phone }}' },
    });
    const payload = { user: { email: 'test@example.com' } };
    const { processedPayload } = processPayload(pipeline, payload);

    expect(processedPayload).toEqual({
      text: 'Phone: ',
    });
  });
});