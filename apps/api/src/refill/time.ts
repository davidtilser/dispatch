// Speech formatting for dates the voice agent reads aloud.

// "2026-09-20" in America/Los_Angeles -> "tomorrow, Sunday, September 20th".
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
  if (date === localDate(now, timeZone)) return `today, ${spoken}`;
  if (date === localDate(new Date(now.getTime() + 24 * 60 * 60 * 1000), timeZone)) return `tomorrow, ${spoken}`;
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
