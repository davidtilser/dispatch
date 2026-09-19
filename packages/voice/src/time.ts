// Speech formatting for dates the voice agent reads aloud.

// "2026-09-20" in America/Los_Angeles -> "tomorrow".
// Only the spoken copy changes; stored dates stay ISO for the UI and demoTime.
export function spokenDate(date: string, timeZone: string, now = new Date()): string {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const day = Number(date.slice(8, 10));
  // The date is already a calendar date in timeZone, so read its parts as UTC
  // rather than projecting it through the zone a second time.
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'long', month: 'long' })
    .formatToParts(new Date(Date.UTC(year, month - 1, day)));
  const weekday = parts.find((part) => part.type === 'weekday')?.value ?? '';
  const monthName = parts.find((part) => part.type === 'month')?.value ?? '';
  const spoken = `${weekday}, ${monthName} ${ordinal(day)}`;
  const today = localDate(now, timeZone);
  if (date === today) return 'today';
  // Advance the local calendar date; a local day can be 23 or 25 hours.
  const tomorrow = new Date(`${today}T00:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  if (date === tomorrow.toISOString().slice(0, 10)) return 'tomorrow';
  return spoken;
}

function localDate(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
}

function ordinal(day: number): string {
  const teen = day % 100;
  if (teen >= 11 && teen <= 13) return `${day}th`;
  return `${day}${['th', 'st', 'nd', 'rd'][day % 10] ?? 'th'}`;
}

export function spokenTime(time: string): string {
  const [hour, minute] = time.split(':').map(Number);
  return `${hour! % 12 || 12}${minute ? `:${String(minute).padStart(2, '0')}` : ''} ${hour! < 12 ? 'AM' : 'PM'}`;
}
