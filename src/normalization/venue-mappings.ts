/**
 * Venue name normalization for Stockholm music venues.
 *
 * Handles naming variations across platforms:
 * - "Kollektivet" vs "Kollektivet Livet" vs "Kollektivet Livet Stockholm"
 * - "Fasching" vs "Fasching Stockholm"
 * - Case-insensitive matching with substring detection
 *
 * @example
 * normalizeVenueName("kollektivet") // => "Kollektivet Livet"
 * normalizeVenueName("Fasching Stockholm") // => "Fasching"
 * normalizeVenueName("Unknown Venue") // => "Unknown Venue"
 */

/**
 * Mapping of venue name variations to canonical names.
 * Covers all 13 priority venues from PROJECT.md.
 */
export const venueAliases: Record<string, string> = {
  // Kollektivet Livet variations
  'kollektivet': 'Kollektivet Livet',
  'kollektivet livet': 'Kollektivet Livet',
  'kollektivet livet stockholm': 'Kollektivet Livet',
  'kollektivet stockholm': 'Kollektivet Livet',
  'live at kollektivet': 'Kollektivet Livet',

  // Slaktkyrkan variations
  'slaktkyrkan': 'Slaktkyrkan',
  'slaktkyrkan kulturhus': 'Slaktkyrkan',
  'kulturhuset slaktkyrkan': 'Slaktkyrkan',
  'slaktkyrkan stockholm': 'Slaktkyrkan',

  // Hus 7 variations
  'hus 7': 'Hus 7',
  'hus7': 'Hus 7',
  'hus sju': 'Hus 7',
  'house 7': 'Hus 7',

  // Fasching variations
  'fasching': 'Fasching',
  'fasching stockholm': 'Fasching',
  'fasching jazz club': 'Fasching',
  'jazz club fasching': 'Fasching',

  // Nalen variations
  'nalen': 'Nalen',
  'nalen stockholm': 'Nalen',
  'nalen kulturhus': 'Nalen',
  'kulturhuset nalen': 'Nalen',

  // Fylkingen variations
  'fylkingen': 'Fylkingen',
  'fylkingen stockholm': 'Fylkingen',
  'kulturföreningen fylkingen': 'Fylkingen',

  // Slakthuset variations
  'slakthuset': 'Slakthuset',
  'slakthuset stockholm': 'Slakthuset',
  'slakthuset kulturhus': 'Slakthuset',

  // Fållan variations
  'fållan': 'Fållan',
  'fallan': 'Fållan',
  'fållan stockholm': 'Fållan',

  // Landet variations
  'landet': 'Landet',
  'landet stockholm': 'Landet',
  'café landet': 'Landet',

  // Mosebacke variations
  'mosebacke': 'Mosebacke',
  'mosebacke etablissement': 'Mosebacke',
  'mosebacke stockholm': 'Mosebacke',
  'etablissementet mosebacke': 'Mosebacke',

  // Kägelbanan variations
  'kägelbanan': 'Kägelbanan',
  'kagelbanan': 'Kägelbanan',
  'kägelbanan stockholm': 'Kägelbanan',

  // Pet Sounds variations
  'pet sounds': 'Pet Sounds Bar',
  'pet sounds bar': 'Pet Sounds Bar',
  'petsounds': 'Pet Sounds Bar',
  'pet sounds stockholm': 'Pet Sounds Bar',

  // Debaser variations
  'debaser': 'Debaser',
  'debaser strand': 'Debaser',
  'debaser stockholm': 'Debaser',
  'debaser medis': 'Debaser',
};

/**
 * Normalizes venue names to canonical form.
 *
 * Process:
 * 1. Try exact match (case-insensitive)
 * 2. Try substring match (e.g., "Live at Kollektivet" contains "kollektivet")
 * 3. Return original with trimmed whitespace if no match
 *
 * @param venue - Raw venue name from any platform
 * @returns Canonical venue name or original if unknown
 */
export function normalizeVenueName(venue: string): string {
  const cleaned = venue.trim().toLowerCase();

  // Direct match in aliases
  if (venueAliases[cleaned]) {
    return venueAliases[cleaned];
  }

  // Check if any alias key is contained in the venue name
  // (handles "Concert at Kollektivet Livet" -> "Kollektivet Livet")
  for (const [alias, canonical] of Object.entries(venueAliases)) {
    if (cleaned.includes(alias)) {
      return canonical;
    }
  }

  // Return original with proper capitalization if no match
  return venue.trim();
}

/**
 * Returns array of unique canonical venue names.
 * Useful for venue filter dropdowns and validation.
 *
 * @returns Array of canonical venue names (13 priority venues)
 */
export function getCanonicalVenues(): string[] {
  return Array.from(new Set(Object.values(venueAliases)));
}
