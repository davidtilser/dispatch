/**
 * server/src/middleware/logger.test.ts
 *
 * Request logger: must log the full original path (not a router-relative
 * path truncated by Express's sub-router mounting), with the query string
 * stripped, plus method and status only — never bodies, cookies, or headers.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

describe('requestLogger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs the full mounted path, not the router-relative path', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const app = createApp();

    await request(app).get('/api/health');

    // Regression: health.ts is mounted at /api/health and its handler is
    // registered at '/' inside that sub-router. A buggy logger reading
    // req.path here would log "GET /" instead of the real request path.
    const lines = logSpy.mock.calls.map(args => args.join(' '));
    expect(lines.some(l => l.includes('[req] GET /api/health 200'))).toBe(true);
    expect(lines.some(l => / GET \/ \d/.test(l))).toBe(false);
  });

  it('strips the query string from the logged path', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const app = createApp();

    await request(app).get('/api/health?foo=bar&token=secret');

    const lines = logSpy.mock.calls.map(args => args.join(' '));
    expect(lines.some(l => l.includes('[req] GET /api/health 200'))).toBe(true);
    expect(lines.some(l => l.includes('foo=bar') || l.includes('token=secret'))).toBe(false);
  });

  it('logs method, path, and status only — no bodies, cookies, or headers', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const app = createApp();

    await request(app)
      .get('/api/unknown-route')
      .set('Cookie', 'session=super-secret')
      .set('X-Custom-Header', 'should-not-appear');

    const lines = logSpy.mock.calls.map(args => args.join(' '));
    const reqLine = lines.find(l => l.startsWith('[req]'));
    expect(reqLine).toBe('[req] GET /api/unknown-route 404');
    expect(lines.some(l => l.includes('super-secret'))).toBe(false);
    expect(lines.some(l => l.includes('should-not-appear'))).toBe(false);
  });
});
