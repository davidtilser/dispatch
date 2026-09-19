import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { dynamicVariables } from '../dist/demo.js';
import { dispatchFirstMessage } from '../dist/agent-config.js';
import { enableAutomaticHangup } from '../dist/update-agent.js';

test('existing agent gains natural speech and end_call while preserving custom instructions; updates are repeatable', async () => {
  const originalFetch = globalThis.fetch;
  let updates = 0;
  const agent = { agent_id: 'agent_test', name: 'Dispatch', metadata: { created_at_unix_secs: 1, updated_at_unix_secs: 1 }, conversation_config: {
    tts: { voice_id: 'existing-voice' },
    agent: { first_message: 'Existing greeting', prompt: {
      prompt: 'Custom shop instructions.\nAfter a confirmed booking or decline, say a short goodbye. The customer can end the web call.',
      llm: 'gemini-2.0-flash', tool_ids: ['check', 'accept', 'decline'],
      built_in_tools: { skip_turn: { type: 'system', name: 'skip_turn', params: { system_tool_type: 'skip_turn' } } },
    } },
  } };
  globalThis.fetch = async (_url, init) => {
    if (init?.method === 'PATCH') {
      const body = JSON.parse(String(init.body));
      assert.deepEqual(Object.keys(body), ['conversation_config']);
      assert.deepEqual(Object.keys(body.conversation_config), ['agent']);
      assert.deepEqual(Object.keys(body.conversation_config.agent), ['first_message', 'prompt']);
      assert.equal(body.conversation_config.agent.first_message, dispatchFirstMessage);
      agent.conversation_config.agent.first_message = body.conversation_config.agent.first_message;
      const patch = body.conversation_config.agent.prompt;
      assert.deepEqual(Object.keys(patch).sort(), ['built_in_tools', 'prompt']);
      assert.equal(patch.built_in_tools.end_call.params.system_tool_type, 'end_call');
      assert.deepEqual(patch.built_in_tools.skip_turn, agent.conversation_config.agent.prompt.built_in_tools.skip_turn);
      assert.match(patch.prompt, /After decline_slot returns ok: true/);
      assert.match(patch.prompt, /never run end_call in parallel/);
      assert.match(patch.prompt, /Custom shop instructions/);
      assert.match(patch.prompt, /Never read ISO dates/);
      assert.match(patch.prompt, /Keep reminders short/);
      assert.doesNotMatch(patch.prompt, /The customer can end the web call/);
      if (updates) assert.equal(patch.prompt, agent.conversation_config.agent.prompt.prompt);
      Object.assign(agent.conversation_config.agent.prompt, patch);
      updates++;
    }
    return new Response(JSON.stringify(agent), { status: 200 });
  };
  try {
    const client = new ElevenLabsClient({ apiKey: 'test-key' });
    await enableAutomaticHangup(client, 'agent_test');
    await enableAutomaticHangup(client, 'agent_test');
    assert.equal(updates, 2);
  } finally { globalThis.fetch = originalFetch; }
});

test('the greeting speaks the local day and actual offered time, without an ISO date', () => {
  const variables = dynamicVariables({ businessName: 'Apblendzz', customerName: 'Jordan',
    service: 'Haircut', price: '$45', date: '2026-09-19', timezone: 'America/Los_Angeles',
    offeredTime: '15:30', availableTimes: ['15:30'] }, new Date('2026-09-20T02:00:00Z'));
  const greeting = dispatchFirstMessage.replace(/{{(\w+)}}/g, (_, key) => variables[key]!);
  assert.match(greeting, /for today at 3:30 PM for \$45/);
  assert.doesNotMatch(greeting, /2026-09-19|15:30|{{/);
});
