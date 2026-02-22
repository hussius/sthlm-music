/**
 * Stampen venue crawler
 *
 * Crawls: https://stampen.se/program
 * Uses Modern Events Calendar (MEC) WordPress plugin.
 * Title in h3.mec-single-title, date as text "22 Feb 5:00 pm"
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

function parseDate(dateText) {
  // Formats: "22 Feb", "22 Feb 2026", "22 Feb 5:00 pm"
  const now = new Date();
  const clean = dateText.trim();

  // Extract time if present: "5:00 pm" or "20:00"
  let hour = 20, minute = 0;
  const timeMatch = clean.match(/(\d{1,2}):(\d{2})\s*(pm|am)?/i);
  if (timeMatch) {
    hour = parseInt(timeMatch[1]);
    minute = parseInt(timeMatch[2]);
    const ampm = timeMatch[3]?.toLowerCase();
    if (ampm === 'pm' && hour !== 12) hour += 12;
    if (ampm === 'am' && hour === 12) hour = 0;
  }

  // Extract day and month: "22 Feb" or "Feb 22"
  const dmMatch = clean.match(/(\d{1,2})\s+([A-Za-z]+)/);
  const mdMatch = clean.match(/([A-Za-z]+)\s+(\d{1,2})/);
  let day, monthStr;

  if (dmMatch) {
    day = parseInt(dmMatch[1]);
    monthStr = dmMatch[2];
  } else if (mdMatch) {
    monthStr = mdMatch[1];
    day = parseInt(mdMatch[2]);
  } else {
    return null;
  }

  // Try parsing with current year appended
  const withYear = `${day} ${monthStr} ${now.getFullYear()}`;
  let d = new Date(withYear);
  if (isNaN(d.getTime())) return null;

  d.setHours(hour, minute, 0, 0);

  // If date is in the past, try next year
  if (d < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    d = new Date(`${day} ${monthStr} ${now.getFullYear() + 1}`);
    d.setHours(hour, minute, 0, 0);
  }

  return d;
}

try {
  console.log('📄 Fetching page...');
  const response = await fetch(VENUE_URL);
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

  const html = await response.text();
  const $ = cheerio.load(html);

  console.log('🔍 Parsing events...');

  // MEC renders each event as an <article> with h3.mec-single-title
  const articles = $('article').toArray();
  console.log(`Found ${articles.length} articles`);

  let success = 0;
  let failed = 0;

  for (const article of articles) {
    try {
      const $a = $(article);

      // Title in h3.mec-single-title or any h3/h4
      const titleEl = $a.find('.mec-single-title, h3, h4').first();
      const title = titleEl.text().trim();
      if (!title) continue;

      // URL from the title link or any event link
      const eventUrl = titleEl.find('a').attr('href')
        || $a.find('a[href*="stampen.se/event"], a[href*="/event/"]').first().attr('href')
        || VENUE_URL;

      // Date text: look for "22 Feb" pattern in the article text
      const articleText = $a.text();
      const dateMatch = articleText.match(/\d{1,2}\s+[A-Za-z]{3}/);
      if (!dateMatch) {
        console.log(`  ⚠️  No date for: ${title}`);
        continue;
      }

      // Also grab time if present
      const fullDateText = articleText.match(/\d{1,2}\s+[A-Za-z]{3,}.*?(\d{1,2}:\d{2}\s*(?:am|pm)?)/i)?.[0]
        || dateMatch[0];

      const eventDate = parseDate(fullDateText);
      if (!eventDate || isNaN(eventDate.getTime())) {
        console.log(`  ⚠️  Could not parse date "${fullDateText}" for: ${title}`);
        continue;
      }

      const timeStr = `${String(eventDate.getHours()).padStart(2, '0')}:${String(eventDate.getMinutes()).padStart(2, '0')}`;

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
