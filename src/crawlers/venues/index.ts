/**
 * Venue crawlers index.
 *
 * Exports all 13 priority venue crawlers and convenience functions.
 *
 * Usage:
 * ```typescript
 * import { crawlAllVenues } from './crawlers/venues/index.js';
 * const result = await crawlAllVenues();
 * ```
 */

export { crawlKollektivetLivet } from './kollektivet-livet.js';
export { crawlSlaktkyrkan } from './slaktkyrkan.js';
export { crawlHus7 } from './hus7.js';
export { crawlFasching } from './fasching.js';
export { crawlNalen } from './nalen.js';
export { crawlFylkingen } from './fylkingen.js';
export { crawlSlakthuset } from './slakthuset.js';
export { crawlFallan } from './fallan.js';
export { crawlLandet } from './landet.js';
export { crawlMosebacke } from './mosebacke.js';
export { crawlKagelbanan } from './kagelbanan.js';
export { crawlPetSounds } from './pet-sounds.js';
export { crawlDebaser } from './debaser.js';

/**
 * Crawl all venues sequentially.
 *
 * Process:
 * - Runs each venue crawler in sequence (avoid overwhelming small sites)
 * - Catches errors so one failed venue doesn't stop others
 * - Aggregates success/failed counts across all venues
 * - Logs summary at completion
 *
 * @returns Aggregated { success, failed } counts across all venues
 */
// Load a JS crawler by path using a runtime variable so TypeScript does not attempt
// static module resolution (which would trigger TS7016 for JS files without .d.ts).
type CrawlResult = { success: number; failed: number };
const runJsCrawler = async (path: string): Promise<CrawlResult> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod = await import(path) as { crawl: () => Promise<CrawlResult> };
  return mod.crawl();
};

export async function crawlAllVenues() {
  const crawlers = [
    // TypeScript crawlers (13)
    { name: 'Kollektivet Livet', fn: async () => (await import('./kollektivet-livet.js')).crawlKollektivetLivet() },
    { name: 'Slaktkyrkan', fn: async () => (await import('./slaktkyrkan.js')).crawlSlaktkyrkan() },
    { name: 'Hus 7', fn: async () => (await import('./hus7.js')).crawlHus7() },
    { name: 'Fasching', fn: async () => (await import('./fasching.js')).crawlFasching() },
    { name: 'Nalen', fn: async () => (await import('./nalen.js')).crawlNalen() },
    { name: 'Fylkingen', fn: async () => (await import('./fylkingen.js')).crawlFylkingen() },
    { name: 'Slakthuset', fn: async () => (await import('./slakthuset.js')).crawlSlakthuset() },
    { name: 'Fållan', fn: async () => (await import('./fallan.js')).crawlFallan() },
    { name: 'Landet', fn: async () => (await import('./landet.js')).crawlLandet() },
    { name: 'Mosebacke', fn: async () => (await import('./mosebacke.js')).crawlMosebacke() },
    { name: 'Kägelbanan', fn: async () => (await import('./kagelbanan.js')).crawlKagelbanan() },
    { name: 'Pet Sounds', fn: async () => (await import('./pet-sounds.js')).crawlPetSounds() },
    { name: 'Debaser', fn: async () => (await import('./debaser.js')).crawlDebaser() },
    // JavaScript crawlers (26) — loaded via runJsCrawler to bypass TS7016
    { name: 'Stadsgårdsterminalen', fn: () => runJsCrawler('../../../crawl-stadsgarden.js') },
    { name: 'Debaser (JS)', fn: () => runJsCrawler('../../../crawl-debaser-fixed.js') },
    { name: 'Fylkingen (JS)', fn: () => runJsCrawler('../../../crawl-fylkingen-fixed.js') },
    { name: 'Slakthusen (all venues)', fn: () => runJsCrawler('../../../crawl-slakthusen.js') },
    { name: 'Fasching (JS)', fn: () => runJsCrawler('../../../crawl-fasching.js') },
    { name: 'Pet Sounds (JS)', fn: () => runJsCrawler('../../../crawl-petsounds.js') },
    { name: 'Nalen (JS)', fn: () => runJsCrawler('../../../crawl-nalen.js') },
    { name: 'Fållan (JS)', fn: () => runJsCrawler('../../../crawl-fallan.js') },
    { name: 'Södra Teatern', fn: () => runJsCrawler('../../../crawl-sodrateatern.js') },
    { name: 'Rönnells', fn: () => runJsCrawler('../../../crawl-ronnells.js') },
    { name: 'Banan-Kompaniet', fn: () => runJsCrawler('../../../crawl-banan-kompaniet.js') },
    { name: 'Berns', fn: () => runJsCrawler('../../../crawl-berns.js') },
    { name: 'Cirkus', fn: () => runJsCrawler('../../../crawl-cirkus.js') },
    { name: 'Stampen', fn: () => runJsCrawler('../../../crawl-stampen.js') },
    { name: 'Gamla Enskede Bryggeri', fn: () => runJsCrawler('../../../crawl-gamla-enskede-bryggeri.js') },
    { name: 'Reimersholme', fn: () => runJsCrawler('../../../crawl-reimersholme.js') },
    { name: 'Rosettas', fn: () => runJsCrawler('../../../crawl-rosettas.js') },
    { name: 'Slakthusetclub', fn: () => runJsCrawler('../../../crawl-slakthusetclub.js') },
    { name: 'Gröna Lund', fn: () => runJsCrawler('../../../crawl-gronalund.js') },
    { name: 'Geronimos FGT', fn: () => runJsCrawler('../../../crawl-geronimosfgt.js') },
    { name: 'Konserthuset', fn: () => runJsCrawler('../../../crawl-konserthuset.js') },
    { name: 'Fredagsmangel', fn: () => runJsCrawler('../../../crawl-fredagsmangel.js') },
    { name: 'Göta Lejon', fn: () => runJsCrawler('../../../crawl-gotalejon.js') },
    { name: 'B-K', fn: () => runJsCrawler('../../../crawl-bk.js') },
    { name: 'Rival', fn: () => runJsCrawler('../../../crawl-rival.js') },
    { name: 'Under Bron', fn: () => runJsCrawler('../../../crawl-underbron-fixed.js') },
  ];

  const results = [];
  for (const crawler of crawlers) {
    try {
      console.log(`\nCrawling ${crawler.name}...`);
      const result = await crawler.fn();
      results.push(result);
      console.log(`${crawler.name}: ${result.success} success, ${result.failed} failed`);
    } catch (error) {
      console.error(`${crawler.name} failed:`, error instanceof Error ? error.message : String(error));
      results.push({ success: 0, failed: 1 });
    }
  }

  const totals = results.reduce(
    (acc, r) => ({ success: acc.success + r.success, failed: acc.failed + r.failed }),
    { success: 0, failed: 0 }
  );

  console.log(`\nAll venues crawled: ${totals.success} success, ${totals.failed} failed`);
  return totals;
}
