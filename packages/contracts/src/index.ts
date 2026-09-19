import { z } from 'zod';
export * from './voice.js';

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
  // Approved discount description (e.g. "20% off"); priceCents is the final price.
  discount?: string;
  currency: string;
}
export interface WaitlistContact {
  id: string;
  name: string;
  phoneE164: string;
}
// What the voice agent says and is allowed to do on one call. Written by the manager.
export interface CallBrief {
  disclosure: string;
  offer: string;
  allowedAlternatives: string[];
  mustNot: string[];
}
export interface CallRequest {
  runId: string;
  attemptId: string;
  business: BusinessProfile;
  slot: BookingSlot;
  contact: WaitlistContact;
  brief?: CallBrief;
}
export type CallOutcome =
  | { type: 'accepted'; startsAt: string }
  | { type: 'alternative_booked'; startsAt: string }
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
export * from './dashboard.js';

export const callOutcomeSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('accepted'), startsAt: z.string().datetime({ offset: true }) }),
  z.object({ type: z.literal('declined') }), z.object({ type: z.literal('no_answer') }),
  z.object({ type: z.literal('failed'), reason: z.string() }),
]);
