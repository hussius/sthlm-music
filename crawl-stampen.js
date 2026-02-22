/**
 * Stampen venue crawler
 *
 * Crawls: https://stampen.se/program
 * Uses Modern Events Calendar (MEC) WordPress plugin - events in static HTML.
 */

import dotenv from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as cheerio from 'cheerio';
import * as schema from './dist/db/schema.js';

dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;
const VENUE_URL = 'https://stampen.se/program';
const VENUE_NAME = 'Stampen';

console.log(`🎸 Crawling ${VENUE_NAME}...`);

const client = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(client, { schema });

// MEC plugin renders dates like "22 Feb" (no year in display text)
function parseMecDate(dateText) {
  const cleaned = dateText.trim();

  // Try "22 Feb 2026" first
  let d = new Date(cleaned);
  if (!isNaN(d.getTime())) return d;

  // Try "22 Feb" — add current year
  const now = new Date();
  const withYear = `${cleaned} ${now.getFullYear()}`;
  d = new Date(withYear);
  if (!isNaN(d.getTime())) {
    // If date already passed this year, try next year
    if (d < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
      d = new Date(`${cleaned} ${now.getFullYear() + 1}`);
    }
    return d;
  }

  return null;
}

try {
  console.log('📄 Fetching page...');
  const response = await fetch(VENUE_URL);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  console.log('🔍 Parsing events...');

  // MEC plugin wraps each event in .mec-event-article
  const articles = $('.mec-event-article').toArray();
  console.log(`Found ${articles.length} event articles`);

  let success = 0;
  let failed = 0;

  for (const article of articles) {
    try {
      const $a = $(article);

      // Title: .t-entry-title contains a link with the event name
      const titleEl = $a.find('.t-entry-title');
      const title = titleEl.text().trim();
      if (!title) continue;

      // URL: link inside .t-entry-title
      const linkEl = titleEl.find('a').first();
      const eventUrl = linkEl.attr('href') || VENUE_URL;

      // Date: MEC stores it in a date element; try multiple selectors
      const dateText = (
        $a.find('.mec-event-date').first().text() ||
        $a.find('[class*="date"]').first().text() ||
        $a.find('time').first().attr('datetime') ||
        $a.find('time').first().text()
      ).trim();

      if (!dateText) {
        console.log(`  ⚠️  No date for: ${title}`);
        continue;
      }

      const eventDate = parseMecDate(dateText);
      if (!eventDate || isNaN(eventDate.getTime())) {
        console.log(`  ⚠️  Could not parse date "${dateText}" for: ${title}`);
        continue;
      }

      // Try to extract time from date area or description
      const timeMatch = $a.text().match(/(\d{1,2}):(\d{2})\s*(pm|am)?/i);
      let timeStr = '20:00';
      if (timeMatch) {
        let hour = parseInt(timeMatch[1]);
        const minute = parseInt(timeMatch[2]);
        const ampm = timeMatch[3]?.toLowerCase();
        if (ampm === 'pm' && hour !== 12) hour += 12;
        if (ampm === 'am' && hour === 12) hour = 0;
        eventDate.setHours(hour, minute, 0, 0);
        timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      } else {
        eventDate.setHours(20, 0, 0, 0);
      }

      const event = {
        name: title,
        artist: title,
        venue: VENUE_NAME,
        date: eventDate,
        time: timeStr,
        genre: 'other',
        ticketSources: [{
          platform: 'venue-direct',
          url: eventUrl,
          addedAt: new Date().toISOString(),
        }],
        sourceId: `stampen-${title.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 60)}-${eventDate.toISOString().split('T')[0]}`,
        sourcePlatform: 'venue-direct',
      };

      await db.insert(schema.events).values(event).onConflictDoUpdate({
        target: [schema.events.venue, schema.events.date],
        set: event,
      });

      success++;
      console.log(`✅ ${title} (${eventDate.toISOString().split('T')[0]} ${timeStr})`);
    } catch (error) {
      failed++;
      console.error(`❌ Error: ${error.message}`);
    }
  }

  console.log(`\n✅ Complete: ${success} saved, ${failed} failed`);

  await client.end();
  process.exit(0);
} catch (error) {
  console.error('❌ Crawler failed:', error);
  await client.end();
  process.exit(1);
}
