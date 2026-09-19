import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { DispatchManager } from '@dispatch/agents';
import { SqliteBookings } from '@dispatch/data';
import { dynamicVariables } from '@dispatch/voice';
import { DemoCoordinator } from '../dist/refill/demo-coordinator.js';
import { DemoVoice } from '../dist/refill/demo-voice.js';
import { BusinessStore } from '../dist/business/business.store.js';

for (const customWriter of [false, true]) {
  test(`approved discount reaches the call and replacement booking (${customWriter ? 'custom' : 'template'} brief)`, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dispatch-discount-'));
    const path = join(directory, 'demo.sqlite');
    const bookings = new SqliteBookings(path);
    try {
      const slot = { ...await bookings.getSlot('slot_3pm'), discount: '10% off', priceCents: 4050 };
      const db = new DatabaseSync(path);
      try { db.prepare('UPDATE bookings SET data = ? WHERE id = ?').run(JSON.stringify(slot), 'slot_3pm'); }
      finally { db.close(); }
      const voice = new DemoVoice();
      const business = new BusinessStore();
      const manager = new DispatchManager({ bookings, voice, getBusiness: id => business.get(id),
        ...(customWriter ? { briefWriter: { write: async () => ({
          disclosure: 'AI assistant', offer: 'A haircut is available for $40.50. Would you like it?',
          allowedAlternatives: [], mustNot: ['offer discounts', 'pressure'],
        }) } } : {}),
      });
      const coordinator = new DemoCoordinator(bookings, manager, voice);
      await coordinator.cancel('slot_3pm');
      const session = await coordinator.createSession();
      assert.equal(session.context.discount, '10% off');
      assert.equal(session.context.price, '$40.5');
      assert.match(session.managerBrief!.offer, /discount: 10% off/);
      assert.match(session.managerBrief!.offer, /40\.5/);
      assert.ok(!session.managerBrief!.mustNot.includes('offer discounts'));
      const variables = dynamicVariables(session.context);
      assert.equal(variables.discount, '10% off');
      assert.match(variables.discount_offer, /discount: 10% off/);
      const booked = await coordinator.accept(session.id, '15:30');
      const replacement = await bookings.getSlot(booked.booking!.id);
      assert.equal(replacement!.discount, '10% off');
      assert.equal(replacement!.priceCents, 4050, 'the approved final price is not discounted twice');
    } finally {
      bookings.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });
}
