/**
 * Landet venue crawler.
 *
 * Crawls: https://landet.live (verify URL during execution)
 * Selectors: Placeholder - requires refinement based on actual page structure
 */

import { BaseVenueCrawler, type VenueConfig } from './base-venue-crawler.js';

const config: VenueConfig = {
  name: 'Landet',
  url: 'https://landet.live/program',
  selectors: {
    eventContainer: '.event, article',
    eventName: '.title, h2, h3',
    eventDate: '.date, time',
    eventUrl: 'a',
  },
  usesJavaScript: false,
};

export async function crawlLandet() {
  const crawler = new BaseVenueCrawler(config);
  return crawler.crawl();
}
