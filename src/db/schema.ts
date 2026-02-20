import { pgTable, uuid, text, timestamp, index, uniqueIndex, integer, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * Ticket source entry - represents one platform's ticket purchase URL for an event.
 */
export type TicketSource = {
  platform: string;  // "ticketmaster", "axs", "dice", "venue-direct"
  url: string;       // Ticket purchase URL
  addedAt: string;   // ISO timestamp when source was added
};

/**
 * Events table - stores all music events from multiple platforms
 *
 * Key features:
 * - UUID primary keys for global uniqueness
 * - Unique constraint on (venue, date) for exact match deduplication
 * - Indexes optimized for date-range queries and fuzzy matching
 * - Source tracking for platform attribution
 */
export const events = pgTable(
  'events',
  {
    // Primary identifier
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    // Event details
    name: text('name').notNull(),
    artist: text('artist').notNull(),
    venue: text('venue').notNull(), // Normalized venue name (e.g., "Debaser Strand")
    date: timestamp('date', { withTimezone: true }).notNull(),
    time: text('time'), // Optional display time string (e.g., "19:00")
    genre: text('genre').notNull(), // Canonical genre (e.g., "rock", "electronic")

    // Ticketing
    ticketSources: jsonb('ticket_sources').notNull().$type<TicketSource[]>(),
    price: text('price'), // Optional price info (e.g., "250 SEK", "Free")

    // Source tracking
    sourceId: text('source_id').notNull(), // Original platform ID
    sourcePlatform: text('source_platform').notNull(), // "ticketmaster", "axs", "dice", "venue-direct"

    // Metadata
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    // Unique constraint for exact match deduplication
    // Same venue + same date = duplicate event
    venueDateIdx: uniqueIndex('venue_date_idx').on(table.venue, table.date),

    // Performance indexes for common queries
    dateIdx: index('date_idx').on(table.date), // Rolling window queries (next 12 months)
    genreIdx: index('genre_idx').on(table.genre), // Genre filtering
    artistDateIdx: index('artist_date_idx').on(table.artist, table.date), // Fuzzy match candidates
    sourcePlatformIdx: index('source_platform_idx').on(table.sourcePlatform, table.sourceId), // Source tracking
  })
);

// Export type for use in application code
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;

/**
 * Review queue table - stores potential duplicate events for manual review
 *
 * Purpose:
 * - Captures edge cases where fuzzy matching is uncertain (70-90% similarity)
 * - Allows human review to confirm or reject duplicate classification
 * - Tracks review status to prevent re-queuing same candidates
 *
 * Workflow:
 * 1. Deduplication pipeline finds potential duplicate (isDuplicateMatch = 'maybe')
 * 2. Add to review queue with similarity scores
 * 3. Admin reviews and marks as 'merged' or 'not_duplicate'
 * 4. Reviewed items excluded from future deduplication runs
 */
export const reviewQueue = pgTable('review_queue', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  // Event pair being reviewed
  eventId1: uuid('event_id_1')
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),
  eventId2: uuid('event_id_2')
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),

  // Similarity scores (0-100)
  artistSimilarity: integer('artist_similarity').notNull(),
  nameSimilarity: integer('name_similarity').notNull(),

  // Review status
  status: text('status')
    .notNull()
    .default('pending'), // 'pending', 'merged', 'not_duplicate'

  // Metadata
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  reviewedBy: text('reviewed_by')
});

export type ReviewQueueItem = typeof reviewQueue.$inferSelect;
export type NewReviewQueueItem = typeof reviewQueue.$inferInsert;
