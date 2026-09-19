import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { DemoAction, DemoBooking, DemoDashboard, DemoEvent } from '@dispatch/contracts';
import { CalendarDays, Check, Search, ShieldCheck, Sparkles } from 'lucide-react';
import './live-refill.css';

const money = (cents: number) => `$${cents / 100}`;
const time = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit' });
const endTime = (iso: string, duration: number) => time(new Date(Date.parse(iso) + duration * 60_000).toISOString());
const day = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
const dayLabel = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const firstName = (name: string) => name.split(' ')[0];
const minutes = (iso: string) => { const [h, m] = time(iso).split(':').map(Number); return h! * 60 + m!; };
const clock = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;

export function refillResult(data: DemoDashboard) {
  const original = data.bookings.find(b => b.id === data.run?.slotId);
  const replacement = original ? data.bookings.find(b => b.replacesSlotId === original.id && b.status === 'replacement' && day(b.startsAt) === day(original.startsAt)) : undefined;
  // A finished call or available time is never evidence of a successful refill.
  return original?.feeStatus === 'waived' && replacement ? { original, replacement } : null;
}

export function LiveRefill({ data, layout = 'dashboard', onCancel, busy }: {
  data: DemoDashboard; layout?: 'dashboard' | 'voice'; onCancel?: (slotId: string) => void; busy?: boolean;
}) {
  const original = data.bookings.find(b => b.id === (data.run?.slotId ?? 'slot_3pm'));
  const result = refillResult(data);
  const events = data.events.filter(e => e.action?.slotId === original?.id).sort((a, b) => a.id - b.id);
  const simulated = events.some(e => e.action?.source === 'simulation');
  return <div className={`live-refill live-refill-${layout}`}>
    <div className="refill-story-heading">
      <div><span className="refill-kicker"><Sparkles size={14} />LIVE DISPATCH</span><h2>{result ? 'A new booking. A fee forgiven.' : data.run?.status === 'exhausted' || data.run?.status === 'failed' ? 'Still open. Fee stays pending.' : data.run ? 'An opening. AI at work.' : 'One opening can change the day.'}</h2></div>
      {onCancel && original?.status === 'booked' && <button disabled={busy || data.run?.status === 'calling'} onClick={() => onCancel(original.id)}>Cancel {firstName(original.customerName)}’s {time(original.startsAt)}</button>}
      {layout === 'dashboard' && data.offer && <a href="/voice" target="_blank" rel="noreferrer">Open customer call ↗</a>}
    </div>
    {result && <div className="refill-win" role="status" key={result.replacement.id}>
      <ShieldCheck size={23} aria-hidden="true" /><div><strong>{firstName(result.replacement.customerName)} booked · {money(result.replacement.priceCents)} recovered · {firstName(result.original.customerName)} saved {money(result.original.cancellationFeeCents)}</strong>
      <span>{time(result.replacement.startsAt)}–{endTime(result.replacement.startsAt, result.replacement.durationMinutes)} · Reservation saved and cancellation fee waived{simulated ? ' · Simulated outcome' : ''}</span></div>
    </div>}
    <div className="refill-story-grid">
      <CalendarTimeline data={data} original={original} events={events} />
      <AgentActivity events={events} data={data} />
    </div>
  </div>;
}

function CalendarTimeline({ data, original, events }: { data: DemoDashboard; original?: DemoBooking; events: DemoEvent[] }) {
  const replacement = data.bookings.find(b => original && b.replacesSlotId === original.id && b.status === 'replacement' && day(b.startsAt) === day(original.startsAt));
  const [selectedDay, setSelectedDay] = useState(data.date);
  const dates = [...new Set([...Array.from({ length: 7 }, (_, i) => new Date(Date.parse(`${data.date}T12:00:00Z`) + i * 86_400_000).toISOString().slice(0, 10)), ...data.bookings.map(b => day(b.startsAt))])].sort();
  const activeDay = dates.includes(selectedDay) ? selectedDay : data.date;
  const resetId = data.events.find(event => event.message.startsWith('Demo reset.'))?.id;
  useEffect(() => { if (resetId !== undefined) setSelectedDay(data.date); }, [resetId, data.date]);
  const dayBookings = data.bookings.filter(b => day(b.startsAt) === activeDay);
  const originalOnDay = original && day(original.startsAt) === activeDay ? original : undefined;
  const focus = originalOnDay ?? dayBookings[0];
  const start = Math.max(9 * 60, Math.min(15 * 60, minutes(focus?.startsAt ?? `${activeDay}T15:00:00-07:00`) - 30));
  const span = 180;
  const visible = dayBookings.filter(b => minutes(b.startsAt) < start + span && minutes(b.startsAt) + b.durationMinutes > start);
  const other = dayBookings.filter(b => !visible.includes(b));
  const position = (iso: string, duration: number): CSSProperties => {
    const left = Math.max(start, minutes(iso)), right = Math.min(start + span, minutes(iso) + duration);
    return { left: `${(left - start) / span * 100}%`, width: `${(right - left) / span * 100}%` };
  };
  const collision = [...events].reverse().find(e => e.action?.conflict && e.action.startsAt && day(e.action.startsAt) === activeDay && minutes(e.action.startsAt) < start + span && minutes(e.action.startsAt) + (e.action.durationMinutes ?? 45) > start)?.action;
  const shift = original && replacement ? Math.round((Date.parse(replacement.startsAt) - Date.parse(original.startsAt)) / 60_000) : 0;
  return <section className="refill-calendar" aria-label="Shared calendar timeline">
    <div className="refill-panel-title"><CalendarDays size={17} /><h3>Shared calendar</h3><span>{original?.durationMinutes ?? 45} min · Pacific time</span></div>
    <div className="refill-days" aria-label="Calendar day">{dates.map(date => <button key={date} aria-pressed={date === activeDay} onClick={() => setSelectedDay(date)}>{dayLabel(date)}{date === data.date ? ' · Demo day' : ''}</button>)}</div>
    <div className="refill-other-bookings">{other.map(b => <span key={b.id}>{time(b.startsAt)} <b>{firstName(b.customerName)}</b>{b.status === 'cancelled' ? ' · Cancelled' : ''}</span>)}</div>
    <div className="refill-timeline-scroll"><div className="refill-timeline">
      <div className="refill-time-axis">{Array.from({ length: 7 }, (_, i) => <span key={i} style={{ left: `${i / 6 * 100}%` }}>{clock(start + i * 30)}</span>)}</div>
      <div className="refill-track-label">BOOKED</div>
      <div className="refill-track">
        {visible.filter(b => b.status !== 'cancelled').map(b => <div key={`${b.id}-${b.status}`} className={`refill-time-block ${b.status}`} style={position(b.startsAt, b.durationMinutes)} title={`${b.customerName}: ${time(b.startsAt)}–${endTime(b.startsAt, b.durationMinutes)}`}>
          <strong>{firstName(b.customerName)}</strong><span>{time(b.startsAt)}–{endTime(b.startsAt, b.durationMinutes)}</span>{b.status === 'replacement' && <small>Saved ✓</small>}{b.status === 'alternative' && <small>Separate booking</small>}
        </div>)}
      </div>
      <div className="refill-track-label">{originalOnDay?.status === 'cancelled' ? 'ORIGINAL OPENING' : originalOnDay ? 'OPENING APPEARS AFTER CANCELLATION' : 'SEPARATE DAY · ORIGINAL OPENING UNCHANGED'}</div>
      <div className="refill-track refill-opening-track">
        {originalOnDay?.status === 'cancelled' && <div key={`${originalOnDay.id}-cancelled`} className="refill-time-block cancelled" style={position(originalOnDay.startsAt, originalOnDay.durationMinutes)}><strong>{firstName(originalOnDay.customerName)} cancelled</strong><span>{time(originalOnDay.startsAt)}–{endTime(originalOnDay.startsAt, originalOnDay.durationMinutes)}</span></div>}
      </div>
      {collision?.startsAt && collision.durationMinutes && <>
        <div className="refill-track-label">AVAILABILITY CHECK · NOT BOOKED</div>
        <div className="refill-track refill-conflict-track"><div className="refill-time-block conflict" style={position(collision.startsAt, collision.durationMinutes)}><strong>{time(collision.startsAt)} unavailable</strong><span>Overlaps {time(collision.conflict!.startsAt)}</span></div></div>
      </>}
    </div></div>
    <p className={`refill-calendar-note ${replacement ? 'saved' : ''}`}>{!originalOnDay ? `${dayBookings.length ? 'Bookings on this day' : 'This day has no saved bookings. Reservations here'} do not fill the original opening or waive its fee.` : replacement && original
      ? shift > 0 ? `${firstName(replacement.customerName)} starts ${shift} min later. ${time(original.startsAt)}–${time(replacement.startsAt)} remains open.` : `${firstName(replacement.customerName)} booked the original ${time(original.startsAt)} opening.`
      : original?.status === 'cancelled' ? `${time(original.startsAt)} opening released. No replacement booked yet.` : 'Cancel an appointment to release its time slot.'}</p>
  </section>;
}

function eventLabel(action: DemoAction): string {
  const at = action.startsAt ? time(action.startsAt) : '';
  switch (action.kind) {
    case 'cancelled': return `${at} opening released`;
    case 'offer_prepared': return `${action.customerName} selected`;
    case 'call_started': return 'Browser call session opened';
    case 'availability_checked': return at ? `${at} ${action.available ? 'is available' : 'is unavailable'}` : `${action.available ? 'Availability found' : 'No availability'}${action.date ? ` · ${dayLabel(action.date)}` : ''}`;
    case 'booking_requested': return `${at} booking ${action.available ? 'requested' : 'rejected'}`;
    case 'booking_saved': return `${action.customerName} booked at ${at}`;
    case 'fee_waived': return `${action.customerName}’s fee waived`;
    case 'call_ended': return action.outcome === 'declined' ? `${action.customerName} declined` : 'Call ended without a booking';
    case 'alternative_booked': return `${action.customerName} booked ${action.startsAt ? dayLabel(day(action.startsAt)) : 'another day'} at ${at}`;
    case 'simulated_outcome': return `Simulated outcome: ${action.outcome}`;
  }
}
function eventDetail(event: DemoEvent): string {
  const action = event.action!;
  if (action.kind === 'availability_checked') return action.reason ?? event.message;
  if (action.kind === 'booking_requested' && action.available) return 'accept_slot received · Waiting for a saved reservation.';
  if (action.kind === 'alternative_booked') return 'Separate reservation saved · Original opening and cancellation fee unchanged.';
  if (action.kind === 'booking_saved') return `Saved to the shared calendar · ${money(action.amountCents ?? 0)} recovered.`;
  if (action.kind === 'fee_waived') return `${money(action.amountCents ?? 0)} saved · Replacement verified in the calendar.`;
  return event.message;
}

function AgentActivity({ events, data }: { events: DemoEvent[]; data: DemoDashboard }) {
  const log = useRef<HTMLOListElement>(null);
  const lastEvent = events.at(-1)?.id;
  useEffect(() => { if (log.current) log.current.scrollTop = log.current.scrollHeight; }, [lastEvent]);
  return <section className="refill-actions" aria-label="Live agent actions">
    <div className="refill-panel-title"><Sparkles size={17} /><h3>Agent actions</h3><span>{data.offer?.sessionActive ? 'Call in progress' : data.offer ? 'Call ready' : data.run?.status === 'exhausted' ? 'No booking' : 'Backend activity'}</span></div>
    <p className="refill-actions-caption">Real tool results and calendar updates</p>
    <ol ref={log} className="refill-action-list" role="log" aria-live="polite" aria-relevant="additions">
      {events.length ? events.map(event => {
        const action = event.action!;
        const tone = action.available === false || action.kind === 'call_ended' ? 'warning' : action.kind === 'booking_saved' || action.kind === 'fee_waived' ? 'success' : 'neutral';
        return <li key={event.id} className={`refill-action ${tone}`}><span className="refill-action-icon">{tone === 'success' ? <Check size={15} /> : <Search size={14} />}</span><div><strong>{eventLabel(action)}{action.startsAt && day(action.startsAt) !== data.date && action.kind !== 'alternative_booked' ? ` · ${dayLabel(day(action.startsAt))}` : ''}</strong><p>{eventDetail(event)}</p></div><time dateTime={event.time}>{new Date(event.time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: data.timezone })}</time></li>;
      }) : <li className="refill-empty">Waiting for a cancellation.<br />Actions appear here when the backend performs them.</li>}
    </ol>
    {data.run?.status === 'exhausted' && <p className="refill-unfilled">Waitlist exhausted · Opening remains unfilled · Fee pending</p>}
  </section>;
}
