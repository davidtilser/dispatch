import { Injectable } from '@nestjs/common';
import { ClaudeCrawlAgent, withTimeout } from '@dispatch/agents';
import type { BusinessImportPreview } from '@dispatch/contracts';
import { lookup } from 'node:dns/promises';

const clean = (value: string) => value.replace(/<[^>]*>/g, ' ').replace(/&(?:amp|quot|apos|nbsp|lt|gt);/g, entity => ({ '&amp;': '&', '&quot;': '"', '&apos;': "'", '&nbsp;': ' ', '&lt;': '<', '&gt;': '>' })[entity] ?? entity)
  .replace(/&#(x[\da-f]+|\d+);/gi, (_, code: string) => { const n = code[0]?.toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code); return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : ''; })
  .replace(/\s+/g, ' ').trim();

function attributes(tag: string) {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/gs)].map(m => [m[1]!.toLowerCase(), clean(m[3]!)]));
}
function fromText(value: string): BusinessImportPreview['services'][number] | undefined {
  const text = clean(value);
  const price = text.match(/\$\s*(\d+(?:\.\d{1,2})?)/);
  if (!price || text.length > 200 || !/hair|cut|shav|beard|trim|style|styling|fade|color|colour|facial|massage/i.test(text)) return;
  const name = text.slice(0, price.index).replace(/[-–—:·\s]+$/, '').trim();
  if (!name || name.length > 120) return;
  const minutes = text.match(/\b(\d+)\s*(?:min|minutes)\b/i);
  return { name, priceCents: Math.round(Number(price[1]) * 100), ...(minutes ? { durationMinutes: Number(minutes[1]) } : {}) };
}

// Read published metadata, structured offers and short service/price lines; never invent missing values.
export function extractBusinessPreview(html: string, website: string): BusinessImportPreview {
  const meta = [...html.matchAll(/<meta\b[^>]*>/gi)].map(m => attributes(m[0]));
  const metadataName = meta.find(m => m.property === 'og:site_name')?.content;
  const services: BusinessImportPreview['services'] = [];
  let businessName = '';
  let siteName = '';
  const visit = (value: unknown, depth = 0) => {
    if (depth > 12 || !value || typeof value !== 'object') return;
    if (Array.isArray(value)) { value.slice(0, 100).forEach(v => visit(v, depth + 1)); return; }
    const item = value as Record<string, any>;
    const types = Array.isArray(item['@type']) ? item['@type'] : [item['@type']];
    if (typeof item.name === 'string') {
      if (types.some((type: string) => /LocalBusiness|BarberShop|HairSalon|BeautySalon|HealthAndBeautyBusiness|Organization/.test(type))) businessName ||= clean(item.name);
      if (types.includes('WebSite')) siteName ||= clean(item.name);
      if (types.some((type: string) => ['Service', 'Offer', 'Product'].includes(type))) {
        const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
        const amount = offer?.price ?? item.price ?? item.priceSpecification?.price;
        const currency = offer?.priceCurrency ?? item.priceCurrency ?? item.priceSpecification?.priceCurrency;
        const price = amount === undefined ? undefined : Number(amount);
        services.push({ name: clean(item.name).slice(0, 120), ...(price !== undefined && Number.isFinite(price) && price > 0 && currency === 'USD' ? { priceCents: Math.round(price * 100) } : {}) });
      }
    }
    Object.values(item).forEach(v => visit(v, depth + 1));
  };
  for (const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (attributes(script[1]!).type !== 'application/ld+json') continue;
    try { visit(JSON.parse(script[2]!)); } catch { /* A broken metadata block should not break onboarding. */ }
  }
  const visible = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
  for (const block of visible.matchAll(/<(h[1-6]|p|li|tr)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const service = fromText(block[2]!);
    if (service) services.push(service);
  }
  const title = clean(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').split(/\s[|–—]\s/)[0] ?? '';
  const unique = [...new Map(services.filter(s => s.name).map(s => [s.name.toLowerCase(), s])).values()].slice(0, 20);
  return { website, name: (businessName || metadataName || siteName || title).slice(0, 120), services: unique, source: 'website',
    notice: unique.length ? 'Read from the public website. Review the details before using them. Missing prices or durations need your confirmation.' : 'Business name read from the public website. No service prices could be extracted; enter the service below.' };
}

async function publicPage(website: string) {
  let url = new URL(website);
  for (let redirects = 0; redirects < 4; redirects++) {
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || (url.port && !['80', '443'].includes(url.port))) throw new Error('Use a public website.');
    const addresses = await lookup(url.hostname.replace(/^\[|\]$/g, ''), { all: true });
    if (!addresses.length || addresses.some(({ address }) => /^(127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[01])\.|::|f[cd]|fe[89ab])/i.test(address))) throw new Error('Use a public website.');
    const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(12000), headers: { 'User-Agent': 'Dispatch-Demo/1.0', Accept: 'text/html' } });
    if (response.status >= 300 && response.status < 400 && response.headers.get('location')) { await response.body?.cancel(); url = new URL(response.headers.get('location')!, url); continue; }
    if (!response.ok || !response.body || !/html/i.test(response.headers.get('content-type') ?? '')) { await response.body?.cancel(); throw new Error('Website could not be read.'); }
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = []; let size = 0;
    try {
      while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 2_000_000) throw new Error('Website too large.'); chunks.push(value); }
    } finally { await reader.cancel(); }
    return Buffer.concat(chunks).toString('utf8');
  }
  throw new Error('Too many website redirects.');
}

@Injectable()
export class BusinessImporter {
  async preview(website: string): Promise<BusinessImportPreview> {
    const { ANTHROPIC_API_KEY, DISPATCH_ENV_ID, DISPATCH_CRAWL_AGENT_ID } = process.env;
    if (ANTHROPIC_API_KEY && DISPATCH_ENV_ID && DISPATCH_CRAWL_AGENT_ID) {
      try {
        const profile = await withTimeout(new ClaudeCrawlAgent({ environmentId: DISPATCH_ENV_ID, crawlAgentId: DISPATCH_CRAWL_AGENT_ID }).learnBusiness(website), 20000);
        return { website, name: profile.name, services: profile.services.map(s => fromText(s) ?? { name: s.slice(0, 120) }), source: 'managed_agent', notice: 'Extracted by the business import agent. Review names and prices before activating.' };
      } catch { /* Public HTML import works without managed-agent credentials. */ }
    }
    try { return extractBusinessPreview(await withTimeout(publicPage(website), 18000), website); }
    catch { return { website, name: '', services: [], source: 'manual', notice: 'This site could not be read automatically. Open the source to check its details, retry, or enter them manually. Nothing has been imported yet.' }; }
  }
}
