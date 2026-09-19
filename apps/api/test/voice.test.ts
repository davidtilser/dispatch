import 'reflect-metadata';
import { DatabaseSync } from 'node:sqlite';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NestFactory } from '@nestjs/core';
import { VoiceModule } from '../dist/voice/voice.module.js';
import { spokenDate } from '@dispatch/voice';
import { DEMO_DATE, SqliteBookings, demoTime } from '@dispatch/data';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

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
    assert.equal(initial.bookings.length, 5);
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
    assert.equal((await get('demo/dashboard')).bookings.length, 5, 'availability is not a booking');
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
    assert.deepEqual((await (await post(`${path}/end`, { reason: 'ended' })).json()).booking, booked.booking);
    assert.equal((await (await post(`${path}/decline`)).json()).status, 'accepted', 'late decline cannot undo first acceptance');
    assert.equal((await (await post('slots/slot_3pm/cancel')).json()).id, runs[0].id, 'completed cancellation is idempotent');

    await post('demo/reset');
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
    assert.equal(afterEnd.bookings.length, 5);
    assert.equal(afterEnd.bookings.find((b: any) => b.id === 'slot_3pm').feeStatus, 'pending');
    assert.equal(afterEnd.offer.customerName, 'Taylor Wilson');
    const third = await (await post('voice/sessions')).json();
    await post(`voice/sessions/${third.session.id}/end`, { reason: 'failed' });
    assert.equal((await get('demo/dashboard')).run.status, 'exhausted');
    assert.equal((await get('demo/dashboard')).run.feeWaived, false);
    await post('demo/reset');
    assert.equal((await get('demo/dashboard')).run, null);
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
    assert.equal(store.bookings().length, 6);
    assert.equal(store.waitlist()[0]?.status, 'booked');
    assert.equal(await store.isAvailable('slot_3pm', demoTime('15:00')), false);
    store.reset();
    assert.equal(store.bookings().length, 5);
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
    assert.equal(store.bookings().length, 5);
    assert.ok(store.bookings().every(booking => booking.startsAt.startsWith(DEMO_DATE) && booking.status === 'booked' && booking.feeStatus === 'not_due'));
    assert.ok(store.waitlist().every(client => client.status === 'waiting'));
    assert.equal(store.events().length, 1);
    assert.match(store.events()[0]!.message, /Demo reset/);
  } finally { store.close(); rmSync(directory, { recursive: true, force: true }); }
});
