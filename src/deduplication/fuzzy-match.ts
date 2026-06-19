/**
 * Fuzzy match deduplication using string similarity.
 *
 * Stage 2 of deduplication pipeline:
 * - Find events within 24-hour window of target date
 * - Calculate string similarity for artist and event name
 * - Classify candidates as duplicate (>90%), maybe (70-90%), or not duplicate (<70%)
 *
 * Why fuzzy matching is needed:
 * - Same event appears with slight naming variations across platforms
 * - "Coldplay Live in Stockholm" vs "Coldplay - Stockholm Concert"
 * - "Stockholm Jazz Trio" vs "Jazz Trio Stockholm"
 * - Venue name variations caught by normalization, but event/artist names vary
 *
 * Why token_set_ratio:
 * - Handles word order differences ("Coldplay Live" vs "Live Coldplay")
 * - Ignores stopwords and common variations
 * - Better for event names than simple Levenshtein distance
 *
 * Thresholds (from RESEARCH.md Pattern 2):
 * - >90% artist + >85% name = high confidence duplicate
 * - >75% artist + >70% name = potential duplicate (manual review)
 * - Lower = not duplicate
 *
 * These may need tuning based on production false positive/negative rates.
 */

import * as Fuzzball from 'fuzzball';
import { db } from '../db/client.js';
import { events, type Event } from '../db/schema.js';
import { between, and, not, eq } from 'drizzle-orm';

/**
 * Fuzzy match candidate with similarity scores.
 */
export interface FuzzyCandidate {
  event: Event;
  artistSimilarity: number;
  nameSimilarity: number;
  venueSimilarity: number;
  sameStockholmDay: boolean;
  overallSimilarity: number;
}

const stockholmDayFormatter = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Stockholm',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function normalizeForDedupe(value: string | null | undefined): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/['"`´]/g, '')
    .replace(/[^a-z0-9åäö]+/gi, ' ')
    .replace(/\b(stockholm|sthlm|biljetter|tickets|ticket|live|konsert)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stockholmDayKey(date: Date): string {
  return stockholmDayFormatter.format(date);
}

/**
 * Find potential duplicate events using fuzzy string matching.
 *
 * Process:
 * 1. Query events within 24-hour window (handles timezone/parsing differences)
 * 2. Calculate similarity for artist and name using token_set_ratio
 * 3. Filter candidates with overall similarity >50%
 * 4. Sort by similarity (highest first)
 *
 * Why 24-hour window:
 * - Allows for timezone differences (Stockholm vs UTC)
 * - Allows for date parsing errors (midnight vs 8 PM)
 * - Prevents false positives from different days
 *
 * Why weighted average (60% artist, 40% name):
 * - Artist name is more stable across platforms
 * - Event name varies more ("Live in Stockholm", "Concert", "Tour")
 * - Artist match more indicative of duplicate than event name
 *
 * @param event - Incoming event to find duplicates for
 * @returns Array of candidates sorted by similarity (highest first)
 */
export async function findFuzzyCandidates(event: Partial<Event>): Promise<FuzzyCandidate[]> {
  if (!event.date || !event.name) {
    return [];
  }

  // Find events within 24 hours of target event
  const dayBefore = new Date(event.date);
  dayBefore.setHours(dayBefore.getHours() - 24);

  const dayAfter = new Date(event.date);
  dayAfter.setHours(dayAfter.getHours() + 24);

  const candidates = await db
    .select()
    .from(events)
    .where(between(events.date, dayBefore, dayAfter));

  // Calculate similarity for each candidate
  const scoredCandidates: FuzzyCandidate[] = [];

  for (const candidate of candidates) {
    // Skip if same source (can't be duplicate from same platform)
    if (event.sourcePlatform && event.sourceId &&
        candidate.sourcePlatform === event.sourcePlatform &&
        candidate.sourceId === event.sourceId) {
      continue;
    }

    // Calculate string similarities using token_set_ratio (handles word order differences)
    const normalizedArtist = normalizeForDedupe(event.artist);
    const normalizedCandidateArtist = normalizeForDedupe(candidate.artist);
    const normalizedName = normalizeForDedupe(event.name);
    const normalizedCandidateName = normalizeForDedupe(candidate.name);
    const normalizedVenue = normalizeForDedupe(event.venue);
    const normalizedCandidateVenue = normalizeForDedupe(candidate.venue);

    const artistSimilarity = normalizedArtist && normalizedCandidateArtist
      ? Fuzzball.token_set_ratio(normalizedArtist, normalizedCandidateArtist)
      : 0;

    const nameSimilarity = Fuzzball.token_set_ratio(
      normalizedName,
      normalizedCandidateName
    );

    const venueSimilarity = normalizedVenue && normalizedCandidateVenue
      ? Fuzzball.token_set_ratio(normalizedVenue, normalizedCandidateVenue)
      : 0;

    const sameStockholmDay = stockholmDayKey(new Date(event.date)) === stockholmDayKey(candidate.date);

    // Overall similarity: artist is useful when present, but event feeds often
    // use missing/generic artist values. Title + venue should still catch obvious duplicates.
    const overallSimilarity = artistSimilarity > 0
      ? (artistSimilarity * 0.5) + (nameSimilarity * 0.35) + (venueSimilarity * 0.15)
      : (nameSimilarity * 0.7) + (venueSimilarity * 0.3);

    // Only include if similarity is above threshold (50%)
    if (overallSimilarity > 50) {
      scoredCandidates.push({
        event: candidate,
        artistSimilarity,
        nameSimilarity,
        venueSimilarity,
        sameStockholmDay,
        overallSimilarity
      });
    }
  }

  // Sort by similarity (highest first)
  return scoredCandidates.sort((a, b) => b.overallSimilarity - a.overallSimilarity);
}

/**
 * Calculate similarity between two strings using token_set_ratio.
 *
 * Utility function for ad-hoc similarity checks.
 *
 * @param str1 - First string
 * @param str2 - Second string
 * @returns Similarity score 0-100
 */
export function calculateSimilarity(str1: string, str2: string): number {
  return Fuzzball.token_set_ratio(normalizeForDedupe(str1), normalizeForDedupe(str2));
}

/**
 * Classify a fuzzy match candidate as duplicate, maybe, or not duplicate.
 *
 * Classification rules:
 * - High confidence duplicate: artist >90% AND name >85%
 * - Potential duplicate (needs review): artist >75% AND name >70%
 * - Not duplicate: below thresholds
 *
 * Why both artist AND name:
 * - Prevents false positives from same artist, different events
 * - "Taylor Swift - Reputation Tour" vs "Taylor Swift - Eras Tour"
 * - Artist 100% similar, but name <70% = different events
 *
 * Why thresholds may need tuning:
 * - False positive rate depends on event name conventions
 * - If platforms use very different naming (e.g., all caps, abbreviations), lower thresholds
 * - If platforms use consistent naming, raise thresholds
 * - Monitor production metrics and adjust
 *
 * @param candidate - Fuzzy match candidate with similarity scores
 * @returns Classification: 'duplicate', 'maybe', or 'not_duplicate'
 */
export function isDuplicateMatch(candidate: FuzzyCandidate): 'duplicate' | 'maybe' | 'not_duplicate' {
  // Many venue/ticket feeds have weak artist fields. If title, venue, and
  // Stockholm calendar day agree strongly, treat it as an obvious duplicate.
  if (candidate.sameStockholmDay && candidate.nameSimilarity >= 94 && candidate.venueSimilarity >= 85) {
    return 'duplicate';
  }

  // High confidence duplicate: both artist and name very similar
  if (candidate.artistSimilarity > 90 && candidate.nameSimilarity > 85) {
    return 'duplicate';
  }

  if (candidate.sameStockholmDay && candidate.nameSimilarity >= 86 && candidate.venueSimilarity >= 75) {
    return 'maybe';
  }

  // Potential duplicate: needs manual review
  if (candidate.artistSimilarity > 75 && candidate.nameSimilarity > 70) {
    return 'maybe';
  }

  // Not a duplicate
  return 'not_duplicate';
}
