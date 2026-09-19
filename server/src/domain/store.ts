/**
 * server/src/domain/store.ts
 *
 * In-memory store for all domain entities.
 * A thin key-value map; all invariant enforcement lives in engine.ts.
 */

import type {
  Business,
  Booking,
  Hold,
  WaitlistEntry,
  CallAttempt,
} from '@getitdone/shared/types.js';

export class Store {
  readonly businesses = new Map<string, Business>();
  readonly bookings    = new Map<string, Booking>();
  readonly holds       = new Map<string, Hold>();
  readonly waitlist    = new Map<string, WaitlistEntry>();
  readonly attempts    = new Map<string, CallAttempt>();

  // ── Convenience iterators ────────────────────────────────────────────────────

  /** Confirmed bookings for a given resource. */
  confirmedBookingsForResource(resourceId: string): Booking[] {
    return [...this.bookings.values()].filter(
      b => b.resourceId === resourceId && b.status === 'confirmed',
    );
  }

  /** Active (unexpired) holds for a given resource at a given moment (ms). */
  activeHoldsForResource(resourceId: string, nowMs: number): Hold[] {
    return [...this.holds.values()].filter(
      h => h.resourceId === resourceId && new Date(h.expiresAt).getTime() > nowMs,
    );
  }

  /** Confirmed bookings for a given client. */
  confirmedBookingsForClient(clientId: string): Booking[] {
    return [...this.bookings.values()].filter(
      b => b.clientId === clientId && b.status === 'confirmed',
    );
  }

  /** Active holds for a given client. */
  activeHoldsForClient(clientId: string, nowMs: number): Hold[] {
    return [...this.holds.values()].filter(
      h => h.clientId === clientId && new Date(h.expiresAt).getTime() > nowMs,
    );
  }

  /** Waiting waitlist entries for a business+service. */
  waitingEntriesFor(businessId: string, serviceId: string): WaitlistEntry[] {
    return [...this.waitlist.values()].filter(
      e => e.businessId === businessId && e.serviceId === serviceId && e.status === 'waiting',
    );
  }

  /** All waiting entries for a business (any service). */
  waitingEntriesForBusiness(businessId: string): WaitlistEntry[] {
    return [...this.waitlist.values()].filter(
      e => e.businessId === businessId && e.status === 'waiting',
    );
  }
}
