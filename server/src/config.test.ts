/**
 * server/src/config.test.ts
 *
 * HOST must be hardcoded to 127.0.0.1 and must never be overridable via
 * environment variables — this is a hard security requirement (see
 * README "Security Posture").
 */

import { describe, it, expect, afterEach, vi } from 'vitest';

describe('config HOST', () => {
  const originalHost = process.env.HOST;

  afterEach(() => {
    if (originalHost === undefined) delete process.env.HOST;
    else process.env.HOST = originalHost;
    vi.resetModules();
  });

  it('is hardcoded to 127.0.0.1', async () => {
    vi.resetModules();
    const { HOST } = await import('./config.js');
    expect(HOST).toBe('127.0.0.1');
  });

  it('ignores a HOST environment variable entirely, even a malicious override', async () => {
    process.env.HOST = '0.0.0.0';
    vi.resetModules();
    const { HOST, config } = await import('./config.js');
    expect(HOST).toBe('127.0.0.1');
    expect(config.host).toBe('127.0.0.1');
  });
});
