// Helpers to move between ISO timestamps (manager) and local HH:mm (voice agent).

export function localDate(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
}

export function localHHmm(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));
}

// "2026-09-20" + "15:30" in America/Los_Angeles -> "2026-09-20T15:30:00-07:00"
export function toIso(date: string, hhmm: string, timeZone: string): string {
  return `${date}T${hhmm}:00${utcOffset(date, timeZone)}`;
}

export function tomorrow(timeZone: string, now = new Date()): string {
  return localDate(new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(), timeZone);
}

function utcOffset(date: string, timeZone: string): string {
  const name = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
    .formatToParts(new Date(`${date}T12:00:00Z`))
    .find((part) => part.type === 'timeZoneName')?.value ?? 'GMT';
  const offset = name.replace('GMT', '');
  return offset === '' ? '+00:00' : offset;
}
