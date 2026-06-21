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

import { db } from '../db/client.js';
import { events, type Event } from '../db/schema.js';
import { between } from 'drizzle-orm';
import {
  classifySimilarity,
  normalizeText,
  scoreEventSimilarity,
} from './canonical.js';

/**
 * Fuzzy match candidate with similarity scores.
 */
export interface FuzzyCandidate {
  event: Event;
  artistSimilarity: number;
  nameSimilarity: number;
  venueSimilarity: number;
  sameStockholmDay: boolean;
  timeDistanceMinutes: number | null;
  sharedTicketUrl: boolean;
  artistReliable: boolean;
  venueReliable: boolean;
  overallSimilarity: number;
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

  // Find events within 36 hours of target event. The final classifier still
  // requires the same Stockholm calendar day unless URL/source matches, but a
  // wider candidate window catches UTC/local parsing drift around midnight.
  const dayBefore = new Date(event.date);
  dayBefore.setHours(dayBefore.getHours() - 36);

  const dayAfter = new Date(event.date);
  dayAfter.setHours(dayAfter.getHours() + 36);

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

    const score = scoreEventSimilarity(event, candidate);

    // Only include if similarity is above threshold (50%)
    if (score.overallSimilarity > 50 || score.sharedTicketUrl || score.sameSource) {
      scoredCandidates.push({
        event: candidate,
        artistSimilarity: score.artistSimilarity,
        nameSimilarity: score.titleSimilarity,
        venueSimilarity: score.venueSimilarity,
        sameStockholmDay: score.sameStockholmDay,
        timeDistanceMinutes: score.timeDistanceMinutes,
        sharedTicketUrl: score.sharedTicketUrl,
        artistReliable: score.artistReliable,
        venueReliable: score.venueReliable,
        overallSimilarity: score.overallSimilarity,
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
  const left = normalizeText(str1);
  const right = normalizeText(str2);
  if (!left || !right) return 0;
  return scoreEventSimilarity({ name: left }, { name: right }).titleSimilarity;
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
  return classifySimilarity({
    titleSimilarity: candidate.nameSimilarity,
    artistSimilarity: candidate.artistSimilarity,
    venueSimilarity: candidate.venueSimilarity,
    overallSimilarity: candidate.overallSimilarity,
    sameStockholmDay: candidate.sameStockholmDay,
    timeDistanceMinutes: candidate.timeDistanceMinutes,
    sharedTicketUrl: candidate.sharedTicketUrl,
    sameSource: false,
    artistReliable: candidate.artistReliable,
    venueReliable: candidate.venueReliable,
  });
}
