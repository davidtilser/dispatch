/**
 * shared/src/types.ts
 *
 * Domain types for GetItDone.
 * Shared between client and server — no Node/browser-specific imports.
 */

// ─── Primitives ───────────────────────────────────────────────────────────────

export type Category =
  | 'barber'
  | 'salon'
  | 'spa'
  | 'electrician'
  | 'plumber'
  | 'hvac'
  | 'cleaning'
  | 'auto_repair'
  | 'other';

export type PriceLevel = 1 | 2 | 3;

// ─── Business ─────────────────────────────────────────────────────────────────

export interface Service {
  id: string;
  name: string;
  durationMin: number;
  priceCents: number;
}

export interface Resource {
  id: string;
  name: string;
}

/** Day-of-week keyed hours. Keys: 'mon'|'tue'|'wed'|'thu'|'fri'|'sat'|'sun'. */
export interface DayHours {
  open: string;  // "HH:MM"
  close: string; // "HH:MM"
}
export type BusinessHours = Partial<Record<'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun', DayHours>>;

export interface Business {
  id: string;
  name: string;
  category: Category;
  description: string;
  address: string;
  lat: number;
  lng: number;
  phone: string;
  priceLevel: PriceLevel;
  rating: number;
  services: Service[];
  hours: BusinessHours;
  resources: Resource[];
}

// ─── Booking ──────────────────────────────────────────────────────────────────

export type BookingStatus = 'confirmed' | 'cancelled';

export interface Booking {
  id: string;
  businessId: string;
  resourceId: string;
  serviceId: string;
  clientId: string;
  /** ISO 8601 string */
  start: string;
  /** ISO 8601 string */
  end: string;
  status: BookingStatus;
}

// ─── Hold ─────────────────────────────────────────────────────────────────────

export interface Hold {
  id: string;
  businessId: string;
  resourceId: string;
  /** ISO 8601 string */
  start: string;
  /** ISO 8601 string */
  end: string;
  clientId: string;
  waitlistEntryId: string;
  /** ISO 8601 string */
  expiresAt: string;
}

// ─── Waitlist ─────────────────────────────────────────────────────────────────

export type WaitlistEntryStatus = 'waiting' | 'called' | 'booked' | 'removed';

export interface WaitlistEntry {
  id: string;
  businessId: string;
  serviceId: string;
  clientId: string;
  /** ISO 8601 string */
  windowStart: string;
  /** ISO 8601 string */
  windowEnd: string;
  /** ISO 8601 string */
  createdAt: string;
  status: WaitlistEntryStatus;
}

// ─── Call Attempt ─────────────────────────────────────────────────────────────

export type CallAttemptStatus =
  | 'ringing'
  | 'answered'
  | 'accepted'
  | 'declined'
  | 'no_answer'
  | 'superseded';

export interface CallAttempt {
  id: string;
  waitlistEntryId: string;
  clientId: string;
  businessId: string;
  /** ISO 8601 string */
  offeredStart: string;
  /** ISO 8601 string */
  offeredEnd: string;
  resourceId: string;
  status: CallAttemptStatus;
  /** ISO 8601 string */
  startedAt: string;
  /** ISO 8601 string */
  expiresAt: string;
  skipReason?: string;
}

// ─── Business search ──────────────────────────────────────────────────────────

/** Business augmented with search-time computed fields. */
export type BusinessSearchResult = Business & {
  /** Great-circle distance from the search origin, in miles. */
  distanceMiles: number;
  /**
   * ISO 8601 start of the next available slot across any resource, within a
   * bounded look-ahead window. Omitted if none was found in that window.
   */
  nextOpening?: string;
  /** True when no resource has any available slot for the rest of today. */
  fullyBooked: boolean;
};

/** Optional filters applied after distance sort in searchBusinesses(). */
export interface BusinessSearchFilters {
  priceLevels?: PriceLevel[];
  minRating?: number;
  /** Business hours currently cover the search moment. */
  openNow?: boolean;
  /** Equivalent to `!fullyBooked` — at least one resource has an opening today. */
  hasOpeningsToday?: boolean;
  /** Case-insensitive substring match against any of the business's service names. */
  services?: string[];
}

// ─── Domain error codes ───────────────────────────────────────────────────────

export type DomainErrorCode =
  | 'SLOT_TAKEN'
  | 'CLIENT_CONFLICT'
  | 'HOLD_EXPIRED'
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'VALIDATION';
