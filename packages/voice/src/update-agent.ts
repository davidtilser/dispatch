import type { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { bookingDecisionInstructions, callEndingInstructions, dispatchFirstMessage, endCallTool, naturalSpeechInstructions, supersededInstructions } from './agent-config.js';

// Update speech and ending policy; keep voice, LLM, client tools and custom instructions.
export async function enableAutomaticHangup(client: ElevenLabsClient, agentId: string) {
  const current = await client.conversationalAi.agents.get(agentId);
  const prompt = current.conversationConfig.agent?.prompt;
  const existing = supersededInstructions
    .reduce((text, sentence) => text.replaceAll(sentence, ''), prompt?.prompt ?? '')
    .replace(/[^\S\n]+\n/g, '\n').replace(/\n{2,}/g, '\n').trim();
  const updated = [callEndingInstructions, naturalSpeechInstructions, bookingDecisionInstructions].reduce(
    (text, instructions) => text.includes(instructions) ? text : `${text}\n${instructions}`, existing,
  );
  await client.conversationalAi.agents.update(agentId, {
    conversationConfig: { agent: { firstMessage: dispatchFirstMessage, prompt: {
      prompt: updated,
      builtInTools: { ...prompt?.builtInTools, endCall: endCallTool },
    } } },
  }, { maxRetries: 0, timeoutInSeconds: 30 });
  const verified = await client.conversationalAi.agents.get(agentId);
  if (verified.conversationConfig.agent?.prompt?.builtInTools?.endCall?.params.systemToolType !== 'end_call'
    || !verified.conversationConfig.agent.prompt.prompt?.includes(callEndingInstructions)
    || !verified.conversationConfig.agent.prompt.prompt?.includes(naturalSpeechInstructions)
    || !verified.conversationConfig.agent.prompt.prompt?.includes(bookingDecisionInstructions)
    || supersededInstructions.some((sentence) => verified.conversationConfig.agent?.prompt?.prompt?.includes(sentence))
    || verified.conversationConfig.agent.firstMessage !== dispatchFirstMessage) {
    throw new Error('Voice agent configuration was not saved.');
  }
}
