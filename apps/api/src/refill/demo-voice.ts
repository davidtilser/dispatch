import type { CallRequest, DemoAction } from '@dispatch/contracts';
import type { ManagerVoice } from '@dispatch/agents';

// The manager prepares one browser-call offer; the participant manually accepts it.
// VoiceService turns this CallRequest into an ElevenLabs WebRTC session.
export class DemoVoice implements ManagerVoice {
  constructor(private readonly log: (message: string, action?: DemoAction) => void = () => {}) {}
  readonly calls: CallRequest[] = [];

  async startCall(input: CallRequest) {
    this.calls.push(input);
    this.log(`Agent prepared an offer for ${input.contact.name}. Waiting for the browser call to be answered.`, { kind: 'offer_prepared', source: 'manager', slotId: input.slot.id, customerName: input.contact.name, startsAt: input.slot.startsAt });
    return { conversationId: `demo_${input.attemptId}` };
  }

  latestFor(runId: string): CallRequest | undefined {
    return [...this.calls].reverse().find((call) => call.runId === runId);
  }
}
