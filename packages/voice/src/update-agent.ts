import type { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { callEndingInstructions, endCallTool } from './agent-config.js';

// Patch only the ending policy and built-in end_call; keep voice, LLM, client
// tools, dynamic variables and any other prompt customizations on the agent.
export async function enableAutomaticHangup(client: ElevenLabsClient, agentId: string) {
  const current = await client.conversationalAi.agents.get(agentId);
  const prompt = current.conversationConfig.agent?.prompt;
  const existing = (prompt?.prompt ?? '').replace(
    'After a confirmed booking or decline, say a short goodbye. The customer can end the web call.', '',
  ).trim();
  const updated = existing.includes(callEndingInstructions) ? existing : `${existing}\n${callEndingInstructions}`;
  await client.conversationalAi.agents.update(agentId, {
    conversationConfig: { agent: { prompt: {
      prompt: updated,
      builtInTools: { ...prompt?.builtInTools, endCall: endCallTool },
    } } },
  }, { maxRetries: 0, timeoutInSeconds: 30 });
  const verified = await client.conversationalAi.agents.get(agentId);
  if (verified.conversationConfig.agent?.prompt?.builtInTools?.endCall?.params.systemToolType !== 'end_call'
    || !verified.conversationConfig.agent.prompt.prompt?.includes(callEndingInstructions)) {
    throw new Error('Automatic hangup configuration was not saved.');
  }
}
