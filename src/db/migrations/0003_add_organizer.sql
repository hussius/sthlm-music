-- Migration: Add organizer column to events table
-- Organizer-specific crawlers (e.g., Klubb Död) set this field so fans can
-- filter events by organizer regardless of which venue hosts the event.
-- Nullable — venue-direct crawlers that don't set an organizer leave it NULL.

ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "organizer" text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organizer_idx" ON "events" USING btree ("organizer");
