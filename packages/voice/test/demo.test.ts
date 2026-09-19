import assert from 'node:assert/strict';
import { test } from 'node:test';
import { VoiceDemoStore, demoContext, dynamicVariables, ElevenLabsWebVoice } from '../dist/index.js';

test('unavailable time leaves the slot unbooked and the fee pending', () => {
  const store = new VoiceDemoStore();
  const session = store.create(demoContext());
  assert.equal(store.check(session.id, '18:00').available, false);
  assert.throws(() => store.accept(session.id, '18:00'), /unavailable/);
  assert.equal(store.get(session.id).feeWaived, false);
  assert.equal(store.get(session.id).status, 'active');
});

test('negotiated time is booked once; duplicate callbacks and disconnect preserve it', () => {
  const store = new VoiceDemoStore();
  const session = store.create(demoContext());
  assert.equal(store.check(session.id, '15:30').available, true);
  const booked = store.accept(session.id, '15:30');
  assert.equal(booked.feeWaived, true);
  assert.deepEqual(store.accept(session.id, '15:30').booking, booked.booking);
  assert.throws(() => store.accept(session.id, '16:00'), /already/);
  assert.throws(() => store.decline(session.id), /already/);
  assert.deepEqual(store.end(session.id, 'failed'), booked);
});

test('declines and hangups do not waive fees or allow a late acceptance', () => {
  for (const outcome of ['declined', 'ended', 'failed'] as const) {
    const store = new VoiceDemoStore();
    const session = store.create(demoContext());
    const result = outcome === 'declined' ? store.decline(session.id) : store.end(session.id, outcome);
    assert.equal(result.status, outcome);
    assert.equal(result.feeWaived, false);
    assert.throws(() => store.accept(session.id, '15:00'), /already/);
  }
});

test('demo sessions and returned objects do not share mutable booking state', () => {
  const store = new VoiceDemoStore();
  const first = store.create(demoContext());
  const second = store.create(demoContext());
  first.context.availableTimes.push('18:00');
  assert.equal(store.check(first.id, '18:00').available, false);
  store.accept(first.id, '15:00');
  assert.equal(store.get(second.id).status, 'active');
  assert.throws(() => store.get('missing'), /Unknown/);
});

test('dynamic context uses a future demo date and explicit timezone', () => {
  const context = demoContext(new Date('2026-09-19T19:00:00Z'));
  assert.equal(context.date, '2026-09-20');
  assert.equal(dynamicVariables(context, new Date('2026-09-19T19:00:00Z')).date, 'tomorrow');
  assert.equal(dynamicVariables(context).offered_time, '3 PM');
  assert.equal(dynamicVariables(context).timezone, 'America/Los_Angeles');
});

test('token adapter uses private credentials and returns only the session token', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    assert.match(String(input), /\/convai\/conversation\/token\?agent_id=agent_test/);
    assert.equal(new Headers(init?.headers).get('xi-api-key'), 'test-secret');
    return new Response(JSON.stringify({ token: 'session-token', conversation_id: 'conversation-test' }), { status: 200 });
  };
  try {
    assert.equal(await new ElevenLabsWebVoice('test-secret', 'agent_test').createToken(), 'session-token');
  } finally { globalThis.fetch = original; }
});

test('provider failures do not echo provider bodies or keys', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response('test-secret private-provider-details', { status: 401 });
  try {
    await assert.rejects(new ElevenLabsWebVoice('test-secret', 'agent_test').createToken(), (error: Error) => {
      assert.match(error.message, /Could not connect/);
      assert.doesNotMatch(error.message, /test-secret|private-provider-details/);
      return true;
    });
  } finally { globalThis.fetch = original; }
});
