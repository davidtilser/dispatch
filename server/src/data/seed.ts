/**
 * server/src/data/seed.ts
 *
 * Populates a fresh domain Engine with demo data: the mock businesses,
 * four fake clients, a handful of pre-existing bookings, and DEMO_SLOT —
 * the specific slot the live waitlist demo revolves around.
 *
 * DEMO_SLOT: "Priya's Express Cuts" (see mockBusinesses.ts) is open only
 * 15:00-15:30 UTC, every day — its one possible appointment slot. Seeding
 * books BOTH of its resources there, for the next occurrence of 15:00 UTC
 * strictly after server start. That makes the business genuinely fully
 * booked (there is no other slot that day, or any day, for that service),
 * which is what the waitlist cascade demo needs: client-casey's booking
 * is the one a live demo cancels to free the slot and trigger the
 * cascade; client-alex's booking on the other chair is left untouched.
 */

import type { Business } from '@getitdone/shared/types.js';
import { Engine } from '../domain/engine.js';
import { Store } from '../domain/store.js';
import { realClock, realScheduler } from '../domain/clock.js';
import { config } from '../config.js';
import {
  MOCK_BUSINESSES,
  DEMO_SLOT_BUSINESS_ID,
  DEMO_SLOT_SERVICE_ID,
  DEMO_SLOT_RESOURCE_IDS,
} from './mockBusinesses.js';

// ─── Fake clients ──────────────────────────────────────────────────────────────

export const DEMO_CLIENT_IDS = {
  demo: 'client-demo',
  casey: 'client-casey',
  jordan: 'client-jordan',
  alex: 'client-alex',
} as const;

/** Display names for the demo. Only casey/jordan's names are spec'd; demo/alex are ours. */
export const DEMO_CLIENT_NAMES: Record<string, string> = {
  [DEMO_CLIENT_IDS.demo]: 'You',
  [DEMO_CLIENT_IDS.casey]: 'Casey R.',
  [DEMO_CLIENT_IDS.jordan]: 'Jordan P.',
  [DEMO_CLIENT_IDS.alex]: 'Alex T.',
};

// ─── DEMO_SLOT ─────────────────────────────────────────────────────────────────

export interface DemoSlot {
  businessId: string;
  serviceId: string;
  resourceIds: readonly string[];
  /** ISO 8601 */
  start: string;
  /** ISO 8601 */
  end: string;
  /** Waitlist join window — equals start/end here since hours only permit this one slot. */
  windowStart: string;
  windowEnd: string;
}

/** Next strictly-future occurrence of `hourUtc:minuteUtc`, as a Date. */
function nextOccurrenceOfUtcTime(hourUtc: number, minuteUtc: number, fromMs: number): Date {
  const from = new Date(fromMs);
  const candidate = new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), hourUtc, minuteUtc, 0, 0),
  );
  if (candidate.getTime() <= fromMs) {
    candidate.setUTCDate(candidate.getUTCDate() + 1);
  }
  return candidate;
}

/** Computed fresh each call so the demo slot is always genuinely in the future. */
export function computeDemoSlot(nowMs: number = Date.now()): DemoSlot {
  const start = nextOccurrenceOfUtcTime(15, 0, nowMs);
  const end = new Date(start.getTime() + 30 * 60_000);
  return {
    businessId: DEMO_SLOT_BUSINESS_ID,
    serviceId: DEMO_SLOT_SERVICE_ID,
    resourceIds: DEMO_SLOT_RESOURCE_IDS,
    start: start.toISOString(),
    end: end.toISOString(),
    windowStart: start.toISOString(),
    windowEnd: end.toISOString(),
  };
}

// ─── Seeding ────────────────────────────────────────────────────────────────────

export interface SeedResult {
  demoSlot: DemoSlot;
}

/**
 * Adds all mock businesses to the engine's store, books the DEMO_SLOT
 * business's two resources (casey + alex — casey's is the one a live demo
 * later cancels), and pre-books two more businesses today/tomorrow so at
 * least 3 businesses have existing bookings. client-demo gets none.
 */
export function seedDemoData(engine: Engine, nowMs: number = Date.now()): SeedResult {
  for (const business of MOCK_BUSINESSES) {
    engine.addBusiness(business);
  }

  const demoSlot = computeDemoSlot(nowMs);

  // Both resources of the DEMO_SLOT business booked at the same instant —
  // "every resource able to perform that service is booked at that time".
  engine.book({
    businessId: demoSlot.businessId,
    resourceId: demoSlot.resourceIds[0]!,
    serviceId: demoSlot.serviceId,
    clientId: DEMO_CLIENT_IDS.casey,
    start: demoSlot.start,
    end: demoSlot.end,
  });
  engine.book({
    businessId: demoSlot.businessId,
    resourceId: demoSlot.resourceIds[1]!,
    serviceId: demoSlot.serviceId,
    clientId: DEMO_CLIENT_IDS.alex,
    start: demoSlot.start,
    end: demoSlot.end,
  });

  // Two more businesses (open every day, so no weekday edge cases) with
  // pre-existing bookings, one "today" and one 24h later.
  const plumber = findBusiness('biz_plumber_2');
  const spa = findBusiness('biz_spa_1');

  const booking2Start = nextOccurrenceOfUtcTime(11, 0, nowMs);
  const booking2End = new Date(booking2Start.getTime() + 45 * 60_000); // "Clogged Drain"
  engine.book({
    businessId: plumber.id,
    resourceId: 'res_p2_tech1',
    serviceId: 'svc_clogged_drain',
    clientId: DEMO_CLIENT_IDS.jordan,
    start: booking2Start.toISOString(),
    end: booking2End.toISOString(),
  });

  const booking3Start = new Date(booking2Start.getTime() + 24 * 3600_000); // one day after booking2
  const booking3End = new Date(booking3Start.getTime() + 45 * 60_000); // "Facial"
  engine.book({
    businessId: spa.id,
    resourceId: 'res_sp1_room1',
    serviceId: 'svc_facial',
    clientId: DEMO_CLIENT_IDS.alex,
    start: booking3Start.toISOString(),
    end: booking3End.toISOString(),
  });

  return { demoSlot };
}

function findBusiness(id: string): Business {
  const business = MOCK_BUSINESSES.find(b => b.id === id);
  if (!business) throw new Error(`seed: unknown mock business id ${id}`);
  return business;
}

/** Convenience factory: a fresh Engine, seeded, using the real clock/scheduler. */
export function createSeededEngine(nowMs: number = Date.now()): { engine: Engine; store: Store; seed: SeedResult } {
  const store = new Store();
  const engine = new Engine(store, realClock, realScheduler, config.demo.callTimeoutSeconds);
  const seed = seedDemoData(engine, nowMs);
  return { engine, store, seed };
}
