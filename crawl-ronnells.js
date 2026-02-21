import dotenv from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as cheerio from 'cheerio';
import * as schema from './dist/db/schema.js';

dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;
const VENUE_URL = 'https://ronnells.se/?page_id=21';
const VENUE_NAME = 'Rönnells Antikvariat';

console.log(`🎸 Crawling ${VENUE_NAME}...`);

const client = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(client, { schema });

function parseRonnellsDate(dateStr) {
  // Parse Swedish dates like "torsdag 26 februari 2026" or "måndag 3 mars 2026"
  const months = {
    januari: 0, februari: 1, mars: 2, april: 3, maj: 4, juni: 5,
    juli: 6, augusti: 7, september: 8, oktober: 9, november: 10, december: 11
  };

  // Remove day name (måndag, tisdag, etc.) and parse the date
  const match = dateStr.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
  if (match) {
    const day = parseInt(match[1]);
    const monthName = match[2].toLowerCase();
    const year = parseInt(match[3]);
    const month = months[monthName];

    if (month !== undefined) {
      // Parse time from time string like "19-21 (insläpp 18:30)"
      // Use start time (19:00 in this case)
      return { year, month, day };
    }
  }

  return null;
}

function parseTime(timeStr) {
  // Parse time like "19-21 (insläpp 18:30)" -> extract start time "19:00"
  const timeMatch = timeStr.match(/(\d{1,2})-\d{1,2}/);
  if (timeMatch) {
    const hour = parseInt(timeMatch[1]);
    return { hour, minute: 0 };
  }

  // Fallback to 20:00
  return { hour: 20, minute: 0 };
}

try {
  console.log('📄 Fetching events page...');

  const response = await fetch(VENUE_URL);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const events = [];

  console.log('🔍 Parsing events...');
  console.log(`Found ${$('strong').length} <strong> tags`);
  console.log(`Found ${$('b').length} <b> tags`);
  console.log(`Found ${$('h3').length} <h3> tags`);

  // Find all strong and b tags with dates (they mark the start of event blocks)
  $('strong, b').each((i, elem) => {
    try {
      const dateText = $(elem).text().trim();

      console.log(`  Checking strong tag: "${dateText}"`);

      // Check if this looks like a date
      if (!dateText.match(/\d{1,2}\s+\w+\s+\d{4}/)) {
        return;
      }

      console.log(`  ✓ Found date: ${dateText}`);

      const dateParts = parseRonnellsDate(dateText);
      if (!dateParts) return;

      // Find all h3 elements and get the one that follows this date element
      const allH3s = $('h3').toArray();
      const dateElem = $(elem)[0];
      let titleText = '';
      let timeText = '';
      let eventUrl = '';

      // Find the next h3 after this date element
      for (const h3 of allH3s) {
        if (h3.startSourcePos && dateElem.endSourcePos && h3.startSourcePos > dateElem.endSourcePos) {
          titleText = $(h3).text().trim();

          // Look for time text before this h3
          const h3Parent = $(h3).parent();
          const textBefore = h3Parent.prevAll().toArray().slice(0, 3).map(el => $(el).text().trim()).join(' ');
          const timeMatch = textBefore.match(/(\d{1,2}-\d{1,2})/);
          if (timeMatch) {
            timeText = timeMatch[0];
          }

          // Look for event link
          const link = h3Parent.find('a').first();
          if (link.length) {
            eventUrl = link.attr('href') || '';
          }

          break;
        }
      }

      // Fallback: if position comparison didn't work, just get the next h3 in DOM order
      if (!titleText) {
        const allContent = $('*').toArray();
        let foundDate = false;
        for (const el of allContent) {
          if (foundDate && $(el).is('h3')) {
            titleText = $(el).text().trim();

            // Get surrounding text for time
            const surroundingText = $(el).parent().text();
            const timeMatch = surroundingText.match(/(\d{1,2}-\d{1,2})/);
            if (timeMatch) {
              timeText = timeMatch[0];
            }

            break;
          }
          if (el === dateElem) {
            foundDate = true;
          }
        }
      }

      if (titleText) {
        console.log(`  ✓ Found title: ${titleText}`);
        console.log(`  ✓ Time: ${timeText || 'default'}`);

        const time = parseTime(timeText || '20-22');
        const eventDate = new Date(
          dateParts.year,
          dateParts.month,
          dateParts.day,
          time.hour,
          time.minute,
          0,
          0
        );

        events.push({
          name: titleText,
          date: eventDate,
          time: `${time.hour.toString().padStart(2, '0')}:${time.minute.toString().padStart(2, '0')}`,
          url: eventUrl || VENUE_URL,
        });
      } else {
        console.log(`  ✗ No title found for date: ${dateText}`);
      }
    } catch (error) {
      console.error(`⚠️  Error parsing event: ${error.message}`);
    }
  });

  console.log(`\n📋 Found ${events.length} events`);

  let success = 0;
  let failed = 0;

  for (const eventData of events) {
    try {
      if (isNaN(eventData.date.getTime())) {
        console.log(`⚠️  ${eventData.name}: Invalid date`);
        failed++;
        continue;
      }

      const event = {
        name: eventData.name,
        artist: eventData.name,
        venue: VENUE_NAME,
        date: eventData.date,
        time: eventData.time,
        genre: 'other',
        ticketSources: [{
          platform: 'venue-direct',
          url: eventData.url,
          addedAt: new Date().toISOString(),
        }],
        sourceId: `ronnells-${eventData.name}-${eventData.date.toISOString().split('T')[0]}`,
        sourcePlatform: 'venue-direct',
      };

      await db.insert(schema.events).values(event).onConflictDoUpdate({
        target: [schema.events.venue, schema.events.date],
        set: event,
      });

      success++;
      console.log(`✅ ${event.name} (${event.date.toISOString().split('T')[0]} ${event.time})`);
    } catch (error) {
      failed++;
      console.error(`❌ ${eventData.name}: ${error.message}`);
    }
  }

  console.log(`\n✅ Complete: ${success} saved, ${failed} failed`);

  await client.end();
  process.exit(0);
} catch (error) {
  console.error('❌ Crawler failed:', error);
  process.exit(1);
}
