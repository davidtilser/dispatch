/**
 * server/src/search/sanitize.ts
 *
 * Defense-in-depth cleanup applied to every Business before it's used in a
 * search result, regardless of source (mock data is already clean, but
 * crawler-derived candidates are not). Strips HTML/control characters,
 * caps string lengths, clamps rating/priceLevel into range, and validates
 * lat/lng — dropping (returning null) anything structurally invalid.
 */

import { z } from 'zod';
import type { Business, Category } from '@getitdone/shared/types.js';

const CATEGORIES = [
  'barber',
  'salon',
  'spa',
  'electrician',
  'plumber',
  'hvac',
  'cleaning',
  'auto_repair',
  'other',
] as const satisfies readonly Category[];

const MAX_NAME_LEN = 80;
const MAX_DESCRIPTION_LEN = 300;

/** Strip HTML tags and control characters (never render raw external strings). */
function clean(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim();
}

const cleanedString = (maxLen: number) =>
  z
    .string()
    .transform(s => clean(s).slice(0, maxLen));

const serviceSchema = z.object({
  id: z.string().min(1),
  name: cleanedString(MAX_NAME_LEN).pipe(z.string().min(1)),
  durationMin: z.number().positive(),
  priceCents: z.number().nonnegative(),
});

const resourceSchema = z.object({
  id: z.string().min(1),
  name: cleanedString(MAX_NAME_LEN).pipe(z.string().min(1)),
});

const dayHoursSchema = z.object({ open: z.string(), close: z.string() });
const hoursSchema = z.object({
  mon: dayHoursSchema.optional(),
  tue: dayHoursSchema.optional(),
  wed: dayHoursSchema.optional(),
  thu: dayHoursSchema.optional(),
  fri: dayHoursSchema.optional(),
  sat: dayHoursSchema.optional(),
  sun: dayHoursSchema.optional(),
});

const businessSchema = z.object({
  id: z.string().min(1),
  name: cleanedString(MAX_NAME_LEN).pipe(z.string().min(1, 'name empty after sanitizing')),
  category: z.enum(CATEGORIES),
  description: cleanedString(MAX_DESCRIPTION_LEN).default(''),
  address: z.string().transform(clean).default(''),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  phone: z.string().transform(clean).default(''),
  priceLevel: z.number().transform(n => Math.min(3, Math.max(1, Math.round(n)))),
  rating: z.number().transform(n => Math.min(5, Math.max(0, n))),
  services: z.array(serviceSchema),
  hours: hoursSchema,
  resources: z.array(resourceSchema),
});

/**
 * Sanitizes a candidate business record. Returns null (drop) if the record
 * is structurally invalid — missing required fields, wrong types, or
 * lat/lng outside valid ranges. Otherwise returns a cleaned, clamped
 * Business: HTML/control chars stripped, name/description length-capped,
 * rating clamped to 0-5, priceLevel clamped to 1-3.
 */
export function sanitizeBusiness(input: unknown): Business | null {
  const result = businessSchema.safeParse(input);
  if (!result.success) return null;
  // The zod schema mirrors Business's shape exactly; priceLevel/rating are
  // clamped numbers at this point, structurally compatible with
  // PriceLevel/number.
  return result.data as Business;
}
