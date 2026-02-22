/**
 * Fredagsmangel venue crawler
 *
 * Crawls: https://fredagsmangel.se/
 * Static HTML — metal club nights at Jakobs Bar, Stockholm.
 * Structure: <div class="project-card">
 *   <h3>[YYMMDD]</h3>              ← date in YYMMDD format (e.g., "260227")
 *   <p>[Artist (COUNTRY) Genre, on stage HH:MM<br>...more acts]</p>
 *   <p><a href="https://www.nortic.se/ticket/event/[ID]">Visa evenemang</a></p>
 *
 * Date format: YYMMDD (2-digit year, so "260227" = 2026-02-27)
 * Multi-day events like "260522-24" use only the first date.
 * Time extracted from first artist line if present ("on stage HH:MM" or just "HH:MM").
 */

import dotenv from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as cheerio from 'cheerio';
import * as schema from './dist/db/schema.js';

dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;
const VENUE_URL = 'https://fredagsmangel.se/';
const VENUE_NAME = 'Fredagsmangel';

console.log(`🎸 Crawling ${VENUE_NAME}...`);

const client = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(client, { schema });

function parseFredagsmangelDate(raw) {
  // Format: "260227" or "260522-24" (multi-day, use first)
  // Take first 6 chars: YYMMDD
  const s = raw.trim().substring(0, 6);
  const match = s.match(/^(\d{2})(\d{2})(\d{2})$/);
  if (!match) return null;

  const year = 2000 + parseInt(match[1]);
  const month = parseInt(match[2]) - 1;
  const day = parseInt(match[3]);

  if (month < 0 || month > 11 || day < 1 || day > 31) return null;
  return { year, month, day };
}

function extractTimeFromLine(line) {
  // Matches "on stage 22:30" or just "22:30" at end/anywhere in the line
  const match = line.match(/\b(\d{1,2}):(\d{2})\b/);
  if (!match) return null;
  return `${String(parseInt(match[1])).padStart(2, '0')}:${match[2]}`;
}

function extractArtistName(line) {
  // "Darkmoon Warrior (GER) Black Metal, on stage 22:30" → "Darkmoon Warrior"
  // "LG LEGACY NIGHT" → "LG LEGACY NIGHT"
  // "MANGELFEST!" → "MANGELFEST!"
  const parenIdx = line.indexOf('(');
  if (parenIdx > 0) {
    return line.substring(0, parenIdx).trim();
  }
  // Strip trailing time/genre info after comma
  const commaIdx = line.indexOf(',');
  if (commaIdx > 0) {
    return line.substring(0, commaIdx).trim();
  }
  return line.trim();
}

try {
  console.log('📄 Fetching events page...');
  const response = await fetch(VENUE_URL);
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

  const html = await response.text();
  const $ = cheerio.load(html);

  console.log('🔍 Parsing events...');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const events = [];
  const seen = new Set();

  $('.project-card').each((_, el) => {
    const $card = $(el);

    // Date from <h3>
    const dateRaw = $card.find('h3').first().text().trim();
    if (!dateRaw) return;

    // Skip non-date headings (letters only, no digits)
    if (!/^\d/.test(dateRaw)) return;

    const parsed = parseFredagsmangelDate(dateRaw);
    if (!parsed) return;

    const { year, month, day } = parsed;

    // Get first artist paragraph (not the ticket link paragraph)
    const paras = $card.find('p');
    let artistText = '';
    let ticketUrl = VENUE_URL;

    paras.each((_, p) => {
      const $p = $(p);
      const link = $p.find('a[href*="nortic.se"]');
      if (link.length > 0) {
        ticketUrl = link.attr('href') || VENUE_URL;
      } else if (!artistText) {
        artistText = $p.text().trim();
      }
    });

    if (!artistText) return;

    // First line = headliner
    const firstLine = artistText.split('\n')[0].trim().replace(/\s+/g, ' ');
    const artist = extractArtistName(firstLine) || firstLine;
    if (!artist) return;

    // Title: artist name (headliner)
    const title = artist;

    // Time from first line
    const timeStr = extractTimeFromLine(firstLine) || '20:00';
    const [hours, minutes] = timeStr.split(':').map(Number);

    const eventDate = new Date(year, month, day, hours, minutes, 0, 0);
    if (eventDate < today) return;

    const key = `${dateRaw}-${title}`;
    if (seen.has(key)) return;
    seen.add(key);

    events.push({ title, ticketUrl, eventDate, timeStr });
  });

  console.log(`Found ${events.length} events`);

  let success = 0;
  let failed = 0;

  for (const { title, ticketUrl, eventDate, timeStr } of events) {
    try {
      const event = {
        name: title,
        artist: title,
        venue: VENUE_NAME,
        date: eventDate,
        time: timeStr,
        genre: 'metal',
        ticketSources: [{
          platform: 'venue-direct',
          url: ticketUrl,
          addedAt: new Date().toISOString(),
        }],
        sourceId: `fredagsmangel-${title.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 60)}-${eventDate.toISOString().split('T')[0]}`,
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
      console.error(`❌ ${title}: ${error.message}`);
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
