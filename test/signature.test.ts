import { createHmac } from 'crypto';
import { test, expect } from 'vitest';

import { verifyHmacSha256Signature } from '../src/services/signature';

const buildSignature = (secret: string, payload: string) =>
  `sha256=${createHmac('sha256', secret).update(payload).digest('hex')}`;

test('verifyHmacSha256Signature returns true for matching signature', () => {
  const secret = 'test-secret-123';
  const payload = JSON.stringify({ hello: 'world' });
  const signature = buildSignature(secret, payload);

  expect(verifyHmacSha256Signature(secret, payload, signature)).toBe(true);
});

test('verifyHmacSha256Signature returns false with wrong signature', () => {
  const secret = 'test-secret-123';
  const payload = JSON.stringify({ hello: 'world' });
  const wrongSignature = buildSignature('other-secret', payload);

  expect(verifyHmacSha256Signature(secret, payload, wrongSignature)).toBe(false);
});

test('verifyHmacSha256Signature returns false when signature header is missing', () => {
  const secret = 'test-secret-123';
  const payload = JSON.stringify({ hello: 'world' });

  expect(verifyHmacSha256Signature(secret, payload, undefined)).toBe(false);
});
