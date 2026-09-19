import type { CallRequest } from '@dispatch/contracts';
import type { ManagerVoice } from '@dispatch/agents';

// The manager prepares one browser-call offer; the participant manually accepts it.
// VoiceService turns this CallRequest into an ElevenLabs WebRTC session.
export class DemoVoice implements ManagerVoice {
  constructor(private readonly log: (message: string) => void = () => {}) {}
  readonly calls: CallRequest[] = [];

  async startCall(input: CallRequest) {
    this.calls.push(input);
    this.log(`Agent offered ${input.slot.service} to ${input.contact.name}. Ready for a manual web call.`);
    return { conversationId: `demo_${input.attemptId}` };
  }

  latestFor(runId: string): CallRequest | undefined {
    return [...this.calls].reverse().find((call) => call.runId === runId);
  }
}
