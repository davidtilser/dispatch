import { describe, it, expect } from 'vitest';

// Trivial smoke test — the full render test will come with jsdom setup in later milestones.
// This validates that the module tree is importable and the test runner is wired up.

describe('App module', () => {
  it('vitest is working in client workspace', () => {
    expect(1 + 1).toBe(2);
  });

  it('environment is not production during tests', () => {
    // Ensures we are not accidentally running tests against a prod build
    expect(process.env['NODE_ENV']).not.toBe('production');
  });
});
