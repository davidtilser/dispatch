import type { CallRequest } from '@dispatch/contracts';
import type { ManagerVoice } from '@dispatch/agents';

// TEMPORARY stand-in until packages/voice ships the ElevenLabs adapter.
// "Places" a call by logging it. Drive outcomes with POST /api/refills/:runId/simulate.
export class DemoVoice implements ManagerVoice {
  readonly calls: CallRequest[] = [];

  async startCall(input: CallRequest) {
    this.calls.push(input);
    console.log(`[demo voice] calling ${input.contact.name}: ${input.brief?.offer ?? '(no brief)'}`);
    return { conversationId: `demo_${input.attemptId}` };
  }

  latestFor(runId: string): CallRequest | undefined {
    return [...this.calls].reverse().find((call) => call.runId === runId);
  }
}
