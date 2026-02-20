-- Enable pg_trgm extension for trigram-based text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN trigram indexes for artist and name columns
-- GIN (Generalized Inverted Index) is preferred over GiST for read-heavy workloads
-- These indexes enable fast ILIKE searches with leading wildcards (e.g., '%metallica%')

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_artist_trgm
  ON events USING GIN (artist gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_name_trgm
  ON events USING GIN (name gin_trgm_ops);

-- Verify indexes were created (for testing/debugging)
-- SELECT schemaname, tablename, indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'events' AND indexname LIKE '%trgm%';
