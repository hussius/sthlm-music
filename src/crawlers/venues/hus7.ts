/**
 * Hus 7 venue crawler.
 *
 * Crawls: https://hus7.se (verify URL during execution)
 * Selectors: Placeholder - requires refinement based on actual page structure
 */

import { BaseVenueCrawler, type VenueConfig } from './base-venue-crawler.js';

const config: VenueConfig = {
  name: 'Hus 7',
  url: 'https://hus7.se/program',
  selectors: {
    eventContainer: '.event, .program-item, article',
    eventName: '.event-title, h2, h3',
    eventDate: '.date, time',
    eventUrl: 'a',
  },
  usesJavaScript: false,
};

export async function crawlHus7() {
  const crawler = new BaseVenueCrawler(config);
  return crawler.crawl();
}
