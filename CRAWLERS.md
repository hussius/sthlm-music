# Stockholm Music Events Crawlers

## Quick Start

**Crawl all sources:**
```bash
node crawl-all.js
```

**Crawl individual sources** (JS crawlers at project root, spawned as subprocesses):
```bash
node crawl-stadsgarden.js      # Stadsgårdsterminalen (Kollektivet Livet stage)
node crawl-debaser-fixed.js    # Debaser Nova & Strand
node crawl-fylkingen-fixed.js  # Fylkingen (requires Playwright)
node crawl-slakthusen.js       # Slakthusen (Slaktkyrkan, Hus 7, Terrassen, etc.)
node crawl-fasching.js         # Fasching (requires Playwright)
node crawl-petsounds.js        # Pet Sounds Bar (requires Playwright)
node crawl-nalen.js            # Nalen (requires Playwright)
node crawl-fallan.js           # Fållan (requires Playwright)
node crawl-sodrateatern.js     # Södra Teatern (requires Playwright)
node crawl-ronnells.js         # Rönnells Antikvariat
node crawl-bk.js               # Banankompaniet (B-K) (requires Playwright)
node crawl-underbron-fixed.js  # Under Bron
node crawl-broder-tuck.js       # Broder Tuck (spelalive.nu widget, requires Playwright)
```

The TS crawlers (Ticketmaster API, DICE, Klubb Död, Stockholm Live, Tickster,
Resident Advisor, Techno i Stockholm) are compiled to `dist/` and invoked from
`crawl-all.js`; they are not meant to be run as standalone scripts.

## File Structure

### Main Scripts
- `crawl-all.js` - Run all crawlers sequentially (TS crawlers first, then JS)
- `clear-db.js` - Clear all events (used by `npm run refresh-data` and the admin refresh route)

### Individual JS Crawlers
- `crawl-stadsgarden.js` - Stadsgårdsterminalen, a Kollektivet Livet stage (static HTML, Cheerio)
- `crawl-debaser-fixed.js` - Debaser (static HTML, Cheerio)
- `crawl-fylkingen-fixed.js` - Fylkingen (JavaScript-rendered, Playwright)
- `crawl-slakthusen.js` - Slakthusen venues: Slaktkyrkan, Hus 7, Terrassen (static HTML, Cheerio)
- `crawl-fasching.js` - Fasching jazz club (JavaScript-rendered, Playwright)
- `crawl-petsounds.js` - Pet Sounds Bar (JavaScript-rendered, Playwright)
- `crawl-nalen.js` - Nalen (Next.js/React with JSON data, Playwright)
- `crawl-fallan.js` - Fållan (Webflow with JavaScript, Playwright)
- `crawl-sodrateatern.js` - Södra Teatern with all stages (JSON-LD data, Playwright)
- `crawl-ronnells.js` - Rönnells Antikvariat bookshop/venue (static HTML, Cheerio)
- `crawl-bk.js` - Banankompaniet (B-K) concert venue (Webflow, Playwright)
- `crawl-underbron-fixed.js` - Under Bron nightclub (static HTML, Cheerio)
- `crawl-broder-tuck.js` - Broder Tuck / BT Bar (spelalive.nu, ZipperTic widget iframe, Playwright)

### TS Crawlers (`src/crawlers/`)
- `src/crawlers/ticketmaster.ts` - Ticketmaster Discovery API (REST API)
- `src/crawlers/dice.ts` - DICE ticketing platform (Crawlee + Playwright)
- `src/crawlers/venues/` - Per-venue TS crawler modules (Klubb Död, Stockholm Live, Tickster, RA, Techno i Stockholm, and others)

## Adding New Venues

1. Check if venue uses static HTML or JavaScript rendering
2. For static HTML: Use Cheerio (see `crawl-stadsgarden.js` as template)
3. For JavaScript: Use Playwright (see `crawl-fylkingen-fixed.js` as template)
4. Normalize dates to avoid duplicates: `new Date(year, month, day, 20, 0, 0, 0)`
5. Add to `crawl-all.js` crawlers array

## Notes

- All dates normalized to prevent duplicates (most to 20:00:00.000, some preserve actual event time)
- Database has unique constraint on (venue, date)
- Duplicate consolidation and non-concert pruning run automatically at the end of `crawl-all.js`
- Playwright crawlers (Fylkingen, Fasching, Pet Sounds, Nalen, Fållan, Södra Teatern, B-K, Broder Tuck) require `TMPDIR=/tmp`
