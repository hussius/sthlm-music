/**
 * Debaser venue crawler.
 *
 * Crawls: https://debaser.se (verify URL during execution)
 * Selectors: Placeholder - requires refinement based on actual page structure
 */

import { BaseVenueCrawler, type VenueConfig } from './base-venue-crawler.js';

const config: VenueConfig = {
  name: 'Debaser',
  url: 'https://debaser.se/program',
  selectors: {
    eventContainer: '.event, article',
    eventName: '.title, h2, h3',
    eventDate: '.date, time',
    eventUrl: 'a',
  },
  usesJavaScript: false,
};

export async function crawlDebaser() {
  const crawler = new BaseVenueCrawler(config);
  return crawler.crawl();
}
