import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { BookingRepository } from './index.js';
import type { DemoAction, DemoBooking, DemoDashboard, DemoEvent } from '@dispatch/contracts';

export const TIMEZONE = 'America/Los_Angeles';

const localDate = (at: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);

// The demo day is tomorrow in the shop's timezone, so every offered time is still
// in the future however late in the day the demo runs.
export function demoDate(now = new Date()): string {
  const day = new Date(`${localDate(now)}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + 1);
  return day.toISOString().slice(0, 10);
}

// Real offset for that date, so the seeded times survive a DST change.
function utcOffset(date: string): string {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE, timeZoneName: 'longOffset' })
    .formatToParts(new Date(`${date}T12:00:00Z`))
    .find((part) => part.type === 'timeZoneName')?.value ?? 'GMT';
  return name.replace('GMT', '') || '+00:00';
}

export const DEMO_DATE = demoDate();
const DEMO_OFFSET = utcOffset(DEMO_DATE);
export const demoTime = (time: string) => `${DEMO_DATE}T${time}:00${DEMO_OFFSET}`;
export const localTime = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit' });

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
    if (!slot || slot.status === 'replacement' || slot.feeStatus === 'waived') throw new Error('This booking cannot be cancelled in this demo.');
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
  async availability(id: string, startsAt: string) {
    const slot = await this.getSlot(id);
    if (!slot || slot.status !== 'cancelled' || slot.feeStatus === 'waived') return { available: false, reason: 'This opening is no longer available.' };
    const start = Date.parse(startsAt), end = start + slot.durationMinutes * 60_000;
    // Report real overlaps even when a requested start is outside the offered alternatives.
    const conflict = this.bookings().find(b => b.status !== 'cancelled' && start < Date.parse(b.startsAt) + b.durationMinutes * 60_000 && end > Date.parse(b.startsAt));
    if (conflict) return { available: false, reason: `Overlaps ${conflict.customerName}’s ${localTime(conflict.startsAt)} booking.`,
      conflict: { bookingId: conflict.id, customerName: conflict.customerName, startsAt: conflict.startsAt, durationMinutes: conflict.durationMinutes } };
    const delta = start - Date.parse(slot.startsAt);
    if (![0, 30 * 60_000].includes(delta) || start < Date.parse(demoTime('09:00')) || end > Date.parse(demoTime('18:00'))) return { available: false, reason: 'Outside the available start times for this opening.' };
    return { available: true, reason: `${slot.durationMinutes} minutes available. No booking made.` };
  }
  async isAvailable(id: string, startsAt: string) {
    return (await this.availability(id, startsAt)).available;
  }
  async bookReplacement(input: { slotId: string; contactId: string; startsAt: string; idempotencyKey: string }) {
    const existing = this.db.prepare('SELECT id FROM bookings WHERE idempotency_key = ?').get(input.idempotencyKey);
    if (existing) return { bookingId: String(existing.id) };
    if (!await this.isAvailable(input.slotId, input.startsAt)) throw new Error('Time no longer available');
    const slot = (await this.getSlot(input.slotId))!;
    const client = this.waitlist().find(c => c.id === input.contactId && c.status === 'waiting');
    if (!client) throw new Error('Contact is no longer waiting');
    const bookingId = `booking_${randomUUID()}`;
    this.db.exec('BEGIN');
    try {
      this.save({ ...slot, id: bookingId, startsAt: input.startsAt, customerId: client.id, customerName: client.name, status: 'replacement', feeStatus: 'not_due', replacesSlotId: slot.id }, input.idempotencyKey);
      this.db.prepare('UPDATE clients SET booked = 1 WHERE id = ?').run(client.id);
      this.log(`Booked ${client.name} at ${localTime(input.startsAt)}. Replacement saved to the demo calendar.`, { kind: 'booking_saved', source: 'calendar', slotId: slot.id, customerName: client.name, startsAt: input.startsAt, durationMinutes: slot.durationMinutes, bookingId, amountCents: slot.priceCents });
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
    return { bookingId };
  }
  async waiveCancellationFee(id: string) {
    const slot = await this.getSlot(id);
    if (!slot || !this.bookings().some(b => b.replacesSlotId === id)) throw new Error('A replacement must exist before waiving the fee');
    if (slot.feeStatus === 'waived') return;
    this.save({ ...slot, feeStatus: 'waived' });
    this.log(`${slot.customerName}’s $${slot.cancellationFeeCents / 100} cancellation fee waived. Slot successfully refilled.`, { kind: 'fee_waived', source: 'calendar', slotId: id, customerName: slot.customerName, amountCents: slot.cancellationFeeCents });
  }
  private save(booking: DemoBooking, key: string | null = null) {
    this.db.prepare('INSERT INTO bookings (id,data,idempotency_key) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET data = excluded.data').run(booking.id, JSON.stringify(booking), key);
  }
}
