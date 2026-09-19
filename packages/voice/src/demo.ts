import { randomUUID } from 'node:crypto';
import { spokenDate, spokenTime } from './time.js';
import type { VoiceDemoContext, VoiceDemoSession } from '@dispatch/contracts';

export function demoContext(now = new Date()): VoiceDemoContext {
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date(now.getTime() + 24 * 60 * 60 * 1000));
  return { businessName: 'Apblendzz', customerName: 'Jordan', service: 'Haircut', price: '$45',
    date, timezone: 'America/Los_Angeles', offeredTime: '15:00', availableTimes: ['15:00', '15:30', '16:00'] };
}

export function dynamicVariables(context: VoiceDemoContext, now = new Date()): Record<string, string> {
  const discount = context.discount?.trim() ?? '';
  return { business_name: context.businessName, customer_name: context.customerName,
    discount, discount_offer: discount ? ` This opening includes a discount: ${discount}.` : '',
    service: context.service, price: context.price, reference_date: context.referenceDate ?? new Intl.DateTimeFormat('en-CA', { timeZone: context.timezone }).format(now), appointment_date: context.date, calendar_start_date: context.calendarStartDate ?? context.date, calendar_end_date: context.calendarEndDate ?? context.date, date: spokenDate(context.date, context.timezone, context.referenceDate ? new Date(`${context.referenceDate}T12:00:00-07:00`) : now), timezone: context.timezone,
    offered_time: spokenTime(context.offeredTime), available_times: context.availableTimes.map(spokenTime).join(', ') };
}

export class VoiceSessionError extends Error {}

// Each session has an isolated mock cancelled slot. Replace this adapter with Lucas's
// manager for the shared waitlist. No external calendar or payment side effects.
export class VoiceDemoStore {
  private sessions = new Map<string, { value: VoiceDemoSession; createdAt: number }>();

  create(context: VoiceDemoContext): VoiceDemoSession {
    for (const [id, entry] of this.sessions) {
      if (Date.now() - entry.createdAt > 60 * 60 * 1000) this.sessions.delete(id);
    }
    if (this.sessions.size >= 100) throw new VoiceSessionError('Demo session limit reached. Restart the API.');
    const value: VoiceDemoSession = { id: randomUUID(), context: structuredClone(context), status: 'active', feeWaived: false };
    this.sessions.set(value.id, { value, createdAt: Date.now() });
    return structuredClone(value);
  }

  get(id: string): VoiceDemoSession { return structuredClone(this.find(id)); }

  check(id: string, time: string) {
    const session = this.find(id);
    return { available: session.status === 'active' && session.context.availableTimes.includes(time),
      date: session.context.date, timezone: session.context.timezone, availableTimes: session.status === 'active' ? session.context.availableTimes : [] };
  }

  accept(id: string, time: string): VoiceDemoSession {
    const session = this.find(id);
    if (session.status === 'accepted' && session.booking?.time === time) return structuredClone(session);
    if (session.status !== 'active') throw new VoiceSessionError('This session already ended or has a result.');
    if (!session.context.availableTimes.includes(time)) throw new VoiceSessionError('That time is unavailable. Ask for one of the available times.');
    session.booking = { id: randomUUID(), time };
    session.status = 'accepted';
    session.feeWaived = true;
    return structuredClone(session);
  }

  decline(id: string): VoiceDemoSession {
    const session = this.find(id);
    if (session.status === 'declined') return structuredClone(session);
    if (session.status !== 'active') throw new VoiceSessionError('This session already ended or has a result.');
    session.status = 'declined';
    return structuredClone(session);
  }

  end(id: string, reason: 'ended' | 'failed'): VoiceDemoSession {
    const session = this.find(id);
    // Disconnects and duplicate callbacks must never undo a confirmed booking.
    if (session.status === 'active') session.status = reason;
    return structuredClone(session);
  }

  private find(id: string): VoiceDemoSession {
    const entry = this.sessions.get(id);
    if (!entry) throw new VoiceSessionError('Unknown demo session. Start a new call.');
    return entry.value;
  }
}
