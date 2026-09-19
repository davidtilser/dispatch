import { describe, it, expect } from 'vitest';
import { searchBusinesses } from './searchBusinesses.js';
import { Store } from '../domain/store.js';
import { DEMO_CENTER } from '@getitdone/shared';
import { getBusinessProvider } from '../providers/index.js';
import { MockBusinessProvider } from '../providers/MockBusinessProvider.js';
import { createSeededEngine } from '../data/seed.js';
import { FakeBusinessProvider, makeBusiness, mon, pointAt, NOW_MS } from './__tests__/helpers.js';
import type { Booking } from '@getitdone/shared/types.js';

const ORIGIN = { lat: DEMO_CENTER.lat, lng: DEMO_CENTER.lng };

function search(businesses: Parameters<typeof makeBusiness>[0][], radiusMiles = 20) {
  const provider = new FakeBusinessProvider(businesses.map(o => makeBusiness(o)));
  return searchBusinesses(provider, new Store(), { category: 'barber', ...ORIGIN, radiusMiles }, NOW_MS);
}

describe('searchBusinesses — distance sort and radius cutoff', () => {
  it('sorts results by distance ascending', async () => {
    const far = pointAt(ORIGIN.lat, ORIGIN.lng, 8, 0);
    const near = pointAt(ORIGIN.lat, ORIGIN.lng, 1, 0);
    const mid = pointAt(ORIGIN.lat, ORIGIN.lng, 4, 0);

    const results = await search([
      { id: 'far', ...far },
      { id: 'near', ...near },
      { id: 'mid', ...mid },
    ]);

    expect(results.map(r => r.id)).toEqual(['near', 'mid', 'far']);
    expect(results[0]!.distanceMiles).toBeLessThan(results[1]!.distanceMiles);
    expect(results[1]!.distanceMiles).toBeLessThan(results[2]!.distanceMiles);
  });

  it('drops businesses outside the radius, keeps ones just inside', async () => {
    const inside = pointAt(ORIGIN.lat, ORIGIN.lng, 4.9, 0);
    const outside = pointAt(ORIGIN.lat, ORIGIN.lng, 5.1, 0);

    const results = await search(
      [
        { id: 'inside', ...inside },
        { id: 'outside', ...outside },
      ],
      5,
    );

    expect(results.map(r => r.id)).toEqual(['inside']);
  });
});

describe('searchBusinesses — filters', () => {
  it('priceLevels alone', async () => {
    const results = await searchBusinesses(
      new FakeBusinessProvider([
        makeBusiness({ id: 'p1', priceLevel: 1 }),
        makeBusiness({ id: 'p2', priceLevel: 2 }),
        makeBusiness({ id: 'p3', priceLevel: 3 }),
      ]),
      new Store(),
      { category: 'barber', ...ORIGIN, radiusMiles: 20, filters: { priceLevels: [2, 3] } },
      NOW_MS,
    );
    expect(results.map(r => r.id).sort()).toEqual(['p2', 'p3']);
  });

  it('minRating alone', async () => {
    const results = await searchBusinesses(
      new FakeBusinessProvider([
        makeBusiness({ id: 'r1', rating: 3.0 }),
        makeBusiness({ id: 'r2', rating: 4.0 }),
        makeBusiness({ id: 'r3', rating: 4.8 }),
      ]),
      new Store(),
      { category: 'barber', ...ORIGIN, radiusMiles: 20, filters: { minRating: 4.0 } },
      NOW_MS,
    );
    expect(results.map(r => r.id).sort()).toEqual(['r2', 'r3']);
  });

  it('openNow alone', async () => {
    const results = await searchBusinesses(
      new FakeBusinessProvider([
        makeBusiness({ id: 'open', hours: { mon: { open: '09:00', close: '18:00' } } }),
        makeBusiness({ id: 'closed', hours: { tue: { open: '09:00', close: '18:00' } } }),
      ]),
      new Store(),
      { category: 'barber', ...ORIGIN, radiusMiles: 20, filters: { openNow: true } },
      NOW_MS, // Monday 10:00 UTC
    );
    expect(results.map(r => r.id)).toEqual(['open']);
  });

  it('hasOpeningsToday alone', async () => {
    const busy = makeBusiness({ id: 'busy', resources: [{ id: 'res_busy', name: 'Chair' }] });
    const free = makeBusiness({ id: 'free', resources: [{ id: 'res_free', name: 'Chair' }] });

    const store = new Store();
    const blockingBooking: Booking = {
      id: 'bk_block',
      businessId: busy.id,
      resourceId: 'res_busy',
      serviceId: 'svc_default',
      clientId: 'client-someone',
      start: mon(10, 0), // covers from "now" ...
      end: mon(23, 30), // ... through the end of business hours today
      status: 'confirmed',
    };
    store.bookings.set(blockingBooking.id, blockingBooking);

    const results = await searchBusinesses(
      new FakeBusinessProvider([busy, free]),
      store,
      { category: 'barber', ...ORIGIN, radiusMiles: 20, filters: { hasOpeningsToday: true } },
      NOW_MS,
    );
    expect(results.map(r => r.id)).toEqual(['free']);
  });

  it('services alone', async () => {
    const results = await searchBusinesses(
      new FakeBusinessProvider([
        makeBusiness({ id: 'cuts', services: [{ id: 's1', name: 'Classic Haircut', durationMin: 30, priceCents: 2000 }] }),
        makeBusiness({ id: 'shaves', services: [{ id: 's2', name: 'Straight Razor Shave', durationMin: 30, priceCents: 3000 }] }),
      ]),
      new Store(),
      { category: 'barber', ...ORIGIN, radiusMiles: 20, filters: { services: ['haircut'] } },
      NOW_MS,
    );
    expect(results.map(r => r.id)).toEqual(['cuts']);
  });

  it('combines multiple filters (priceLevels + minRating + services)', async () => {
    const results = await searchBusinesses(
      new FakeBusinessProvider([
        makeBusiness({
          id: 'match',
          priceLevel: 2,
          rating: 4.7,
          services: [{ id: 's1', name: 'Beard Trim', durationMin: 15, priceCents: 1500 }],
        }),
        makeBusiness({
          id: 'wrong-price',
          priceLevel: 1,
          rating: 4.7,
          services: [{ id: 's1', name: 'Beard Trim', durationMin: 15, priceCents: 1500 }],
        }),
        makeBusiness({
          id: 'wrong-rating',
          priceLevel: 2,
          rating: 3.0,
          services: [{ id: 's1', name: 'Beard Trim', durationMin: 15, priceCents: 1500 }],
        }),
        makeBusiness({
          id: 'wrong-service',
          priceLevel: 2,
          rating: 4.7,
          services: [{ id: 's1', name: 'Manicure', durationMin: 30, priceCents: 2500 }],
        }),
      ]),
      new Store(),
      {
        category: 'barber',
        ...ORIGIN,
        radiusMiles: 20,
        filters: { priceLevels: [2, 3], minRating: 4.0, services: ['beard trim'] },
      },
      NOW_MS,
    );
    expect(results.map(r => r.id)).toEqual(['match']);
  });
});

describe('searchBusinesses — DEMO_SLOT integration', () => {
  it('flags the DEMO_SLOT business as fullyBooked for its service', async () => {
    const { store } = createSeededEngine();
    const provider = new MockBusinessProvider(undefined, 0); // no simulated latency in tests

    const results = await searchBusinesses(provider, store, {
      category: 'barber',
      lat: DEMO_CENTER.lat,
      lng: DEMO_CENTER.lng,
      radiusMiles: 5,
    });

    const demoBusiness = results.find(r => r.id === 'biz_barber_3');
    expect(demoBusiness).toBeDefined();
    expect(demoBusiness?.fullyBooked).toBe(true);
  });

  it('uses the same real BusinessProvider factory as the rest of the app', async () => {
    const { store } = createSeededEngine();
    const provider = getBusinessProvider();
    const results = await searchBusinesses(
      provider,
      store,
      { category: 'barber', lat: DEMO_CENTER.lat, lng: DEMO_CENTER.lng, radiusMiles: 15 },
    );
    expect(results.length).toBeGreaterThan(0);
  });
});
