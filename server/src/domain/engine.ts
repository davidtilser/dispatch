/**
 * server/src/domain/engine.ts
 *
 * Domain engine — all booking/hold/waitlist operations.
 *
 * RULES:
 * I1  A resource never has two overlapping confirmed bookings or active holds.
 * I2  A client never has two overlapping confirmed bookings or holds across ALL businesses.
 * I3  A held slot is bookable only by the held client until it expires.
 * I4  Reschedule is atomic: claim new, release old — if claim fails the old is untouched.
 * I5  Cascade skips entries that now conflict (I2) and records skipReason 'skipped_conflict'.
 * I6  Accepting an expired or superseded call throws HOLD_EXPIRED.
 * I7  A client cannot join the same business+service+window waitlist twice.
 *
 * Every mutating operation is ONE synchronous function: check then write, no await in between.
 * No Express or HTTP imports.
 */

import { EventEmitter } from 'events';
import type {
  Business,
  Booking,
  Hold,
  WaitlistEntry,
  CallAttempt,
  BookingStatus,
} from '@getitdone/shared/types.js';
import { DomainError } from './errors.js';
import type { Clock, Scheduler } from './clock.js';
import { Store } from './store.js';
import { overlaps, addMinutes, durationMs } from './intervals.js';

// ─── ID generation ────────────────────────────────────────────────────────────

let _seq = 0;
function newId(prefix: string): string {
  return `${prefix}_${Date.now()}_${++_seq}`;
}

// ─── Event types ──────────────────────────────────────────────────────────────

export interface CallStartedEvent {
  type: 'call.started';
  attempt: CallAttempt;
  serverNow: number;
}
export interface CallUpdatedEvent {
  type: 'call.updated';
  attempt: CallAttempt;
  serverNow: number;
}
export interface BookingChangedEvent {
  type: 'booking.changed';
  booking: Booking;
  serverNow: number;
}
export interface SlotOpenedEvent {
  type: 'slot.opened';
  businessId: string;
  resourceId: string;
  start: string;
  end: string;
  serverNow: number;
}
export interface WaitlistUpdatedEvent {
  type: 'waitlist.updated';
  entry: WaitlistEntry;
  serverNow: number;
}

export type DomainEvent =
  | CallStartedEvent
  | CallUpdatedEvent
  | BookingChangedEvent
  | SlotOpenedEvent
  | WaitlistUpdatedEvent;

// ─── Engine ───────────────────────────────────────────────────────────────────

export class Engine extends EventEmitter {
  readonly store: Store;
  private readonly timerHandles = new Map<string, unknown>(); // attemptId → timer handle

  constructor(
    store: Store,
    private readonly clock: Clock,
    private readonly scheduler: Scheduler,
    private readonly callTimeoutSeconds: number = 30,
  ) {
    super();
    this.store = store;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private _emit<T extends DomainEvent>(evt: T): void {
    super.emit(evt.type, evt);
    super.emit('*', evt); // wildcard listener for tests
  }

  private nowIso(): string {
    return new Date(this.clock.now()).toISOString();
  }

  /**
   * Check I1: resource has no overlapping confirmed booking or active hold.
   */
  private checkResourceFree(
    resourceId: string,
    start: string,
    end: string,
    excludeBookingId?: string,
    excludeHoldId?: string,
  ): void {
    const nowMs = this.clock.now();
    for (const b of this.store.confirmedBookingsForResource(resourceId)) {
      if (b.id === excludeBookingId) continue;
      if (overlaps(start, end, b.start, b.end)) {
        throw new DomainError('SLOT_TAKEN', `Resource ${resourceId} is booked at that time.`);
      }
    }
    for (const h of this.store.activeHoldsForResource(resourceId, nowMs)) {
      if (h.id === excludeHoldId) continue;
      if (overlaps(start, end, h.start, h.end)) {
        throw new DomainError('SLOT_TAKEN', `Resource ${resourceId} has an active hold at that time.`);
      }
    }
  }

  /**
   * Check I2: client has no overlapping confirmed booking or active hold across all businesses.
   */
  private checkClientFree(
    clientId: string,
    start: string,
    end: string,
    excludeBookingId?: string,
    excludeHoldId?: string,
  ): void {
    const nowMs = this.clock.now();
    for (const b of this.store.confirmedBookingsForClient(clientId)) {
      if (b.id === excludeBookingId) continue;
      if (overlaps(start, end, b.start, b.end)) {
        throw new DomainError(
          'CLIENT_CONFLICT',
          `Client ${clientId} already has a booking overlapping that time.`,
        );
      }
    }
    for (const h of this.store.activeHoldsForClient(clientId, nowMs)) {
      if (h.id === excludeHoldId) continue;
      if (overlaps(start, end, h.start, h.end)) {
        throw new DomainError(
          'CLIENT_CONFLICT',
          `Client ${clientId} already has a hold overlapping that time.`,
        );
      }
    }
  }

  // ── Business management ────────────────────────────────────────────────────

  addBusiness(business: Business): void {
    this.store.businesses.set(business.id, business);
  }

  getBusiness(businessId: string): Business {
    const b = this.store.businesses.get(businessId);
    if (!b) throw new DomainError('NOT_FOUND', `Business ${businessId} not found.`);
    return b;
  }

  // ── Booking operations ─────────────────────────────────────────────────────

  /**
   * Book a slot directly (no hold required for non-waitlist bookings).
   * Enforces I1 + I2.
   */
  book(params: {
    businessId: string;
    resourceId: string;
    serviceId: string;
    clientId: string;
    start: string;
    end: string;
  }): Booking {
    const { businessId, resourceId, serviceId, clientId, start, end } = params;

    // I1: resource free
    this.checkResourceFree(resourceId, start, end);
    // I2: client free
    this.checkClientFree(clientId, start, end);

    const booking: Booking = {
      id: newId('bk'),
      businessId,
      resourceId,
      serviceId,
      clientId,
      start,
      end,
      status: 'confirmed',
    };
    this.store.bookings.set(booking.id, booking);
    this._emit({ type: 'booking.changed', booking, serverNow: this.clock.now() });
    return booking;
  }

  /**
   * Cancel a booking. Frees the interval and triggers the waitlist cascade.
   */
  cancelBooking(bookingId: string, requestingClientId: string): Booking {
    const booking = this.store.bookings.get(bookingId);
    if (!booking) throw new DomainError('NOT_FOUND', `Booking ${bookingId} not found.`);
    if (booking.clientId !== requestingClientId) {
      throw new DomainError('FORBIDDEN', `You do not own booking ${bookingId}.`);
    }
    if (booking.status === 'cancelled') {
      throw new DomainError('VALIDATION', `Booking ${bookingId} is already cancelled.`);
    }

    booking.status = 'cancelled' as BookingStatus;
    this._emit({ type: 'booking.changed', booking, serverNow: this.clock.now() });

    // Free the slot and cascade the waitlist
    this._cascadeWaitlist(booking.businessId, booking.resourceId, booking.start, booking.end);

    return booking;
  }

  /**
   * Reschedule: atomically release old slot + claim new slot (I4).
   * If the new slot is unavailable, the old booking is untouched.
   */
  reschedule(params: {
    bookingId: string;
    requestingClientId: string;
    newStart: string;
    newEnd: string;
  }): Booking {
    const { bookingId, requestingClientId, newStart, newEnd } = params;

    const booking = this.store.bookings.get(bookingId);
    if (!booking) throw new DomainError('NOT_FOUND', `Booking ${bookingId} not found.`);
    if (booking.clientId !== requestingClientId) {
      throw new DomainError('FORBIDDEN', `You do not own booking ${bookingId}.`);
    }
    if (booking.status === 'cancelled') {
      throw new DomainError('VALIDATION', `Cannot reschedule a cancelled booking.`);
    }

    // I4: check BEFORE any write — pass the existing booking as excluded so it doesn't block itself
    this.checkResourceFree(booking.resourceId, newStart, newEnd, bookingId);
    this.checkClientFree(booking.clientId, newStart, newEnd, bookingId);

    // All checks passed — perform the atomic swap
    const oldStart = booking.start;
    const oldEnd = booking.end;

    booking.start = newStart;
    booking.end = newEnd;
    this._emit({ type: 'booking.changed', booking, serverNow: this.clock.now() });

    // Free the old interval and cascade waitlist
    this._cascadeWaitlist(booking.businessId, booking.resourceId, oldStart, oldEnd);

    return booking;
  }

  // ── Hold operations ────────────────────────────────────────────────────────

  /** Create a hold for a waitlist-driven slot reservation. */
  createHold(params: {
    businessId: string;
    resourceId: string;
    start: string;
    end: string;
    clientId: string;
    waitlistEntryId: string;
  }): Hold {
    const { businessId, resourceId, start, end, clientId, waitlistEntryId } = params;
    const expiresAt = addMinutes(this.nowIso(), this.callTimeoutSeconds / 60);

    this.checkResourceFree(resourceId, start, end);
    this.checkClientFree(clientId, start, end);

    const hold: Hold = {
      id: newId('hold'),
      businessId,
      resourceId,
      start,
      end,
      clientId,
      waitlistEntryId,
      expiresAt,
    };
    this.store.holds.set(hold.id, hold);
    return hold;
  }

  /** Release a hold (makes the slot available again). */
  private _releaseHold(holdId: string): void {
    this.store.holds.delete(holdId);
  }

  // ── Waitlist operations ────────────────────────────────────────────────────

  /**
   * Join the waitlist for a business+service within a time window.
   * Enforces I7: no duplicate active entries for the same client+business+service+window.
   */
  joinWaitlist(params: {
    businessId: string;
    serviceId: string;
    clientId: string;
    windowStart: string;
    windowEnd: string;
  }): WaitlistEntry {
    const { businessId, serviceId, clientId, windowStart, windowEnd } = params;

    // I7: duplicate check
    const existing = [...this.store.waitlist.values()].find(
      e =>
        e.businessId === businessId &&
        e.serviceId === serviceId &&
        e.clientId === clientId &&
        e.windowStart === windowStart &&
        e.windowEnd === windowEnd &&
        (e.status === 'waiting' || e.status === 'called'),
    );
    if (existing) {
      throw new DomainError(
        'VALIDATION',
        `Client ${clientId} is already on the waitlist for this business+service+window.`,
      );
    }

    const entry: WaitlistEntry = {
      id: newId('wl'),
      businessId,
      serviceId,
      clientId,
      windowStart,
      windowEnd,
      createdAt: this.nowIso(),
      status: 'waiting',
    };
    this.store.waitlist.set(entry.id, entry);
    this._emit({ type: 'waitlist.updated', entry, serverNow: this.clock.now() });
    return entry;
  }

  /** Remove a client from the waitlist. */
  leaveWaitlist(entryId: string, requestingClientId: string): WaitlistEntry {
    const entry = this.store.waitlist.get(entryId);
    if (!entry) throw new DomainError('NOT_FOUND', `Waitlist entry ${entryId} not found.`);
    if (entry.clientId !== requestingClientId) {
      throw new DomainError('FORBIDDEN', `You do not own waitlist entry ${entryId}.`);
    }
    if (entry.status === 'removed') {
      throw new DomainError('VALIDATION', `Entry ${entryId} is already removed.`);
    }
    entry.status = 'removed';
    this._emit({ type: 'waitlist.updated', entry, serverNow: this.clock.now() });
    return entry;
  }

  // ── Call operations ────────────────────────────────────────────────────────

  /** Mark a call as answered (client picked up). */
  answerCall(attemptId: string): CallAttempt {
    const attempt = this.store.attempts.get(attemptId);
    if (!attempt) throw new DomainError('NOT_FOUND', `Call attempt ${attemptId} not found.`);
    if (attempt.status !== 'ringing') {
      throw new DomainError('VALIDATION', `Attempt ${attemptId} is not ringing (is ${attempt.status}).`);
    }
    const nowMs = this.clock.now();
    if (nowMs >= new Date(attempt.expiresAt).getTime()) {
      throw new DomainError('HOLD_EXPIRED', `Call attempt ${attemptId} has already expired.`);
    }
    attempt.status = 'answered';
    this._emit({ type: 'call.updated', attempt, serverNow: nowMs });
    return attempt;
  }

  /**
   * Accept a call: convert the Hold into a confirmed Booking, mark the entry 'booked'.
   * Enforces I6: throw HOLD_EXPIRED if attempt is expired or superseded.
   */
  acceptCall(attemptId: string): { attempt: CallAttempt; booking: Booking } {
    const attempt = this.store.attempts.get(attemptId);
    if (!attempt) throw new DomainError('NOT_FOUND', `Call attempt ${attemptId} not found.`);

    // I6
    if (attempt.status === 'superseded') {
      throw new DomainError('HOLD_EXPIRED', `Call attempt ${attemptId} was superseded.`);
    }
    if (attempt.status !== 'ringing' && attempt.status !== 'answered') {
      throw new DomainError('HOLD_EXPIRED', `Call attempt ${attemptId} is no longer active (${attempt.status}).`);
    }

    const nowMs = this.clock.now();
    if (nowMs >= new Date(attempt.expiresAt).getTime()) {
      throw new DomainError('HOLD_EXPIRED', `Call attempt ${attemptId} has expired.`);
    }

    // Find the hold — it must still be active
    const hold = [...this.store.holds.values()].find(
      h => h.waitlistEntryId === attempt.waitlistEntryId && h.clientId === attempt.clientId,
    );
    if (!hold || nowMs >= new Date(hold.expiresAt).getTime()) {
      throw new DomainError('HOLD_EXPIRED', `Hold for attempt ${attemptId} has expired.`);
    }

    const entry = this.store.waitlist.get(attempt.waitlistEntryId);
    if (!entry) throw new DomainError('NOT_FOUND', `Waitlist entry for attempt ${attemptId} not found.`);

    // Cancel the timer for this attempt
    const timerHandle = this.timerHandles.get(attemptId);
    if (timerHandle !== undefined) {
      this.scheduler.clearTimeout(timerHandle);
      this.timerHandles.delete(attemptId);
    }

    // Atomic: release hold → create booking
    this._releaseHold(hold.id);

    const booking: Booking = {
      id: newId('bk'),
      businessId: attempt.businessId,
      resourceId: attempt.resourceId,
      serviceId: entry.serviceId,
      clientId: attempt.clientId,
      start: attempt.offeredStart,
      end: attempt.offeredEnd,
      status: 'confirmed',
    };
    this.store.bookings.set(booking.id, booking);

    // Update attempt and entry
    attempt.status = 'accepted';
    entry.status = 'booked';

    this._emit({ type: 'call.updated', attempt, serverNow: nowMs });
    this._emit({ type: 'booking.changed', booking, serverNow: nowMs });
    this._emit({ type: 'waitlist.updated', entry, serverNow: nowMs });

    return { attempt, booking };
  }

  /**
   * Decline a call: release the hold and advance to the next waitlist entry.
   */
  declineCall(attemptId: string): CallAttempt {
    const attempt = this.store.attempts.get(attemptId);
    if (!attempt) throw new DomainError('NOT_FOUND', `Call attempt ${attemptId} not found.`);
    if (attempt.status !== 'ringing' && attempt.status !== 'answered') {
      throw new DomainError(
        'VALIDATION',
        `Cannot decline attempt ${attemptId} with status ${attempt.status}.`,
      );
    }

    const nowMs = this.clock.now();
    attempt.status = 'declined';

    // Cancel timer
    const handle = this.timerHandles.get(attemptId);
    if (handle !== undefined) {
      this.scheduler.clearTimeout(handle);
      this.timerHandles.delete(attemptId);
    }

    // Release hold and advance cascade
    this._releaseHoldForAttempt(attempt);
    const entry = this.store.waitlist.get(attempt.waitlistEntryId);
    if (entry) entry.status = 'removed'; // declined = done with this entry

    this._emit({ type: 'call.updated', attempt, serverNow: nowMs });

    // Advance to next eligible waitlist entry
    this._cascadeWaitlist(
      attempt.businessId,
      attempt.resourceId,
      attempt.offeredStart,
      attempt.offeredEnd,
    );

    return attempt;
  }

  // ── Cascade (private) ──────────────────────────────────────────────────────

  /**
   * Cascade the waitlist for a freed interval.
   * Finds the next eligible entry, creates a Hold + CallAttempt,
   * and schedules the no-answer timeout.
   * If no entry is eligible the slot returns to the public pool.
   */
  private _cascadeWaitlist(
    businessId: string,
    resourceId: string,
    start: string,
    end: string,
  ): void {
    const nowMs = this.clock.now();
    const nowIso = new Date(nowMs).toISOString();
    const freedDurationMs = durationMs(start, end);

    // Find the business + service for duration matching
    const business = this.store.businesses.get(businessId);

    // Collect eligible waiting entries (same business, service duration fits, window covers slot, start in future)
    const eligible = [...this.store.waitlist.values()].filter(entry => {
      if (entry.businessId !== businessId) return false;
      if (entry.status !== 'waiting') return false;
      if (start < nowIso) return false; // slot is in the past

      // Service duration must fit in the freed interval
      const service = business?.services.find(s => s.id === entry.serviceId);
      if (!service) return false;
      const serviceDurationMs = service.durationMin * 60_000;
      if (serviceDurationMs > freedDurationMs) return false;

      // Offered slot must be inside the entry's preferred window
      if (start < entry.windowStart || end > entry.windowEnd) return false;

      return true;
    });

    // Sort by createdAt (FIFO) — I5 cascade order
    eligible.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    for (const entry of eligible) {
      // I5: skip if client now has a conflict
      const clientConflict =
        this.store.confirmedBookingsForClient(entry.clientId).some(b =>
          overlaps(start, end, b.start, b.end),
        ) ||
        this.store.activeHoldsForClient(entry.clientId, nowMs).some(h =>
          overlaps(start, end, h.start, h.end),
        );

      if (clientConflict) {
        // Mark attempt as skipped (I5)
        const skippedAttempt: CallAttempt = {
          id: newId('att'),
          waitlistEntryId: entry.id,
          clientId: entry.clientId,
          businessId,
          offeredStart: start,
          offeredEnd: end,
          resourceId,
          status: 'superseded',
          startedAt: nowIso,
          expiresAt: nowIso,
          skipReason: 'skipped_conflict',
        };
        this.store.attempts.set(skippedAttempt.id, skippedAttempt);
        this._emit({ type: 'call.updated', attempt: skippedAttempt, serverNow: nowMs });
        continue; // next entry
      }

      // Resource must still be free (it was just freed, but double-check)
      const resourceTaken =
        this.store.confirmedBookingsForResource(resourceId).some(b =>
          overlaps(start, end, b.start, b.end),
        ) ||
        this.store.activeHoldsForResource(resourceId, nowMs).some(h =>
          overlaps(start, end, h.start, h.end),
        );
      if (resourceTaken) break; // nobody can have it

      // Create hold
      const expiresAt = addMinutes(nowIso, this.callTimeoutSeconds / 60);
      const hold: Hold = {
        id: newId('hold'),
        businessId,
        resourceId,
        start,
        end,
        clientId: entry.clientId,
        waitlistEntryId: entry.id,
        expiresAt,
      };
      this.store.holds.set(hold.id, hold);

      // Create call attempt
      const attempt: CallAttempt = {
        id: newId('att'),
        waitlistEntryId: entry.id,
        clientId: entry.clientId,
        businessId,
        offeredStart: start,
        offeredEnd: end,
        resourceId,
        status: 'ringing',
        startedAt: nowIso,
        expiresAt,
      };
      this.store.attempts.set(attempt.id, attempt);
      entry.status = 'called';

      this._emit({ type: 'call.started', attempt, serverNow: nowMs });
      this._emit({ type: 'waitlist.updated', entry, serverNow: nowMs });

      // Schedule no-answer timeout
      const timeoutMs = this.callTimeoutSeconds * 1_000;
      const handle = this.scheduler.setTimeout(() => {
        this._handleCallTimeout(attempt.id, hold.id, businessId, resourceId, start, end);
      }, timeoutMs);
      this.timerHandles.set(attempt.id, handle);

      return; // found one — stop
    }

    // No eligible entry — slot returns to public pool
    this._emit({
      type: 'slot.opened',
      businessId,
      resourceId,
      start,
      end,
      serverNow: nowMs,
    });
  }

  /** Called when a call timer fires (no_answer). */
  private _handleCallTimeout(
    attemptId: string,
    holdId: string,
    businessId: string,
    resourceId: string,
    start: string,
    end: string,
  ): void {
    const attempt = this.store.attempts.get(attemptId);
    if (!attempt) return;
    if (attempt.status === 'accepted' || attempt.status === 'declined' || attempt.status === 'superseded') return;

    const nowMs = this.clock.now();
    attempt.status = 'no_answer';
    this.timerHandles.delete(attemptId);

    // Mark the entry as removed
    const entry = this.store.waitlist.get(attempt.waitlistEntryId);
    if (entry && entry.status === 'called') {
      entry.status = 'removed';
      this._emit({ type: 'waitlist.updated', entry, serverNow: nowMs });
    }

    // Release hold
    this.store.holds.delete(holdId);
    this._emit({ type: 'call.updated', attempt, serverNow: nowMs });

    // Advance cascade
    this._cascadeWaitlist(businessId, resourceId, start, end);
  }

  /** Find and release the hold associated with a given attempt. */
  private _releaseHoldForAttempt(attempt: CallAttempt): void {
    const hold = [...this.store.holds.values()].find(
      h => h.waitlistEntryId === attempt.waitlistEntryId && h.clientId === attempt.clientId,
    );
    if (hold) this.store.holds.delete(hold.id);
  }
}
