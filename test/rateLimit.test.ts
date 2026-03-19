import { test, expect } from 'vitest';

import { shouldRateLimit, resetRateLimit } from '../src/services/rateLimit';
import { config } from '../src/config';

test('shouldRateLimit returns true after exceeding requests in window', () => {
  const key = 'test-key';

  // ensure predictable window by using small window and reset
  const originalRequests = config.rateLimit.requests;
  const originalWindow = config.rateLimit.windowSeconds;

  // temporarily override config for test
  config.rateLimit.requests = 2;
  config.rateLimit.windowSeconds = 60;

  resetRateLimit(key);

  expect(shouldRateLimit(key)).toBe(false);
  expect(shouldRateLimit(key)).toBe(false);
  expect(shouldRateLimit(key)).toBe(true);

  // restore config
  config.rateLimit.requests = originalRequests;
  config.rateLimit.windowSeconds = originalWindow;
});
