/**
 * server/src/providers/index.ts
 *
 * Public surface of the providers module. getBusinessProvider() selects
 * the implementation named by config.businessProvider ('mock' | 'crawler').
 */

import { config } from '../config.js';
import type { BusinessProvider } from './BusinessProvider.js';
import { MockBusinessProvider } from './MockBusinessProvider.js';
import { CrawlerBusinessProvider } from './CrawlerBusinessProvider.js';

export type { BusinessProvider, BusinessSearchParams } from './BusinessProvider.js';
export { MockBusinessProvider } from './MockBusinessProvider.js';
export { CrawlerBusinessProvider, NotImplementedError } from './CrawlerBusinessProvider.js';
export type { RawCrawledBusiness } from './CrawlerBusinessProvider.js';

export function getBusinessProvider(): BusinessProvider {
  return config.businessProvider === 'crawler' ? new CrawlerBusinessProvider() : new MockBusinessProvider();
}
