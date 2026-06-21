/**
 * Removes clearly non-concert/non-music entries after crawls complete.
 *
 * Some legacy JS crawlers insert directly into Postgres and bypass the Zod
 * normalization filter. This pass catches those rows before the public API
 * serves them.
 */

import Anthropic from '@anthropic-ai/sdk';
import { eq } from 'drizzle-orm';
import { db } from './db/client.js';
import { events } from './db/schema.js';
import { nonConcertReason } from './normalization/event-filters.js';

const BATCH_SIZE = 50;

type EventRow = {
  id: string;
  name: string;
  artist: string;
  venue: string;
  organizer: string | null;
  genre: string;
};

type LlmDecision = {
  id: string;
  decision: 'keep' | 'remove';
  reason?: string;
};

async function deleteEvent(id: string, reason: string): Promise<void> {
  await db.delete(events).where(eq(events.id, id));
  console.log(`  removed non-concert event: ${id} (${reason})`);
}

function parseJsonArray(raw: string): LlmDecision[] {
  const json = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    console.error('  ⚠ Failed to parse non-concert classifier response:', json.slice(0, 150));
    return [];
  }
}

async function classifyBatch(client: Anthropic, batch: EventRow[]): Promise<LlmDecision[]> {
  const eventList = batch
    .map((event) => (
      `id="${event.id}" name="${event.name}" artist="${event.artist}" venue="${event.venue}" organizer="${event.organizer || ''}" genre="${event.genre}"`
    ))
    .join('\n');

  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `You are filtering a Stockholm music events calendar.

Classify each listing as:
- "keep" for concerts, live music, DJ sets, club nights, jams, music festivals, artist tours, record-release shows, and nightlife events that plausibly center on music.
- "remove" only when clearly NOT a music event: film/cinema screenings, children's activities, art/craft courses, museum workshops, sports watch parties, food/brunch/dinner-only events, shopping/market events, ticket-sale-only promos, gift cards, quizzes, stand-up, lectures, or theatre-only listings.

Be conservative. If uncertain, choose "keep".

Events:
${eventList}

Respond with a JSON array only, no markdown:
[{"id":"...","decision":"keep|remove","reason":"short reason"}]`,
      },
    ],
  });

  const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : '[]';
  return parseJsonArray(raw);
}

export async function pruneNonConcertEvents(): Promise<void> {
  const allEvents = await db
    .select({
      id: events.id,
      name: events.name,
      artist: events.artist,
      venue: events.venue,
      organizer: events.organizer,
      genre: events.genre,
    })
    .from(events);

  if (allEvents.length === 0) {
    console.log('  No events to prune');
    return;
  }

  let removed = 0;

  for (const event of allEvents) {
    const reason = nonConcertReason(event);
    if (reason) {
      await deleteEvent(event.id, reason);
      removed++;
    }
  }

  const llmCandidates = allEvents.filter((event) => event.genre === 'other' && !nonConcertReason(event));

  if (!process.env.ANTHROPIC_API_KEY) {
    console.log(`  ✅ Removed ${removed} non-concert events by rules; ANTHROPIC_API_KEY not set, skipping LLM pruning`);
    return;
  }

  if (llmCandidates.length === 0) {
    console.log(`  ✅ Removed ${removed} non-concert events by rules; no LLM candidates`);
    return;
  }

  const client = new Anthropic();
  const totalBatches = Math.ceil(llmCandidates.length / BATCH_SIZE);

  for (let i = 0; i < llmCandidates.length; i += BATCH_SIZE) {
    const batch = llmCandidates.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    process.stdout.write(`  Non-concert classifier batch ${batchNum}/${totalBatches}... `);

    const decisions = await classifyBatch(client, batch);
    const batchById = new Map(batch.map((event) => [event.id, event]));

    let batchRemoved = 0;
    for (const decision of decisions) {
      if (decision.decision !== 'remove' || !batchById.has(decision.id)) {
        continue;
      }

      await deleteEvent(decision.id, `LLM: ${decision.reason || 'non-music event'}`);
      removed++;
      batchRemoved++;
    }

    console.log(`done (${batchRemoved} removed)`);
  }

  console.log(`  ✅ Removed ${removed} non-concert events total`);
}
