/**
 * server/src/domain/intervals.ts
 *
 * Half-open interval helpers. [start, end)
 * Overlap iff s1 < e2 && s2 < e1.
 * Back-to-back (s1 == e2 or s2 == e1) is allowed.
 */

/** Returns true if two half-open intervals [s1,e1) and [s2,e2) overlap. */
export function overlaps(s1: string, e1: string, s2: string, e2: string): boolean {
  return s1 < e2 && s2 < e1;
}

/** Returns true if two half-open intervals are exactly touching (back-to-back). */
export function touching(s1: string, e1: string, s2: string, e2: string): boolean {
  return e1 === s2 || e2 === s1;
}

/** Add `minutes` to an ISO string, return ISO string. */
export function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

/** Subtract `minutes` from an ISO string, return ISO string. */
export function subMinutes(iso: string, minutes: number): string {
  return addMinutes(iso, -minutes);
}

/** Return ms between two ISO strings (end - start). May be negative. */
export function durationMs(start: string, end: string): number {
  return new Date(end).getTime() - new Date(start).getTime();
}

/** Floor an ISO string to the nearest 30-minute boundary. */
export function floorTo30(iso: string): string {
  const d = new Date(iso);
  const minutes = d.getUTCMinutes();
  const floored = minutes < 30 ? 0 : 30;
  d.setUTCMinutes(floored, 0, 0);
  return d.toISOString();
}

/** Generate an array of 30-min slot starts between `from` and `to` (exclusive of `to`). */
export function thirtyMinSlots(from: string, to: string): string[] {
  const slots: string[] = [];
  let cur = new Date(floorTo30(from)).getTime();
  const end = new Date(to).getTime();
  while (cur < end) {
    slots.push(new Date(cur).toISOString());
    cur += 30 * 60_000;
  }
  return slots;
}
