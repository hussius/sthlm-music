-- Migration: Add review_queue table for manual deduplication review
-- This table is required by src/deduplication/manual-review-queue.ts
-- Events with fuzzy match similarity 70-90% are queued here for human review

CREATE TABLE "review_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id_1" uuid NOT NULL,
	"event_id_2" uuid NOT NULL,
	"artist_similarity" integer NOT NULL,
	"name_similarity" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" text,
	CONSTRAINT "review_queue_event_id_1_events_id_fk" FOREIGN KEY ("event_id_1") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "review_queue_event_id_2_events_id_fk" FOREIGN KEY ("event_id_2") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action
);
