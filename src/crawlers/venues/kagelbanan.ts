/**
 * Kägelbanan venue crawler.
 *
 * Crawls: https://kagelbanan.com (verify URL during execution)
 * Selectors: Placeholder - requires refinement based on actual page structure
 *
 * Note: Per PROJECT.md, this venue may be defunct ("if still exists").
 * Check if venue still operates before relying on this crawler.
 */

import { BaseVenueCrawler, type VenueConfig } from './base-venue-crawler.js';

const config: VenueConfig = {
  name: 'Kägelbanan',
  url: 'https://kagelbanan.com/program',
  selectors: {
    eventContainer: '.event, article',
    eventName: '.title, h2, h3',
    eventDate: '.date, time',
    eventUrl: 'a',
  },
  usesJavaScript: false,
};

export async function crawlKagelbanan() {
  const crawler = new BaseVenueCrawler(config);
  return crawler.crawl();
}
