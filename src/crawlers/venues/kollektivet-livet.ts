/**
 * Kollektivet Livet venue crawler.
 *
 * Crawls: https://kollektivetlivet.se (verify URL during execution)
 * Selectors: Placeholder - requires refinement based on actual page structure
 */

import { BaseVenueCrawler, type VenueConfig } from './base-venue-crawler.js';

const config: VenueConfig = {
  name: 'Kollektivet Livet',
  url: 'https://kollektivetlivet.se/evenemang',
  selectors: {
    eventContainer: '.event-item, .event, article',
    eventName: '.event-title, h2, h3',
    eventDate: '.event-date, time, .date',
    eventUrl: 'a',
  },
  usesJavaScript: false,
};

export async function crawlKollektivetLivet() {
  const crawler = new BaseVenueCrawler(config);
  return crawler.crawl();
}
