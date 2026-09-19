import { z } from 'zod';

// Shared payloads. Coordinate contract changes with the other owners.
export const businessUrlSchema = z.object({ url: z.string().url() });
export type BusinessUrlInput = z.infer<typeof businessUrlSchema>;

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
  startsAt: string; // ISO 8601 timestamp with timezone
  durationMinutes: number;
  service: string;
  priceCents: number;
  currency: string;
}
export interface WaitlistContact {
  id: string;
  name: string;
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
