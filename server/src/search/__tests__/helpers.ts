/**
 * server/src/search/__tests__/helpers.ts
 *
 * Shared fixtures for search pipeline tests.
 */

import type { Business } from '@getitdone/shared/types.js';
import type { BusinessProvider, BusinessSearchParams } from '../../providers/BusinessProvider.js';

/** A fixed Monday, matching the domain test helpers' convention (2024-01-01 is a Monday). */
export function mon(hh: number, mm = 0): string {
  return new Date(Date.UTC(2024, 0, 1, hh, mm, 0, 0)).toISOString();
}

export const NOW_MS = new Date(mon(10, 0)).getTime(); // Mon 10:00 UTC

const ALWAYS_OPEN = {
  mon: { open: '00:00', close: '23:30' },
  tue: { open: '00:00', close: '23:30' },
  wed: { open: '00:00', close: '23:30' },
  thu: { open: '00:00', close: '23:30' },
  fri: { open: '00:00', close: '23:30' },
  sat: { open: '00:00', close: '23:30' },
  sun: { open: '00:00', close: '23:30' },
};

let _seq = 0;

export function makeBusiness(overrides: Partial<Business> = {}): Business {
  _seq += 1;
  return {
    id: `biz_${_seq}`,
    name: `Test Business ${_seq}`,
    category: 'barber',
    description: '',
    address: '1 Main St',
    lat: 37.5485,
    lng: -121.9886,
    phone: '555-0100',
    priceLevel: 2,
    rating: 4.0,
    services: [{ id: 'svc_default', name: 'Haircut', durationMin: 30, priceCents: 1000 }],
    hours: ALWAYS_OPEN,
    resources: [{ id: 'res_default', name: 'Resource 1' }],
    ...overrides,
  };
}

const MILES_PER_DEGREE_LAT = 69.0;

/** A point `dNorthMiles`/`dEastMiles` away from (baseLat, baseLng). */
export function pointAt(baseLat: number, baseLng: number, dNorthMiles: number, dEastMiles: number) {
  const milesPerDegreeLng = MILES_PER_DEGREE_LAT * Math.cos((baseLat * Math.PI) / 180);
  return {
    lat: baseLat + dNorthMiles / MILES_PER_DEGREE_LAT,
    lng: baseLng + dEastMiles / milesPerDegreeLng,
  };
}

export class FakeBusinessProvider implements BusinessProvider {
  constructor(private readonly businesses: Business[]) {}

  async search(params: BusinessSearchParams): Promise<Business[]> {
    return this.businesses.filter(b => b.category === params.category);
  }
}
