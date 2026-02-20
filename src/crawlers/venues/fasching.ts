/**
 * Fasching venue crawler.
 *
 * Crawls: https://fasching.se (verify URL during execution)
 * Selectors: Placeholder - requires refinement based on actual page structure
 */

import { BaseVenueCrawler, type VenueConfig } from './base-venue-crawler.js';

const config: VenueConfig = {
  name: 'Fasching',
  url: 'https://fasching.se/program',
  selectors: {
    eventContainer: '.event, .concert, article',
    eventName: '.title, h2, h3',
    eventDate: '.date, time',
    eventUrl: 'a',
  },
  usesJavaScript: false,
};

export async function crawlFasching() {
  const crawler = new BaseVenueCrawler(config);
  return crawler.crawl();
}
