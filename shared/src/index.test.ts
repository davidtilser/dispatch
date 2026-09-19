import { describe, it, expect } from 'vitest';
import { businessUrlSchema, type HealthResponse } from './index.js';

describe('shared types', () => {
  it('businessUrlSchema accepts a valid URL', () => {
    const result = businessUrlSchema.safeParse({ url: 'https://example.com' });
    expect(result.success).toBe(true);
  });

  it('businessUrlSchema rejects a non-URL', () => {
    const result = businessUrlSchema.safeParse({ url: 'not-a-url' });
    expect(result.success).toBe(false);
  });

  it('HealthResponse type is structurally correct', () => {
    const resp: HealthResponse = { ok: true };
    expect(resp.ok).toBe(true);
  });
});
