CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"artist" text NOT NULL,
	"venue" text NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"time" text,
	"genre" text NOT NULL,
	"ticket_url" text NOT NULL,
	"price" text,
	"source_id" text NOT NULL,
	"source_platform" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "venue_date_idx" ON "events" USING btree ("venue","date");--> statement-breakpoint
CREATE INDEX "date_idx" ON "events" USING btree ("date");--> statement-breakpoint
CREATE INDEX "genre_idx" ON "events" USING btree ("genre");--> statement-breakpoint
CREATE INDEX "artist_date_idx" ON "events" USING btree ("artist","date");--> statement-breakpoint
CREATE INDEX "source_platform_idx" ON "events" USING btree ("source_platform","source_id");