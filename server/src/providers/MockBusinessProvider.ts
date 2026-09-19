/**
 * server/src/providers/MockBusinessProvider.ts
 *
 * Seeded, in-memory BusinessProvider. Returns businesses matching the
 * requested category within radiusMiles of the given point (a coarse
 * pre-filter — searchBusinesses() re-checks distance precisely with its
 * own haversine calculation and does the authoritative radius cutoff and
 * sort).
 *
 * Simulates real network latency so the demo UI shows a loading state.
 */

import type { Business } from '@getitdone/shared/types.js';
import type { BusinessProvider, BusinessSearchParams } from './BusinessProvider.js';
import { MOCK_BUSINESSES } from '../data/mockBusinesses.js';
import { distanceMiles } from '../search/haversine.js';

const DEFAULT_LATENCY_MS = 400;

export class MockBusinessProvider implements BusinessProvider {
  constructor(
    private readonly businesses: Business[] = MOCK_BUSINESSES,
    private readonly latencyMs: number = DEFAULT_LATENCY_MS,
  ) {}

  async search(params: BusinessSearchParams): Promise<Business[]> {
    if (this.latencyMs > 0) {
      await new Promise(resolve => setTimeout(resolve, this.latencyMs));
    }

    return this.businesses.filter(
      b =>
        b.category === params.category &&
        distanceMiles(params.lat, params.lng, b.lat, b.lng) <= params.radiusMiles,
    );
  }
}
