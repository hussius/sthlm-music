/**
 * Broder Tuck venue crawler
 *
 * Crawls: https://spelalive.nu/  (events sold via the embedded ZipperTic widget)
 *
 * spelalive.nu is a One.com static page that embeds a ticketing widget in an
 * <iframe src="https://zippertic.se/promo/3133">. spelalive.nu acts as the band
 * booker for "Broder Tucks nedervåning / BT Bar" — i.e. the venue for every
 * event sold through that widget is Broder Tuck (Götgatan 85, Stockholm).
 *
 * The widget is a React SPA fronted by Cloudflare's "managed challenge".
 * Direct curl/fetch of the backing JSON API (api.zippertic.se) returns a 403
 * challenge page, so we render the page with Playwright (using a realistic
 * User-Agent and navigator.webdriver masking) and:
 *
 *   1. Intercept the XHR to api.zippertic.se/api/events?promoter=3133&passed=0
 *      to get cleanly-structured event JSON (name, start_date, venue, ...).
 *   2. Read the rendered <a> elements inside the iframe to obtain each event's
 *      ticket purchase URL (https://zippertic.app.link/<slug>-promo3133),
 *      matched to the API record by event name.
 *
 * This is far more robust than scraping date strings from rendered DOM, since
 * the API hands us an ISO-like `start_date` field directly.
 */

import dotenv from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import * as schema from './dist/db/schema.js';

dotenv.config({ path: '.env.local' });

// Set temp directory to avoid permission issues (see CRAWLERS.md notes)
const tmpDir = '/tmp/claude-crawlers';
try {
  mkdirSync(tmpDir, { recursive: true });
  process.env.TMPDIR = tmpDir;
} catch (e) {
  console.warn(`Could not create temp dir ${tmpDir}:`, e.message);
}

const DATABASE_URL = process.env.DATABASE_URL;
const VENUE_URL = 'https://spelalive.nu/';
const VENUE_NAME = 'Broder Tuck';
const PROMOTER_ID = '3133';
const API_HOST_PATTERN = /api\.zippertic\.se\/api\/events/;

// Browser-like UA + stealth flags so Cloudflare's managed challenge lets the
// iframe through (headless Chromium with default flags gets 403'd).
const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/**
 * Parse "2026-06-27 20:00:00" (server local time, Europe/Stockholm) into a
 * Date. The API returns wall-clock Stockholm time without a timezone offset,
 * so we construct the Date in local components and rely on the DB column being
 * timestamptz — matching how the other crawlers handle "20:00" defaults.
 */
function parseApiDate(start) {
  if (!start || typeof start !== 'string') return null;
  const m = start.match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (!m) return null;
  const d = new Date(
    parseInt(m[1], 10),
    parseInt(m[2], 10) - 1,
    parseInt(m[3], 10),
    parseInt(m[4], 10),
    parseInt(m[5], 10),
    0, 0,
  );
  if (isNaN(d.getTime())) return null;
  return d;
}

export async function crawl() {
  const client = postgres(DATABASE_URL, { max: 1 });
  const db = drizzle(client, { schema });

  let browser;
  try {
    console.log(`🎸 Crawling ${VENUE_NAME}...`);
    console.log('🌐 Launching browser...');
    browser = await chromium.launch({
      headless: true,
      args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
    });
    const ctx = await browser.newContext({
      userAgent: BROWSER_UA,
      locale: 'sv-SE',
      viewport: { width: 1280, height: 900 },
      timezoneId: 'Europe/Stockholm',
    });
    // Mask automation signals that Cloudflare's bot check keys on.
    await ctx.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      Object.defineProperty(navigator, 'languages', { get: () => ['sv-SE', 'sv', 'en'] });
      window.chrome = { runtime: {} };
    });
    const page = await ctx.newPage();

    // Capture the events JSON when the widget fetches it.
    let apiPayload = null;
    page.on('response', async (response) => {
      if (API_HOST_PATTERN.test(response.url())) {
        try {
          apiPayload = await response.json();
        } catch (e) {
          console.warn(`  ⚠️  Could not parse API JSON: ${e.message}`);
        }
      }
    });

    console.log('📄 Loading spelalive.nu (embeds ZipperTic widget)...');
    await page.goto(VENUE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for the widget iframe to attach and clear Cloudflare's challenge.
    console.log('⏳ Waiting for ZIP widget to clear Cloudflare & fetch events...');
    let frame = page.frames().find((f) => /zippertic\.se\/promo/.test(f.url()));
    for (let i = 0; (!frame || !apiPayload) && i < 40; i++) {
      await page.waitForTimeout(500);
      frame = page.frames().find((f) => /zippertic\.se\/promo/.test(f.url()));
    }
    // Give the React app a moment to render its event cards (for the href map).
    if (frame) {
      await frame.waitForLoadState?.('networkidle', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(2000);
    }

    if (!apiPayload) {
      throw new Error('ZipperTic events API response was not captured (Cloudflare may have blocked the iframe)');
    }

    const eventsRaw = Array.isArray(apiPayload)
      ? apiPayload
      : apiPayload.collection || apiPayload.events || apiPayload.data || apiPayload.result || [];

    console.log(`📋 API returned ${eventsRaw.length} event(s)`);

    // Build name → ticket-URL map from the rendered <a> tags inside the iframe.
    // The anchor text equals the event `name` from the API.
    let ticketUrlByName = {};
    if (frame) {
      try {
        const anchors = await frame.evaluate(() =>
          Array.from(document.querySelectorAll('a[href]')).map((a) => ({
            href: a.getAttribute('href') || '',
            text: (a.textContent || '').replace(/\s+/g, ' ').trim(),
          })).filter((a) => a.href && a.href !== '#' && a.text),
        );
        for (const a of anchors) {
          if (!ticketUrlByName[a.text]) ticketUrlByName[a.text] = a.href;
        }
      } catch (e) {
        console.warn(`  ⚠️  Could not read iframe anchors: ${e.message}`);
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let success = 0;
    let failed = 0;
    const inserted = new Set();

    for (const ev of eventsRaw) {
      try {
        const name = (ev.name || '').trim();
        if (!name) {
          failed++;
          continue;
        }

        const eventDate = parseApiDate(ev.start_date);
        if (!eventDate) {
          console.log(`  ⚠️  No start_date for: ${name}`);
          failed++;
          continue;
        }

        // Skip past events (passed=0 already filters, but be defensive)
        if (eventDate < today) {
          continue;
        }

        const timeStr = `${String(eventDate.getHours()).padStart(2, '0')}:${String(eventDate.getMinutes()).padStart(2, '0')}`;
        const dateStr = eventDate.toISOString().split('T')[0];

        // De-dupe within this run (API shouldn't return dupes, but be safe)
        const dedupKey = `${name}|${dateStr}|${timeStr}`;
        if (inserted.has(dedupKey)) continue;
        inserted.add(dedupKey);

        const ticketUrl = ticketUrlByName[name] || VENUE_URL;

        const event = {
          name,
          artist: name,
          venue: VENUE_NAME,
          date: eventDate,
          time: timeStr,
          genre: 'other',
          ticketSources: [{
            platform: 'venue-direct',
            url: ticketUrl,
            addedAt: new Date().toISOString(),
          }],
          sourceId: `broder-tuck-${String(ev.id || name.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 60))}-${dateStr}`,
          sourcePlatform: 'venue-direct',
        };

        await db.insert(schema.events).values(event).onConflictDoUpdate({
          target: [schema.events.venue, schema.events.date],
          set: event,
        });

        success++;
        console.log(`✅ ${name} (${dateStr} ${timeStr})`);
      } catch (error) {
        failed++;
        console.error(`❌ Error: ${error.message}`);
      }
    }

    console.log(`\n✅ Complete: ${success} saved, ${failed} failed`);
    return { success, failed };
  } catch (error) {
    console.error('❌ Crawler failed:', error);
    throw error;
  } finally {
    if (browser) await browser.close().catch(() => {});
    await client.end();
  }
}

// Standalone runner
import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  crawl().then(r => { console.log(r); process.exit(0); }).catch(e => { console.error(e); process.exit(1); });
}
