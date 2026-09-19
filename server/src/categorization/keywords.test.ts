import { describe, it, expect } from 'vitest';
import { categorize, inferServices } from './keywords.js';
import type { RawCrawledBusiness } from '../providers/CrawlerBusinessProvider.js';

function raw(overrides: Partial<RawCrawledBusiness>): RawCrawledBusiness {
  return {
    sourceId: 'src_1',
    name: 'Generic Business',
    address: '1 Main St',
    lat: 37.5,
    lng: -121.9,
    ...overrides,
  };
}

describe('categorize — step 1: crawler category alias table', () => {
  it('maps "Barber Shop" to barber', () => {
    const result = categorize(raw({ categories: ['Barber Shop'] }));
    expect(result).toEqual({ category: 'barber', source: 'crawler', confidence: 1, matchedKeywords: ['Barber Shop'] });
  });

  it('maps "Hair Salon" to salon', () => {
    const result = categorize(raw({ categories: ['Hair Salon'] }));
    expect(result.category).toBe('salon');
    expect(result.source).toBe('crawler');
  });

  it('maps "Plumbing Contractor" to plumber', () => {
    const result = categorize(raw({ categories: ['Plumbing Contractor'] }));
    expect(result.category).toBe('plumber');
    expect(result.confidence).toBe(1);
  });

  it('matches aliases case-insensitively and trims whitespace', () => {
    const result = categorize(raw({ categories: ['  ELECTRICIAN  '] }));
    expect(result.category).toBe('electrician');
    expect(result.source).toBe('crawler');
  });

  it('uses the first alias-matching category when several are given', () => {
    const result = categorize(raw({ categories: ['Not A Real Category', 'Auto Repair Shop'] }));
    expect(result.category).toBe('auto_repair');
    expect(result.source).toBe('crawler');
  });

  it('falls through to keyword scoring when no given category matches an alias', () => {
    const result = categorize(
      raw({ categories: ['Some Unmapped Label'], name: "Joe's Barber Shop", description: 'Fades and haircuts.' }),
    );
    expect(result.category).toBe('barber');
    expect(result.source).toBe('keyword');
  });
});

describe('categorize — step 2: keyword scoring', () => {
  it('categorizes via name keywords alone', () => {
    const result = categorize(raw({ name: 'QuickFix HVAC Services' }));
    expect(result.category).toBe('hvac');
    expect(result.source).toBe('keyword');
  });

  it('categorizes via description keywords', () => {
    const result = categorize(
      raw({ name: 'CleanPro', description: 'We offer house cleaning and janitorial service.' }),
    );
    expect(result.category).toBe('cleaning');
    expect(result.source).toBe('keyword');
  });

  it('categorizes via servicesText alone', () => {
    const result = categorize(
      raw({ name: 'ABC Services', servicesText: 'Drain cleaning and pipe repair for homes.' }),
    );
    expect(result.category).toBe('plumber');
  });

  it('weighs a name hit over a single incidental text hit elsewhere', () => {
    const result = categorize(
      raw({ name: "Tony's Barber Shop", description: 'We also recommend a nice massage afterward.' }),
    );
    expect(result.category).toBe('barber');
  });

  it('reaches the minimum score from two separate weak text hits', () => {
    // "drain" + "pipe" in description only = 1+1 = 2, meets MIN_KEYWORD_SCORE.
    const result = categorize(raw({ name: 'Generic Co', description: 'We fix a clogged drain or a broken pipe.' }));
    expect(result.category).toBe('plumber');
    expect(result.source).toBe('keyword');
  });

  it('falls back to other/unknown below the minimum score', () => {
    // Single weak hit only — score 1 < MIN_KEYWORD_SCORE (2).
    const result = categorize(raw({ name: 'Generic Co', description: 'We offer a spa day package sometimes.' }));
    expect(result.category).toBe('other');
    expect(result.source).toBe('unknown');
    expect(result.confidence).toBe(0);
  });

  it('is ambiguous / low-signal and falls back to other', () => {
    const result = categorize(raw({ name: 'Ambiguous Home Services', description: 'We handle it all around the house.' }));
    expect(result.category).toBe('other');
    expect(result.source).toBe('unknown');
    expect(result.matchedKeywords).toEqual([]);
  });

  it('returns other/unknown for a completely empty record', () => {
    const result = categorize(raw({ name: '' }));
    expect(result).toEqual({ category: 'other', source: 'unknown', confidence: 0, matchedKeywords: [] });
  });

  it('still finds keywords in an HTML-injected name', () => {
    const result = categorize(raw({ name: "<script>alert(1)</script> Bob's Barber Shop" }));
    expect(result.category).toBe('barber');
    expect(result.source).toBe('keyword');
  });

  it('still finds keywords in an HTML-injected description', () => {
    const result = categorize(
      raw({ name: 'Generic Co', description: '<b>Panel upgrade</b> and <i>wiring</i> services.' }),
    );
    expect(result.category).toBe('electrician');
  });

  it('does not let a keyword substring inside an unrelated word match ("spa" in "Sparkle")', () => {
    const result = categorize(
      raw({
        name: 'Sparkle Windows & More',
        description: 'Professional home cleaning and window washing.',
        servicesText: 'House cleaning, deep clean, move-out cleaning',
      }),
    );
    // Without word-boundary matching this would wrongly hit 'spa' inside
    // "Sparkle" and come back as source: 'keyword', category: 'spa'.
    expect(result.category).toBe('cleaning');
    expect(result.matchedKeywords).not.toContain('spa');
  });

  it('caps confidence at 1 even with many keyword hits', () => {
    const result = categorize(
      raw({
        name: 'Barber Shop Barbershop Fade Haircut',
        description: 'shave clipper grooming barber',
      }),
    );
    expect(result.category).toBe('barber');
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
});

describe('inferServices', () => {
  it('returns normalized service tags found across name/description/servicesText', () => {
    const tags = inferServices(
      raw({ name: "Bob's Barber", description: 'Haircuts and fades.', servicesText: 'Beard trim, shave' }),
    );
    expect(tags).toEqual(expect.arrayContaining(['haircut', 'fade', 'beard trim', 'shave']));
  });

  it('dedupes tags that would otherwise match more than once', () => {
    const tags = inferServices(raw({ name: 'Haircut haircut HAIRCUT' }));
    expect(tags.filter(t => t === 'haircut')).toHaveLength(1);
  });

  it('returns an empty array when nothing matches', () => {
    expect(inferServices(raw({ name: 'Nondescript Co', description: '' }))).toEqual([]);
  });
});
