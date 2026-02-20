/**
 * Slaktkyrkan venue crawler.
 *
 * Crawls: https://slaktkyrkan.com (verify URL during execution)
 * Selectors: Placeholder - requires refinement based on actual page structure
 */

import { BaseVenueCrawler, type VenueConfig } from './base-venue-crawler.js';

const config: VenueConfig = {
  name: 'Slaktkyrkan',
  url: 'https://slaktkyrkan.com/program',
  selectors: {
    eventContainer: '.event-card, .event, article',
    eventName: '.title, h2, h3',
    eventDate: '.date, time',
    eventUrl: 'a',
  },
  usesJavaScript: false,
};

export async function crawlSlaktkyrkan() {
  const crawler = new BaseVenueCrawler(config);
  return crawler.crawl();
}
