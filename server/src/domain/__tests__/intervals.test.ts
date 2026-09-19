/**
 * Interval overlap tests.
 * Spec: overlaps iff s1 < e2 && s2 < e1. Back-to-back is allowed.
 */

import { describe, it, expect } from 'vitest';
import { overlaps, touching } from '../intervals.js';

describe('intervals', () => {
  it('touching intervals do NOT overlap', () => {
    // [10:00–10:30) and [10:30–11:00) — back-to-back
    expect(overlaps('2024-01-01T10:00:00Z', '2024-01-01T10:30:00Z',
                    '2024-01-01T10:30:00Z', '2024-01-01T11:00:00Z')).toBe(false);
  });

  it('touching intervals are detected as touching', () => {
    expect(touching('2024-01-01T10:00:00Z', '2024-01-01T10:30:00Z',
                    '2024-01-01T10:30:00Z', '2024-01-01T11:00:00Z')).toBe(true);
  });

  it('overlapping intervals are detected', () => {
    // [10:00–10:30) and [10:15–10:45) overlap
    expect(overlaps('2024-01-01T10:00:00Z', '2024-01-01T10:30:00Z',
                    '2024-01-01T10:15:00Z', '2024-01-01T10:45:00Z')).toBe(true);
  });

  it('identical intervals overlap', () => {
    expect(overlaps('2024-01-01T10:00:00Z', '2024-01-01T10:30:00Z',
                    '2024-01-01T10:00:00Z', '2024-01-01T10:30:00Z')).toBe(true);
  });

  it('contained interval overlaps', () => {
    expect(overlaps('2024-01-01T09:00:00Z', '2024-01-01T11:00:00Z',
                    '2024-01-01T09:30:00Z', '2024-01-01T10:30:00Z')).toBe(true);
  });

  it('wholly before does not overlap', () => {
    expect(overlaps('2024-01-01T08:00:00Z', '2024-01-01T09:00:00Z',
                    '2024-01-01T10:00:00Z', '2024-01-01T11:00:00Z')).toBe(false);
  });

  it('wholly after does not overlap', () => {
    expect(overlaps('2024-01-01T12:00:00Z', '2024-01-01T13:00:00Z',
                    '2024-01-01T10:00:00Z', '2024-01-01T11:00:00Z')).toBe(false);
  });
});
