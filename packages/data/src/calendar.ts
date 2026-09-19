import type { AvailabilityRequest } from '@dispatch/contracts';

export const BUSINESS_TIMEZONE = 'America/Los_Angeles';
export const TIMEZONE = BUSINESS_TIMEZONE;
export const localDate = (iso: string | Date) => new Date(iso).toLocaleDateString('en-CA', { timeZone: BUSINESS_TIMEZONE });
export const localTime = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { timeZone: BUSINESS_TIMEZONE, hour: '2-digit', minute: '2-digit' });
export function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export const demoDate = (now = new Date()) => addDays(localDate(now), 1);
// Preserve the main demo's future seed; relative speech uses the session's actual
// business-local reference day. The search horizon is seven calendar days.
export const DEMO_DATE = demoDate();
export const DEMO_LAST_DATE = addDays(DEMO_DATE, 6);
export function demoTime(time: string, date = DEMO_DATE) {
  // Business hours are after LA's 2 AM DST transition. Noon has the same offset.
  const zone = new Intl.DateTimeFormat('en-US', { timeZone: BUSINESS_TIMEZONE, timeZoneName: 'longOffset' })
    .formatToParts(new Date(`${date}T12:00:00Z`)).find(part => part.type === 'timeZoneName')?.value ?? 'GMT';
  const offset = zone.replace('GMT', '') || '+00:00';
  return `${date}T${time}:00${offset}`;
}
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
