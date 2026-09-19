import type { AvailabilityRequest } from '@dispatch/contracts';

export const DEMO_DATE = '2026-09-19';
export const DEMO_LAST_DATE = '2026-09-25';
export const BUSINESS_TIMEZONE = 'America/Los_Angeles';
// Fixed September demo horizon is entirely PDT. Do not extend it over DST without
// replacing this conversion with timezone-aware local-to-instant conversion.
export const demoTime = (time: string, date = DEMO_DATE) => `${date}T${time}:00-07:00`;
export const localDate = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: BUSINESS_TIMEZONE });
export const localTime = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { timeZone: BUSINESS_TIMEZONE, hour: '2-digit', minute: '2-digit' });
export function validDemoDate(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= DEMO_DATE && date <= DEMO_LAST_DATE
    && new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) === date;
}
export function spokenCalendarDate(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric' });
}
// Demo business hours: daily 09:00–18:00, starts on a 15-minute grid.
export function candidateTimes(partOfDay?: AvailabilityRequest['partOfDay']) {
  const range = partOfDay === 'morning' ? [9, 12] : partOfDay === 'afternoon' ? [12, 17] : partOfDay === 'evening' ? [17, 18] : [9, 18];
  const times: string[] = [];
  for (let minute = range[0]! * 60; minute < range[1]! * 60; minute += 15) {
    times.push(`${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`);
  }
  return times;
}
