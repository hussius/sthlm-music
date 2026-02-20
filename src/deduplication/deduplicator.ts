/**
 * Multi-stage deduplication pipeline orchestrator.
 *
 * Coordinates three deduplication stages:
 * 1. Exact match on venue+date (database constraint)
 * 2. Fuzzy match on artist+name (string similarity)
 * 3. Manual review queue for edge cases (70-90% similarity)
 *
 * Flow:
 * ```
 * Incoming event
 *   ↓
 * Stage 1: Exact match? → Yes → Return existing event
 *   ↓ No
 * Stage 2: Fuzzy match >90%? → Yes → Return existing event
 *   ↓ No
 * Stage 2: Fuzzy match 70-90%? → Yes → Queue for manual review + Save as new
 *   ↓ No
 * Stage 3: No matches → Save as unique event
 * ```
 *
 * Integration with crawlers:
 * - Call deduplicateAndSave() instead of upsertEvent()
 * - Pipeline handles all deduplication logic
 * - Crawlers don't need to know about deduplication stages
 *
 * Performance:
 * - Exact match: O(log n) database index lookup
 * - Fuzzy match: O(m) where m = events in 24-hour window (~10-50 for Stockholm)
 * - Overall: Fast enough for real-time crawler use
 *
 * Accuracy (target from RESEARCH.md):
 * - False positive rate: <2% (high confidence duplicates are truly duplicates)
 * - False negative rate: <3% (true duplicates caught by fuzzy matching)
 * - Manual review catches edge cases that would be false positives/negatives
 */

import { checkExactMatch, mergeEventData } from './exact-match.js';
import { findFuzzyCandidates, isDuplicateMatch } from './fuzzy-match.js';
import { addToReviewQueue } from './manual-review-queue.js';
import { upsertEvent, getEventById } from '../repositories/event-repository.js';
import type { Event, NewEvent } from '../db/schema.js';

/**
 * Deduplication result indicating how the event was classified.
 */
export type DeduplicationResult =
  | { status: 'duplicate'; existingEventId: string }
  | { status: 'unique' }
  | { status: 'manual_review'; candidateIds: string[] };

/**
 * Run deduplication pipeline on an event.
 *
 * Returns classification without modifying database.
 * Use deduplicateAndSave() for full pipeline including database operations.
 *
 * @param event - Event to check for duplicates
 * @returns Classification result with status and relevant IDs
 */
export async function deduplicateEvent(event: Partial<Event>): Promise<DeduplicationResult> {
  // Stage 1: Exact match on venue + date
  const exactMatch = await checkExactMatch(event);

  if (exactMatch) {
    console.log(`Exact match found for ${event.name} at ${event.venue}`);
    return { status: 'duplicate', existingEventId: exactMatch.id };
  }

  // Stage 2: Fuzzy match on artist + date
  const candidates = await findFuzzyCandidates(event);

  if (candidates.length === 0) {
    // No candidates found, definitely unique
    return { status: 'unique' };
  }

  // Check each candidate
  const reviewCandidates: string[] = [];

  for (const candidate of candidates) {
    const classification = isDuplicateMatch(candidate);

    if (classification === 'duplicate') {
      // High confidence duplicate
      console.log(
        `Fuzzy match found: ${event.name} ≈ ${candidate.event.name} (${candidate.overallSimilarity.toFixed(1)}%)`
      );
      return { status: 'duplicate', existingEventId: candidate.event.id };
    }

    if (classification === 'maybe') {
      // Edge case - needs manual review
      console.log(
        `Potential duplicate queued for review: ${event.name} ≈ ${candidate.event.name} (${candidate.overallSimilarity.toFixed(1)}%)`
      );
      reviewCandidates.push(candidate.event.id);
    }
  }

  // If we have review candidates, return manual_review status
  if (reviewCandidates.length > 0) {
    return { status: 'manual_review', candidateIds: reviewCandidates };
  }

  // No high-confidence matches found
  return { status: 'unique' };
}

/**
 * Run deduplication pipeline and save event to database.
 *
 * Complete workflow:
 * 1. Check for duplicates (exact + fuzzy)
 * 2. If duplicate: skip insert (event already exists)
 * 3. If unique: insert as new event
 * 4. If manual_review: insert as new event AND queue for review
 *
 * Note on manual_review flow:
 * - Event is saved immediately (users see it in listings)
 * - Admin can later merge if confirmed duplicate
 * - Better UX than waiting for manual review before showing event
 *
 * @param event - Event to deduplicate and save
 * @returns Saved event from database (or existing event if duplicate)
 */
export async function deduplicateAndSave(event: NewEvent): Promise<Event> {
  const result = await deduplicateEvent(event);

  switch (result.status) {
    case 'duplicate':
      // Fetch existing event and merge ticket sources
      const existing = await getEventById(result.existingEventId);
      if (!existing) {
        // Edge case: existing event was deleted between deduplication check and now
        // Treat as unique and insert
        const saved = await upsertEvent(event);
        console.log(`Saved event (original duplicate was deleted): ${event.name}`);
        return saved;
      }

      // Merge ticket sources from both events
      const merged = await mergeEventData(existing, event);
      const updated = await upsertEvent(merged);
      console.log(`Merged ticket source into existing event: ${updated.name}`);
      return updated;

    case 'unique':
      // Save event as new
      const saved = await upsertEvent(event);
      console.log(`Saved new event: ${event.name}`);
      return saved;

    case 'manual_review':
      // Save event but queue for review
      const savedForReview = await upsertEvent(event);
      console.log(`Saved event for manual review: ${event.name}`);

      // Queue all candidates for manual review
      for (const candidateId of result.candidateIds) {
        await addToReviewQueue(savedForReview.id, {
          event: { id: candidateId } as Event,
          artistSimilarity: 0, // Will be calculated again in review UI
          nameSimilarity: 0,
          overallSimilarity: 0
        });
      }

      return savedForReview;
  }
}

/**
 * Helper function for repository integration.
 *
 * Wraps deduplicateAndSave with error handling.
 * Returns boolean for simple success/failure checking in crawlers.
 *
 * @param event - Event to save with deduplication
 * @returns true if saved successfully, false on error
 */
export async function saveEventWithDeduplication(event: NewEvent): Promise<boolean> {
  try {
    await deduplicateAndSave(event);
    return true;
  } catch (error) {
    // If error is "duplicate event", that's actually success
    if (error instanceof Error && error.message.includes('Duplicate event')) {
      return true;
    }
    console.error('Failed to save event:', error);
    return false;
  }
}
