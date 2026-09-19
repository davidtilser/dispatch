import type { BusinessProfile } from '@dispatch/contracts';
import {
  asString,
  createClient,
  extractJson,
  runManagedAgent,
  type ManagedAgentConfig,
} from './managed.js';

// Lucas: website URL -> validated shop information for the voice agent.
export interface CrawlAgent {
  learnBusiness(url: string): Promise<BusinessProfile>;
}

export interface ClaudeCrawlAgentConfig extends ManagedAgentConfig {
  crawlAgentId: string; // "Dispatch Crawl" in Console
  defaultTimezone?: string;
}

// Calls the Dispatch Crawl managed agent and maps its JSON onto BusinessProfile.
export class ClaudeCrawlAgent implements CrawlAgent {
  private readonly client;

  constructor(private readonly config: ClaudeCrawlAgentConfig) {
    this.client = createClient(config);
  }

  async learnBusiness(url: string): Promise<BusinessProfile> {
    const reply = await runManagedAgent(
      this.client,
      this.config.environmentId,
      this.config.crawlAgentId,
      `Build the business profile for: ${url}`,
      'Dispatch crawl',
    );
    const raw = extractJson(reply);
    const name = asString(raw.business_name) ?? new URL(url).hostname;

    return {
      id: asString(raw.business_id) ?? slugify(name),
      name,
      website: url,
      timezone: this.config.defaultTimezone ?? 'America/Los_Angeles',
      services: toServiceList(raw.services),
    };
  }
}

// ["Haircut ($45)", "Skin fade ($50)"]
function toServiceList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item === 'string') return [item];
    if (typeof item !== 'object' || item === null) return [];
    const record = item as Record<string, unknown>;
    const name = asString(record.name);
    if (!name) return [];
    const price = record.price_usd;
    return [typeof price === 'number' ? `${name} ($${price})` : name];
  });
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'business';
}
