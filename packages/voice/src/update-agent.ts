import type { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { calendarInstructions, callEndingInstructions, discountInstructions, dispatchFirstMessage, dispatchTools, endCallTool, legacyNaturalSpeechInstructions, naturalSpeechInstructions } from './agent-config.js';

// Provider responses can add default fields or reorder schema keys.
function containsExpected(actual: unknown, expected: unknown): boolean {
  if (Array.isArray(expected)) return Array.isArray(actual) && actual.length === expected.length && expected.every(item => actual.some(value => containsExpected(value, item)));
  if (expected && typeof expected === 'object') return !!actual && typeof actual === 'object' && Object.entries(expected).every(([key, value]) => containsExpected((actual as Record<string, unknown>)[key], value));
  return actual === expected;
}

const requestOptions = { maxRetries: 0, timeoutInSeconds: 30 };

// Inspect only the configured agent's attached tools. No creation or reassignment.
export async function inspectCalendarTools(client: ElevenLabsClient, agentId: string) {
  const current = await client.conversationalAi.agents.get(agentId);
  const ids = current.conversationConfig.agent?.prompt?.toolIds ?? [];
  const attached = await Promise.all(ids.map(id => client.conversationalAi.tools.get(id, {}, requestOptions)));
  const changes = [];
  for (const desired of dispatchTools.slice(0, 2)) {
    const desiredConfig = desired.toolConfig;
    if (desiredConfig.type !== 'client') continue;
    const matches = attached.filter(tool => tool.toolConfig.type === 'client' && tool.toolConfig.name === desiredConfig.name);
    if (matches.length !== 1 || matches[0]!.toolConfig.type !== 'client') throw new Error('Expected exactly one attached client tool for each calendar action.');
    const tool = matches[0]!;
    const dependencies = await client.conversationalAi.tools.getDependentAgents(tool.id, {}, requestOptions);
    if (dependencies.hasMore || dependencies.agents.some(agent => agent.id !== agentId)) throw new Error('Calendar tool is shared with another agent; no changes made.');
    changes.push({ id: tool.id, desired, previous: tool.toolConfig });
  }
  if (!attached.some(tool => tool.toolConfig.type === 'client' && tool.toolConfig.name === 'decline_slot')) throw new Error('The configured agent is missing decline_slot.');
  return { current, changes };
}

// The historical export stays compatible. Run only after backend/UI integration:
// existing browser handlers forward the entire parameters object unchanged.
export async function enableAutomaticHangup(client: ElevenLabsClient, agentId: string) {
  const { current, changes } = await inspectCalendarTools(client, agentId);
  const prompt = current.conversationConfig.agent?.prompt;
  const placeholders = (current.conversationConfig.agent?.dynamicVariables as {
    dynamic_variable_placeholders?: Record<string, string>;
  } | undefined)?.dynamic_variable_placeholders;
  const existing = (prompt?.prompt ?? '')
    .replace('After a confirmed booking or decline, say a short goodbye. The customer can end the web call.', '')
    .replace('Never offer discounts, invent services or availability,', 'Never invent services or availability,')
    .replace(legacyNaturalSpeechInstructions, '')
    .replace('If the customer requests another time, call check_availability with the local 24-hour HH:mm time.', '')
    .replace('Before confirming any booking, obtain explicit agreement to the exact time, then call accept_slot.', '')
    .replace('Available alternatives for this demo are {{available_times}}.', 'Initial starts for the original opening are {{available_times}}. Search the calendar for other times or days.').trim();
  const updated = [callEndingInstructions, naturalSpeechInstructions, discountInstructions, calendarInstructions].reduce(
    (text, instructions) => text.includes(instructions) ? text : `${text}\n${instructions}`, existing,
  );
  // Preflight completed for every tool before any mutation. Retain each ID and
  // unrelated tool settings; update only schema/description/response behavior.
  for (const { id, desired, previous } of changes) {
    await client.conversationalAi.tools.update(id, { toolConfig: { ...previous, ...desired.toolConfig } }, requestOptions);
  }
  await client.conversationalAi.agents.update(agentId, {
    conversationConfig: { agent: { firstMessage: dispatchFirstMessage,
      dynamicVariables: { dynamic_variable_placeholders: {
        ...placeholders, discount: '', discount_offer: '', reference_date: '2026-09-19', appointment_date: '2026-09-19',
      } }, prompt: {
      prompt: updated,
      builtInTools: { ...prompt?.builtInTools, endCall: endCallTool },
    } } },
  }, requestOptions);
  const verified = await client.conversationalAi.agents.get(agentId);
  if (verified.conversationConfig.agent?.prompt?.builtInTools?.endCall?.params.systemToolType !== 'end_call'
    || ![callEndingInstructions, naturalSpeechInstructions, discountInstructions, calendarInstructions].every(instruction => verified.conversationConfig.agent?.prompt?.prompt?.includes(instruction))
    || verified.conversationConfig.agent.firstMessage !== dispatchFirstMessage) {
    throw new Error('Voice agent configuration was not saved.');
  }
  for (const { id, desired } of changes) {
    const saved = await client.conversationalAi.tools.get(id, {}, requestOptions);
    if (saved.toolConfig.type !== 'client' || desired.toolConfig.type !== 'client'
      || !containsExpected(saved.toolConfig.parameters, desired.toolConfig.parameters)) throw new Error('Calendar tool schema was not saved.');
  }
}
