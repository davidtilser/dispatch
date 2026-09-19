import { BadGatewayException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { dynamicVariables, ElevenLabsWebVoice } from '@dispatch/voice';
import type { AcceptRequest, AvailabilityRequest, VoiceDemoConfiguration, VoiceSessionStart } from '@dispatch/contracts';
import { DemoCoordinator } from '../refill/demo-coordinator.js';

@Injectable()
export class VoiceService {
  constructor(private readonly demo: DemoCoordinator) {}

  async configuration(): Promise<VoiceDemoConfiguration> {
    const missing = ['ELEVENLABS_API_KEY', 'ELEVENLABS_AGENT_ID'].filter((key) => !process.env[key]?.trim());
    return { configured: missing.length === 0, missing, ...await this.demo.configuration() };
  }

  async start(attemptId?: string): Promise<VoiceSessionStart> {
    const config = await this.configuration();
    if (!config.configured) throw new ServiceUnavailableException(`Set ${config.missing.join(', ')} in .env.`);
    const session = await this.demo.createSession(attemptId);
    const voice = new ElevenLabsWebVoice(process.env.ELEVENLABS_API_KEY!, process.env.ELEVENLABS_AGENT_ID!);
    try {
      const conversationToken = await voice.createToken();
      // Reset/end during token creation must not return a usable stale offer.
      if ((await this.demo.get(session.id)).status !== 'active') throw new Error('The offer ended before voice connected.');
      // The agent reads the date aloud, so speak it. session.context.date stays ISO for the UI and demoTime.
      return { session, conversationToken,
        dynamicVariables: dynamicVariables(session.context) };
    } catch (error) {
      await this.demo.end(session.id, 'failed').catch(() => {});
      throw new BadGatewayException(error instanceof Error ? error.message : 'ElevenLabs unavailable');
    }
  }
  get(id: string) { return this.demo.get(id); }
  check(id: string, input: AvailabilityRequest) { return this.demo.check(id, input); }
  accept(id: string, input: AcceptRequest) { return this.demo.accept(id, input); }
  decline(id: string) { return this.demo.end(id, 'declined'); }
  end(id: string, reason: 'ended' | 'failed') { return this.demo.end(id, reason); }
}
