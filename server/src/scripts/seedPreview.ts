/**
 * server/src/scripts/seedPreview.ts
 *
 * Standalone preview script — does NOT start the HTTP server. Run with:
 *   npm run seed:preview -w server
 *
 * Prints:
 *   1. The 4 sample crawler records run through categorize(), proving the
 *      keyword-scoring categorization path.
 *   2. A sample search (barber, 5 miles from DEMO_CENTER) against the
 *      seeded mock data, sorted by distance.
 */

import { DEMO_CENTER } from '@getitdone/shared';
import { categorize, inferServices } from '../categorization/keywords.js';
import { CRAWLER_SAMPLES } from '../data/crawlerSamples.js';
import { createSeededEngine } from '../data/seed.js';
import { getBusinessProvider } from '../providers/index.js';
import { searchBusinesses } from '../search/searchBusinesses.js';

function printCategorizedSamples(): void {
  console.log('\n=== Crawler samples -> categorize() ===\n');
  for (const raw of CRAWLER_SAMPLES) {
    const result = categorize(raw);
    const services = inferServices(raw);
    console.log(`${raw.name}`);
    console.log(
      `  category=${result.category} source=${result.source} confidence=${result.confidence.toFixed(2)}`,
    );
    console.log(`  matchedKeywords=[${result.matchedKeywords.join(', ')}]`);
    console.log(`  inferredServices=[${services.join(', ')}]\n`);
  }
}

async function printSampleSearch(): Promise<void> {
  console.log('=== Sample search: barber within 5 miles of DEMO_CENTER ===\n');

  const { store } = createSeededEngine();
  const provider = getBusinessProvider();

  const results = await searchBusinesses(provider, store, {
    category: 'barber',
    lat: DEMO_CENTER.lat,
    lng: DEMO_CENTER.lng,
    radiusMiles: 5,
  });

  for (const r of results) {
    console.log(
      `  ${r.distanceMiles.toFixed(2)} mi  ${r.name} (${r.priceLevel}$, ${r.rating}★) ` +
        `fullyBooked=${r.fullyBooked}${r.nextOpening ? ` nextOpening=${r.nextOpening}` : ''}`,
    );
  }
  console.log('');
}

printCategorizedSamples();
await printSampleSearch();
