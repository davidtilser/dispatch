/**
 * server/src/domain/availability.ts
 *
 * 30-minute availability grid for a business resource.
 * Availability = business hours grid minus confirmed bookings and unexpired holds.
 */

import type { Business } from '@getitdone/shared/types.js';
import type { Store } from './store.js';
import { overlaps, addMinutes, thirtyMinSlots } from './intervals.js';

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
type DayKey = (typeof DAY_KEYS)[number];

/**
 * Returns an array of ISO strings representing the starts of 30-min available
 * slots for a given resource, within the query window [windowStart, windowEnd).
 *
 * @param business  Business to check hours for
 * @param resourceId  Specific resource (chair, bay, etc.)
 * @param windowStart  ISO string — start of search window
 * @param windowEnd    ISO string — end of search window (exclusive)
 * @param store       Store instance
 * @param nowMs       Current time in ms (for hold expiry checks)
 */
export function availableSlots(
  business: Business,
  resourceId: string,
  windowStart: string,
  windowEnd: string,
  store: Store,
  nowMs: number,
): string[] {
  // Validate resource exists
  if (!business.resources.some(r => r.id === resourceId)) return [];

  const confirmedBookings = store.confirmedBookingsForResource(resourceId);
  const activeHolds = store.activeHoldsForResource(resourceId, nowMs);

  const result: string[] = [];

  for (const slotStart of thirtyMinSlots(windowStart, windowEnd)) {
    const slotEnd = addMinutes(slotStart, 30);

    // ── Check business hours ────────────────────────────────────────────────
    const d = new Date(slotStart);
    const dayKey = DAY_KEYS[d.getUTCDay()] as DayKey;
    const dayHours = business.hours[dayKey];
    if (!dayHours) continue; // closed this day

    // Parse open/close as HH:MM on same calendar date (UTC for simplicity)
    const [openH, openM] = dayHours.open.split(':').map(Number) as [number, number];
    const [closeH, closeM] = dayHours.close.split(':').map(Number) as [number, number];
    const datePrefix = slotStart.slice(0, 10); // "YYYY-MM-DD"
    const openTime = `${datePrefix}T${pad(openH)}:${pad(openM)}:00.000Z`;
    const closeTime = `${datePrefix}T${pad(closeH)}:${pad(closeM)}:00.000Z`;

    if (slotStart < openTime || slotEnd > closeTime) continue;

    // ── Check confirmed bookings ───────────────────────────────────────────
    if (confirmedBookings.some(b => overlaps(slotStart, slotEnd, b.start, b.end))) continue;

    // ── Check active holds ────────────────────────────────────────────────
    if (activeHolds.some(h => overlaps(slotStart, slotEnd, h.start, h.end))) continue;

    result.push(slotStart);
  }

  return result;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
