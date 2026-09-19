import { ConflictException, Inject, Injectable, NotFoundException, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { DispatchManager } from '@dispatch/agents';
import { SqliteBookings, DEMO_DATE, DEMO_LAST_DATE, demoTime, localTime, localDate, validDemoDate, spokenCalendarDate } from '@dispatch/data';
import type { AcceptRequest, AvailabilityRequest, AvailabilityResult, CallOutcome, CallRequest, DemoDashboard, VoiceDemoContext, VoiceDemoSession } from '@dispatch/contracts';
import { randomUUID } from 'node:crypto';
import { DemoVoice } from './demo-voice.js';
import { BOOKINGS, MANAGER, VOICE } from './tokens.js';

// Serializes demo mutations around the existing manager, including cross-tab tool calls.
@Injectable()
export class DemoCoordinator implements OnModuleInit, OnModuleDestroy {
  private queue: Promise<unknown> = Promise.resolve();
  private runId: string | null = null;
  private sessions = new Map<string, { value: VoiceDemoSession; call: CallRequest; connected: boolean }>();
  constructor(@Inject(BOOKINGS) readonly bookings: SqliteBookings,
    @Inject(MANAGER) readonly manager: DispatchManager,
    @Inject(VOICE) readonly voice: DemoVoice) {}

  async onModuleInit() {
    // Bookings survive API restarts; in-flight browser offers restart from the waitlist.
    for (const slot of this.bookings.bookings()) {
      if (slot.status !== 'cancelled' || slot.feeStatus !== 'pending') continue;
      if (this.bookings.bookings().some(b => b.replacesSlotId === slot.id)) await this.bookings.waiveCancellationFee(slot.id);
      else { this.runId = (await this.manager.startRefill(slot.id)).id; break; }
    }
  }
  onModuleDestroy() { this.bookings.close(); }
  private serial<T>(fn: () => Promise<T>): Promise<T> {
    const result = this.queue.then(fn);
    this.queue = result.catch(() => {});
    return result;
  }
  async currentCall() {
    const run = this.runId ? await this.manager.getRun(this.runId) : null;
    const call = run?.activeAttemptId ? this.voice.latestFor(run.id) : undefined;
    return call?.attemptId === run?.activeAttemptId ? call : undefined;
  }
  private async context(call: CallRequest): Promise<VoiceDemoContext> {
    return { businessName: call.business.name, customerName: call.contact.name, service: call.slot.service,
      price: `$${call.slot.priceCents / 100}`, discount: call.slot.discount, date: localDate(call.slot.startsAt), referenceDate: localDate(new Date()), calendarStartDate: DEMO_DATE, calendarEndDate: DEMO_LAST_DATE, timezone: call.business.timezone,
      offeredTime: localTime(call.slot.startsAt), availableTimes: (await this.bookings.availableTimes(call.slot.id)).map(localTime) };
  }
  configuration() {
    return this.serial(async () => {
      const call = await this.currentCall();
      return { context: call ? await this.context(call) : null, attemptId: call?.attemptId ?? null, callActive: [...this.sessions.values()].some(s => s.connected) };
    });
  }
  dashboard(): Promise<DemoDashboard> {
    return this.serial(async () => {
      const call = await this.currentCall();
      return { businessName: 'Apblendzz', date: DEMO_DATE, timezone: 'America/Los_Angeles',
        bookings: this.bookings.bookings(), waitlist: this.bookings.waitlist(), events: this.bookings.events(),
        run: this.runId ? await this.manager.getRun(this.runId) : null,
        offer: call ? { attemptId: call.attemptId, customerName: call.contact.name, service: call.slot.service, time: localTime(call.slot.startsAt),
          sessionActive: [...this.sessions.values()].some(s => s.connected && s.call.attemptId === call.attemptId) } : null };
    });
  }
  cancel(slotId: string) {
    return this.serial(async () => {
      const existing = this.runId ? await this.manager.getRun(this.runId) : null;
      if (existing?.slotId === slotId) return existing;
      if (existing?.status === 'calling' || existing?.status === 'pending') throw new ConflictException('Finish the active refill or reset the demo first.');
      const slot = await this.bookings.getSlot(slotId);
      if (!slot) throw new NotFoundException('Booking not found');
      if (slot.status !== 'booked') throw new ConflictException('Only original bookings can be cancelled. Reset to repeat.');
      // A confirmed/declined call can still have audio connected. Its tools stay terminal.
      const run = await this.manager.startRefill(slotId);
      this.runId = run.id;
      return run;
    });
  }
  reset() {
    return this.serial(async () => {
      this.manager.reset(); this.voice.calls.length = 0; this.sessions.clear(); this.runId = null;
      this.bookings.reset();
      return { ok: true };
    });
  }
  createSession(attemptId?: string) {
    return this.serial(async () => {
      const call = await this.currentCall();
      if (!call) throw new ConflictException('Cancel an appointment on the shop dashboard first.');
      if (attemptId && attemptId !== call.attemptId) throw new ConflictException('This offer changed. Refresh the call context and try again.');
      if ([...this.sessions.values()].some(s => s.connected)) throw new ConflictException('A web call is already active. End it or reset the demo.');
      const value: VoiceDemoSession = { id: randomUUID(), context: await this.context(call), managerBrief: call.brief, status: 'active', feeWaived: false };
      this.sessions.set(value.id, { value, call, connected: true });
      this.bookings.log(`Browser session opened for ${call.contact.name}. Waiting for booking agreement.`, { kind: 'call_started', source: 'voice_tool', slotId: call.slot.id, customerName: call.contact.name });
      return structuredClone(value);
    });
  }
  private find(id: string) {
    const session = this.sessions.get(id);
    if (!session) throw new NotFoundException('Unknown session. The demo may have been reset.');
    return session;
  }
  get(id: string) { return this.serial(async () => structuredClone(this.find(id).value)); }
  private async active(id: string) {
    const entry = this.find(id);
    if (entry.value.status !== 'active' || (await this.currentCall())?.attemptId !== entry.call.attemptId) throw new ConflictException('This offer is no longer active.');
    return entry;
  }
  check(id: string, input: AvailabilityRequest | string): Promise<AvailabilityResult> {
    return this.serial(async () => {
      const { call, value } = await this.active(id);
      const query = typeof input === 'string' ? { time: input } : input;
      const date = query.date ?? value.context.date;
      const availableSlots = await this.bookings.searchAvailability(call.slot.id, { ...query, date });
      const checked = query.time ? this.bookings.availability(call.slot.id, demoTime(query.time, date)) : undefined;
      const available = checked?.available ?? availableSlots.length > 0;
      const message = !validDemoDate(date) ? `Choose a date from ${DEMO_DATE} through ${DEMO_LAST_DATE}.`
        : checked?.reason ?? (available ? 'These starts are available. Ask the customer to agree to an exact day and time before booking.' : 'No appointments are available in that part of the day. Ask about another day or time.');
      this.bookings.log(`Agent checked ${date} ${query.time ?? query.partOfDay ?? 'all day'} for ${call.contact.name}: ${available ? 'available' : 'unavailable'} (${call.slot.durationMinutes} minutes).`, { kind: 'availability_checked', source: 'voice_tool', slotId: call.slot.id, customerName: call.contact.name, date, ...(query.time ? { startsAt: demoTime(query.time, date) } : {}), durationMinutes: call.slot.durationMinutes, available, reason: message, ...(checked?.conflict ? { conflict: checked.conflict } : {}) });
      return { available, date, referenceDate: value.context.referenceDate!, timezone: value.context.timezone,
        availableTimes: availableSlots.map(slot => slot.time), availableSlots, message };
    });
  }
  accept(id: string, input: AcceptRequest | string) {
    return this.serial(async () => {
      const previous = this.find(id).value;
      const request = typeof input === 'string' ? { time: input } : input;
      const { time } = request;
      const date = request.date ?? previous.context.date;
      if (request.confirmed === false || (request.date && request.confirmed !== true)) throw new ConflictException('Obtain explicit agreement to the exact day and time before booking.');
      if ((previous.status === 'accepted' || previous.status === 'alternative_booked') && previous.booking?.time === time && previous.booking.date === date) return structuredClone(previous);
      const { call, value } = await this.active(id);
      const startsAt = demoTime(time, date);
      const availability = this.bookings.availability(call.slot.id, startsAt);
      this.bookings.log(`Booking requested for ${call.contact.name} on ${date} at ${time}. ${availability.reason}`, { kind: 'booking_requested', source: 'voice_tool', slotId: call.slot.id, customerName: call.contact.name, startsAt, durationMinutes: call.slot.durationMinutes, ...availability });
      if (!availability.available) throw new ConflictException('That time is unavailable. Ask for one of the available times.');
      const run = await this.manager.recordCallOutcome({ runId: call.runId, attemptId: call.attemptId, outcome: { type: 'accepted', startsAt } });
      const details = await this.manager.getRunDetails(run.id);
      const attempt = details?.attempts.find(a => a.attemptId === call.attemptId);
      const alternative = attempt?.outcome?.type === 'alternative_booked';
      if (!attempt?.bookingId || (!alternative && run.status !== 'filled')) throw new ConflictException('The booking could not be confirmed.');
      value.status = alternative ? 'alternative_booked' : 'accepted';
      value.booking = { id: attempt.bookingId, time, date, startsAt, spokenDate: spokenCalendarDate(date), kind: alternative ? 'alternative' : 'replacement' };
      value.feeWaived = !alternative && run.feeWaived;
      return structuredClone(value);
    });
  }
  end(id: string, reason: 'ended' | 'failed' | 'declined') {
    return this.serial(async () => {
      const entry = this.find(id);
      const { call, value } = entry;
      if (reason !== 'declined') entry.connected = false;
      if (value.status !== 'active') return structuredClone(value);
      value.status = reason;
      this.bookings.log(`${call.contact.name}: ${reason === 'declined' ? 'declined the offer' : 'call ended without a booking'}. Fee remains pending.`, { kind: 'call_ended', source: 'voice_tool', slotId: call.slot.id, customerName: call.contact.name, outcome: reason });
      await this.manager.recordCallOutcome({ runId: call.runId, attemptId: call.attemptId,
        outcome: reason === 'declined' ? { type: 'declined' } : { type: 'no_answer' } });
      return structuredClone(value);
    });
  }
  // Explicit mock outcome endpoint, retained for Lucas's manager demo.
  simulate(runId: string, outcome: CallOutcome) {
    return this.serial(async () => {
      const run = await this.manager.getRun(runId);
      if (!run?.activeAttemptId) throw new ConflictException('No call in progress');
      if ([...this.sessions.values()].some(s => s.connected)) throw new ConflictException('End the live web call before simulating an outcome.');
      this.bookings.log(`Simulated call outcome: ${outcome.type}.`, { kind: 'simulated_outcome', source: 'simulation', slotId: run.slotId, outcome: outcome.type });
      return this.manager.recordCallOutcome({ runId, attemptId: run.activeAttemptId, outcome });
    });
  }
}
