import { z } from 'zod';

// ─── Demo geography ────────────────────────────────────────────────────────────

/**
 * Center point for the demo's business search radius (Fremont, CA).
 * The mock provider seeds businesses within ~15 miles of this point.
 */
export const DEMO_CENTER = { lat: 37.5485, lng: -121.9886 } as const;

// ─── Shared Zod schemas ────────────────────────────────────────────────────────

export const businessUrlSchema = z.object({
  url: z.string().url(),
});
export type BusinessUrlInput = z.infer<typeof businessUrlSchema>;

// ─── Core domain types ─────────────────────────────────────────────────────────

export interface BusinessProfile {
  id: string;
  name: string;
  website: string;
  timezone: string;
  services: string[];
}

export interface BookingSlot {
  id: string;
  businessId: string;
  /** ISO 8601 with timezone */
  startsAt: string;
  durationMinutes: number;
  service: string;
  priceCents: number;
  currency: string;
}

export interface WaitlistContact {
  id: string;
  name: string;
  /** E.164 format — fake number for demo only */
  phoneE164: string;
}

export interface CallRequest {
  runId: string;
  attemptId: string;
  business: BusinessProfile;
  slot: BookingSlot;
  contact: WaitlistContact;
}

export type CallOutcome =
  | { type: 'accepted'; startsAt: string }
  | { type: 'declined' }
  | { type: 'no_answer' }
  | { type: 'failed'; reason: string };

export type RefillStatus = 'pending' | 'calling' | 'filled' | 'exhausted' | 'failed';

export interface RefillRun {
  id: string;
  slotId: string;
  status: RefillStatus;
  activeAttemptId?: string;
  feeWaived: boolean;
}

// ─── API response envelope ─────────────────────────────────────────────────────

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

export interface HealthResponse {
  ok: true;
}
