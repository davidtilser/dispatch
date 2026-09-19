import { readFile, writeFile } from 'node:fs/promises';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { dispatchPrompt, dispatchTools } from './agent-config.js';
import { demoContext, dynamicVariables } from './demo.js';

// Run from the repository root via npm run voice:setup. Secrets stay in .env.
const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
  console.error('Set ELEVENLABS_API_KEY in the root .env, then run npm run voice:setup again.');
  process.exit(1);
}
if (process.env.ELEVENLABS_AGENT_ID?.trim()) {
  console.log('ELEVENLABS_AGENT_ID is already set. Keeping the existing agent unchanged.');
  process.exit(0);
}
const client = new ElevenLabsClient({ apiKey });
try {
  // Save tool IDs after each creation, so a partial failure can be resumed.
  let envText = await readFile('.env', 'utf8').catch(() => '');
  async function save(name: string, value: string) {
    const line = `${name}=${value}`;
    const pattern = new RegExp(`^${name}=.*$`, 'm');
    envText = pattern.test(envText) ? envText.replace(pattern, line) : `${envText.trimEnd()}\n${line}\n`;
    await writeFile('.env', envText, { mode: 0o600 });
  }
  const toolIds: string[] = [];
  for (const tool of dispatchTools) {
    const name = `ELEVENLABS_TOOL_${tool.toolConfig.type === 'client' ? tool.toolConfig.name.toUpperCase() : 'UNKNOWN'}`;
    const existing = process.env[name]?.trim();
    if (existing) { toolIds.push(existing); continue; }
    const created = await client.conversationalAi.tools.create(tool, { maxRetries: 0, timeoutInSeconds: 30 });
    toolIds.push(created.id);
    await save(name, created.id);
  }
  const agent = await client.conversationalAi.agents.create({
    name: 'Dispatch — web demo',
    conversationConfig: {
      agent: {
        language: 'en',
        firstMessage: 'Hi {{customer_name}}, I’m an AI assistant for {{business_name}}. A {{service}} appointment opened up on {{date}} at 3 PM for {{price}}. Would you like it?',
        dynamicVariables: { dynamic_variable_placeholders: dynamicVariables(demoContext()) },
        prompt: { prompt: dispatchPrompt, toolIds },
      },
      conversation: { maxDurationSeconds: 300, clientEvents: ['audio', 'user_transcript', 'agent_response', 'client_tool_call', 'interruption'] },
    },
    platformSettings: { auth: { enableAuth: true } },
  }, { maxRetries: 0, timeoutInSeconds: 30 });
  // Print only the non-secret ID before saving, so it can be recovered if the write fails.
  console.log(`Created agent ${agent.agentId}`);
  await save('ELEVENLABS_AGENT_ID', agent.agentId);
  console.log('Saved agent ID to .env. Restart npm run dev and open http://localhost:5173/voice.');
} catch (error) {
  const detail = error instanceof Error ? error.message : 'Unknown setup error';
  console.error(detail.replaceAll(apiKey, '[REDACTED]'));
  console.error('Agent setup failed. Check ElevenLabs API permissions (agents and tools). Created tool IDs were saved in .env for retry. If the request timed out, check the ElevenLabs dashboard before retrying.');
  process.exitCode = 1;
}
