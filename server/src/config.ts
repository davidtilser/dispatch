/**
 * server/src/config.ts
 *
 * Single source of truth for all server configuration.
 * HOST is hardcoded — it is NEVER overridable by environment variables.
 * The key is never logged; use redact() when printing config.
 */

import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env from the server package root (one level up from src/)
dotenv.config({ path: resolve(__dirname, '..', '.env') });

// ─── Constants: NOT overridable ───────────────────────────────────────────────
/** Server always binds to loopback. Never expose to 0.0.0.0. */
export const HOST = '127.0.0.1' as const;
export const PORT = 8787 as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function env(key: string, fallback?: string): string {
  const val = process.env[key];
  if (val !== undefined && val.trim() !== '') return val.trim();
  if (fallback !== undefined) return fallback;
  return '';
}

function envBool(key: string, fallback: boolean): boolean {
  const val = process.env[key];
  if (val === undefined || val.trim() === '') return fallback;
  return val.trim().toLowerCase() === 'true';
}

function envInt(key: string, fallback: number): number {
  const val = process.env[key];
  if (val === undefined || val.trim() === '') return fallback;
  const n = parseInt(val.trim(), 10);
  return Number.isNaN(n) ? fallback : n;
}

/** Replaces every character of a sensitive string with '*'. */
export function redact(value: string): string {
  if (!value) return '(not set)';
  if (value.length <= 4) return '****';
  return value.slice(0, 4) + '*'.repeat(value.length - 4);
}

// ─── Typed config object ──────────────────────────────────────────────────────

const rawApiKey = env('ELEVENLABS_API_KEY');

const DEMO_FAST = envBool('DEMO_FAST', false);

function resolveCallTimeout(): number {
  const explicit = envInt('CALL_TIMEOUT_SECONDS', 0);
  if (explicit > 0) return explicit;
  return DEMO_FAST ? 12 : 30;
}

const businessProviderRaw = env('BUSINESS_PROVIDER', 'mock');
if (businessProviderRaw !== 'mock' && businessProviderRaw !== 'crawler') {
  console.warn(
    `[config] Unknown BUSINESS_PROVIDER "${businessProviderRaw}", falling back to "mock".`,
  );
}

export const config = {
  /** Hardcoded loopback — see HOST constant above */
  host: HOST,
  port: PORT,

  voice: {
    /** true only when an API key is actually present */
    enabled: rawApiKey.length > 0,
    /** Never log this directly — use redact(config.voice.apiKey) */
    apiKey: rawApiKey,
    voiceId: env('ELEVENLABS_VOICE_ID'),
    modelId: env('ELEVENLABS_MODEL_ID', 'eleven_turbo_v2_5'),
  },

  demo: {
    mode: envBool('DEMO_MODE', true),
    fast: DEMO_FAST,
    callTimeoutSeconds: resolveCallTimeout(),
  },

  businessProvider: (
    businessProviderRaw === 'crawler' ? 'crawler' : 'mock'
  ) as 'mock' | 'crawler',
} as const;

// ─── Startup diagnostics (never print the raw key) ───────────────────────────
console.log(
  `[config] voice.enabled=${String(config.voice.enabled)} ` +
  `apiKey=${redact(config.voice.apiKey)} ` +
  `model=${config.voice.modelId}`,
);
console.log(
  `[config] demo.mode=${String(config.demo.mode)} ` +
  `demo.fast=${String(config.demo.fast)} ` +
  `callTimeout=${config.demo.callTimeoutSeconds}s ` +
  `businessProvider=${config.businessProvider}`,
);
