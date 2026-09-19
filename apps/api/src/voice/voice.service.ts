import { BadGatewayException, ConflictException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { demoContext, dynamicVariables, ElevenLabsWebVoice, VoiceDemoStore, VoiceSessionError } from '@dispatch/voice';
import type { VoiceDemoConfiguration, VoiceSessionStart } from '@dispatch/contracts';

@Injectable()
export class VoiceService {
  private store = new VoiceDemoStore();

  configuration(): VoiceDemoConfiguration {
    const missing = ['ELEVENLABS_API_KEY', 'ELEVENLABS_AGENT_ID'].filter((key) => !process.env[key]?.trim());
    return { configured: missing.length === 0, missing, context: demoContext() };
  }

  async start(): Promise<VoiceSessionStart> {
    const config = this.configuration();
    if (!config.configured) throw new ServiceUnavailableException(`Set ${config.missing.join(', ')} in .env. Run npm run voice:setup to create the agent.`);
    const voice = new ElevenLabsWebVoice(process.env.ELEVENLABS_API_KEY!, process.env.ELEVENLABS_AGENT_ID!);
    let conversationToken: string;
    try { conversationToken = await voice.createToken(); }
    catch (error) { throw new BadGatewayException(error instanceof Error ? error.message : 'ElevenLabs unavailable'); }
    const session = this.perform(() => this.store.create(config.context));
    return { session, conversationToken, dynamicVariables: dynamicVariables(config.context) };
  }

  get(id: string) { return this.perform(() => this.store.get(id)); }
  check(id: string, time: string) { return this.perform(() => this.store.check(id, time)); }
  accept(id: string, time: string) { return this.perform(() => this.store.accept(id, time)); }
  decline(id: string) { return this.perform(() => this.store.decline(id)); }
  end(id: string, reason: 'ended' | 'failed') { return this.perform(() => this.store.end(id, reason)); }

  private perform<T>(fn: () => T): T {
    try { return fn(); }
    catch (error) {
      if (error instanceof VoiceSessionError) throw new ConflictException(error.message);
      throw error;
    }
  }
}
