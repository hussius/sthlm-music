# Stockholm Music Events Crawlers

## Quick Start

**Crawl all sources:**
```bash
node crawl-all.js
```

**Crawl individual sources:**
```bash
node crawl-ticketmaster.js     # Ticketmaster Discovery API
node crawl-stadsgarden.js       # Stadsgårdsterminalen (Kollektivet Livet stage)
node crawl-debaser-fixed.js     # Debaser Nova & Strand
node crawl-fylkingen-fixed.js   # Fylkingen (requires Playwright)
node crawl-slakthusen.js        # Slakthusen (Slaktkyrkan, Hus 7, Terrassen, etc.)
node crawl-fasching.js          # Fasching (requires Playwright)
node crawl-petsounds.js         # Pet Sounds Bar (requires Playwright)
node crawl-nalen.js             # Nalen (requires Playwright)
node crawl-fallan.js            # Fållan (requires Playwright)
node crawl-sodrateatern.js      # Södra Teatern (requires Playwright)
node crawl-billetto.js          # Billetto Stockholm music events (requires Playwright)
node crawl-ronnells.js          # Rönnells Antikvariat
node crawl-bk.js                # Banankompaniet (B-K) (requires Playwright)
node crawl-underbron.js         # Under Bron
```

## Maintenance

**Remove duplicates:**
```bash
node deduplicate-events.js
```

**Check venue statistics:**
```bash
node check-venues.js
```

## File Structure

### Main Scripts
- `crawl-all.js` - Run all crawlers sequentially
- `deduplicate-events.js` - Clean up duplicate events
- `check-venues.js` - Show venue statistics

### Individual Crawlers
- `crawl-ticketmaster.js` - Ticketmaster Discovery API (REST API)
- `crawl-stadsgarden.js` - Stadsgårdsterminalen, a Kollektivet Livet stage (static HTML, Cheerio)
- `crawl-debaser-fixed.js` - Debaser (static HTML, Cheerio)
- `crawl-fylkingen-fixed.js` - Fylkingen (JavaScript-rendered, Playwright)
- `crawl-slakthusen.js` - Slakthusen venues: Slaktkyrkan, Hus 7, Terrassen (static HTML, Cheerio)
- `crawl-fasching.js` - Fasching jazz club (JavaScript-rendered, Playwright)
- `crawl-petsounds.js` - Pet Sounds Bar (JavaScript-rendered, Playwright)
- `crawl-nalen.js` - Nalen (Next.js/React with JSON data, Playwright)
- `crawl-fallan.js` - Fållan (Webflow with JavaScript, Playwright)
- `crawl-sodrateatern.js` - Södra Teatern with all stages (JSON-LD data, Playwright)
- `crawl-billetto.js` - Billetto ticketing platform, Stockholm music events (Playwright)
- `crawl-ronnells.js` - Rönnells Antikvariat bookshop/venue (static HTML, Cheerio)
- `crawl-bk.js` - Banankompaniet (B-K) concert venue (Webflow, Playwright)
- `crawl-underbron.js` - Under Bron nightclub (static HTML, Cheerio)

### Deprecated
- `crawl-venues.js` - Old venue crawler (13 venues, mostly broken)
- `crawl-debaser.js` - Old Debaser crawler (replaced by crawl-debaser-fixed.js)
- `crawl-fylkingen.js` - Old Fylkingen crawler (replaced by crawl-fylkingen-fixed.js)
- `crawl-slaktkyrkan.js` - Old Slaktkyrkan-only crawler (replaced by crawl-slakthusen.js)

### Debug Scripts
Moved to `debug/` folder - used for development and troubleshooting

## Adding New Venues

1. Check if venue uses static HTML or JavaScript rendering
2. For static HTML: Use Cheerio (see `crawl-stadsgarden.js` as template)
3. For JavaScript: Use Playwright (see `crawl-fylkingen-fixed.js` as template)
4. Normalize dates to avoid duplicates: `new Date(year, month, day, 20, 0, 0, 0)`
5. Add to `crawl-all.js` crawlers array

## Notes

- All dates normalized to prevent duplicates (most to 20:00:00.000, some preserve actual event time)
- Database has unique constraint on (venue, date)
- Run deduplication after adding new crawlers to clean up old data
- Playwright crawlers (Fylkingen, Fasching, Pet Sounds, Nalen, Fållan, Södra Teatern, Billetto, B-K) require `TMPDIR=/tmp`
