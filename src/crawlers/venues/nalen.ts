/**
 * Nalen venue crawler.
 *
 * Crawls: https://nalen.com (verify URL during execution)
 * Selectors: Placeholder - requires refinement based on actual page structure
 */

import { BaseVenueCrawler, type VenueConfig } from './base-venue-crawler.js';

const config: VenueConfig = {
  name: 'Nalen',
  url: 'https://nalen.com/program',
  selectors: {
    eventContainer: '.event, .show, article',
    eventName: '.title, h2, h3',
    eventDate: '.date, time',
    eventUrl: 'a',
  },
  usesJavaScript: false,
};

export async function crawlNalen() {
  const crawler = new BaseVenueCrawler(config);
  return crawler.crawl();
}
