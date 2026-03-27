/**
 * LLM-based genre inference for events with unknown genre.
 *
 * Finds all events stored as 'other' and uses Claude to classify them
 * into the canonical genre taxonomy based on artist name, event name, and venue.
 *
 * Runs in batches of 50 events per API call for cost efficiency.
 * Only updates events where Claude is confident (non-'other' result).
 *
 * Usage:
 *   import { inferGenres } from './genre-inference.js';
 *   await inferGenres();
 */

import Anthropic from '@anthropic-ai/sdk';
import { db } from './db/client.js';
import { events } from './db/schema.js';
import { CANONICAL_GENRES } from './normalization/genre-mappings.js';
import { eq } from 'drizzle-orm';

const BATCH_SIZE = 50;

type CanonicalGenre = typeof CANONICAL_GENRES[number];

interface EventRow {
  id: string;
  name: string;
  artist: string;
  venue: string;
}

/**
 * Sends a batch of events to Claude Haiku for genre classification.
 * Returns a map of event ID → inferred genre.
 * Events where Claude returns 'other' or an invalid genre are omitted.
 */
async function inferGenresForBatch(
  client: Anthropic,
  batch: EventRow[],
): Promise<Map<string, CanonicalGenre>> {
  const eventList = batch
    .map(
      (e) =>
        `id="${e.id}" artist="${e.artist}" name="${e.name}" venue="${e.venue}"`,
    )
    .join('\n');

  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `You are a music genre classifier. Classify each event's genre using ONLY these options:
${CANONICAL_GENRES.join(', ')}

Guidelines:
- orchestra, opera, chamber music, philharmonic → classical
- techno, house, DJ sets, club nights → electronic
- psytrance, goa → trance
- noise, EBM, dark electro → industrial
- ska, dub, dancehall → reggae
- only use "other" if truly ambiguous (comedy, theatre, talks, etc.)

Events to classify:
${eventList}

Respond with a JSON array only — no explanation, no markdown:
[{"id":"...","genre":"..."},...]`,
      },
    ],
  });

  const raw =
    response.content[0].type === 'text' ? response.content[0].text.trim() : '[]';

  // Strip markdown code fences if present
  const json = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

  try {
    const results = JSON.parse(json) as Array<{ id: string; genre: string }>;
    const map = new Map<string, CanonicalGenre>();
    for (const r of results) {
      if (r.id && CANONICAL_GENRES.includes(r.genre as CanonicalGenre)) {
        map.set(r.id, r.genre as CanonicalGenre);
      }
    }
    return map;
  } catch {
    console.error('  ⚠ Failed to parse inference response:', json.slice(0, 150));
    return new Map();
  }
}

/**
 * Main entry point. Fetches all genre='other' events and infers their genre
 * using Claude Haiku in batches. Updates the DB for each classified event.
 */
export async function inferGenres(): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('  ⚠ ANTHROPIC_API_KEY not set — skipping genre inference');
    return;
  }

  const client = new Anthropic();

  // Fetch all events that still need classification
  const otherEvents = await db
    .select({
      id: events.id,
      name: events.name,
      artist: events.artist,
      venue: events.venue,
    })
    .from(events)
    .where(eq(events.genre, 'other'));

  if (otherEvents.length === 0) {
    console.log('  No events need genre inference');
    return;
  }

  console.log(`  Found ${otherEvents.length} events to classify`);

  let updated = 0;
  const totalBatches = Math.ceil(otherEvents.length / BATCH_SIZE);

  for (let i = 0; i < otherEvents.length; i += BATCH_SIZE) {
    const batch = otherEvents.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    process.stdout.write(`  Batch ${batchNum}/${totalBatches}... `);

    const genreMap = await inferGenresForBatch(client, batch);

    // Update DB for each event with a confident (non-'other') result
    for (const [id, genre] of genreMap) {
      if (genre !== 'other') {
        await db.update(events).set({ genre }).where(eq(events.id, id));
        updated++;
      }
    }

    const skipped = batch.length - genreMap.size;
    console.log(
      `done (${updated} updated so far${skipped > 0 ? `, ${skipped} parse errors` : ''})`,
    );
  }

  console.log(`  ✅ Updated ${updated}/${otherEvents.length} events with inferred genre`);
}
