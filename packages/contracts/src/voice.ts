import type { CallBrief } from './index.js';
import { z } from 'zod';

const localTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:mm, for example 15:30');
const localDateSchema = z.string().date();
export const voiceAvailabilitySchema = z.object({
  date: localDateSchema.optional(), time: localTimeSchema.optional(),
  partOfDay: z.enum(['morning', 'afternoon', 'evening']).optional(),
});
export type AvailabilityRequest = z.infer<typeof voiceAvailabilitySchema>;
export const voiceTimeSchema = z.object({ time: localTimeSchema });
export const voiceAcceptSchema = z.object({
  time: localTimeSchema, date: localDateSchema.optional(), confirmed: z.boolean().optional(),
}).refine(input => input.confirmed !== false && (!input.date || input.confirmed === true),
  'Explicit agreement to the exact date and time is required (confirmed: true)');
export type AcceptRequest = z.infer<typeof voiceAcceptSchema>;
export interface AvailableSlot { date: string; time: string; startsAt: string; endsAt: string; spokenDate: string }
export interface AvailabilityResult {
  available: boolean; date: string; timezone: string; referenceDate: string;
  availableTimes: string[]; availableSlots: AvailableSlot[]; message: string;
}
export const voiceEndSchema = z.object({ reason: z.enum(['ended', 'failed']) });

export interface VoiceDemoContext {
  businessName: string;
  customerName: string;
  service: string;
  price: string;
  discount?: string;
  date: string;
  timezone: string;
  referenceDate?: string;
  offeredTime: string;
  availableTimes: string[];
}

export interface VoiceDemoSession {
  id: string;
  context: VoiceDemoContext;
  managerBrief?: CallBrief;
  status: 'active' | 'accepted' | 'alternative_booked' | 'declined' | 'ended' | 'failed';
  booking?: { id: string; time: string; date?: string; startsAt?: string; spokenDate?: string; kind?: 'replacement' | 'alternative' };
  feeWaived: boolean;
}

export interface VoiceSessionStart {
  session: VoiceDemoSession;
  conversationToken: string;
  dynamicVariables: Record<string, string>;
}

export interface VoiceDemoConfiguration {
  configured: boolean;
  missing: string[];
  context: VoiceDemoContext | null;
  attemptId: string | null;
  callActive: boolean;
}
