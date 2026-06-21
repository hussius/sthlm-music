/**
 * Post-crawl duplicate consolidation.
 *
 * The main deduplication pipeline protects crawlers that call deduplicateAndSave,
 * but several legacy JS crawlers still write directly to the events table. This
 * pass consolidates duplicates after all crawlers have finished.
 */

import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { events, type Event } from '../db/schema.js';
import {
  classifySimilarity,
  isReliableArtist,
  mergeTicketSources,
  normalizeTitle,
  scoreEventSimilarity,
  stockholmDayKey,
} from './canonical.js';

function titleQuality(event: Event): number {
  const title = normalizeTitle(event.name, event.venue);
  let score = 0;

  if (title) score += 10;
  if (!/^\d{1,2}\s/.test(event.name)) score += 5;
  if (!/[|•]/.test(event.name)) score += 3;
  if (!/\b(ticket|tickets|biljetter|platinum)\b/i.test(event.name)) score += 3;
  if (event.name.length <= 80) score += 2;

  return score;
}

function rowQuality(event: Event): number {
  let score = titleQuality(event);
  if (event.venue && !/unknown/i.test(event.venue)) score += 10;
  if (isReliableArtist(event)) score += 8;
  if (event.genre && event.genre !== 'other') score += 4;
  if (event.organizer) score += 2;
  score += Math.min(event.ticketSources.length, 5);
  return score;
}

function chooseKeeper(a: Event, b: Event): { keep: Event; remove: Event } {
  const aQuality = rowQuality(a);
  const bQuality = rowQuality(b);
  if (bQuality > aQuality) return { keep: b, remove: a };
  return { keep: a, remove: b };
}

function chooseDisplayDate(keep: Event, remove: Event): { date: Date; time: string | null } {
  if (!keep.time && remove.time) {
    return { date: remove.date, time: remove.time };
  }

  const keepIsMidnight = keep.date.getUTCHours() === 0 && keep.date.getUTCMinutes() === 0;
  const removeIsMidnight = remove.date.getUTCHours() === 0 && remove.date.getUTCMinutes() === 0;
  if (keepIsMidnight && !removeIsMidnight) {
    return { date: remove.date, time: remove.time };
  }

  return { date: keep.date, time: keep.time };
}

function mergedUpdate(keep: Event, remove: Event) {
  const displayDate = chooseDisplayDate(keep, remove);

  return {
    name: titleQuality(remove) > titleQuality(keep) ? remove.name : keep.name,
    artist: isReliableArtist(remove) && !isReliableArtist(keep) ? remove.artist : keep.artist,
    venue: /unknown/i.test(keep.venue) && !/unknown/i.test(remove.venue) ? remove.venue : keep.venue,
    date: displayDate.date,
    time: displayDate.time,
    genre: keep.genre === 'other' && remove.genre !== 'other' ? remove.genre : keep.genre,
    organizer: keep.organizer || remove.organizer,
    price: keep.price || remove.price,
    ticketSources: mergeTicketSources(keep.ticketSources, remove.ticketSources),
    updatedAt: new Date(),
  };
}

export async function consolidateDuplicateEvents(): Promise<void> {
  const rows = await db.select().from(events).orderBy(events.date);
  if (rows.length < 2) {
    console.log('  No duplicate candidates to consolidate');
    return;
  }

  const byDay = new Map<string, Event[]>();
  for (const event of rows) {
    const day = stockholmDayKey(event.date);
    byDay.set(day, [...(byDay.get(day) || []), event]);
  }

  const deleted = new Set<string>();
  let merged = 0;

  for (const dayEvents of byDay.values()) {
    for (let i = 0; i < dayEvents.length; i++) {
      const left = dayEvents[i];
      if (deleted.has(left.id)) continue;

      for (let j = i + 1; j < dayEvents.length; j++) {
        const right = dayEvents[j];
        if (deleted.has(right.id)) continue;

        const score = scoreEventSimilarity(left, right);
        if (classifySimilarity(score) !== 'duplicate') {
          continue;
        }

        const { keep, remove } = chooseKeeper(left, right);
        await db.delete(events).where(eq(events.id, remove.id));
        await db.update(events).set(mergedUpdate(keep, remove)).where(eq(events.id, keep.id));

        deleted.add(remove.id);
        merged++;
        console.log(
          `  merged duplicate: "${remove.name}" → "${keep.name}" ` +
          `(title=${score.titleSimilarity}, artist=${score.artistSimilarity}, venue=${score.venueSimilarity})`
        );

        if (remove.id === left.id) {
          break;
        }
      }
    }
  }

  console.log(`  ✅ Consolidated ${merged} duplicate event${merged === 1 ? '' : 's'}`);
}
