import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../dist/app.module.js';
import { BusinessImporter, extractBusinessPreview } from '../dist/business/business-importer.js';

const website = 'https://example.com/';
const html = `<title>Sample Barber | Services</title><meta property="og:site_name" content="Sample &amp; Barber"><script type="application/ld+json">{"@type":"HairSalon","name":"Sample & Barber","makesOffer":{"@type":"Offer","name":"Beard trim","price":25,"priceCurrency":"USD"}}</script><h4>Standard haircut $65</h4><h4>Buzz cut $45</h4>`;

test('business import reads published metadata and prices without inventing duration or services', () => {
  const result = extractBusinessPreview(html, website);
  assert.equal(result.name, 'Sample & Barber');
  assert.equal(result.source, 'website');
  assert.deepEqual(result.services, [{ name: 'Beard trim', priceCents: 2500 }, { name: 'Standard haircut', priceCents: 6500 }, { name: 'Buzz cut', priceCents: 4500 }]);
  const noPrices = extractBusinessPreview('<title>Another Shop</title><p>Come for a haircut!</p>', website);
  assert.deepEqual(noPrices.services, []);
  assert.equal(noPrices.name, 'Another Shop');
});

test('reviewed business drives calendar, manager brief and voice variables; reset/restart preserve it', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'dispatch-onboarding-'));
  const env = { ...process.env };
  process.env.DEMO_DB_PATH = join(directory, 'demo.sqlite');
  delete process.env.DISPATCH_ENV_ID;
  delete process.env.DISPATCH_MANAGER_AGENT_ID;
  process.env.ELEVENLABS_API_KEY = 'test-key';
  process.env.ELEVENLABS_AGENT_ID = 'test-agent';
  const realFetch = globalThis.fetch;
  let app = await NestFactory.create(AppModule, { logger: false });
  const start = async () => { app.setGlobalPrefix('api'); await app.listen(0, '127.0.0.1'); return `${await app.getUrl()}/api`; };
  let base = await start();
  const post = (path: string, body: unknown = {}) => realFetch(`${base}/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const get = async (path: string) => (await realFetch(`${base}/${path}`)).json();
  const setup = { name: 'Sample & Barber', website, service: { name: 'Standard haircut', priceCents: 6500, durationMinutes: 45 } };
  try {
    app.get(BusinessImporter).preview = async (url: string) => extractBusinessPreview(html, url);
    assert.equal((await post('business/preview', { url: 'file:///etc/hosts' })).status, 400);
    assert.equal((await (await post('business/preview', { url: website })).json()).name, setup.name);
    assert.equal((await get('demo/dashboard')).businessName, 'Apblendzz', 'preview does not activate a business');
    assert.equal((await post('demo/business', { ...setup, service: { ...setup.service, durationMinutes: 300 } })).status, 400);
    assert.equal((await post('demo/business', setup)).status, 201);
    const ready = await get('demo/dashboard');
    assert.equal(ready.businessName, setup.name);
    assert.ok(ready.bookings.every((booking: any) => booking.service === 'Standard haircut' && booking.priceCents === 6500));
    await post('slots/slot_3pm/cancel');
    assert.equal((await post('demo/business', { ...setup, name: 'Other shop' })).status, 409);
    const config = await get('voice/config');
    assert.equal(config.context.businessName, setup.name);
    assert.equal(config.context.service, setup.service.name);
    assert.equal(config.context.price, '$65');
    globalThis.fetch = async () => new Response(JSON.stringify({ token: 'test-token', conversation_id: 'test-conversation' }), { status: 200 });
    const sessionResponse = await post('voice/sessions', { attemptId: config.attemptId });
    const session = await sessionResponse.json();
    assert.equal(sessionResponse.status, 201, JSON.stringify(session));
    assert.equal(session.dynamicVariables.business_name, setup.name);
    assert.equal(session.dynamicVariables.service, setup.service.name);
    assert.equal(session.dynamicVariables.price, '$65');
    assert.match(session.session.managerBrief.offer, /standard haircut.*\$65/i);
    await post(`voice/sessions/${session.session.id}/accept`, { time: '15:30' });
    assert.equal((await post('demo/business', setup)).status, 409, 'open audio prevents changing context even after booking');
    await post(`voice/sessions/${session.session.id}/end`, { reason: 'ended' });
    const filled = await get('demo/dashboard');
    assert.equal(filled.bookings.find((b: any) => b.status === 'replacement').priceCents, 6500);
    assert.equal(filled.bookings.find((b: any) => b.id === 'slot_3pm').feeStatus, 'waived');
    await post('demo/reset');
    assert.equal((await get('demo/dashboard')).businessName, setup.name);
    assert.equal((await get('demo/dashboard')).bookings[0].priceCents, 6500);
    await app.close();
    app = await NestFactory.create(AppModule, { logger: false });
    base = await start();
    assert.deepEqual(await get('demo/business'), setup);
    assert.equal((await get('demo/dashboard')).businessName, setup.name);
    await post('slots/slot_3pm/cancel');
    assert.equal((await get('voice/config')).context.businessName, setup.name, 'manager restores the persisted business before preparing offers');
  } finally {
    globalThis.fetch = realFetch;
    await app.close();
    for (const key of ['DEMO_DB_PATH', 'DISPATCH_ENV_ID', 'DISPATCH_MANAGER_AGENT_ID', 'ELEVENLABS_API_KEY', 'ELEVENLABS_AGENT_ID']) {
      if (env[key] === undefined) delete process.env[key]; else process.env[key] = env[key];
    }
    rmSync(directory, { recursive: true, force: true });
  }
});
