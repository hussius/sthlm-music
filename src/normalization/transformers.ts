/**
 * Platform-specific event data transformers.
 *
 * Each transformer extracts data from platform-specific structures
 * then delegates validation to normalizeEventData from schemas.ts.
 *
 * Handles missing fields gracefully:
 * - Use 'other' for missing genre
 * - Use 'Unknown' for missing artist if unavailable
 * - Generate sourceId from venue+date for venue-direct if no ID
 *
 * @example
 * const result = transformTicketmasterEvent(rawApiResponse);
 * if (result.success) {
 *   await saveEvent(result.data);
 * }
 */

import { normalizeEventData } from './schemas.js';

/**
 * Transforms Ticketmaster Discovery API event data to normalized schema.
 *
 * Ticketmaster structure:
 * - Event name: raw.name
 * - Artist: raw._embedded.attractions[0].name
 * - Venue: raw._embedded.venues[0].name
 * - Date: raw.dates.start.dateTime
 * - Genre: raw.classifications[0].genre.name
 * - Price: raw.priceRanges[0] (formatted as "min-max currency")
 *
 * @param raw - Raw event data from Ticketmaster API
 * @returns Validation result with normalized data or errors
 */
export function transformTicketmasterEvent(raw: any) {
  return normalizeEventData({
    name: raw.name || raw._embedded?.attractions?.[0]?.name || 'Unknown Event',
    artist: raw._embedded?.attractions?.[0]?.name || 'Unknown',
    venue: raw._embedded?.venues?.[0]?.name || 'Unknown Venue',
    date: raw.dates?.start?.dateTime,
    time: raw.dates?.start?.localTime,
    genre: raw.classifications?.[0]?.genre?.name || 'other',
    ticketUrl: raw.url,
    price: raw.priceRanges?.[0]
      ? `${raw.priceRanges[0].min}-${raw.priceRanges[0].max} ${raw.priceRanges[0].currency}`
      : undefined,
    sourceId: raw.id,
    sourcePlatform: 'ticketmaster',
  });
}

/**
 * Transforms AXS event data to normalized schema.
 *
 * AXS structure (varies by page):
 * - Event name: raw.name or raw.title
 * - Artist: raw.artist or raw.performer
 * - Venue: raw.venue or raw.location
 * - Date: raw.date or raw.eventDate
 * - Genre: raw.genre or raw.category
 *
 * @param raw - Raw event data from AXS scraper
 * @returns Validation result with normalized data or errors
 */
export function transformAXSEvent(raw: any) {
  return normalizeEventData({
    name: raw.name || raw.title || 'Unknown Event',
    artist: raw.artist || raw.performer || 'Unknown',
    venue: raw.venue || raw.location || 'Unknown Venue',
    date: raw.date || raw.eventDate,
    time: raw.time,
    genre: raw.genre || raw.category || 'other',
    ticketUrl: raw.url || raw.ticketLink,
    price: raw.price,
    sourceId: raw.id || raw.eventId,
    sourcePlatform: 'axs',
  });
}

/**
 * Transforms DICE event data to normalized schema.
 *
 * DICE structure (JSON-LD or API):
 * - Event name: raw.name
 * - Artist: raw.artist
 * - Venue: raw.venue
 * - Date: raw.date
 * - Genre: raw.genre (may be missing)
 *
 * @param raw - Raw event data from DICE scraper
 * @returns Validation result with normalized data or errors
 */
export function transformDICEEvent(raw: any) {
  return normalizeEventData({
    name: raw.name || 'Unknown Event',
    artist: raw.artist || 'Unknown',
    venue: raw.venue || 'Unknown Venue',
    date: raw.date,
    time: raw.time,
    genre: raw.genre || 'other',
    ticketUrl: raw.url,
    price: raw.price,
    sourceId: raw.id,
    sourcePlatform: 'dice',
  });
}

/**
 * Transforms venue website event data to normalized schema.
 *
 * Venue structure (HTML scraping, highly variable):
 * - Event name: raw.name
 * - Artist: raw.artist (fallback to name if missing)
 * - Venue: raw.venue
 * - Date: raw.date
 * - Genre: raw.genre (often missing)
 * - sourceId: raw.id or generated from venue+date
 *
 * Note: Some venues don't separate artist from event name.
 * Use event name as artist if raw.artist is missing.
 *
 * @param raw - Raw event data from venue scraper
 * @returns Validation result with normalized data or errors
 */
export function transformVenueEvent(raw: any) {
  return normalizeEventData({
    name: raw.name || 'Unknown Event',
    artist: raw.artist || raw.name || 'Unknown', // Some venues don't separate artist/event
    venue: raw.venue || 'Unknown Venue',
    date: raw.date,
    time: raw.time,
    genre: raw.genre || 'other',
    ticketUrl: raw.url,
    price: raw.price,
    sourceId: raw.id || `${raw.venue}-${raw.date}`, // Generate ID if missing
    sourcePlatform: 'venue-direct',
  });
}
