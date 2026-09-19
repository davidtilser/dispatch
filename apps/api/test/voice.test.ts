import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NestFactory } from '@nestjs/core';
import { VoiceModule } from '../dist/voice/voice.module.js';
import { spokenDate } from '@dispatch/voice';
import { DEMO_DATE, SqliteBookings, demoTime, addDays } from '@dispatch/data';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DatabaseSync } from 'node:sqlite';

test('shared HTTP demo: cancellation → offer → voice tool → calendar booking → fee waiver', async () => {
  const realFetch = globalThis.fetch;
  const oldEnv = { ...process.env };
  process.env.DEMO_DB_PATH = ':memory:';
  delete process.env.DISPATCH_ENV_ID;
  delete process.env.DISPATCH_MANAGER_AGENT_ID;
  const app = await NestFactory.create(VoiceModule, { logger: false });
  app.setGlobalPrefix('api');
  try {
    await app.listen(0, '127.0.0.1');
    const base = `${await app.getUrl()}/api`;
    const post = (path: string, body = {}) => realFetch(`${base}/${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const get = async (path: string) => (await realFetch(`${base}/${path}`)).json();
    delete process.env.ELEVENLABS_API_KEY;
    delete process.env.ELEVENLABS_AGENT_ID;
    assert.equal((await post('voice/sessions')).status, 503);
    process.env.ELEVENLABS_API_KEY = 'test-private-key';
    process.env.ELEVENLABS_AGENT_ID = 'agent_test';
    globalThis.fetch = async () => new Response(JSON.stringify({ token: 'test-token', conversation_id: 'test-conversation' }), { status: 200 });
    assert.equal((await post('voice/sessions')).status, 409, 'no isolated voice booking before cancellation');
    const initial = await get('demo/dashboard');
    assert.equal(initial.bookings.length, 6);
    assert.equal(initial.waitlist.length, 3);
    const cancellations = await Promise.all([post('slots/slot_3pm/cancel'), post('slots/slot_3pm/cancel')]);
    const runs = await Promise.all(cancellations.map(r => r.json()));
    assert.equal(runs[0].id, runs[1].id, 'double cancellation starts just one run');
    assert.equal((await post('slots/slot_0/cancel')).status, 409, 'only one active refill');
    const offered = await get('demo/dashboard');
    assert.equal(offered.bookings.find((b: any) => b.id === 'slot_3pm').feeStatus, 'pending');
    assert.equal(offered.offer.customerName, 'Jordan Davis');
    const configuration = await get('voice/config');
    assert.equal(configuration.context.customerName, offered.offer.customerName);
    assert.equal(configuration.context.offeredTime, '15:00');
    assert.deepEqual(configuration.context.availableTimes, ['15:00', '15:30']);
    assert.doesNotMatch(JSON.stringify(configuration), /test-private-key/);
    assert.equal((await post('voice/sessions', { attemptId: 'stale-offer' })).status, 409);
    const response = await post('voice/sessions', { attemptId: configuration.attemptId });
    assert.equal(response.status, 201);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const started = await response.json();
    assert.equal(started.conversationToken, 'test-token');
    assert.equal(started.dynamicVariables.customer_name, 'Jordan Davis');
    assert.equal(started.dynamicVariables.offered_time, '3 PM');
    assert.equal(started.dynamicVariables.available_times, '3 PM, 3:30 PM');
    assert.equal(started.dynamicVariables.date, spokenDate(DEMO_DATE, 'America/Los_Angeles'));
    assert.equal(started.session.context.date, DEMO_DATE, 'booking context keeps its ISO date');
    assert.match(started.session.managerBrief.disclosure, /Jordan Davis/);
    assert.match(started.session.managerBrief.offer, /45/);
    assert.equal((await post('voice/sessions')).status, 409, 'second tab cannot claim the same offer');
    const path = `voice/sessions/${started.session.id}`;
    assert.equal((await post(`${path}/accept`, { time: 'bad-time' })).status, 400);
    assert.equal((await post(`${path}/accept`, { time: '18:00' })).status, 409);
    assert.equal((await (await post(`${path}/check-availability`, { time: '16:00' })).json()).available, false, '45 minutes would overlap 16:30');
    assert.equal((await (await post(`${path}/check-availability`, { time: '15:30' })).json()).available, true);
    const checked = await get('demo/dashboard');
    assert.equal(checked.bookings.length, 6, 'availability is not a booking');
    const checks = checked.events.filter((e: any) => e.action?.kind === 'availability_checked').reverse();
    assert.equal(checks.length, 2);
    assert.equal(checks[0].action.available, false);
    assert.equal(checks[0].action.conflict.customerName, 'Oliver James');
    assert.equal(checks[0].action.conflict.startsAt, demoTime('16:30'));
    assert.equal(checks[1].action.available, true);
    assert.equal(checks[1].action.startsAt, demoTime('15:30'));
    assert.match(checks[1].action.reason, /No booking made/);
    assert.equal(checked.events.some((e: any) => ['booking_saved', 'fee_waived'].includes(e.action?.kind)), false);
    assert.equal(checked.events.find((e: any) => e.action?.kind === 'booking_requested').action.available, false, 'failed accept is recorded as rejected');
    const accepts = await Promise.all([post(`${path}/accept`, { time: '15:30' }), post(`${path}/accept`, { time: '15:30' })]);
    const [booked, duplicate] = await Promise.all(accepts.map(r => r.json()));
    assert.equal(booked.status, 'accepted');
    assert.equal(booked.feeWaived, true);
    assert.deepEqual(duplicate.booking, booked.booking);
    assert.equal((await post(`${path}/accept`, { time: '15:00' })).status, 409);
    const dashboard = await get('demo/dashboard');
    assert.equal(dashboard.run.status, 'filled');
    assert.equal(dashboard.offer, null);
    const replacements = dashboard.bookings.filter((b: any) => b.status === 'replacement');
    assert.equal(replacements.length, 1);
    assert.equal(replacements[0].id, booked.booking.id);
    assert.equal(replacements[0].customerName, 'Jordan Davis');
    assert.equal(Date.parse(replacements[0].startsAt), Date.parse(demoTime('15:30')));
    assert.equal(dashboard.bookings.find((b: any) => b.id === 'slot_3pm').feeStatus, 'waived');
    assert.equal(dashboard.waitlist[0].status, 'booked');
    const bookingEvent = dashboard.events.find((e: any) => e.message.startsWith('Booked Jordan'));
    const waiverEvent = dashboard.events.find((e: any) => e.message.includes('fee waived'));
    assert.ok(bookingEvent.id < waiverEvent.id, 'fee waived after durable booking');
    assert.equal(bookingEvent.action.kind, 'booking_saved');
    assert.equal(bookingEvent.action.bookingId, booked.booking.id);
    assert.equal(bookingEvent.action.amountCents, 4500);
    assert.equal(waiverEvent.action.kind, 'fee_waived');
    assert.equal(waiverEvent.action.amountCents, 1500);
    assert.equal(dashboard.events.filter((e: any) => e.action?.kind === 'booking_saved').length, 1, 'duplicate acceptance does not invent another saved event');
    const agreement = dashboard.events.find((e: any) => e.action?.kind === 'booking_requested' && e.action.available);
    assert.ok(agreement.id < bookingEvent.id, 'tool request precedes saved booking');
    assert.deepEqual((await (await post(`${path}/end`, { reason: 'ended' })).json()).booking, booked.booking);
    assert.equal((await (await post(`${path}/decline`)).json()).status, 'accepted', 'late decline cannot undo first acceptance');
    assert.equal((await (await post('slots/slot_3pm/cancel')).json()).id, runs[0].id, 'completed cancellation is idempotent');

    await post('demo/reset');
    assert.equal((await get('demo/dashboard')).events.filter((e: any) => e.action).length, 0, 'reset clears structured actions');
    assert.equal((await post(`${path}/accept`, { time: '15:30' })).status, 404, 'reset invalidates old calls');
    const nextRun = await (await post('slots/slot_3pm/cancel')).json();
    assert.notEqual(nextRun.id, runs[0].id);
    const first = await (await post('voice/sessions')).json();
    await post(`voice/sessions/${first.session.id}/decline`);
    assert.equal((await get('demo/dashboard')).offer.customerName, 'Sam Rivera');
    await post(`voice/sessions/${first.session.id}/decline`);
    assert.equal((await get('demo/dashboard')).offer.customerName, 'Sam Rivera', 'duplicate decline does not skip another candidate');
    assert.equal((await post(`voice/sessions/${first.session.id}/accept`, { time: '15:30' })).status, 409);
    assert.equal((await post('voice/sessions')).status, 409, 'wait for previous audio call to end before the next call');
    // ElevenLabs end_call triggers the same disconnect callback as a manual end.
    const disconnected = await (await post(`voice/sessions/${first.session.id}/end`, { reason: 'ended' })).json();
    assert.equal(disconnected.status, 'declined', 'automatic disconnect preserves the refusal');
    const afterDecline = await get('voice/config');
    assert.equal(afterDecline.callActive, false, 'automatic disconnect releases the next web call');
    assert.equal(afterDecline.context.customerName, 'Sam Rivera', 'disconnect does not skip the next candidate');
    const second = await (await post('voice/sessions')).json();
    await post(`voice/sessions/${second.session.id}/end`, { reason: 'ended' });
    const afterEnd = await get('demo/dashboard');
    assert.equal(afterEnd.bookings.length, 6);
    assert.equal(afterEnd.bookings.find((b: any) => b.id === 'slot_3pm').feeStatus, 'pending');
    assert.equal(afterEnd.offer.customerName, 'Taylor Wilson');
    assert.equal(afterEnd.events.some((e: any) => e.action?.kind === 'booking_saved' || e.action?.kind === 'fee_waived'), false);
    assert.ok(afterEnd.events.some((e: any) => e.action?.kind === 'call_ended' && e.action.outcome === 'declined'));
    const third = await (await post('voice/sessions')).json();
    await post(`voice/sessions/${third.session.id}/end`, { reason: 'failed' });
    assert.equal((await get('demo/dashboard')).run.status, 'exhausted');
    assert.equal((await get('demo/dashboard')).run.feeWaived, false);
    await post('demo/reset');
    assert.equal((await get('demo/dashboard')).run, null);
    await post('slots/slot_3pm/cancel');
    const crossDay = await (await post('voice/sessions')).json();
    const crossPath = `voice/sessions/${crossDay.session.id}`;
    const search = await (await post(`${crossPath}/check-availability`, { date: addDays(DEMO_DATE, 1), partOfDay: 'afternoon' })).json();
    assert.equal(search.available, true);
    assert.ok(search.availableSlots.every((slot: any) => slot.date === addDays(DEMO_DATE, 1)));
    assert.equal((await post(`${crossPath}/accept`, { date: addDays(DEMO_DATE, 1), time: '14:00' })).status, 400);
    assert.equal((await post(`${crossPath}/accept`, { date: addDays(DEMO_DATE, 1), time: '13:00', confirmed: true })).status, 409);
    const dated = await (await post(`${crossPath}/accept`, { date: addDays(DEMO_DATE, 1), time: '14:00', confirmed: true })).json();
    assert.equal(dated.status, 'alternative_booked');
    assert.equal(dated.booking.date, addDays(DEMO_DATE, 1));
    assert.equal(dated.feeWaived, false);
    assert.equal((await get('demo/dashboard')).offer.customerName, 'Sam Rivera');
    assert.equal((await post('voice/sessions')).status, 409);
    await post(`${crossPath}/end`, { reason: 'ended' });
    assert.equal((await post('voice/sessions')).status, 201);
    await post('demo/reset');

  } finally {
    globalThis.fetch = realFetch;
    for (const key of ['ELEVENLABS_API_KEY', 'ELEVENLABS_AGENT_ID', 'DEMO_DB_PATH', 'DISPATCH_ENV_ID', 'DISPATCH_MANAGER_AGENT_ID']) {
      if (oldEnv[key] === undefined) delete process.env[key]; else process.env[key] = oldEnv[key];
    }
    await app.close();
  }
});

test('SQLite persists bookings, clients and fees across reopen; reset restores seed', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'dispatch-test-'));
  const path = join(directory, 'demo.sqlite');
  let store = new SqliteBookings(path);
  try {
    await assert.rejects(store.waiveCancellationFee('slot_3pm'), /replacement must exist/);
    await store.cancelBooking('slot_3pm');
    const input = { slotId: 'slot_3pm', contactId: 'client_5', startsAt: demoTime('15:30'), idempotencyKey: 'test-attempt' };
    const booked = await store.bookReplacement(input);
    await store.waiveCancellationFee('slot_3pm');
    store.close();
    store = new SqliteBookings(path);
    assert.deepEqual(await store.bookReplacement(input), booked);
    assert.equal((await store.getSlot('slot_3pm'))?.feeStatus, 'waived');
    assert.equal(store.bookings().length, 7);
    assert.equal(store.events().find(e => e.action?.kind === 'booking_saved')?.action?.bookingId, booked.bookingId, 'structured actions survive reopen');
    assert.equal(store.waitlist()[0]?.status, 'booked');
    assert.equal(await store.isAvailable('slot_3pm', demoTime('15:00')), false);
    store.reset();
    assert.equal(store.bookings().length, 6);
    assert.equal(store.waitlist()[0]?.status, 'waiting');
  } finally { store.close(); rmSync(directory, { recursive: true, force: true }); }
});


test('opening an older demo database reseeds the calendar, waitlist and activity for tomorrow', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'dispatch-stale-day-'));
  const path = join(directory, 'demo.sqlite');
  let store = new SqliteBookings(path);
  try {
    await store.cancelBooking('slot_3pm');
    await store.bookReplacement({ slotId: 'slot_3pm', contactId: 'client_5', startsAt: demoTime('15:30'), idempotencyKey: 'old-day' });
    await store.waiveCancellationFee('slot_3pm');
    const oldBookings = store.bookings();
    store.close();
    const db = new DatabaseSync(path);
    try {
      for (const booking of oldBookings) {
        booking.startsAt = `2000-01-01${booking.startsAt.slice(10)}`;
        db.prepare('UPDATE bookings SET data = ? WHERE id = ?').run(JSON.stringify(booking), booking.id);
      }
    } finally { db.close(); }
    store = new SqliteBookings(path);
    assert.equal(store.bookings().length, 6);
    assert.ok(store.bookings().every(booking => (booking.startsAt.startsWith(DEMO_DATE) || booking.startsAt.startsWith(addDays(DEMO_DATE, 1))) && booking.status === 'booked' && booking.feeStatus === 'not_due'));
    assert.ok(store.waitlist().every(client => client.status === 'waiting'));
    assert.equal(store.events().length, 1);
    assert.match(store.events()[0]!.message, /Demo reset/);
  } finally { store.close(); rmSync(directory, { recursive: true, force: true }); }
});

test('existing text-only activity database upgrades without losing history', () => {
  const directory = mkdtempSync(join(tmpdir(), 'dispatch-event-upgrade-'));
  const path = join(directory, 'demo.sqlite');
  let store = new SqliteBookings(path);
  store.close();
  const legacy = new DatabaseSync(path);
  legacy.exec('ALTER TABLE events DROP COLUMN action');
  legacy.prepare('INSERT INTO events (time,message) VALUES (?,?)').run(new Date().toISOString(), 'Legacy event');
  legacy.close();
  try {
    store = new SqliteBookings(path);
    assert.equal(store.events()[0]?.message, 'Legacy event');
    assert.equal(store.events()[0]?.action, undefined);
    store.log('New structured event', { kind: 'availability_checked', source: 'voice_tool', slotId: 'slot_3pm', available: false });
    assert.equal(store.events()[0]?.action?.available, false);
    assert.equal(store.bookings().length, 6);
  } finally { store.close(); rmSync(directory, { recursive: true, force: true }); }
});
