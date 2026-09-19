/**
 * server/src/domain/__tests__/helpers.ts
 *
 * Shared test fixtures and factory helpers.
 */

import type { Business } from '@getitdone/shared/types.js';
import { Store } from '../store.js';
import { Engine } from '../engine.js';
import { FakeClock, FakeScheduler } from '../clock.js';

/** A Monday ISO date at HH:MM UTC */
export function mon(hh: number, mm = 0): string {
  // 2024-01-01 is a Monday
  return new Date(
    Date.UTC(2024, 0, 1, hh, mm, 0, 0),
  ).toISOString();
}

/** Convenient shorthand: Mon 09:00 + N hours */
export function monPlus(hours: number, minutes = 0): string {
  return mon(9 + hours, minutes);
}

/** Standard test business */
export function makeTestBusiness(overrides: Partial<Business> = {}): Business {
  return {
    id: 'biz1',
    name: 'Test Barber',
    category: 'barber',
    description: 'Test shop',
    address: '1 Main St',
    lat: 0,
    lng: 0,
    phone: '+10000000000',
    priceLevel: 1,
    rating: 4.5,
    services: [
      { id: 'svc1', name: 'Haircut', durationMin: 30, priceCents: 2500 },
      { id: 'svc2', name: 'Beard Trim', durationMin: 30, priceCents: 1500 },
    ],
    hours: {
      mon: { open: '09:00', close: '17:00' },
      tue: { open: '09:00', close: '17:00' },
      wed: { open: '09:00', close: '17:00' },
      thu: { open: '09:00', close: '17:00' },
      fri: { open: '09:00', close: '17:00' },
    },
    resources: [
      { id: 'res1', name: 'Chair 1' },
      { id: 'res2', name: 'Chair 2' },
    ],
    ...overrides,
  };
}

/** Create a fully wired engine with fakes */
export function makeEngine(callTimeoutSeconds = 30): {
  engine: Engine;
  store: Store;
  clock: FakeClock;
  scheduler: FakeScheduler;
} {
  const store = new Store();
  // Start time: 2024-01-01T08:00:00Z (before the 09:00 business open, slots start at 09:00)
  const clock = new FakeClock(new Date('2024-01-01T08:00:00.000Z').getTime());
  const scheduler = new FakeScheduler(clock);
  const engine = new Engine(store, clock, scheduler, callTimeoutSeconds);
  const biz = makeTestBusiness();
  engine.addBusiness(biz);
  return { engine, store, clock, scheduler };
}

/** Standard slot: Mon 10:00–10:30 */
export const SLOT = {
  start: mon(10, 0),
  end: mon(10, 30),
} as const;

/** Back-to-back slot: Mon 10:30–11:00 */
export const SLOT_NEXT = {
  start: mon(10, 30),
  end: mon(11, 0),
} as const;

/** Overlapping slot: Mon 10:15–10:45 */
export const SLOT_OVERLAP = {
  start: mon(10, 15),
  end: mon(10, 45),
} as const;
