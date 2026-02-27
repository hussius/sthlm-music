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
 * Terms that indicate a non-concert entry.
 * Checked case-insensitively against the event name.
 */
const BLOCKLIST_TERMS = [
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
