/**
 * Waitlist cascade tests.
 * Tests: order by createdAt; skip on conflict; decline goes to next;
 * timeout goes to next; nobody accepts returns slot to public pool;
 * accept after expiry gives HOLD_EXPIRED.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DomainError } from '../errors.js';
import { makeEngine, SLOT, mon } from './helpers.js';
import type { CallAttempt } from '@getitdone/shared/types.js';

let e: ReturnType<typeof makeEngine>;

beforeEach(() => {
  e = makeEngine(30); // 30s timeout
});

// ─── Helper: book and cancel the slot to trigger the cascade ─────────────────

function triggerCascade() {
  const bk = e.engine.book({
    businessId: 'biz1', resourceId: 'res1', serviceId: 'svc1',
    clientId: 'triggerer',
    start: SLOT.start, end: SLOT.end,
  });
  e.engine.cancelBooking(bk.id, 'triggerer');
}

// ─── Helper: collect call.started events ─────────────────────────────────────

function collectAttempts(): CallAttempt[] {
  const attempts: CallAttempt[] = [];
  e.engine.on('call.started', (evt: { attempt: CallAttempt }) => {
    attempts.push(evt.attempt);
  });
  return attempts;
}

// ─── Order by createdAt (FIFO) ────────────────────────────────────────────────

describe('cascade order by createdAt', () => {
  it('calls the earliest-joining waitlist client first', () => {
    // c1 joins first, c2 second
    e.engine.joinWaitlist({
      businessId: 'biz1', serviceId: 'svc1', clientId: 'c1',
      windowStart: SLOT.start, windowEnd: SLOT.end,
    });
    e.clock.advance(1000); // ensure c2 createdAt > c1
    e.engine.joinWaitlist({
      businessId: 'biz1', serviceId: 'svc1', clientId: 'c2',
      windowStart: SLOT.start, windowEnd: SLOT.end,
    });

    const attempts = collectAttempts();
    triggerCascade();

    expect(attempts).toHaveLength(1);
    expect(attempts[0]!.clientId).toBe('c1');
  });
});

// ─── Skip on I2 conflict ──────────────────────────────────────────────────────

describe('I5 — skip on conflict', () => {
  it('skips an entry when the client now has a conflicting booking', () => {
    // c1 has an overlapping booking
    e.engine.book({
      businessId: 'biz1', resourceId: 'res2', serviceId: 'svc1',
      clientId: 'c1', ...SLOT,
    });
    // c1 also on the waitlist (before booking happened — simulate)
    e.engine.joinWaitlist({
      businessId: 'biz1', serviceId: 'svc1', clientId: 'c1',
      windowStart: SLOT.start, windowEnd: SLOT.end,
    });
    // c2 is next
    e.engine.joinWaitlist({
      businessId: 'biz1', serviceId: 'svc1', clientId: 'c2',
      windowStart: SLOT.start, windowEnd: SLOT.end,
    });

    const started: CallAttempt[] = [];
    e.engine.on('call.started', (evt: { attempt: CallAttempt }) => started.push(evt.attempt));

    triggerCascade();

    // c1 should be skipped, c2 should be called
    expect(started).toHaveLength(1);
    expect(started[0]!.clientId).toBe('c2');

    // Check that a superseded attempt with skipReason was recorded for c1
    const allAttempts = [...e.store.attempts.values()];
    const skipped = allAttempts.find(a => a.clientId === 'c1' && a.skipReason === 'skipped_conflict');
    expect(skipped).toBeDefined();
  });
});

// ─── Decline goes to the next entry ──────────────────────────────────────────

describe('decline advances to next', () => {
  it('calls c2 after c1 declines', () => {
    e.engine.joinWaitlist({
      businessId: 'biz1', serviceId: 'svc1', clientId: 'c1',
      windowStart: SLOT.start, windowEnd: SLOT.end,
    });
    e.clock.advance(500);
    e.engine.joinWaitlist({
      businessId: 'biz1', serviceId: 'svc1', clientId: 'c2',
      windowStart: SLOT.start, windowEnd: SLOT.end,
    });

    const started: CallAttempt[] = [];
    e.engine.on('call.started', (evt: { attempt: CallAttempt }) => started.push(evt.attempt));

    triggerCascade();
    expect(started[0]!.clientId).toBe('c1');

    // c1 declines
    e.engine.declineCall(started[0]!.id);

    // c2 should now be called
    expect(started).toHaveLength(2);
    expect(started[1]!.clientId).toBe('c2');
  });
});

// ─── Timeout goes to the next entry ──────────────────────────────────────────

describe('no_answer advances to next', () => {
  it('calls c2 after c1 times out', () => {
    e = makeEngine(10); // short timeout for test
    e.engine.addBusiness({
      id: 'biz1',
      name: 'Test', category: 'barber', description: '', address: '',
      lat: 0, lng: 0, phone: '', priceLevel: 1, rating: 5,
      services: [{ id: 'svc1', name: 'Cut', durationMin: 30, priceCents: 0 }],
      hours: { mon: { open: '09:00', close: '17:00' } },
      resources: [{ id: 'res1', name: 'Chair' }, { id: 'res2', name: 'Chair 2' }],
    });

    e.engine.joinWaitlist({
      businessId: 'biz1', serviceId: 'svc1', clientId: 'c1',
      windowStart: SLOT.start, windowEnd: SLOT.end,
    });
    e.clock.advance(500);
    e.engine.joinWaitlist({
      businessId: 'biz1', serviceId: 'svc1', clientId: 'c2',
      windowStart: SLOT.start, windowEnd: SLOT.end,
    });

    const started: CallAttempt[] = [];
    e.engine.on('call.started', (evt: { attempt: CallAttempt }) => started.push(evt.attempt));

    triggerCascade();
    expect(started[0]!.clientId).toBe('c1');
    expect(started[0]!.status).toBe('ringing');

    // Advance past timeout
    e.clock.advance(11_000); // +11s > 10s timeout
    e.scheduler.tick();

    expect(started[0]!.status).toBe('no_answer');
    expect(started).toHaveLength(2);
    expect(started[1]!.clientId).toBe('c2');
  });
});

// ─── Nobody accepts → slot returns to public pool ────────────────────────────

describe('slot returns to public pool when waitlist exhausted', () => {
  it('emits slot.opened when nobody accepts', () => {
    e = makeEngine(10);
    e.engine.addBusiness({
      id: 'biz1',
      name: 'Test', category: 'barber', description: '', address: '',
      lat: 0, lng: 0, phone: '', priceLevel: 1, rating: 5,
      services: [{ id: 'svc1', name: 'Cut', durationMin: 30, priceCents: 0 }],
      hours: { mon: { open: '09:00', close: '17:00' } },
      resources: [{ id: 'res1', name: 'Chair' }, { id: 'res2', name: 'Chair 2' }],
    });

    // Only one entry
    e.engine.joinWaitlist({
      businessId: 'biz1', serviceId: 'svc1', clientId: 'c1',
      windowStart: SLOT.start, windowEnd: SLOT.end,
    });

    const opened: unknown[] = [];
    e.engine.on('slot.opened', (evt) => opened.push(evt));

    triggerCascade();

    // c1 declines
    const attempt = [...e.store.attempts.values()].find(a => a.clientId === 'c1');
    e.engine.declineCall(attempt!.id);

    // No more entries → slot.opened
    expect(opened).toHaveLength(1);
  });
});

// ─── I6: accept after expiry gives HOLD_EXPIRED ──────────────────────────────

describe('I6 — expired call cannot be accepted', () => {
  it('throws HOLD_EXPIRED when accepting an expired attempt', () => {
    e = makeEngine(10);
    e.engine.addBusiness({
      id: 'biz1',
      name: 'Test', category: 'barber', description: '', address: '',
      lat: 0, lng: 0, phone: '', priceLevel: 1, rating: 5,
      services: [{ id: 'svc1', name: 'Cut', durationMin: 30, priceCents: 0 }],
      hours: { mon: { open: '09:00', close: '17:00' } },
      resources: [{ id: 'res1', name: 'Chair' }, { id: 'res2', name: 'Chair 2' }],
    });

    e.engine.joinWaitlist({
      businessId: 'biz1', serviceId: 'svc1', clientId: 'c1',
      windowStart: SLOT.start, windowEnd: SLOT.end,
    });

    triggerCascade();

    const attempt = [...e.store.attempts.values()].find(a => a.clientId === 'c1')!;
    expect(attempt.status).toBe('ringing');

    // Advance past timeout
    e.clock.advance(11_000);
    e.scheduler.tick();

    expect(attempt.status).toBe('no_answer');

    // Trying to accept now should throw HOLD_EXPIRED
    expect(() => e.engine.acceptCall(attempt.id)).toThrow(DomainError);
    try {
      e.engine.acceptCall(attempt.id);
    } catch (err) {
      expect(err).toBeInstanceOf(DomainError);
      expect((err as DomainError).code).toBe('HOLD_EXPIRED');
    }
  });

  it('throws HOLD_EXPIRED when accepting a superseded attempt', () => {
    // Two entries; c1 declines → c2 is called → c1's attempt is superseded
    e.engine.joinWaitlist({
      businessId: 'biz1', serviceId: 'svc1', clientId: 'c1',
      windowStart: SLOT.start, windowEnd: SLOT.end,
    });
    e.clock.advance(500);
    e.engine.joinWaitlist({
      businessId: 'biz1', serviceId: 'svc1', clientId: 'c2',
      windowStart: SLOT.start, windowEnd: SLOT.end,
    });

    triggerCascade();

    const c1attempt = [...e.store.attempts.values()].find(a => a.clientId === 'c1')!;
    e.engine.declineCall(c1attempt.id);

    // c1 attempt is now declined — trying to accept it again should throw
    expect(() => e.engine.acceptCall(c1attempt.id)).toThrow(DomainError);
  });
});

// ─── Happy path: accept creates a confirmed booking ──────────────────────────

describe('successful waitlist acceptance', () => {
  it('converts the hold to a confirmed booking on accept', () => {
    e.engine.joinWaitlist({
      businessId: 'biz1', serviceId: 'svc1', clientId: 'c1',
      windowStart: SLOT.start, windowEnd: SLOT.end,
    });

    const bookings: unknown[] = [];
    e.engine.on('booking.changed', (evt) => bookings.push(evt));

    triggerCascade();

    const attempt = [...e.store.attempts.values()].find(a => a.clientId === 'c1')!;
    expect(attempt.status).toBe('ringing');

    const { booking } = e.engine.acceptCall(attempt.id);

    expect(booking.status).toBe('confirmed');
    expect(booking.clientId).toBe('c1');
    expect(booking.start).toBe(SLOT.start);

    // Hold should be released
    expect(e.store.holds.size).toBe(0);
    // Entry should be 'booked'
    const entry = [...e.store.waitlist.values()].find(en => en.clientId === 'c1')!;
    expect(entry.status).toBe('booked');
  });
});
