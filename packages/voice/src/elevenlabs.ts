import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

export class VoiceProviderError extends Error {}

export class ElevenLabsWebVoice {
  private client: ElevenLabsClient;
  private agentId: string;
  constructor(apiKey: string, agentId: string) {
    this.client = new ElevenLabsClient({ apiKey });
    this.agentId = agentId;
  }
  async createToken(): Promise<string> {
    try {
      const result = await this.client.conversationalAi.conversations.getWebrtcToken(
        { agentId: this.agentId }, { timeoutInSeconds: 15, maxRetries: 0 },
      );
      if (!result.token) throw new Error('Missing token');
      return result.token;
    } catch {
      // Provider bodies may contain sensitive details. Keep errors safe for the browser.
      throw new VoiceProviderError('Could not connect to ElevenLabs. Check the API key, agent ID, permissions, and available credits.');
    }
  }
}
