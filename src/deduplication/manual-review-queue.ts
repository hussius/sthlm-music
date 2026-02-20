/**
 * Manual review queue for edge case deduplication.
 *
 * Stage 3 of deduplication pipeline:
 * - Stores potential duplicates with similarity 70-90%
 * - Provides API for retrieving pending review items
 * - Tracks review decisions to prevent re-queuing
 *
 * Why manual review is necessary:
 * - Automatic thresholds can't handle all edge cases
 * - "Taylor Swift Eras Tour" vs "Taylor Swift Reputation Tour" = 85% similar but different events
 * - "Coldplay Live" vs "Coldplay Concert" = 90% similar, probably same event
 * - Human judgment needed for 70-90% similarity range
 *
 * How to use review queue:
 * 1. Build admin UI that calls getReviewQueue()
 * 2. Display event pairs side-by-side with similarity scores
 * 3. Admin clicks "Merge" or "Keep Separate"
 * 4. Call markAsReviewed() with decision
 * 5. If merged, delete one event and update ticket URLs
 */

import { db } from '../db/client.js';
import { reviewQueue, type NewReviewQueueItem } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import type { FuzzyCandidate } from './fuzzy-match.js';

/**
 * Add a potential duplicate pair to the manual review queue.
 *
 * Called when isDuplicateMatch returns 'maybe' (similarity 70-90%).
 *
 * @param incomingEventId - UUID of the newly discovered event
 * @param candidate - Fuzzy match candidate with similarity scores
 */
export async function addToReviewQueue(
  incomingEventId: string,
  candidate: FuzzyCandidate
): Promise<void> {
  await db.insert(reviewQueue).values({
    eventId1: incomingEventId,
    eventId2: candidate.event.id,
    artistSimilarity: Math.round(candidate.artistSimilarity),
    nameSimilarity: Math.round(candidate.nameSimilarity),
    status: 'pending'
  });
}

/**
 * Get all pending review queue items.
 *
 * Returns items sorted by creation date (oldest first).
 * Admin UI should display these for manual review.
 *
 * @param limit - Maximum number of items to return (default 100)
 * @returns Array of pending review queue items
 */
export async function getReviewQueue(limit: number = 100) {
  return db
    .select()
    .from(reviewQueue)
    .where(eq(reviewQueue.status, 'pending'))
    .orderBy(reviewQueue.createdAt)
    .limit(limit);
}

/**
 * Mark a review queue item as reviewed.
 *
 * Called after admin makes merge/keep-separate decision.
 *
 * @param queueId - UUID of the review queue item
 * @param decision - 'merged' if events are duplicates, 'not_duplicate' if separate
 * @param reviewedBy - Username or email of reviewer (default 'system')
 */
export async function markAsReviewed(
  queueId: string,
  decision: 'merged' | 'not_duplicate',
  reviewedBy: string = 'system'
): Promise<void> {
  await db
    .update(reviewQueue)
    .set({
      status: decision,
      reviewedAt: new Date(),
      reviewedBy
    })
    .where(eq(reviewQueue.id, queueId));
}
