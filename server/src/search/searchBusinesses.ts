/**
 * server/src/search/searchBusinesses.ts
 *
 * The end-to-end business search pipeline:
 *
 *   1. provider.search({category, lat, lng, radiusMiles})
 *   2. sanitizeBusiness() every result, dropping invalid ones
 *   3. compute haversine distanceMiles from the search origin
 *   4. drop anything outside radiusMiles (authoritative cutoff — the
 *      provider's own filtering is only a coarse pre-filter)
 *   5. sort by distanceMiles ascending — the ONLY sort
 *   6. compute fullyBooked/nextOpening per business (via domain
 *      availability), since the hasOpeningsToday filter needs it
 *   7. apply filters, in order: priceLevels, minRating, openNow,
 *      hasOpeningsToday, services — filtering preserves the distance sort
 */

import type { Business, BusinessSearchFilters, BusinessSearchResult } from '@getitdone/shared/types.js';
import { availableSlots, isOpenAt } from '../domain/availability.js';
import type { Store } from '../domain/store.js';
import type { BusinessProvider, BusinessSearchParams } from '../providers/BusinessProvider.js';
import { distanceMiles } from './haversine.js';
import { sanitizeBusiness } from './sanitize.js';

/** How many days ahead to look for nextOpening before giving up. */
const NEXT_OPENING_HORIZON_DAYS = 7;

export interface SearchBusinessesParams extends BusinessSearchParams {
  filters?: BusinessSearchFilters;
}

export async function searchBusinesses(
  provider: BusinessProvider,
  store: Store,
  params: SearchBusinessesParams,
  nowMs: number = Date.now(),
): Promise<BusinessSearchResult[]> {
  const { category, lat, lng, radiusMiles, filters } = params;

  const raw = await provider.search({ category, lat, lng, radiusMiles });

  const sanitized = raw
    .map(sanitizeBusiness)
    .filter((b): b is Business => b !== null);

  const withinRadius = sanitized
    .map(b => ({ business: b, distanceMiles: distanceMiles(lat, lng, b.lat, b.lng) }))
    .filter(({ distanceMiles: d }) => d <= radiusMiles);

  // The ONLY sort in this pipeline.
  withinRadius.sort((a, b) => a.distanceMiles - b.distanceMiles);

  const augmented: BusinessSearchResult[] = withinRadius.map(({ business, distanceMiles: d }) => {
    const { fullyBooked, nextOpening } = computeAvailability(business, store, nowMs);
    return { ...business, distanceMiles: d, fullyBooked, ...(nextOpening ? { nextOpening } : {}) };
  });

  return augmented.filter(b => passesFilters(b, filters, nowMs));
}

/**
 * fullyBooked: true if no resource has any 30-min opening for the rest of
 * today. nextOpening: earliest available slot start across any resource,
 * searched forward day-by-day up to NEXT_OPENING_HORIZON_DAYS.
 */
function computeAvailability(
  business: Business,
  store: Store,
  nowMs: number,
): { fullyBooked: boolean; nextOpening?: string } {
  const now = new Date(nowMs);

  let fullyBooked = true;
  let nextOpening: string | undefined;

  for (let dayOffset = 0; dayOffset <= NEXT_OPENING_HORIZON_DAYS && !nextOpening; dayOffset++) {
    const dayStart = startOfUtcDay(now, dayOffset);
    const dayEnd = startOfUtcDay(now, dayOffset + 1);
    const windowStart = dayOffset === 0 ? new Date(nowMs).toISOString() : dayStart;

    let earliestToday: string | undefined;
    for (const resource of business.resources) {
      const slots = availableSlots(business, resource.id, windowStart, dayEnd, store, nowMs);
      if (slots.length > 0 && (!earliestToday || slots[0]! < earliestToday)) {
        earliestToday = slots[0];
      }
    }

    if (dayOffset === 0) {
      fullyBooked = earliestToday === undefined;
    }
    if (earliestToday) {
      nextOpening = earliestToday;
    }
  }

  return { fullyBooked, nextOpening };
}

function startOfUtcDay(from: Date, addDays: number): string {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + addDays);
  return d.toISOString();
}

function passesFilters(
  business: BusinessSearchResult,
  filters: BusinessSearchFilters | undefined,
  nowMs: number,
): boolean {
  if (!filters) return true;

  if (filters.priceLevels && !filters.priceLevels.includes(business.priceLevel)) return false;
  if (filters.minRating !== undefined && business.rating < filters.minRating) return false;
  if (filters.openNow && !isOpenAt(business, new Date(nowMs).toISOString())) return false;
  if (filters.hasOpeningsToday && business.fullyBooked) return false;
  if (filters.services && filters.services.length > 0) {
    const wanted = filters.services.map(s => s.toLowerCase());
    const offered = business.services.map(s => s.name.toLowerCase());
    const matches = wanted.some(term => offered.some(name => name.includes(term)));
    if (!matches) return false;
  }

  return true;
}
