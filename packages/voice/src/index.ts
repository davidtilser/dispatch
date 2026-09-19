import type { CallOutcome, CallRequest } from '@dispatch/contracts';

// Voice owner: implement using ElevenLabs Agents and a connected telephony number.
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
