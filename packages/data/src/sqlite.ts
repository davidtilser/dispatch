import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { BookingRepository } from './index.js';
import type { DemoAction, DemoBooking, DemoDashboard, DemoEvent, AvailabilityRequest, AvailableSlot } from '@dispatch/contracts';

import { DEMO_DATE, DEMO_LAST_DATE, addDays, demoTime, localTime, localDate, validDemoDate, candidateTimes, spokenCalendarDate } from './calendar.js';
export { DEMO_DATE, demoTime, localTime } from './calendar.js';

// A single-barber calendar, backed by Node 24's built-in SQLite. No external service.
export class SqliteBookings implements BookingRepository {
  private readonly db: DatabaseSync;
  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`CREATE TABLE IF NOT EXISTS clients (id TEXT PRIMARY KEY, name TEXT, phone TEXT, waitlist INTEGER, booked INTEGER DEFAULT 0);
      CREATE TABLE IF NOT EXISTS bookings (id TEXT PRIMARY KEY, data TEXT NOT NULL, idempotency_key TEXT UNIQUE);
      CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, time TEXT, message TEXT);`);
    // Additive migration: existing demo databases and their text activity remain usable.
    if (!this.db.prepare('PRAGMA table_info(events)').all().some(column => column.name === 'action')) {
      this.db.exec('ALTER TABLE events ADD COLUMN action TEXT');
    }
    // A database kept from an earlier demo day holds past times; reseed it onto today's demo date.
    const seeded = this.db.prepare('SELECT data FROM bookings LIMIT 1').get();
    const staleDay = !!seeded && !(JSON.parse(String(seeded.data)) as DemoBooking).startsAt.startsWith(DEMO_DATE);
    if (staleDay || !this.db.prepare('SELECT id FROM clients LIMIT 1').get()) this.reset();
  }
  close() { this.db.close(); }
  reset() {
    this.db.exec('BEGIN');
    try {
      this.db.exec('DELETE FROM bookings; DELETE FROM clients; DELETE FROM events;');
      const names = ['Alex Morgan', 'Marcus Chen', 'Daniel Reyes', 'Chris Brooks', 'Oliver James', 'Jordan Davis', 'Sam Rivera', 'Taylor Wilson'];
      names.forEach((name, i) => this.db.prepare('INSERT INTO clients (id,name,phone,waitlist) VALUES (?,?,?,?)').run(`client_${i}`, name, `+1650555010${i}`, i >= 5 ? 1 : 0));
      ['09:00', '10:30', '13:00', '15:00', '16:30'].forEach((time, i) => {
        const booking: DemoBooking = { id: i === 3 ? 'slot_3pm' : `slot_${i}`, businessId: 'biz_001', startsAt: demoTime(time), durationMinutes: 45,
          service: 'Haircut', priceCents: 4500, currency: 'USD', customerId: `client_${i}`, customerName: names[i]!, status: 'booked', cancellationFeeCents: 1500, feeStatus: 'not_due' };
        this.save(booking);
      });
      this.save({ id: 'slot_tomorrow', businessId: 'biz_001', startsAt: demoTime('13:00', addDays(DEMO_DATE, 1)), durationMinutes: 45,
        service: 'Haircut', priceCents: 4500, currency: 'USD', customerId: 'client_0', customerName: names[0]!, status: 'booked', cancellationFeeCents: 1500, feeStatus: 'not_due' });
      this.log('Demo reset. Calendar and waitlist ready. No real payments or calendar integrations.');
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  bookings(): DemoBooking[] {
    return this.db.prepare('SELECT data FROM bookings').all().map(row => JSON.parse(String(row.data)) as DemoBooking).sort((a,b) => a.startsAt.localeCompare(b.startsAt));
  }
  waitlist(): DemoDashboard['waitlist'] {
    return this.db.prepare('SELECT * FROM clients WHERE waitlist = 1 ORDER BY id').all().map(row => ({ id: String(row.id), name: String(row.name), phoneE164: String(row.phone), status: row.booked ? 'booked' : 'waiting' }));
  }
  events(): DemoEvent[] {
    return this.db.prepare('SELECT * FROM events ORDER BY id DESC LIMIT 80').all().map(row => ({
      id: Number(row.id), time: String(row.time), message: String(row.message),
      ...(row.action ? { action: JSON.parse(String(row.action)) as DemoAction } : {}),
    }));
  }
  log(message: string, action?: DemoAction) {
    this.db.prepare('INSERT INTO events (time,message,action) VALUES (?,?,?)').run(new Date().toISOString(), message, action ? JSON.stringify(action) : null);
  }
  async getSlot(id: string): Promise<DemoBooking | null> {
    const row = this.db.prepare('SELECT data FROM bookings WHERE id = ?').get(id);
    return row ? JSON.parse(String(row.data)) : null;
  }
  async getWaitlist(_businessId: string) { return this.waitlist().filter(c => c.status === 'waiting'); }
  async cancelBooking(id: string) {
    const slot = await this.getSlot(id);
    if (!slot || (slot.status === 'replacement' || slot.status === 'alternative') || slot.feeStatus === 'waived') throw new Error('This booking cannot be cancelled in this demo.');
    if (slot.status === 'cancelled') return;
    this.save({ ...slot, status: 'cancelled', feeStatus: 'pending' });
    this.log(`${slot.customerName} cancelled ${localTime(slot.startsAt)}. $${slot.cancellationFeeCents / 100} cancellation fee pending refill.`, { kind: 'cancelled', source: 'calendar', slotId: id, customerName: slot.customerName, startsAt: slot.startsAt, durationMinutes: slot.durationMinutes });
  }
  async availableTimes(id: string) {
    const slot = await this.getSlot(id);
    if (!slot) return [];
    const candidates = [0, 30].map(minutes => new Date(Date.parse(slot.startsAt) + minutes * 60_000).toISOString());
    const available: string[] = [];
    for (const candidate of candidates) if (await this.isAvailable(id, candidate)) available.push(candidate);
    return available;
  }
  // The original refill window is deliberately narrow; every other available
  // appointment is a separate booking and cannot recover this cancellation.
  isRefillStart(slot: DemoBooking, startsAt: string) {
    return [0, 30 * 60_000].includes(Date.parse(startsAt) - Date.parse(slot.startsAt));
  }
  async searchAvailability(id: string, query: AvailabilityRequest): Promise<AvailableSlot[]> {
    const slot = await this.getSlot(id);
    const date = query.date ?? (slot ? localDate(slot.startsAt) : DEMO_DATE);
    if (!slot || !validDemoDate(date)) return [];
    const times = candidateTimes(query.partOfDay);
    // Offer nearest real alternatives when the requested time collides.
    if (query.time) times.sort((a, b) => Math.abs(Date.parse(demoTime(a, date)) - Date.parse(demoTime(query.time!, date)))
      - Math.abs(Date.parse(demoTime(b, date)) - Date.parse(demoTime(query.time!, date))));
    return times.filter(time => this.availability(id, demoTime(time, date)).available).slice(0, 6).map(time => ({
      date, time, startsAt: demoTime(time, date), endsAt: new Date(Date.parse(demoTime(time, date)) + slot.durationMinutes * 60_000).toISOString(),
      spokenDate: spokenCalendarDate(date),
    }));
  }
  availability(id: string, startsAt: string): { available: boolean; reason: string; conflict?: { bookingId: string; customerName: string; startsAt: string; durationMinutes: number } } {
    const slot = this.readSlot(id);
    if (!slot || slot.status !== 'cancelled' || slot.feeStatus === 'waived') return { available: false, reason: 'This offer is no longer active.' };
    const start = Date.parse(startsAt), end = start + slot.durationMinutes * 60_000;
    if (!Number.isFinite(start)) return { available: false, reason: 'Invalid appointment time.' };
    const date = localDate(startsAt);
    if (!validDemoDate(date)) return { available: false, reason: `Choose a day from ${DEMO_DATE} through ${DEMO_LAST_DATE}.` };
    if (start < Date.parse(demoTime('09:00', date)) || end > Date.parse(demoTime('18:00', date))) return { available: false, reason: 'The appointment must fit within business hours, 9 AM to 6 PM.' };
    const conflict = this.bookings().find(b => b.businessId === slot.businessId && b.status !== 'cancelled' && start < Date.parse(b.startsAt) + b.durationMinutes * 60_000 && end > Date.parse(b.startsAt));
    if (conflict) return { available: false, reason: 'That time overlaps another appointment.', conflict: { bookingId: conflict.id, customerName: conflict.customerName, startsAt: conflict.startsAt, durationMinutes: conflict.durationMinutes } };
    return { available: true, reason: 'The full service fits in the shared calendar. No booking made.' };
  }
  async isAvailable(id: string, startsAt: string) { return this.availability(id, startsAt).available; }
  async bookReplacement(input: { slotId: string; contactId: string; startsAt: string; idempotencyKey: string }) {
    // No awaits between availability validation and INSERT: transaction also
    // protects against a second connection writing to the shared SQLite file.
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const existing = this.db.prepare('SELECT data FROM bookings WHERE idempotency_key = ?').get(input.idempotencyKey);
      if (existing) {
        const booking = JSON.parse(String(existing.data)) as DemoBooking;
        if (booking.customerId !== input.contactId || Date.parse(booking.startsAt) !== Date.parse(input.startsAt)) throw new Error('Idempotency key already used for another booking');
        this.db.exec('COMMIT');
        return { bookingId: booking.id, kind: booking.status === 'alternative' ? 'alternative' as const : 'replacement' as const };
      }
      if (!this.availability(input.slotId, input.startsAt).available) throw new Error('Time no longer available');
      const slot = this.readSlot(input.slotId)!;
      const client = this.waitlist().find(c => c.id === input.contactId && c.status === 'waiting');
      if (!client) throw new Error('Contact is no longer waiting');
      const bookingId = `booking_${randomUUID()}`;
      const kind = this.isRefillStart(slot, input.startsAt) ? 'replacement' as const : 'alternative' as const;
      this.save({ ...slot, id: bookingId, startsAt: input.startsAt, customerId: client.id, customerName: client.name,
        status: kind, feeStatus: 'not_due', ...(kind === 'replacement' ? { replacesSlotId: slot.id } : {}) }, input.idempotencyKey);
      this.db.prepare('UPDATE clients SET booked = 1 WHERE id = ?').run(client.id);
      this.log(`Booked ${client.name} on ${localDate(input.startsAt)} at ${localTime(input.startsAt)}. ${kind === 'replacement' ? 'Replacement saved to the demo calendar.' : 'Separate appointment saved; original gap and cancellation fee remain pending.'}`, { kind: kind === 'alternative' ? 'alternative_booked' : 'booking_saved', source: 'calendar', slotId: slot.id, customerName: client.name, startsAt: input.startsAt, durationMinutes: slot.durationMinutes, bookingId, amountCents: slot.priceCents });
      this.db.exec('COMMIT');
      return { bookingId, kind };
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  private readSlot(id: string): DemoBooking | null {
    const row = this.db.prepare('SELECT data FROM bookings WHERE id = ?').get(id);
    return row ? JSON.parse(String(row.data)) : null;
  }
  async waiveCancellationFee(id: string) {
    const slot = await this.getSlot(id);
    if (!slot || !this.bookings().some(b => b.status === 'replacement' && b.replacesSlotId === id && this.isRefillStart(slot, b.startsAt))) throw new Error('A replacement must exist before waiving the fee');
    if (slot.feeStatus === 'waived') return;
    this.save({ ...slot, feeStatus: 'waived' });
    this.log(`${slot.customerName}’s $${slot.cancellationFeeCents / 100} cancellation fee waived. Slot successfully refilled.`, { kind: 'fee_waived', source: 'calendar', slotId: id, customerName: slot.customerName, amountCents: slot.cancellationFeeCents });
  }
  private save(booking: DemoBooking, key: string | null = null) {
    this.db.prepare('INSERT INTO bookings (id,data,idempotency_key) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET data = excluded.data').run(booking.id, JSON.stringify(booking), key);
  }
}
