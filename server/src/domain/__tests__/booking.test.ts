/**
 * Booking invariant tests: I1, I2, I3, I4, I7.
 * Also: touching slots OK, overlapping rejected, concurrency.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DomainError } from '../errors.js';
import { makeEngine, SLOT, SLOT_NEXT, SLOT_OVERLAP, mon } from './helpers.js';

// ─── Shared setup ──────────────────────────────────────────────────────────────

let e: ReturnType<typeof makeEngine>;

beforeEach(() => {
  e = makeEngine();
});

// ─── I1: resource no two overlapping confirmed bookings ────────────────────────

describe('I1 — resource double-booking prevention', () => {
  it('allows a booking on a free slot', () => {
    const bk = e.engine.book({
      businessId: 'biz1', resourceId: 'res1', serviceId: 'svc1',
      clientId: 'c1', ...SLOT,
    });
    expect(bk.status).toBe('confirmed');
  });

  it('rejects a second booking on the same resource at overlapping time', () => {
    e.engine.book({
      businessId: 'biz1', resourceId: 'res1', serviceId: 'svc1',
      clientId: 'c1', ...SLOT,
    });
    expect(() =>
      e.engine.book({
        businessId: 'biz1', resourceId: 'res1', serviceId: 'svc2',
        clientId: 'c2', ...SLOT_OVERLAP,
      }),
    ).toThrow(DomainError);
  });

  it('allows a back-to-back booking on the same resource (touching OK)', () => {
    e.engine.book({
      businessId: 'biz1', resourceId: 'res1', serviceId: 'svc1',
      clientId: 'c1', ...SLOT,
    });
    const bk2 = e.engine.book({
      businessId: 'biz1', resourceId: 'res1', serviceId: 'svc1',
      clientId: 'c2', ...SLOT_NEXT,
    });
    expect(bk2.status).toBe('confirmed');
  });

  it('allows simultaneous bookings on different resources', () => {
    const bk1 = e.engine.book({
      businessId: 'biz1', resourceId: 'res1', serviceId: 'svc1',
      clientId: 'c1', ...SLOT,
    });
    const bk2 = e.engine.book({
      businessId: 'biz1', resourceId: 'res2', serviceId: 'svc1',
      clientId: 'c2', ...SLOT,
    });
    expect(bk1.status).toBe('confirmed');
    expect(bk2.status).toBe('confirmed');
  });
});

// ─── I2: client no two overlapping bookings across ALL businesses ──────────────

describe('I2 — client cross-business conflict prevention', () => {
  it('rejects a booking for a client who already has an overlapping booking', () => {
    e.engine.book({
      businessId: 'biz1', resourceId: 'res1', serviceId: 'svc1',
      clientId: 'c1', ...SLOT,
    });
    // same time, different resource — still violates I2
    expect(() =>
      e.engine.book({
        businessId: 'biz1', resourceId: 'res2', serviceId: 'svc1',
        clientId: 'c1', ...SLOT_OVERLAP,
      }),
    ).toThrow(DomainError);
  });

  it('allows back-to-back bookings for the same client', () => {
    e.engine.book({
      businessId: 'biz1', resourceId: 'res1', serviceId: 'svc1',
      clientId: 'c1', ...SLOT,
    });
    const bk2 = e.engine.book({
      businessId: 'biz1', resourceId: 'res1', serviceId: 'svc1',
      clientId: 'c1', ...SLOT_NEXT,
    });
    expect(bk2.status).toBe('confirmed');
  });
});

// ─── I3: held slot is bookable only by the held client ────────────────────────

describe('I3 — hold exclusivity', () => {
  it('rejects a booking on a held slot by a different client', () => {
    // Create a hold for c1
    e.engine.joinWaitlist({
      businessId: 'biz1', serviceId: 'svc1',
      clientId: 'c1', windowStart: SLOT.start, windowEnd: SLOT.end,
    });
    // Manually create the hold
    const hold = e.engine['createHold']({
      businessId: 'biz1', resourceId: 'res1', ...SLOT,
      clientId: 'c1', waitlistEntryId: 'wl1',
    });
    expect(hold).toBeDefined();

    // c2 should not be able to book the same slot
    expect(() =>
      e.engine.book({
        businessId: 'biz1', resourceId: 'res1', serviceId: 'svc1',
        clientId: 'c2', ...SLOT,
      }),
    ).toThrow(DomainError);
  });
});

// ─── I4: reschedule atomic ────────────────────────────────────────────────────

describe('I4 — atomic reschedule', () => {
  it('reschedules to a free slot successfully', () => {
    const bk = e.engine.book({
      businessId: 'biz1', resourceId: 'res1', serviceId: 'svc1',
      clientId: 'c1', ...SLOT,
    });

    const updated = e.engine.reschedule({
      bookingId: bk.id,
      requestingClientId: 'c1',
      newStart: SLOT_NEXT.start,
      newEnd: SLOT_NEXT.end,
    });

    expect(updated.start).toBe(SLOT_NEXT.start);
    expect(updated.end).toBe(SLOT_NEXT.end);
    expect(updated.status).toBe('confirmed');
  });

  it('keeps the old booking if the new slot is taken (I4 failed reschedule)', () => {
    const bk = e.engine.book({
      businessId: 'biz1', resourceId: 'res1', serviceId: 'svc1',
      clientId: 'c1', ...SLOT,
    });
    // Block the target slot
    e.engine.book({
      businessId: 'biz1', resourceId: 'res1', serviceId: 'svc1',
      clientId: 'c2', ...SLOT_NEXT,
    });

    expect(() =>
      e.engine.reschedule({
        bookingId: bk.id,
        requestingClientId: 'c1',
        newStart: SLOT_NEXT.start,
        newEnd: SLOT_NEXT.end,
      }),
    ).toThrow(DomainError);

    // Old booking must be untouched
    const original = e.engine.store.bookings.get(bk.id);
    expect(original?.start).toBe(SLOT.start);
    expect(original?.end).toBe(SLOT.end);
    expect(original?.status).toBe('confirmed');
  });

  it('forbids reschedule by a different client', () => {
    const bk = e.engine.book({
      businessId: 'biz1', resourceId: 'res1', serviceId: 'svc1',
      clientId: 'c1', ...SLOT,
    });
    expect(() =>
      e.engine.reschedule({
        bookingId: bk.id,
        requestingClientId: 'wrong',
        newStart: SLOT_NEXT.start,
        newEnd: SLOT_NEXT.end,
      }),
    ).toThrow(DomainError);
  });
});

// ─── I7: no duplicate waitlist entries ────────────────────────────────────────

describe('I7 — waitlist deduplication', () => {
  it('prevents joining the same waitlist twice', () => {
    e.engine.joinWaitlist({
      businessId: 'biz1', serviceId: 'svc1',
      clientId: 'c1', windowStart: SLOT.start, windowEnd: SLOT.end,
    });
    expect(() =>
      e.engine.joinWaitlist({
        businessId: 'biz1', serviceId: 'svc1',
        clientId: 'c1', windowStart: SLOT.start, windowEnd: SLOT.end,
      }),
    ).toThrow(DomainError);
  });

  it('allows joining a different service waitlist at the same time', () => {
    e.engine.joinWaitlist({
      businessId: 'biz1', serviceId: 'svc1',
      clientId: 'c1', windowStart: SLOT.start, windowEnd: SLOT.end,
    });
    const entry2 = e.engine.joinWaitlist({
      businessId: 'biz1', serviceId: 'svc2',
      clientId: 'c1', windowStart: SLOT.start, windowEnd: SLOT.end,
    });
    expect(entry2.status).toBe('waiting');
  });

  it('allows re-joining after removal', () => {
    const entry = e.engine.joinWaitlist({
      businessId: 'biz1', serviceId: 'svc1',
      clientId: 'c1', windowStart: SLOT.start, windowEnd: SLOT.end,
    });
    e.engine.leaveWaitlist(entry.id, 'c1');
    // Should succeed — previous entry is removed
    const entry2 = e.engine.joinWaitlist({
      businessId: 'biz1', serviceId: 'svc1',
      clientId: 'c1', windowStart: SLOT.start, windowEnd: SLOT.end,
    });
    expect(entry2.status).toBe('waiting');
  });
});

// ─── Concurrency: 20 simultaneous book() calls ────────────────────────────────

describe('concurrency — 20 simultaneous book() calls', () => {
  it('gives exactly 1 success and 19 SLOT_TAKEN for one slot', async () => {
    const attempts = Array.from({ length: 20 }, (_, i) =>
      Promise.resolve().then(() => {
        try {
          e.engine.book({
            businessId: 'biz1', resourceId: 'res1', serviceId: 'svc1',
            clientId: `client_${i}`,
            ...SLOT,
          });
          return 'ok';
        } catch (err) {
          if (err instanceof DomainError && err.code === 'SLOT_TAKEN') return 'taken';
          throw err;
        }
      }),
    );

    const results = await Promise.all(attempts);
    const successes = results.filter(r => r === 'ok');
    const failures = results.filter(r => r === 'taken');

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(19);
  });
});

// ─── Cancellation releases the slot ──────────────────────────────────────────

describe('cancelBooking', () => {
  it('cancels a booking and frees the slot', () => {
    const bk = e.engine.book({
      businessId: 'biz1', resourceId: 'res1', serviceId: 'svc1',
      clientId: 'c1', ...SLOT,
    });
    e.engine.cancelBooking(bk.id, 'c1');

    // Slot should now be bookable by someone else
    const bk2 = e.engine.book({
      businessId: 'biz1', resourceId: 'res1', serviceId: 'svc1',
      clientId: 'c2', ...SLOT,
    });
    expect(bk2.status).toBe('confirmed');
  });

  it('forbids cancellation by wrong client', () => {
    const bk = e.engine.book({
      businessId: 'biz1', resourceId: 'res1', serviceId: 'svc1',
      clientId: 'c1', ...SLOT,
    });
    expect(() => e.engine.cancelBooking(bk.id, 'wrong')).toThrow(DomainError);
  });

  it('forbids double-cancellation', () => {
    const bk = e.engine.book({
      businessId: 'biz1', resourceId: 'res1', serviceId: 'svc1',
      clientId: 'c1', ...SLOT,
    });
    e.engine.cancelBooking(bk.id, 'c1');
    expect(() => e.engine.cancelBooking(bk.id, 'c1')).toThrow(DomainError);
  });
});

// ─── Events ──────────────────────────────────────────────────────────────────

describe('events', () => {
  it('emits booking.changed on book()', () => {
    const events: unknown[] = [];
    e.engine.on('booking.changed', (evt) => events.push(evt));
    e.engine.book({
      businessId: 'biz1', resourceId: 'res1', serviceId: 'svc1',
      clientId: 'c1', ...SLOT,
    });
    expect(events).toHaveLength(1);
  });

  it('emits booking.changed on cancelBooking()', () => {
    const events: unknown[] = [];
    const bk = e.engine.book({
      businessId: 'biz1', resourceId: 'res1', serviceId: 'svc1',
      clientId: 'c1', ...SLOT,
    });
    e.engine.on('booking.changed', (evt) => events.push(evt));
    e.engine.cancelBooking(bk.id, 'c1');
    expect(events.length).toBeGreaterThanOrEqual(1);
  });

  it('includes serverNow in events', () => {
    type EvtShape = { serverNow: number };
    const events: EvtShape[] = [];
    e.engine.on('booking.changed', (evt: EvtShape) => events.push(evt));
    e.engine.book({
      businessId: 'biz1', resourceId: 'res1', serviceId: 'svc1',
      clientId: 'c1', ...SLOT,
    });
    expect(typeof events[0]?.serverNow).toBe('number');
  });
});

// ─── Availability grid ────────────────────────────────────────────────────────

describe('availability grid', () => {
  it('shows slots as taken when booked', async () => {
    const { availableSlots } = await import('../availability.js');
    e.engine.book({
      businessId: 'biz1', resourceId: 'res1', serviceId: 'svc1',
      clientId: 'c1', ...SLOT,
    });
    const slots = availableSlots(
      e.engine.store.businesses.get('biz1')!,
      'res1',
      mon(9), mon(11),
      e.store,
      e.clock.now(),
    );
    expect(slots).not.toContain(SLOT.start);
    expect(slots).toContain(SLOT_NEXT.start);
  });

  it('shows held slot as unavailable, adjacent slot free', async () => {
    const { availableSlots } = await import('../availability.js');
    const { addMinutes } = await import('../intervals.js');
    const holdExpiry = addMinutes(new Date(e.clock.now()).toISOString(), 10);
    const hold = {
      id: 'h1',
      businessId: 'biz1', resourceId: 'res1',
      start: SLOT.start, end: SLOT.end,
      clientId: 'c1', waitlistEntryId: 'wl1',
      expiresAt: holdExpiry,
    };
    e.store.holds.set('h1', hold);

    const slots = availableSlots(
      e.engine.store.businesses.get('biz1')!,
      'res1',
      mon(9), mon(11),
      e.store,
      e.clock.now(),
    );
    expect(slots).not.toContain(SLOT.start);
    expect(slots).toContain(SLOT_NEXT.start);
  });

  it('returns the slot once the hold expires', async () => {
    const { availableSlots } = await import('../availability.js');
    const { addMinutes } = await import('../intervals.js');
    const holdExpiry = addMinutes(new Date(e.clock.now()).toISOString(), 5);
    const hold = {
      id: 'h1',
      businessId: 'biz1', resourceId: 'res1',
      start: SLOT.start, end: SLOT.end,
      clientId: 'c1', waitlistEntryId: 'wl1',
      expiresAt: holdExpiry,
    };
    e.store.holds.set('h1', hold);

    // Advance past the hold expiry
    e.clock.advance(6 * 60_000); // +6 min

    const slots = availableSlots(
      e.engine.store.businesses.get('biz1')!,
      'res1',
      mon(9), mon(11),
      e.store,
      e.clock.now(),
    );
    expect(slots).toContain(SLOT.start);
  });
});
