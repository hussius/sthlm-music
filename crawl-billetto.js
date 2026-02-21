import dotenv from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { chromium } from 'playwright';
import * as schema from './dist/db/schema.js';
import { mkdirSync } from 'fs';

dotenv.config({ path: '.env.local' });

// Set temp directory to avoid permission issues
const tmpDir = '/tmp/claude-crawlers';
try {
  mkdirSync(tmpDir, { recursive: true });
  process.env.TMPDIR = tmpDir;
} catch (e) {
  console.warn(`Could not create temp dir ${tmpDir}:`, e.message);
}

const DATABASE_URL = process.env.DATABASE_URL;
const SEARCH_URL = 'https://billetto.se/search?text=stockholm&category%5B%5D=music';

console.log(`🎸 Crawling Billetto Stockholm music events...`);

const client = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(client, { schema });

function parseSwedishDate(dateStr) {
  // Parse Swedish dates like:
  // "apr. 17 2026 19:30", "22 feb 2026", "15 mar", "mars 21 2026 21:00"
  const months = {
    jan: 0, feb: 1, mar: 2, mars: 2, apr: 3, maj: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, okt: 9, nov: 10, dec: 11
  };

  // Clean up the date string
  const cleaned = dateStr.toLowerCase().replace(/\./g, '').trim();

  // Try format: "apr 17 2026 19:30" or "apr 17 2026"
  let match = cleaned.match(/(\w{3,4})\s+(\d{1,2})\s+(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (match) {
    const monthName = match[1];
    const day = parseInt(match[2]);
    const year = parseInt(match[3]);
    const hour = match[4] ? parseInt(match[4]) : 20;
    const minute = match[5] ? parseInt(match[5]) : 0;
    const month = months[monthName];

    if (month !== undefined) {
      return new Date(year, month, day, hour, minute, 0, 0);
    }
  }

  // Try format: "22 feb 2026" or "15 mar"
  match = cleaned.match(/(\d{1,2})\s+(\w{3,4})\s*(\d{4})?/);
  if (match) {
    const day = parseInt(match[1]);
    const monthName = match[2];
    const year = match[3] ? parseInt(match[3]) : new Date().getFullYear();
    const month = months[monthName];

    if (month !== undefined) {
      return new Date(year, month, day, 20, 0, 0, 0);
    }
  }

  return null;
}

function normalizeVenue(venueName) {
  // Normalize venue names to match our existing venues
  const name = venueName.trim();

  // Landet variations
  if (name.includes('Landet')) return 'Landet';

  // Kollektivet variations
  if (name.includes('Kollektivet')) return 'Kollektivet Livet';

  // Debaser variations
  if (name.includes('Debaser')) {
    if (name.includes('Strand')) return 'Debaser Strand';
    if (name.includes('Nova')) return 'Debaser Nova';
    return 'Debaser Strand'; // Default to Strand
  }

  // Slakthusområdet venues
  if (name.includes('Slaktkyrkan')) return 'Slaktkyrkan';
  if (name.includes('Hus 7')) return 'Hus 7';
  if (name.includes('Terrassen')) return 'Terrassen';
  if (name.includes('Under Bron')) return 'Under Bron';

  // Jazz/music venues
  if (name.includes('Fasching')) return 'Fasching';
  if (name.includes('Nalen')) return 'Nalen';
  if (name.includes('Fylkingen')) return 'Fylkingen';

  // Other venues
  if (name.includes('Pet Sounds')) return 'Pet Sounds';
  if (name.includes('Fållan')) return 'Fållan';
  if (name.includes('Södra Teatern')) return 'Södra Teatern';
  if (name.includes('Rönnells')) return 'Rönnells Antikvariat';
  if (name.includes('Banan') || name.includes('B-K')) return 'Banankompaniet';

  return name;
}

try {
  console.log('🌐 Launching browser...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-dev-shm-usage', '--no-sandbox'],
  });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  });
  const page = await context.newPage();

  console.log('📄 Loading Billetto search page...');
  await page.goto(SEARCH_URL, { waitUntil: 'networkidle', timeout: 30000 });

  // Wait for events to load
  console.log('⏳ Waiting for search results...');
  await page.waitForTimeout(8000); // Longer wait for JavaScript to render

  // Check if page loaded correctly
  const pageTitle = await page.title();
  console.log(`📄 Page title: ${pageTitle}`);

  // Get some debug info
  const debugInfo = await page.evaluate(() => {
    return {
      bodyTextLength: document.body.innerText.length,
      linksCount: document.querySelectorAll('a[href]').length,
      eventLinksCount: document.querySelectorAll('a[href*="/e/"]').length,
    };
  });

  console.log(`📊 Debug: ${debugInfo.bodyTextLength} chars of text, ${debugInfo.linksCount} links, ${debugInfo.eventLinksCount} event links`);

  console.log('🔍 Extracting events...');

  const events = await page.evaluate(() => {
    const eventData = [];
    const debugInfo = [];

    // Use event links directly and get their parent containers
    const eventLinks = Array.from(document.querySelectorAll('a[href*="/e/"]'));
    console.log(`Found ${eventLinks.length} event links`);

    eventLinks.forEach((link, index) => {
      try {
        // Get the href
        const href = link.getAttribute('href') || '';

        // Get the parent container
        let container = link.closest('article') || link.closest('[class*="card"]') || link.closest('div[class]') || link;

        // Get full text from container
        const fullText = container.textContent || '';

        // Try to parse JSON-LD schema.org data (Billetto embeds this)
        let name = '';
        let jsonVenue = '';
        try {
          // Get event name - it appears at the end of the JSON, right before "url"
          const eventNameMatch = fullText.match(/"name":"([^"]+)","url":"https:\/\/billetto\.se\/e\//);
          if (eventNameMatch) {
            name = eventNameMatch[1];
          }

          // Also try to get venue from JSON location.name
          const venueMatch = fullText.match(/"location":\{"@type":"Place"[^}]+?"name":"([^"]+)"/);
          if (venueMatch) {
            jsonVenue = venueMatch[1];
          }
        } catch (e) {
          // JSON parsing failed, continue with text extraction
        }

        // Fallback: get name from visible heading if JSON parsing failed
        if (!name || name.length < 3) {
          const heading = container.querySelector('h1, h2, h3, h4, h5');
          if (heading) {
            name = heading.textContent?.trim() || '';
          }
        }

        // Extract venue from "Plats: VenueName, City" pattern in visible text
        let venue = jsonVenue;
        if (!venue) {
          const venueMatch = fullText.match(/Plats:\s*([^,\n]+)/);
          if (venueMatch) {
            venue = venueMatch[1].trim();
          }
        }

        // Extract date from visible text like "apr. 17 2026 19:30"
        // Swedish months: jan, feb, mars, apr, maj, jun, jul, aug, sep, okt, nov, dec
        const dateMatch = fullText.match(/(\w{3,4}\.?\s+\d{1,2}\s+\d{4}\s+\d{1,2}:\d{2})/i) ||
                         fullText.match(/(\d{1,2}\s+\w{3,4}\.?\s+\d{4})/i);
        const dateStr = dateMatch ? dateMatch[1].trim() : '';

        // Debug first 5 elements
        if (index < 5) {
          debugInfo.push({
            name: name || 'NO NAME',
            venue: venue || 'NO VENUE',
            date: dateStr || 'NO DATE',
            href: href || 'NO HREF',
            textPreview: fullText.substring(0, 150).replace(/\s+/g, ' '),
          });
        }

        if (!name || name.length < 2) return;

        if (dateStr && href) {
          eventData.push({
            name: name,
            venue: venue || 'Unknown Venue',
            date: dateStr,
            url: href,
          });
        }
      } catch (e) {
        // Skip problematic elements
        console.error('Error processing link:', e.message);
      }
    });

    // Return both event data and debug info
    return { events: eventData, debug: debugInfo };
  });

  // Debug output
  console.log('\n🔍 Debug - First 5 event links:');
  events.debug.forEach((d, i) => {
    console.log(`\n  Link ${i + 1}:`);
    console.log(`    Name: ${d.name}`);
    console.log(`    Venue: ${d.venue}`);
    console.log(`    Date: ${d.date}`);
    console.log(`    Href: ${d.href}`);
    console.log(`    Text: ${d.textPreview}`);
  });

  console.log(`\n📋 Found ${events.events.length} events from Billetto`);

  // Group by venue
  const venueGroups = {};
  events.events.forEach(e => {
    const v = e.venue || 'Unknown';
    venueGroups[v] = (venueGroups[v] || 0) + 1;
  });

  console.log('\n📊 Events by venue:');
  Object.entries(venueGroups).forEach(([venue, count]) => {
    console.log(`   ${venue}: ${count} events`);
  });

  let success = 0;
  let failed = 0;
  let skipped = 0;

  console.log('\n💾 Saving to database...\n');

  for (const eventData of events.events) {
    try {
      const eventDate = parseSwedishDate(eventData.date);

      if (!eventDate || isNaN(eventDate.getTime())) {
        failed++;
        continue;
      }

      // Skip events with unknown venue
      if (eventData.venue === 'Unknown Venue') {
        skipped++;
        continue;
      }

      const normalizedVenue = normalizeVenue(eventData.venue);

      const event = {
        name: eventData.name,
        artist: eventData.name,
        venue: normalizedVenue,
        date: eventDate,
        time: '20:00',
        genre: 'other',
        ticketSources: [{
          platform: 'billetto',
          url: eventData.url.startsWith('http')
            ? eventData.url
            : `https://billetto.se${eventData.url}`,
          addedAt: new Date().toISOString(),
        }],
        sourceId: `billetto-${eventData.name}-${eventDate.toISOString().split('T')[0]}`,
        sourcePlatform: 'billetto',
      };

      await db.insert(schema.events).values(event).onConflictDoUpdate({
        target: [schema.events.venue, schema.events.date],
        set: event,
      });

      success++;
      console.log(`✅ ${event.venue} | ${event.name} (${event.date.toISOString().split('T')[0]})`);
    } catch (error) {
      failed++;
      if (failed <= 5) {
        console.error(`❌ ${eventData.name}: ${error.message}`);
      }
    }
  }

  await browser.close();

  console.log(`\n✅ Complete: ${success} saved, ${failed} failed, ${skipped} skipped (unknown venue)`);

  await client.end();
  process.exit(0);
} catch (error) {
  console.error('❌ Crawler failed:', error);
  process.exit(1);
}
