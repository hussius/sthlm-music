import { pgTable, uuid, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

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
    ticketUrl: text('ticket_url').notNull(),
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
