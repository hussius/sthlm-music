/**
 * Fylkingen venue crawler.
 *
 * Crawls: https://fylkingen.se (verify URL during execution)
 * Selectors: Placeholder - requires refinement based on actual page structure
 */

import { BaseVenueCrawler, type VenueConfig } from './base-venue-crawler.js';

const config: VenueConfig = {
  name: 'Fylkingen',
  url: 'https://fylkingen.se/events',
  selectors: {
    eventContainer: '.event, article',
    eventName: '.event-title, h2, h3',
    eventDate: '.date, time',
    eventUrl: 'a',
  },
  usesJavaScript: false,
};

export async function crawlFylkingen() {
  const crawler = new BaseVenueCrawler(config);
  return crawler.crawl();
}
