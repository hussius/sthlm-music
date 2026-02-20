/**
 * Slakthuset venue crawler.
 *
 * Crawls: https://slakthuset.com (verify URL during execution)
 * Selectors: Placeholder - requires refinement based on actual page structure
 */

import { BaseVenueCrawler, type VenueConfig } from './base-venue-crawler.js';

const config: VenueConfig = {
  name: 'Slakthuset',
  url: 'https://slakthuset.com/program',
  selectors: {
    eventContainer: '.event, article',
    eventName: '.title, h2, h3',
    eventDate: '.date, time',
    eventUrl: 'a',
  },
  usesJavaScript: false,
};

export async function crawlSlakthuset() {
  const crawler = new BaseVenueCrawler(config);
  return crawler.crawl();
}
