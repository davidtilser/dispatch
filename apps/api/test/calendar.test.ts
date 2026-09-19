import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SqliteBookings, demoTime, DEMO_DATE, DEMO_LAST_DATE, addDays, localDate, spokenCalendarDate } from '@dispatch/data';
import { DispatchManager } from '@dispatch/agents';
import { voiceAcceptSchema, voiceAvailabilitySchema } from '@dispatch/contracts';
import { DemoCoordinator } from '../dist/refill/demo-coordinator.js';
import { DemoVoice } from '../dist/refill/demo-voice.js';
import { BusinessStore } from '../dist/business/business.store.js';

const NEXT_DATE = addDays(DEMO_DATE, 1);

function fixture() {
  const bookings = new SqliteBookings(':memory:');
  const voice = new DemoVoice();
  const business = new BusinessStore();
  const manager = new DispatchManager({ bookings, voice, getBusiness: id => business.get(id) });
  return { bookings, manager, demo: new DemoCoordinator(bookings, manager, voice) };
}

test('tomorrow search → explicit exact-day booking → next candidate; original gap stays pending', async () => {
  const { bookings, manager, demo } = fixture();
  try {
    const run = await demo.cancel('slot_3pm');
    const session = await demo.createSession();
    const tomorrow = await demo.check(session.id, { date: NEXT_DATE, partOfDay: 'afternoon' });
    assert.equal(tomorrow.referenceDate, localDate(new Date()));
    assert.ok(tomorrow.availableSlots.length >= 3);
    assert.ok(tomorrow.availableSlots.every(slot => slot.date === NEXT_DATE && slot.time >= '12:00' && slot.time < '17:00'));
    assert.ok(tomorrow.availableSlots.every(slot => !['12:30', '12:45', '13:00', '13:15', '13:30'].includes(slot.time)));
    assert.equal((await demo.check(session.id, { date: NEXT_DATE, time: '13:00' })).available, false);
    assert.equal((await demo.check(session.id, { date: NEXT_DATE, time: '14:00' })).available, true);
    assert.equal(bookings.bookings().length, 6, 'search never reserves');
    await assert.rejects(demo.accept(session.id, { date: NEXT_DATE, time: '14:00' }), /explicit agreement/);
    await assert.rejects(demo.accept(session.id, { date: NEXT_DATE, time: '14:00', confirmed: false }), /explicit agreement/);
    await assert.rejects(demo.accept(session.id, { date: NEXT_DATE, time: '13:00', confirmed: true }), /unavailable/);
    const request = { date: NEXT_DATE, time: '14:00', confirmed: true };
    const [saved, duplicate] = await Promise.all([demo.accept(session.id, request), demo.accept(session.id, request)]);
    assert.equal(saved.status, 'alternative_booked');
    assert.deepEqual(duplicate, saved);
    assert.equal(saved.booking?.date, request.date);
    assert.equal(saved.booking?.startsAt, demoTime('14:00', request.date));
    assert.equal(saved.booking!.spokenDate!, spokenCalendarDate(NEXT_DATE));
    assert.equal(saved.feeWaived, false);
    const alternative = await bookings.getSlot(saved.booking!.id);
    assert.equal(alternative?.status, 'alternative');
    assert.equal(alternative?.replacesSlotId, undefined);
    assert.equal((await bookings.getSlot('slot_3pm'))?.feeStatus, 'pending');
    assert.equal(bookings.bookings().filter(b => b.status === 'replacement').reduce((sum, b) => sum + b.priceCents, 0), 0);
    await assert.rejects(bookings.waiveCancellationFee('slot_3pm'), /replacement must exist/);
    assert.equal((await demo.dashboard()).offer?.customerName, 'Sam Rivera');
    assert.equal((await manager.getRunDetails(run.id))?.attempts[0]?.outcome?.type, 'alternative_booked');
    assert.ok(bookings.events().some(event => event.message.includes(`${NEXT_DATE} at 14:00`)));
    await assert.rejects(demo.createSession(), /already active/);
    await assert.rejects(demo.accept(session.id, { ...request, date: DEMO_DATE }), /no longer active/);
    assert.equal((await demo.end(session.id, 'declined')).status, 'alternative_booked');
    assert.equal((await demo.end(session.id, 'ended')).booking?.id, saved.booking?.id);
    const next = await demo.createSession();
    assert.equal(next.context.customerName, 'Sam Rivera');
    const filled = await demo.accept(next.id, '15:30');
    assert.equal(filled.feeWaived, true, 'the next person can still fill the actual gap');
    assert.equal((await demo.dashboard()).bookings.filter(b => b.status === 'replacement').length, 1);
    await demo.reset();
    assert.equal(bookings.bookings().length, 6);
    assert.equal(bookings.waitlist().filter(c => c.status === 'waiting').length, 3);
    await assert.rejects(demo.get(session.id), /Unknown session/);
  } finally { bookings.close(); }
});

test('calendar respects duration, hours, horizon, and separates a same-day appointment outside the refill window', async () => {
  const { bookings, demo } = fixture();
  try {
    await demo.cancel('slot_3pm');
    const session = await demo.createSession();
    for (const [date, time] of [[addDays(DEMO_DATE, -1), '15:00'], [addDays(DEMO_DATE, 7), '15:00'], [NEXT_DATE, '08:45'], [NEXT_DATE, '17:30'], [DEMO_DATE, '16:00']]) {
      assert.equal((await demo.check(session.id, { date, time })).available, false, `${date} ${time}`);
    }
    assert.equal((await demo.check(session.id, { date: DEMO_LAST_DATE, time: '17:15' })).available, true);
    const saved = await demo.accept(session.id, { date: DEMO_DATE, time: '11:30', confirmed: true });
    assert.equal(saved.status, 'alternative_booked');
    assert.equal(saved.feeWaived, false);
  } finally { bookings.close(); }
});

test('writes recheck collisions and reject reusing a booking key for another date', async () => {
  const { bookings } = fixture();
  try {
    await bookings.cancelBooking('slot_3pm');
    const input = { slotId: 'slot_3pm', contactId: 'client_5', startsAt: demoTime('14:00', NEXT_DATE), idempotencyKey: 'jordan' };
    assert.equal(await bookings.isAvailable(input.slotId, input.startsAt), true);
    const saved = await bookings.bookReplacement(input);
    assert.deepEqual(await bookings.bookReplacement(input), saved);
    await assert.rejects(bookings.bookReplacement({ ...input, contactId: 'client_6', idempotencyKey: 'sam' }), /no longer available/);
    await assert.rejects(bookings.bookReplacement({ ...input, startsAt: demoTime('14:00', addDays(DEMO_DATE, 2)) }), /another booking/);
    assert.equal(bookings.bookings().length, 7);
  } finally { bookings.close(); }
});

test('tool schemas retain legacy HH:mm and validate dated confirmation and real dates', () => {
  assert.equal(voiceAvailabilitySchema.safeParse({ date: '2026-02-30' }).success, false);
  assert.equal(voiceAvailabilitySchema.safeParse({ date: NEXT_DATE, partOfDay: 'afternoon' }).success, true);
  assert.equal(voiceAcceptSchema.safeParse({ time: '15:30' }).success, true);
  assert.equal(voiceAcceptSchema.safeParse({ date: NEXT_DATE, time: '14:00' }).success, false);
  assert.equal(voiceAcceptSchema.safeParse({ date: NEXT_DATE, time: '14:00', confirmed: true }).success, true);
});
