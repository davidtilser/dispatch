import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { dynamicVariables } from '../dist/demo.js';
import { dispatchFirstMessage, dispatchTools, legacyNaturalSpeechInstructions } from '../dist/agent-config.js';
import { enableAutomaticHangup, inspectCalendarTools } from '../dist/update-agent.js';

test('existing agent gains natural speech and end_call while preserving custom instructions; updates are repeatable', async () => {
  const originalFetch = globalThis.fetch;
  let updates = 0;
  const agent = { agent_id: 'agent_test', name: 'Dispatch', metadata: { created_at_unix_secs: 1, updated_at_unix_secs: 1 }, conversation_config: {
    tts: { voice_id: 'existing-voice' },
    agent: { first_message: 'Existing greeting', dynamic_variables: { dynamic_variable_placeholders: { business_name: 'Existing shop' } }, prompt: {
      prompt: legacyNaturalSpeechInstructions + '\nCustom shop instructions.\nNever offer discounts, invent services or availability, reveal who cancelled, or claim a real payment was processed.\nAfter a confirmed booking or decline, say a short goodbye. The customer can end the web call.',
      llm: 'gemini-2.0-flash', tool_ids: ['check', 'accept', 'decline'],
      built_in_tools: { skip_turn: { type: 'system', name: 'skip_turn', params: { system_tool_type: 'skip_turn' } } },
    } },
  } };
  const tools = new Map(dispatchTools.map((tool, i) => [ ['check', 'accept', 'decline'][i], { id: ['check', 'accept', 'decline'][i], tool_config: { ...tool.toolConfig, expects_response: true, parameters: { type: 'object', required: ['time'], properties: { time: { type: 'string' } } } }, access_info: { is_creator: true, creator_name: 'Test', creator_email: 'test@example.com', role: 'admin' }, usage_stats: { avg_latency_secs: 0 } } ]));
  globalThis.fetch = async (_url, init) => {
    const url = String(_url);
    if (url.includes('/tools/')) {
      const id = url.split('/tools/')[1]!.split('/')[0];
      if (url.includes('/dependent-agents')) return new Response(JSON.stringify({ agents: [{ type: 'available', id: 'agent_test', name: 'Dispatch', created_at_unix_secs: 1, access_level: 'admin' }], has_more: false }), { status: 200 });
      const tool = tools.get(id);
      assert.ok(tool, `Unknown tool ${id}`);
      if (init?.method === 'PATCH') tool.tool_config = JSON.parse(String(init.body)).tool_config;
      return new Response(JSON.stringify(tool), { status: 200 });
    }
    if (init?.method === 'PATCH') {
      const body = JSON.parse(String(init.body));
      assert.deepEqual(Object.keys(body), ['conversation_config']);
      assert.deepEqual(Object.keys(body.conversation_config), ['agent']);
      assert.deepEqual(Object.keys(body.conversation_config.agent).sort(), ['dynamic_variables', 'first_message', 'prompt']);
      assert.deepEqual(body.conversation_config.agent.dynamic_variables.dynamic_variable_placeholders,
        { business_name: 'Existing shop', discount: '', discount_offer: '', reference_date: '2026-09-19', appointment_date: '2026-09-19' });
      agent.conversation_config.agent.dynamic_variables = body.conversation_config.agent.dynamic_variables;
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
      assert.match(patch.prompt, /tomorrow afternoon/);
      assert.doesNotMatch(patch.prompt, /Use {{date}} as the appointment date for speech/);
      assert.match(patch.prompt, /explicitly highlight this discount in the initial offer/);
      assert.doesNotMatch(patch.prompt, /Never offer discounts/);
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
    assert.deepEqual(tools.get('accept')!.tool_config.parameters.required, ['date', 'time', 'confirmed']);
    assert.deepEqual(tools.get('check')!.tool_config.parameters.required, ['date']);
    assert.equal(agent.conversation_config.tts.voice_id, 'existing-voice');
    assert.equal(agent.conversation_config.agent.prompt.llm, 'gemini-2.0-flash');
    assert.deepEqual(agent.conversation_config.agent.prompt.tool_ids, ['check', 'accept', 'decline']);
  } finally { globalThis.fetch = originalFetch; }
});

test('the greeting speaks the local day and actual offered time, without an ISO date', () => {
  const variables = dynamicVariables({ businessName: 'Apblendzz', customerName: 'Jordan',
    service: 'Haircut', price: '$45', date: '2026-09-19', timezone: 'America/Los_Angeles',
    offeredTime: '15:30', availableTimes: ['15:30'] }, new Date('2026-09-20T02:00:00Z'));
  const greeting = dispatchFirstMessage.replace(/{{(\w+)}}/g, (_, key) => variables[key]!);
  assert.match(greeting, /for today at 3:30 PM for \$45/);
  assert.doesNotMatch(greeting, /2026-09-19|15:30|{{/);
  assert.doesNotMatch(greeting, /discount/i);
});

test('the opening highlights supplied discounts and omits absent or blank discounts', () => {
  for (const discount of ['20% off', '$10 off', undefined, '', '   ']) {
    const variables = dynamicVariables({ businessName: 'Apblendzz', customerName: 'Jordan',
      service: 'Haircut', price: '$36', discount, date: '2026-09-19', timezone: 'America/Los_Angeles',
      offeredTime: '15:00', availableTimes: ['15:00'] });
    const greeting = dispatchFirstMessage.replace(/{{(\w+)}}/g, (_, key) => variables[key]!);
    assert.match(greeting, /for \$36\./);
    assert.doesNotMatch(greeting, /{{/);
    if (discount?.trim()) {
      assert.ok(greeting.includes(`includes a discount: ${discount}.`));
      assert.equal(variables.discount, discount);
    } else {
      assert.doesNotMatch(greeting, /discount/i);
      assert.equal(variables.discount, '');
    }
  }
});


test('calendar update preflight rejects a shared tool before any mutation', async () => {
  let mutated = false;
  const client = { conversationalAi: {
    agents: { get: async () => ({ conversationConfig: { agent: { prompt: { toolIds: ['check', 'accept', 'decline'] } } } }), update: async () => { mutated = true; } },
    tools: {
      get: async (id: string) => ({ id, toolConfig: { type: 'client', name: id === 'check' ? 'check_availability' : id === 'accept' ? 'accept_slot' : 'decline_slot' } }),
      getDependentAgents: async () => ({ agents: [{ id: 'another-agent' }], hasMore: false }),
      update: async () => { mutated = true; },
    },
  } } as unknown as ElevenLabsClient;
  await assert.rejects(enableAutomaticHangup(client, 'agent_test'), /shared with another agent/);
  assert.equal(mutated, false);
});
