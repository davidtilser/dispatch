import Anthropic from '@anthropic-ai/sdk';

// Shared plumbing for running a Claude Managed Agent once and reading its reply.
export interface ManagedAgentConfig {
  apiKey?: string; // defaults to ANTHROPIC_API_KEY
  environmentId: string;
}

export function createClient(config: ManagedAgentConfig): Anthropic {
  return new Anthropic(config.apiKey ? { apiKey: config.apiKey } : {});
}

// Start a session, send one message, return the agent's last text message.
export async function runManagedAgent(
  client: Anthropic,
  environmentId: string,
  agentId: string,
  text: string,
  title: string,
): Promise<string> {
  const session = await client.beta.sessions.create({
    agent: agentId,
    environment_id: environmentId,
    title,
  });

  const stream = await client.beta.sessions.events.stream(session.id);
  await client.beta.sessions.events.send(session.id, {
    events: [{ type: 'user.message', content: [{ type: 'text', text }] }],
  });

  let lastMessage = '';
  for await (const event of stream) {
    if (event.type === 'agent.message') {
      lastMessage = event.content
        .map((block) => (block.type === 'text' ? block.text : ''))
        .join('');
    } else if (event.type === 'session.status_idle') {
      break;
    }
  }
  return lastMessage;
}

// Pull the JSON object out of the reply, even if the agent added extra words.
export function extractJson(text: string): Record<string, unknown> {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new Error(`No JSON in agent reply: ${text.slice(0, 200)}`);
  }
  const parsed: unknown = JSON.parse(text.slice(start, end + 1));
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Agent reply was not a JSON object');
  }
  return parsed as Record<string, unknown>;
}

export function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

export function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

export async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
