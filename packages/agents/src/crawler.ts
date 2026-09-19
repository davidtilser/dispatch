import type { BusinessProfile } from '@dispatch/contracts';

// Lucas: website URL -> validated shop information for the voice agent.
export interface CrawlAgent {
  learnBusiness(url: string): Promise<BusinessProfile>;
}
