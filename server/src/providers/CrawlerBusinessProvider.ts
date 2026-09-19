/**
 * server/src/providers/CrawlerBusinessProvider.ts
 *
 * Stub for a future web-crawler agent that discovers real businesses from
 * the open web (Google Maps / Yelp-style listing pages, business
 * websites, etc.) and turns them into GetItDone Business records via
 * categorize() + inferServices() + sanitizeBusiness().
 *
 * Selected when BUSINESS_PROVIDER=crawler (see server/src/config.ts).
 * Not implemented in this milestone — search() always throws.
 */

import type { BusinessProvider, BusinessSearchParams } from './BusinessProvider.js';
import type { Business } from '@getitdone/shared/types.js';

/**
 * Loosely-typed shape a crawler would hand back for one listing, before
 * categorization or sanitization. Everything past id/name/address/lat/lng
 * is optional because real-world crawled pages are inconsistent — some
 * expose a structured category, some only free-text descriptions, some
 * neither.
 */
export interface RawCrawledBusiness {
  /** Stable id from the source (e.g. a Maps place id or listing URL slug). */
  sourceId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  /** Source-provided category label(s), e.g. ["Barber Shop"]. Not our Category enum. */
  categories?: string[];
  description?: string;
  /** Free-text services blurb, e.g. "Haircuts, fades, beard trims, hot towel shaves." */
  servicesText?: string;
  priceLevel?: number;
  rating?: number;
  phone?: string;
  /** Free-text hours, e.g. "Mon-Fri 9am-6pm, Sat 10am-4pm". Not parsed in this milestone. */
  hoursText?: string;
  sourceUrl?: string;
}

export class NotImplementedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotImplementedError';
  }
}

export class CrawlerBusinessProvider implements BusinessProvider {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async search(_params: BusinessSearchParams): Promise<Business[]> {
    throw new NotImplementedError(
      'CrawlerBusinessProvider is not implemented yet — set BUSINESS_PROVIDER=mock.',
    );
  }
}
