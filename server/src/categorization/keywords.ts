/**
 * server/src/categorization/keywords.ts
 *
 * Turns a crawler's messy, source-specific business data into our
 * `Category` enum plus a set of normalized service tags.
 *
 * Two-step categorization:
 *   1. Alias table — if the source gave us a category string (e.g. "Barber
 *      Shop"), map it directly. This is authoritative: the source already
 *      told us what kind of business this is, we're just normalizing the
 *      label. source: 'crawler', confidence: 1.
 *   2. Keyword scoring — if step 1 found nothing (no categories, or none
 *      matched an alias), score CATEGORY_KEYWORDS against the business's
 *      name + description + servicesText. Name hits count for more than
 *      description/servicesText hits, since a business literally calling
 *      itself "Joe's Barber Shop" is stronger signal than the word
 *      "haircut" appearing once in a paragraph. source: 'keyword'.
 *      Below MIN_KEYWORD_SCORE, we give up: category 'other', source
 *      'unknown'.
 *
 * Both dictionaries below are plain data — editable without touching the
 * scoring logic.
 */

import type { Category } from '@getitdone/shared/types.js';
import type { RawCrawledBusiness } from '../providers/CrawlerBusinessProvider.js';

// ─── Step 1: source category alias table ──────────────────────────────────────

/**
 * Maps a source-provided category label (lowercased, trimmed) to our
 * Category enum. Add new source label variants here as they're seen in
 * the wild — this table is the first and cheapest thing to extend.
 */
export const CATEGORY_ALIASES: Record<string, Category> = {
  // barber
  'barber shop': 'barber',
  'barbershop': 'barber',
  'men\'s grooming': 'barber',
  'men\'s haircut': 'barber',

  // salon
  'hair salon': 'salon',
  'beauty salon': 'salon',
  'nail salon': 'salon',
  'hair stylist': 'salon',
  'blow dry bar': 'salon',

  // spa
  'day spa': 'spa',
  'massage spa': 'spa',
  'spa': 'spa',
  'massage therapist': 'spa',

  // electrician
  'electrician': 'electrician',
  'electrical contractor': 'electrician',
  'electrical service': 'electrician',

  // plumber
  'plumber': 'plumber',
  'plumbing contractor': 'plumber',
  'plumbing service': 'plumber',

  // hvac
  'hvac contractor': 'hvac',
  'heating & air conditioning': 'hvac',
  'heating and air conditioning': 'hvac',
  'air conditioning contractor': 'hvac',
  'hvac': 'hvac',

  // cleaning
  'house cleaning service': 'cleaning',
  'cleaning service': 'cleaning',
  'janitorial service': 'cleaning',
  'maid service': 'cleaning',

  // auto_repair
  'auto repair shop': 'auto_repair',
  'car repair': 'auto_repair',
  'mechanic': 'auto_repair',
  'auto repair': 'auto_repair',
};

// ─── Step 2: keyword scoring dictionary ───────────────────────────────────────

/** Keywords (lowercase, substring-matched) that suggest each category. */
export const CATEGORY_KEYWORDS: Record<Exclude<Category, 'other'>, string[]> = {
  barber: ['barber', 'barbershop', 'fade', 'haircut', 'shave', 'clipper', 'grooming'],
  salon: ['salon', 'stylist', 'blowout', 'highlights', 'balayage', 'nails', 'manicure', 'pedicure', 'color'],
  spa: ['spa', 'massage', 'facial', 'sauna', 'wellness', 'esthetician', 'aromatherapy'],
  electrician: ['electrician', 'electrical', 'wiring', 'panel upgrade', 'circuit breaker', 'outlet install'],
  plumber: ['plumber', 'plumbing', 'drain', 'pipe', 'leak repair', 'water heater', 'clog'],
  hvac: ['hvac', 'air conditioning', 'heating', 'furnace', 'duct', 'thermostat', 'ac repair'],
  cleaning: ['cleaning', 'maid', 'janitorial', 'housekeeping', 'deep clean', 'sanitize'],
  auto_repair: ['auto repair', 'mechanic', 'oil change', 'brake', 'transmission', 'tire', 'car repair'],
};

const NAME_WEIGHT = 3;
const TEXT_WEIGHT = 1;
const MIN_KEYWORD_SCORE = 2;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Whole-word/phrase match, tolerant of a simple trailing "s" plural
 * ("fade"/"fades", "haircut"/"haircuts") — plain substring matching would
 * let "spa" match inside "Sparkle" or "duct" match inside "product". Both
 * `text` and `keyword` are expected to already be lowercased.
 */
function containsKeyword(text: string, keyword: string): boolean {
  return new RegExp(`\\b${escapeRegExp(keyword)}s?\\b`).test(text);
}

// ─── Service tag dictionary (for inferServices) ───────────────────────────────

/** Normalized service tag -> phrases (lowercase, substring-matched) that imply it. */
export const SERVICE_KEYWORDS: Record<string, string[]> = {
  'haircut': ['haircut', 'hair cut', 'trim'],
  'fade': ['fade'],
  'beard trim': ['beard trim', 'beard'],
  'shave': ['shave', 'shaving', 'hot towel'],
  'hair coloring': ['color', 'highlights', 'balayage'],
  'manicure': ['manicure', 'mani'],
  'pedicure': ['pedicure', 'pedi'],
  'massage': ['massage'],
  'facial': ['facial'],
  'drain cleaning': ['drain cleaning', 'clogged drain', 'drain clog'],
  'pipe repair': ['pipe repair', 'leak repair', 'leaky pipe'],
  'water heater service': ['water heater'],
  'panel upgrade': ['panel upgrade', 'electrical panel', 'breaker panel'],
  'wiring': ['wiring', 'rewiring'],
  'ac repair': ['ac repair', 'air conditioning repair', 'air conditioner repair'],
  'furnace repair': ['furnace repair', 'heating repair'],
  'house cleaning': ['house cleaning', 'deep clean', 'housekeeping'],
  'oil change': ['oil change'],
  'brake service': ['brake service', 'brake repair', 'brakes'],
};

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface CategorizationResult {
  category: Category;
  source: 'crawler' | 'keyword' | 'unknown';
  /** 0..1 */
  confidence: number;
  matchedKeywords: string[];
}

// ─── categorize() ──────────────────────────────────────────────────────────────

export function categorize(raw: RawCrawledBusiness): CategorizationResult {
  // Step 1: alias table over source-given categories.
  for (const label of raw.categories ?? []) {
    const normalized = label.trim().toLowerCase();
    const mapped = CATEGORY_ALIASES[normalized];
    if (mapped) {
      return { category: mapped, source: 'crawler', confidence: 1, matchedKeywords: [label] };
    }
  }

  // Step 2: keyword scoring over name + description + servicesText.
  const name = (raw.name ?? '').toLowerCase();
  const text = `${raw.description ?? ''} ${raw.servicesText ?? ''}`.toLowerCase();

  let bestCategory: Category = 'other';
  let bestScore = 0;
  let bestMatches: string[] = [];

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as [Category, string[]][]) {
    let score = 0;
    const matches: string[] = [];
    for (const keyword of keywords) {
      let hit = false;
      if (containsKeyword(name, keyword)) {
        score += NAME_WEIGHT;
        hit = true;
      }
      if (containsKeyword(text, keyword)) {
        score += TEXT_WEIGHT;
        hit = true;
      }
      if (hit) matches.push(keyword);
    }
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
      bestMatches = matches;
    }
  }

  if (bestScore >= MIN_KEYWORD_SCORE) {
    const confidence = Math.min(1, bestScore / (NAME_WEIGHT + TEXT_WEIGHT + TEXT_WEIGHT));
    return { category: bestCategory, source: 'keyword', confidence, matchedKeywords: bestMatches };
  }

  return { category: 'other', source: 'unknown', confidence: 0, matchedKeywords: [] };
}

// ─── inferServices() ────────────────────────────────────────────────────────────

/** Returns normalized service tags found in the raw business's text fields. */
export function inferServices(raw: RawCrawledBusiness): string[] {
  const text = `${raw.name ?? ''} ${raw.description ?? ''} ${raw.servicesText ?? ''}`.toLowerCase();
  const tags: string[] = [];
  for (const [tag, phrases] of Object.entries(SERVICE_KEYWORDS)) {
    if (phrases.some(phrase => containsKeyword(text, phrase))) {
      tags.push(tag);
    }
  }
  return tags;
}
