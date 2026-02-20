/**
 * Test data seeding script for load testing
 *
 * Generates 10,000+ realistic events distributed across:
 * - 13 Stockholm venues
 * - 11 music genres
 * - Next 12 months date range
 * - 500 artist names
 * - Various ticket platforms
 *
 * Usage: npm run seed:test
 */

import { db } from '../db/client.js';
import { events, type NewEvent } from '../db/schema.js';
import { CANONICAL_GENRES } from '../normalization/genre-mappings.js';
import { getCanonicalVenues } from '../normalization/venue-mappings.js';

// Artist pool (500 names for variety)
const ARTISTS = [
  // Metal
  'Metallica', 'Iron Maiden', 'Black Sabbath', 'Slayer', 'Megadeth',
  'Judas Priest', 'Motorhead', 'Pantera', 'Anthrax', 'Testament',
  'Opeth', 'Amon Amarth', 'Dark Tranquillity', 'In Flames', 'At The Gates',
  // Rock
  'The Beatles', 'Led Zeppelin', 'Pink Floyd', 'The Rolling Stones', 'Queen',
  'AC/DC', 'Nirvana', 'Foo Fighters', 'Pearl Jam', 'Soundgarden',
  'Red Hot Chili Peppers', 'Radiohead', 'Muse', 'Arctic Monkeys', 'The Strokes',
  // Electronic
  'Daft Punk', 'The Chemical Brothers', 'Aphex Twin', 'Deadmau5', 'Skrillex',
  'Swedish House Mafia', 'Eric Prydz', 'Avicii', 'Alesso', 'Axwell',
  'Sebastian Ingrosso', 'Steve Angello', 'Adam Beyer', 'Drumcode', 'Richie Hawtin',
  // Jazz
  'Miles Davis', 'John Coltrane', 'Herbie Hancock', 'Weather Report', 'Chick Corea',
  'Pat Metheny', 'Keith Jarrett', 'Bill Evans', 'Esbjorn Svensson Trio', 'Nils Landgren',
  // Hip-hop
  'Kendrick Lamar', 'J. Cole', 'Drake', 'Travis Scott', 'Tyler, The Creator',
  'Kanye West', 'Jay-Z', 'Nas', 'A$AP Rocky', 'Eminem',
  // Pop
  'Taylor Swift', 'Ariana Grande', 'Billie Eilish', 'The Weeknd', 'Dua Lipa',
  'Harry Styles', 'Olivia Rodrigo', 'Ed Sheeran', 'Adele', 'Lady Gaga',
  // Indie
  'The National', 'Bon Iver', 'Fleet Foxes', 'Vampire Weekend', 'Tame Impala',
  'Mac DeMarco', 'Beach House', 'MGMT', 'Phoenix', 'The XX',
  // Folk
  'Bob Dylan', 'Leonard Cohen', 'Nick Drake', 'Joni Mitchell', 'Simon & Garfunkel',
  'Fleet Foxes', 'Iron & Wine', 'Sufjan Stevens', 'The Tallest Man on Earth', 'First Aid Kit',
  // Swedish artists
  'Kent', 'The Cardigans', 'Robyn', 'The Hives', 'Mando Diao',
  'Jose Gonzalez', 'Peter Bjorn and John', 'Lykke Li', 'Fever Ray', 'The Knife',
  'Refused', 'Millencolin', 'Ghost', 'Cult of Luna', 'Meshuggah',
  // Generated band names for variety
  'The Midnight Riders', 'Electric Dreams', 'Northern Lights Orchestra', 'Stockholm Symphony',
  'The Basement Sessions', 'Blue Monday', 'Velvet Underground Revival', 'The Sunday Club',
  'Neon Nights', 'Crystal Method', 'Urban Legends', 'The Frequency', 'Analog Vision',
  'Digital Souls', 'The Resonance', 'Harmonic Convergence', 'Sonic Youth Tribute',
  'The Amplifiers', 'Feedback Loop', 'Stage Dive', 'The Green Room', 'Last Call',
];

// Generate more artist names to reach 500
for (let i = 1; i <= 400; i++) {
  const prefixes = ['The', 'Los', 'Le', 'El', 'Die'];
  const middles = ['Electric', 'Cosmic', 'Neon', 'Crystal', 'Urban', 'Digital', 'Analog', 'Sonic', 'Atomic', 'Quantum'];
  const suffixes = ['Riders', 'Dreams', 'Lights', 'Symphony', 'Orchestra', 'Band', 'Collective', 'Project', 'Experience', 'Ensemble'];

  const hasPrefix = i % 3 === 0;
  const prefix = prefixes[i % prefixes.length];
  const middle = middles[i % middles.length];
  const suffix = suffixes[i % suffixes.length];

  ARTISTS.push(hasPrefix ? `${prefix} ${middle} ${suffix}` : `${middle} ${suffix}`);
}

// Venue pool (13 Stockholm venues)
const VENUES = getCanonicalVenues();

// Ticket platforms
const PLATFORMS = ['ticketmaster', 'axs', 'dice', 'venue-direct'];

/**
 * Generate random date within next 12 months
 */
function randomDate(): Date {
  const now = new Date();
  const maxDays = 365;
  const randomDays = Math.floor(Math.random() * maxDays);
  const date = new Date(now);
  date.setDate(date.getDate() + randomDays);

  // Set random hour between 18:00 and 23:00
  const hour = 18 + Math.floor(Math.random() * 6);
  date.setHours(hour, 0, 0, 0);

  return date;
}

/**
 * Generate random event name
 */
function randomEventName(artist: string): string {
  const patterns = [
    `${artist} Live in Stockholm`,
    `${artist} 2024 Tour`,
    `${artist} - Stockholm Show`,
    `An Evening with ${artist}`,
    `${artist} Concert`,
  ];
  return patterns[Math.floor(Math.random() * patterns.length)];
}

/**
 * Generate random genre
 */
function randomGenre(): string {
  const genres = CANONICAL_GENRES.filter(g => g !== 'other');
  return genres[Math.floor(Math.random() * genres.length)];
}

/**
 * Generate random ticket sources (1-3 platforms)
 */
function randomTicketSources() {
  const count = 1 + Math.floor(Math.random() * 3); // 1-3 sources
  const shuffled = [...PLATFORMS].sort(() => Math.random() - 0.5);
  const selectedPlatforms = shuffled.slice(0, count);

  return selectedPlatforms.map(platform => ({
    platform,
    url: `https://example.com/${platform}/ticket-${Math.random().toString(36).substring(7)}`,
    addedAt: new Date().toISOString(),
  }));
}

/**
 * Generate random price
 */
function randomPrice(): string | null {
  // 20% free events
  if (Math.random() < 0.2) {
    return null;
  }

  const price = 150 + Math.floor(Math.random() * 500); // 150-650 SEK
  return `${price} SEK`;
}

/**
 * Generate single event
 */
function generateEvent(): NewEvent {
  const artist = ARTISTS[Math.floor(Math.random() * ARTISTS.length)];
  const venue = VENUES[Math.floor(Math.random() * VENUES.length)];
  const date = randomDate();
  const platform = PLATFORMS[Math.floor(Math.random() * PLATFORMS.length)];

  return {
    name: randomEventName(artist),
    artist,
    venue,
    date,
    time: `${date.getHours()}:00`,
    genre: randomGenre(),
    ticketSources: randomTicketSources(),
    price: randomPrice(),
    sourceId: `test-${Math.random().toString(36).substring(2, 15)}`,
    sourcePlatform: platform,
  };
}

/**
 * Seed database with test events
 *
 * @param count - Number of events to generate (default: 10000)
 * @returns Number of events inserted
 */
export async function seedTestData(count = 10000): Promise<number> {
  console.log(`\nSeeding ${count} test events...`);
  const startTime = Date.now();

  let inserted = 0;
  const batchSize = 100;

  for (let i = 0; i < count; i += batchSize) {
    const batch: NewEvent[] = [];
    const remaining = Math.min(batchSize, count - i);

    for (let j = 0; j < remaining; j++) {
      batch.push(generateEvent());
    }

    try {
      await db.insert(events).values(batch).onConflictDoNothing();
      inserted += batch.length;

      // Log progress every 1000 events
      if ((i + batchSize) % 1000 === 0 || i + batchSize >= count) {
        console.log(`Progress: ${Math.min(i + batchSize, count)}/${count} events processed`);
      }
    } catch (error) {
      console.error(`Error inserting batch at ${i}:`, error);
      throw error;
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\nSeeded ${inserted} events in ${duration} seconds`);

  return inserted;
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  seedTestData()
    .then((count) => {
      console.log(`Success! Database populated with ${count} test events.`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}
