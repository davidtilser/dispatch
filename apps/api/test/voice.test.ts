import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NestFactory } from '@nestjs/core';
import { VoiceModule } from '../dist/voice/voice.module.js';

test('web voice HTTP flow: setup errors, token, validation, negotiated booking, end', async () => {
  const realFetch = globalThis.fetch;
  const previousKey = process.env.ELEVENLABS_API_KEY;
  const previousAgent = process.env.ELEVENLABS_AGENT_ID;
  const app = await NestFactory.create(VoiceModule, { logger: false });
  app.setGlobalPrefix('api');
  try {
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();
    const post = (path: string, body = {}) => realFetch(`${base}/api/voice/${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    delete process.env.ELEVENLABS_API_KEY;
    delete process.env.ELEVENLABS_AGENT_ID;
    assert.equal((await post('sessions')).status, 503);
    process.env.ELEVENLABS_API_KEY = 'test-private-key';
    process.env.ELEVENLABS_AGENT_ID = 'agent_test';
    globalThis.fetch = async () => new Response(JSON.stringify({ token: 'test-token', conversation_id: 'test-conversation' }), { status: 200 });
    const configuration = await (await realFetch(`${base}/api/voice/config`)).json();
    assert.equal(configuration.configured, true);
    assert.doesNotMatch(JSON.stringify(configuration), /test-private-key/);
    const response = await post('sessions');
    assert.equal(response.status, 201);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const started = await response.json();
    assert.equal(started.conversationToken, 'test-token');
    assert.equal(started.session.feeWaived, false);
    const path = `sessions/${started.session.id}`;
    assert.equal((await post(`${path}/accept`, { time: 'bad-time' })).status, 400);
    assert.equal((await post(`${path}/accept`, { time: '18:00' })).status, 409);
    assert.equal((await (await post(`${path}/check-availability`, { time: '15:30' })).json()).available, true);
    const booked = await (await post(`${path}/accept`, { time: '15:30' })).json();
    assert.equal(booked.status, 'accepted');
    assert.equal(booked.feeWaived, true);
    const ended = await (await post(`${path}/end`, { reason: 'ended' })).json();
    assert.deepEqual(ended.booking, booked.booking);
    assert.equal(ended.feeWaived, true);
  } finally {
    globalThis.fetch = realFetch;
    if (previousKey === undefined) delete process.env.ELEVENLABS_API_KEY; else process.env.ELEVENLABS_API_KEY = previousKey;
    if (previousAgent === undefined) delete process.env.ELEVENLABS_AGENT_ID; else process.env.ELEVENLABS_AGENT_ID = previousAgent;
    await app.close();
  }
});
