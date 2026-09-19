import type { CallBrief } from './index.js';
import { z } from 'zod';

export const voiceTimeSchema = z.object({ time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:mm, for example 15:30') });
export const voiceEndSchema = z.object({ reason: z.enum(['ended', 'failed']) });

export interface VoiceDemoContext {
  businessName: string;
  customerName: string;
  service: string;
  price: string;
  discount?: string;
  date: string;
  timezone: string;
  offeredTime: string;
  availableTimes: string[];
}

export interface VoiceDemoSession {
  id: string;
  context: VoiceDemoContext;
  managerBrief?: CallBrief;
  status: 'active' | 'accepted' | 'declined' | 'ended' | 'failed';
  booking?: { id: string; time: string };
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
