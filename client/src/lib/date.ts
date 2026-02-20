/**
 * Date formatting utilities with Stockholm timezone support.
 *
 * All event dates are displayed in Europe/Stockholm timezone regardless
 * of user's local timezone to maintain consistency with the local events.
 */

import { formatInTimeZone } from 'date-fns-tz';

export const STOCKHOLM_TZ = 'Europe/Stockholm';

/**
 * Format event date to Stockholm timezone with consistent format.
 *
 * @param isoDate - ISO 8601 date string from API
 * @returns Formatted date string: "EEE, MMM d, yyyy • HH:mm"
 * @example formatEventDate("2026-02-21T18:30:00Z") // "Fri, Feb 21, 2026 • 19:30"
 */
export function formatEventDate(isoDate: string): string {
  return formatInTimeZone(
    new Date(isoDate),
    STOCKHOLM_TZ,
    'EEE, MMM d, yyyy • HH:mm'
  );
}
