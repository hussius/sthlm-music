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
    // JavaScript crawlers (26)
    { name: 'Stadsgårdsterminalen', fn: async () => { const { crawl } = await import('../../../crawl-stadsgarden.js'); return crawl(); } },
    { name: 'Debaser (JS)', fn: async () => { const { crawl } = await import('../../../crawl-debaser-fixed.js'); return crawl(); } },
    { name: 'Fylkingen (JS)', fn: async () => { const { crawl } = await import('../../../crawl-fylkingen-fixed.js'); return crawl(); } },
    { name: 'Slakthusen (all venues)', fn: async () => { const { crawl } = await import('../../../crawl-slakthusen.js'); return crawl(); } },
    { name: 'Fasching (JS)', fn: async () => { const { crawl } = await import('../../../crawl-fasching.js'); return crawl(); } },
    { name: 'Pet Sounds (JS)', fn: async () => { const { crawl } = await import('../../../crawl-petsounds.js'); return crawl(); } },
    { name: 'Nalen (JS)', fn: async () => { const { crawl } = await import('../../../crawl-nalen.js'); return crawl(); } },
    { name: 'Fållan (JS)', fn: async () => { const { crawl } = await import('../../../crawl-fallan.js'); return crawl(); } },
    { name: 'Södra Teatern', fn: async () => { const { crawl } = await import('../../../crawl-sodrateatern.js'); return crawl(); } },
    { name: 'Rönnells', fn: async () => { const { crawl } = await import('../../../crawl-ronnells.js'); return crawl(); } },
    { name: 'Banan-Kompaniet', fn: async () => { const { crawl } = await import('../../../crawl-banan-kompaniet.js'); return crawl(); } },
    { name: 'Berns', fn: async () => { const { crawl } = await import('../../../crawl-berns.js'); return crawl(); } },
    { name: 'Cirkus', fn: async () => { const { crawl } = await import('../../../crawl-cirkus.js'); return crawl(); } },
    { name: 'Stampen', fn: async () => { const { crawl } = await import('../../../crawl-stampen.js'); return crawl(); } },
    { name: 'Gamla Enskede Bryggeri', fn: async () => { const { crawl } = await import('../../../crawl-gamla-enskede-bryggeri.js'); return crawl(); } },
    { name: 'Reimersholme', fn: async () => { const { crawl } = await import('../../../crawl-reimersholme.js'); return crawl(); } },
    { name: 'Rosettas', fn: async () => { const { crawl } = await import('../../../crawl-rosettas.js'); return crawl(); } },
    { name: 'Slakthusetclub', fn: async () => { const { crawl } = await import('../../../crawl-slakthusetclub.js'); return crawl(); } },
    { name: 'Gröna Lund', fn: async () => { const { crawl } = await import('../../../crawl-gronalund.js'); return crawl(); } },
    { name: 'Geronimos FGT', fn: async () => { const { crawl } = await import('../../../crawl-geronimosfgt.js'); return crawl(); } },
    { name: 'Konserthuset', fn: async () => { const { crawl } = await import('../../../crawl-konserthuset.js'); return crawl(); } },
    { name: 'Fredagsmangel', fn: async () => { const { crawl } = await import('../../../crawl-fredagsmangel.js'); return crawl(); } },
    { name: 'Göta Lejon', fn: async () => { const { crawl } = await import('../../../crawl-gotalejon.js'); return crawl(); } },
    { name: 'B-K', fn: async () => { const { crawl } = await import('../../../crawl-bk.js'); return crawl(); } },
    { name: 'Rival', fn: async () => { const { crawl } = await import('../../../crawl-rival.js'); return crawl(); } },
    { name: 'Under Bron', fn: async () => { const { crawl } = await import('../../../crawl-underbron-fixed.js'); return crawl(); } },
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
