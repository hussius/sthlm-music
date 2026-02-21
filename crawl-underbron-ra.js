/**
 * Under Bron crawler via Resident Advisor
 *
 * Crawls: https://ra.co/promoters/15353
 */

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
const RA_URL = 'https://ra.co/promoters/15353';
const VENUE_NAME = 'Under Bron';

console.log(`🎸 Crawling ${VENUE_NAME} via Resident Advisor...`);

const client = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(client, { schema });

function parseRADate(dateStr) {
  // RA dates are typically in format like "Fri, 21 Feb 2026" or "21 Feb"
  const months = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };

  // Try full format: "Fri, 21 Feb 2026" or "21 Feb 2026"
  let match = dateStr.match(/(\d{1,2})\s+(\w{3})\s+(\d{4})/i);
  if (match) {
    const day = parseInt(match[1]);
    const monthName = match[2].toLowerCase();
    const year = parseInt(match[3]);
    const month = months[monthName];

    if (month !== undefined) {
      return new Date(year, month, day, 22, 0, 0, 0);
    }
  }

  // Try short format: "21 Feb"
  match = dateStr.match(/(\d{1,2})\s+(\w{3})/i);
  if (match) {
    const day = parseInt(match[1]);
    const monthName = match[2].toLowerCase();
    const month = months[monthName];

    if (month !== undefined) {
      // Determine year
      const now = new Date();
      let year = now.getFullYear();
      if (month < now.getMonth() || (month === now.getMonth() && day < now.getDate())) {
        year += 1;
      }

      return new Date(year, month, day, 22, 0, 0, 0);
    }
  }

  return null;
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

  console.log('📄 Loading RA page...');
  await page.goto(RA_URL, { waitUntil: 'networkidle', timeout: 30000 });

  // Wait for content to load
  console.log('⏳ Waiting for events to load...');
  await page.waitForTimeout(5000);

  console.log('🔍 Extracting events...');

  // First, get debug info about the page structure
  const pageInfo = await page.evaluate(() => {
    const info = {
      title: document.title,
      bodyText: document.body.innerText.substring(0, 300),
      hasArticles: document.querySelectorAll('article').length,
      hasEventLinks: document.querySelectorAll('a[href*="/events/"]').length,
      hasTimeElements: document.querySelectorAll('time').length,
      allClasses: [],
    };

    // Get unique class names to understand page structure
    const classes = new Set();
    document.querySelectorAll('[class]').forEach(el => {
      el.className.split(' ').forEach(c => {
        if (c.includes('event') || c.includes('Event') || c.includes('card') || c.includes('Card')) {
          classes.add(c);
        }
      });
    });
    info.allClasses = Array.from(classes).slice(0, 20);

    return info;
  });

  console.log('\n📊 Page Structure:');
  console.log(`   Title: ${pageInfo.title}`);
  console.log(`   Articles: ${pageInfo.hasArticles}`);
  console.log(`   Event links: ${pageInfo.hasEventLinks}`);
  console.log(`   Time elements: ${pageInfo.hasTimeElements}`);
  console.log(`   Event-related classes: ${pageInfo.allClasses.join(', ')}`);
  console.log(`   Body text preview: ${pageInfo.bodyText}...`);

  const events = await page.evaluate(() => {
    const eventData = [];
    const debugInfo = [];

    // RA typically uses structured event listings
    const possibleSelectors = [
      'article[class*="event"]',
      'article',
      '[class*="Event"]',
      'li[class*="event"]',
      'a[href*="/events/"]',
      '[data-tracking-id]',
    ];

    let eventElements = [];
    let usedSelector = '';

    for (const selector of possibleSelectors) {
      const elems = document.querySelectorAll(selector);
      if (elems.length > 0) {
        console.log(`Found ${elems.length} elements with selector: ${selector}`);
        eventElements = Array.from(elems);
        usedSelector = selector;
        break;
      }
    }

    eventElements.forEach((elem, index) => {
      try {
        // Get event name/title
        const titleElem = elem.querySelector('h3, h4, h2, [class*="title"], [class*="Title"], a[href*="/events/"]');
        const name = titleElem?.textContent?.trim();

        // Get date
        const dateElem = elem.querySelector('time, [class*="date"], [class*="Date"]');
        let dateStr = dateElem?.textContent?.trim() || dateElem?.getAttribute('datetime') || '';

        // Also check full text for date patterns
        if (!dateStr) {
          const fullText = elem.textContent || '';
          const dateMatch = fullText.match(/(\d{1,2}\s+\w{3}(?:\s+\d{4})?)/);
          if (dateMatch) {
            dateStr = dateMatch[1];
          }
        }

        // Get event URL
        const link = elem.tagName === 'A' ? elem : elem.querySelector('a[href*="/events/"]');
        const href = link?.getAttribute('href') || '';

        // Debug first 3 elements
        if (index < 3) {
          debugInfo.push({
            name: name || 'NO NAME',
            date: dateStr || 'NO DATE',
            href: href || 'NO HREF',
            textPreview: (elem.textContent || '').substring(0, 100),
          });
        }

        if (!name || name.length < 2) return;

        if (dateStr) {
          eventData.push({
            name: name,
            date: dateStr,
            url: href,
          });
        }
      } catch (e) {
        // Skip problematic elements
      }
    });

    return { events: eventData, debug: debugInfo };
  });

  // Debug output
  console.log('\n🔍 Debug - First 3 elements:');
  events.debug.forEach((d, i) => {
    console.log(`\n  Element ${i + 1}:`);
    console.log(`    Name: ${d.name}`);
    console.log(`    Date: ${d.date}`);
    console.log(`    Href: ${d.href}`);
    console.log(`    Text: ${d.textPreview}...`);
  });

  console.log(`\n📋 Found ${events.events.length} events from RA`);

  let success = 0;
  let failed = 0;

  for (const eventData of events.events) {
    try {
      const eventDate = parseRADate(eventData.date);

      if (!eventDate || isNaN(eventDate.getTime())) {
        console.log(`⚠️  ${eventData.name}: Could not parse date (${eventData.date})`);
        failed++;
        continue;
      }

      const event = {
        name: eventData.name,
        artist: eventData.name,
        venue: VENUE_NAME,
        date: eventDate,
        time: '22:00',
        genre: 'electronic',
        ticketSources: [{
          platform: 'resident-advisor',
          url: eventData.url.startsWith('http')
            ? eventData.url
            : `https://ra.co${eventData.url}`,
          addedAt: new Date().toISOString(),
        }],
        sourceId: `ra-underbron-${eventData.name}-${eventDate.toISOString().split('T')[0]}`,
        sourcePlatform: 'resident-advisor',
      };

      await db.insert(schema.events).values(event).onConflictDoUpdate({
        target: [schema.events.venue, schema.events.date],
        set: event,
      });

      success++;
      console.log(`✅ ${event.name} (${event.date.toISOString().split('T')[0]})`);
    } catch (error) {
      failed++;
      console.error(`❌ ${eventData.name}: ${error.message}`);
    }
  }

  await browser.close();

  console.log(`\n✅ Complete: ${success} saved, ${failed} failed`);

  await client.end();
  process.exit(0);
} catch (error) {
  console.error('❌ Crawler failed:', error);
  process.exit(1);
}
