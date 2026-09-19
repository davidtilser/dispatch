/**
 * server/src/data/crawlerSamples.ts
 *
 * 4 raw crawler-style records with NO source-given category, to prove the
 * keyword-scoring categorization path (step 2 of categorize()) at
 * startup / in seed:preview — none of these can take the step-1 alias
 * shortcut, since `categories` is omitted entirely.
 */

import type { RawCrawledBusiness } from '../providers/CrawlerBusinessProvider.js';

export const CRAWLER_SAMPLES: RawCrawledBusiness[] = [
  {
    sourceId: 'crawl_001',
    name: "Bob's Barber Shop",
    address: '12 Main St, Fremont, CA',
    lat: 37.55,
    lng: -121.99,
    description: 'Classic haircuts, fades, and hot towel shaves in downtown Fremont.',
    servicesText: 'Haircut, fade, beard trim',
    priceLevel: 2,
    rating: 4.5,
    phone: '555-0199',
    sourceUrl: 'https://example.com/listings/bobs-barber-shop',
  },
  {
    sourceId: 'crawl_002',
    name: 'Golden State Plumbing Co',
    address: '90 Industrial Way, Newark, CA',
    lat: 37.53,
    lng: -122.04,
    description: 'Fast response for clogged drains, leaky pipes, and water heater repair.',
    servicesText: 'Drain cleaning, pipe repair, water heater installation',
    priceLevel: 2,
    rating: 4.2,
    phone: '555-0198',
    sourceUrl: 'https://example.com/listings/golden-state-plumbing',
  },
  {
    // Deliberately ambiguous / low-signal: should fall through to 'other'.
    sourceId: 'crawl_003',
    name: 'Ambiguous Home Services',
    address: '5 Generic Ave, Fremont, CA',
    lat: 37.56,
    lng: -121.97,
    description: 'We handle it all around the house, big or small.',
    servicesText: '',
    sourceUrl: 'https://example.com/listings/ambiguous-home-services',
  },
  {
    sourceId: 'crawl_004',
    name: 'Sparkle Windows & More',
    address: '400 Elm St, Fremont, CA',
    lat: 37.54,
    lng: -121.95,
    description: 'Professional home cleaning and window washing for busy families.',
    servicesText: 'House cleaning, deep clean, move-out cleaning',
    priceLevel: 1,
    rating: 4.6,
    phone: '555-0197',
    sourceUrl: 'https://example.com/listings/sparkle-windows',
  },
];
