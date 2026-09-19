/**
 * server/src/providers/BusinessProvider.ts
 *
 * Provider abstraction over "where business listings come from". Two
 * implementations exist: MockBusinessProvider (seeded fake data, used in
 * demo mode) and CrawlerBusinessProvider (a stub for a future web-crawler
 * agent). searchBusinesses() consumes whichever one config.businessProvider
 * selects without knowing which it is.
 */

import type { Business, Category } from '@getitdone/shared/types.js';

export interface BusinessSearchParams {
  category: Category;
  lat: number;
  lng: number;
  radiusMiles: number;
}

export interface BusinessProvider {
  search(params: BusinessSearchParams): Promise<Business[]>;
}
