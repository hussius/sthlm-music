/**
 * Configuration for all 13 priority Stockholm venues.
 *
 * Each config defines:
 * - Venue name (normalized, matches venue-mappings.ts)
 * - URL to events page
 * - CSS selectors for event data extraction
 * - Whether site uses JavaScript (Playwright vs Cheerio)
 *
 * NOTE: These configurations are PLACEHOLDERS and require refinement.
 * Each venue has unique HTML structure requiring custom selector tuning.
 * URLs may need verification, selectors will need testing.
 *
 * Maintenance:
 * - If a venue changes website structure, update selectors here
 * - Health checks detect when crawlers stop working
 * - Some venues may be uncrawlable (Facebook-only, defunct)
 */

import { VenueConfig } from './base-venue-crawler.js';

export const VENUE_CONFIGS: VenueConfig[] = [
  {
    name: 'Kollektivet Livet',
    url: 'https://kollektivetlivet.se/evenemang',
    selectors: {
      eventContainer: '.event-item, .event, article',
      eventName: '.event-title, h2, h3',
      eventDate: '.event-date, time, .date',
      eventUrl: 'a',
    },
    usesJavaScript: false,
  },
  {
    name: 'Slaktkyrkan',
    url: 'https://slaktkyrkan.com/program',
    selectors: {
      eventContainer: '.event-card, .event, article',
      eventName: '.title, h2, h3',
      eventDate: '.date, time',
      eventUrl: 'a',
    },
    usesJavaScript: false,
  },
  {
    name: 'Hus 7',
    url: 'https://hus7.se/program',
    selectors: {
      eventContainer: '.event, .program-item, article',
      eventName: '.event-title, h2, h3',
      eventDate: '.date, time',
      eventUrl: 'a',
    },
    usesJavaScript: false,
  },
  {
    name: 'Fasching',
    url: 'https://fasching.se/program',
    selectors: {
      eventContainer: '.event, .concert, article',
      eventName: '.title, h2, h3',
      eventDate: '.date, time',
      eventUrl: 'a',
    },
    usesJavaScript: false,
  },
  {
    name: 'Nalen',
    url: 'https://nalen.com/program',
    selectors: {
      eventContainer: '.event, .show, article',
      eventName: '.title, h2, h3',
      eventDate: '.date, time',
      eventUrl: 'a',
    },
    usesJavaScript: false,
  },
  {
    name: 'Fylkingen',
    url: 'https://fylkingen.se/events',
    selectors: {
      eventContainer: '.event, article',
      eventName: '.event-title, h2, h3',
      eventDate: '.date, time',
      eventUrl: 'a',
    },
    usesJavaScript: false,
  },
  {
    name: 'Slakthuset',
    url: 'https://slakthuset.com/program',
    selectors: {
      eventContainer: '.event, article',
      eventName: '.title, h2, h3',
      eventDate: '.date, time',
      eventUrl: 'a',
    },
    usesJavaScript: false,
  },
  {
    name: 'Fållan',
    url: 'https://fallan.se/program',
    selectors: {
      eventContainer: '.event, article',
      eventName: '.title, h2, h3',
      eventDate: '.date, time',
      eventUrl: 'a',
    },
    usesJavaScript: false,
  },
  {
    name: 'Landet',
    url: 'https://landet.live/program',
    selectors: {
      eventContainer: '.event, article',
      eventName: '.title, h2, h3',
      eventDate: '.date, time',
      eventUrl: 'a',
    },
    usesJavaScript: false,
  },
  {
    name: 'Mosebacke',
    url: 'https://mosebacke.se/program',
    selectors: {
      eventContainer: '.event, article',
      eventName: '.title, h2, h3',
      eventDate: '.date, time',
      eventUrl: 'a',
    },
    usesJavaScript: false,
  },
  {
    name: 'Kägelbanan',
    url: 'https://kagelbanan.com/program',
    selectors: {
      eventContainer: '.event, article',
      eventName: '.title, h2, h3',
      eventDate: '.date, time',
      eventUrl: 'a',
    },
    usesJavaScript: false,
  },
  {
    name: 'Pet Sounds',
    url: 'https://petsounds.se/program',
    selectors: {
      eventContainer: '.event, article',
      eventName: '.title, h2, h3',
      eventDate: '.date, time',
      eventUrl: 'a',
    },
    usesJavaScript: false,
  },
  {
    name: 'Debaser',
    url: 'https://debaser.se/program',
    selectors: {
      eventContainer: '.event, article',
      eventName: '.title, h2, h3',
      eventDate: '.date, time',
      eventUrl: 'a',
    },
    usesJavaScript: false,
  },
];
