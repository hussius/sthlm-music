/**
 * Genre taxonomy and mapping for music event normalization.
 *
 * Handles platform-specific genre variations and maps them to canonical taxonomy:
 * - "Rock & Roll" -> "rock"
 * - "Electronic Dance Music" -> "electronic"
 * - "Hip Hop" -> "hip-hop"
 *
 * Unknown genres default to "other" with console warning.
 *
 * @example
 * mapGenre("alternative rock") // => "rock"
 * mapGenre("Techno") // => "electronic"
 * mapGenre("Unknown Genre X") // => "other" (+ warning logged)
 */

/**
 * Canonical genre taxonomy (10-12 core genres).
 * Used for filtering and categorization across all platforms.
 */
export const CANONICAL_GENRES = [
  'rock',
  'pop',
  'electronic',
  'jazz',
  'hip-hop',
  'metal',
  'indie',
  'folk',
  'classical',
  'world',
  'other',
] as const;

/**
 * Platform-specific genre mappings to canonical genres.
 * Covers 50+ common variations from Ticketmaster, AXS, DICE, and venue sites.
 */
const genreMappings: Record<string, typeof CANONICAL_GENRES[number]> = {
  // Rock variations
  'rock': 'rock',
  'rock & roll': 'rock',
  'rock and roll': 'rock',
  'alternative rock': 'rock',
  'alternative': 'rock',
  'punk': 'rock',
  'punk rock': 'rock',
  'hard rock': 'rock',
  'garage rock': 'rock',
  'classic rock': 'rock',
  'psychedelic rock': 'rock',

  // Pop variations
  'pop': 'pop',
  'pop music': 'pop',
  'pop rock': 'pop',
  'synth pop': 'pop',
  'synthpop': 'pop',
  'electropop': 'pop',
  'dance pop': 'pop',

  // Electronic variations
  'electronic': 'electronic',
  'techno': 'electronic',
  'house': 'electronic',
  'deep house': 'electronic',
  'tech house': 'electronic',
  'edm': 'electronic',
  'electronic dance music': 'electronic',
  'dance': 'electronic',
  'club': 'electronic',
  'trance': 'electronic',
  'dubstep': 'electronic',
  'drum and bass': 'electronic',
  'dnb': 'electronic',
  'ambient': 'electronic',
  'downtempo': 'electronic',

  // Jazz variations
  'jazz': 'jazz',
  'jazz music': 'jazz',
  'bebop': 'jazz',
  'fusion': 'jazz',
  'jazz fusion': 'jazz',
  'swing': 'jazz',
  'blues': 'jazz',
  'jazz & blues': 'jazz',

  // Hip-hop variations
  'hip-hop': 'hip-hop',
  'hip hop': 'hip-hop',
  'hiphop': 'hip-hop',
  'rap': 'hip-hop',
  'trap': 'hip-hop',
  'r&b': 'hip-hop',
  'rnb': 'hip-hop',
  'urban': 'hip-hop',

  // Metal variations
  'metal': 'metal',
  'heavy metal': 'metal',
  'death metal': 'metal',
  'black metal': 'metal',
  'thrash metal': 'metal',
  'metalcore': 'metal',
  'progressive metal': 'metal',

  // Indie variations
  'indie': 'indie',
  'indie rock': 'indie',
  'indie pop': 'indie',
  'indie folk': 'indie',
  'lo-fi': 'indie',
  'bedroom pop': 'indie',

  // Folk variations
  'folk': 'folk',
  'folk music': 'folk',
  'folk rock': 'folk',
  'americana': 'folk',
  'country': 'folk',
  'bluegrass': 'folk',
  'acoustic': 'folk',

  // Classical variations
  'classical': 'classical',
  'classical music': 'classical',
  'orchestra': 'classical',
  'orchestral': 'classical',
  'chamber music': 'classical',
  'opera': 'classical',
  'baroque': 'classical',

  // World variations
  'world': 'world',
  'world music': 'world',
  'latin': 'world',
  'reggae': 'world',
  'ska': 'world',
  'afrobeat': 'world',
  'salsa': 'world',
  'cumbia': 'world',
  'bossa nova': 'world',

  // Other
  'other': 'other',
  'miscellaneous': 'other',
  'various': 'other',
};

/**
 * Maps platform-specific genre to canonical genre taxonomy.
 *
 * Process:
 * 1. Normalize input (trim, lowercase)
 * 2. Try direct mapping lookup
 * 3. Try substring match (e.g., "indie rock" contains "indie")
 * 4. Default to "other" with warning if no match
 *
 * @param genre - Raw genre string from platform
 * @returns Canonical genre from CANONICAL_GENRES
 */
export function mapGenre(genre: string): typeof CANONICAL_GENRES[number] {
  const cleaned = genre.trim().toLowerCase();

  // Direct mapping
  if (genreMappings[cleaned]) {
    return genreMappings[cleaned];
  }

  // Substring match (e.g., "indie rock alternative" -> "indie")
  // Check if cleaned contains any mapping key
  for (const [key, canonical] of Object.entries(genreMappings)) {
    if (cleaned.includes(key) || key.includes(cleaned)) {
      return canonical;
    }
  }

  // Default to 'other' if no match
  console.warn(`Unknown genre "${genre}", mapped to "other"`);
  return 'other';
}
