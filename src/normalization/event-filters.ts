/**
 * Event content filters for rejecting non-concert entries.
 *
 * Crawlers ingest venue websites that list non-music items alongside concerts:
 * gift cards, quiz nights, bingo, etc. This module provides blocklist-based
 * filtering to keep the calendar limited to music events.
 *
 * Design:
 * - Case-insensitive whole-word matching (\b boundaries) prevents false positives
 *   (e.g. "Prestige" does not match "prest", "Quizmaster" does not match "quiz")
 * - Multi-word terms are matched as exact phrases
 * - Blocklist is intentionally conservative — add terms only when confirmed FPs exist
 */

/**
 * Terms that indicate a non-concert entry when found in the event title.
 * Checked case-insensitively against the event name.
 */
const BLOCKLIST_TERMS = [
  // Film/cinema screenings
  'bio',
  'frukostbio',
  'filmvisning',
  'movie screening',
  'film screening',
  'screening',
  'cinema',
  'movie',
  'documentary',

  // Children's classes and activities
  'för barn',
  'for children',
  'kids',
  'children',
  'barn 7',
  'barn 8',
  'barn 9',
  'barn 10',
  'barn 11',
  'barn 12',
  'barn 13',
  'konstkurs',
  'art class',
  'workshop',
  'kurs',

  // Museum/craft/non-music activities
  'batik',
  'craft',
  'pyssel',

  // Guided tours, venue viewings, lectures, and education formats
  'guidad visning',
  'guided tour',
  'guided tours',
  'takvisning',
  'nobel tours',
  'visning',
  'seminarium',
  'seminar',
  'masterclass',
  'mästarklass',
  'oppen masterclass',
  'öppen mästarklass',
  'yoga',

  // Sports/watch-party listings
  'worldcup party',
  'world cup party',
  'worldcup',
  'world cup',

  // Ticket-sale-only entries
  'flash sale',
  'ticket sale',
  'tickets only',
  'early bird',

  // Swedish gift/voucher entries
  'presentkort',
  // English gift/voucher entries
  'gift card',
  'gift voucher',
  // Quiz and trivia nights
  'quiz',
  'quiz night',
  'trivia',
  'trivia night',
  // Bingo
  'bingo',
  // Stand-up comedy
  'standup',
  'stand-up',
  'comedy night',
  // Swedish holiday dinners
  'julbord',
  // Workplace socials
  'afterwork',
  'after work',
  // Brunch events
  'brunch',
  // Coffee/social gatherings (not concerts)
  'fika',
];

const BLOCKLIST_VENUES = [
  'bio skandia',
  'prins eugens waldemarsudde',
  'etnografiska museet',
  'livrustkammaren',
];

/**
 * Pre-compiled regex patterns for each blocklist term.
 * Using \b word boundaries to avoid partial-word matches.
 * Multi-word phrases are matched as literal strings (spaces act as boundary).
 */
const BLOCKLIST_PATTERNS: RegExp[] = BLOCKLIST_TERMS.map(
  (term) => new RegExp(`\\b${escapeRegex(term)}\\b`, 'i')
);

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Returns true if the event name matches any blocklist term.
 *
 * @example
 * isBlocklisted('Presentkort 500kr')  // true
 * isBlocklisted('Quiz Night at Berns') // true
 * isBlocklisted('Prestige — Live')    // false  (\b prevents partial match)
 * isBlocklisted('The Quizmasters')    // false  (\b after "quiz" prevents match)
 * isBlocklisted('Concert: Tame Impala') // false
 */
export function isBlocklisted(name: string): boolean {
  return BLOCKLIST_PATTERNS.some((pattern) => pattern.test(name));
}

/**
 * Returns the matched blocklist term if the name is blocked, otherwise null.
 * Useful for generating descriptive log messages.
 */
export function blockedBy(name: string): string | null {
  const idx = BLOCKLIST_PATTERNS.findIndex((pattern) => pattern.test(name));
  return idx >= 0 ? BLOCKLIST_TERMS[idx] : null;
}

export type EventFilterInput = {
  name?: string | null;
  artist?: string | null;
  venue?: string | null;
  organizer?: string | null;
};

function normalize(value: string | null | undefined): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Returns a removal reason for clearly non-concert/non-music events.
 *
 * The rules are intentionally conservative:
 * - keep club nights, DJ nights, jams, parties, tours, and artist listings
 * - remove clear cinema, children's classes, craft/workshop, and ticket-sale-only entries
 */
export function nonConcertReason(event: EventFilterInput): string | null {
  const name = event.name || '';
  const normalizedName = normalize(name);
  const normalizedVenue = normalize(event.venue);

  const term = blockedBy(name);
  if (term) {
    // "party" and "club" are common in real music listings, so they override
    // broad workshop-ish terms only when the block term is weak. Ticket-sale
    // and cinema/kids/craft terms remain blocked.
    return `title matched "${term}"`;
  }

  if (BLOCKLIST_VENUES.some((venue) => normalizedVenue === venue)) {
    return `venue matched "${event.venue}"`;
  }

  if (/barn\s+\d+\s*[-–]\s*\d+\s*ar/.test(normalizedName)) {
    return 'children age range in title';
  }

  return null;
}

export function isNonConcertEvent(event: EventFilterInput): boolean {
  return nonConcertReason(event) !== null;
}
