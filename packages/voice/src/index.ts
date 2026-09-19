import type { CallOutcome, CallRequest } from '@dispatch/contracts';
export * from './demo.js';
export * from './elevenlabs.js';

// Future telephony adapter. Browser sessions use ElevenLabsWebVoice instead.
// Resolve on provider acknowledgement; deliver the outcome asynchronously.
export interface VoiceGateway {
  startCall(input: CallRequest): Promise<{ conversationId: string }>;
}
// Normalize authenticated provider callbacks into this event for the manager.
export interface VoiceOutcomeEvent {
  runId: string;
  attemptId: string;
  conversationId: string;
  outcome: CallOutcome;
}
