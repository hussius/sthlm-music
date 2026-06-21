import type { TicketSource } from '../db/schema.js';
import * as Fuzzball from 'fuzzball';
import { normalizeVenueName } from '../normalization/venue-mappings.js';

export type EventIdentity = {
  name?: string | null;
  artist?: string | null;
  venue?: string | null;
  date?: Date | string | null;
  ticketSources?: TicketSource[] | null;
  sourceId?: string | null;
  sourcePlatform?: string | null;
};

export type EventSimilarity = {
  titleSimilarity: number;
  artistSimilarity: number;
  venueSimilarity: number;
  overallSimilarity: number;
  sameStockholmDay: boolean;
  timeDistanceMinutes: number | null;
  sharedTicketUrl: boolean;
  sameSource: boolean;
  artistReliable: boolean;
  venueReliable: boolean;
};

const stockholmDayFormatter = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Stockholm',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const GENERIC_ARTISTS = new Set([
  '',
  'unknown',
  'unknown artist',
  'various',
  'various artists',
  'tba',
  'to be announced',
  'multiple artists',
  'live',
]);

const TITLE_NOISE_TERMS = [
  'stockholm',
  'sthlm',
  'biljetter',
  'ticket',
  'tickets',
  'platinum tickets',
  'concert',
  'konsert',
  'live at',
  'live',
  'presenterar',
  'presents',
  'world tour',
  'tour',
];

const GENERIC_VENUE_TOKENS = new Set([
  'the',
  'club',
  'klubben',
  'scen',
  'stage',
  'arena',
  'stockholm',
]);

const GENERIC_VENUES = new Set([
  '',
  'unknown',
  'unknown venue',
  'stockholm',
  'stockholm venue',
  'tba',
  'to be announced',
]);

export function normalizeText(value: string | null | undefined): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/['"`´]/g, '')
    .replace(/[^a-z0-9åäö]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeVenue(value: string | null | undefined): string {
  const normalized = value ? normalizeVenueName(value) : '';
  return normalizeText(normalized)
    .replace(/\b(klubben|stora scen|lilla scen|main stage)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripDatePrefixes(value: string): string {
  return value
    .replace(/^\s*\d{1,2}\s*[/.:-]\s*\d{1,2}\s*/g, ' ')
    .replace(/^\s*\d{1,2}\s+\d{1,2}\s+/g, ' ')
    .replace(/^\s*\d{1,2}\s+(jan|feb|mar|apr|maj|may|jun|jul|aug|sep|okt|oct|nov|dec)\w*\s*/i, ' ')
    .replace(/\b\d{1,2}\s+\d{1,2}\b/g, ' ')
    .replace(/\b\d{1,2}\s*[/.:-]\s*\d{1,2}\b/g, ' ');
}

function stripVenueTokens(title: string, venue: string | null | undefined): string {
  const venueTokens = normalizeVenue(venue)
    .split(' ')
    .filter((token) => token.length > 2 && !GENERIC_VENUE_TOKENS.has(token));

  let cleaned = title;
  for (const token of venueTokens) {
    cleaned = cleaned.replace(new RegExp(`\\b${escapeRegex(token)}\\b`, 'g'), ' ');
  }
  return cleaned.replace(/\s+/g, ' ').trim();
}

export function normalizeTitle(value: string | null | undefined, venue?: string | null): string {
  let title = normalizeText(value);
  title = stripDatePrefixes(title);

  for (const term of TITLE_NOISE_TERMS) {
    title = title.replace(new RegExp(`\\b${escapeRegex(normalizeText(term))}\\b`, 'g'), ' ');
  }

  title = stripVenueTokens(title, venue);
  return title.replace(/\s+/g, ' ').trim();
}

export function normalizeArtist(value: string | null | undefined): string {
  return normalizeText(value)
    .replace(/\b(live|concert|konsert|dj set)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isReliableArtist(event: EventIdentity): boolean {
  const artist = normalizeArtist(event.artist);
  if (GENERIC_ARTISTS.has(artist)) return false;

  const title = normalizeTitle(event.name, event.venue);
  if (!artist || !title) return false;
  if (artist === title) return false;

  return true;
}

export function isReliableVenue(event: EventIdentity): boolean {
  const venue = normalizeVenue(event.venue);
  return Boolean(venue && !GENERIC_VENUES.has(venue));
}

export function stockholmDayKey(date: Date | string): string {
  return stockholmDayFormatter.format(new Date(date));
}

export function minutesBetween(a: Date | string, b: Date | string): number {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 60000;
}

export function normalizeTicketUrl(url: string | null | undefined): string {
  const raw = (url || '').trim();
  if (!raw) return '';

  try {
    const parsed = new URL(raw);
    parsed.hash = '';
    parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');

    for (const param of Array.from(parsed.searchParams.keys())) {
      if (/^(utm_|fbclid$|gclid$|mc_)/i.test(param)) {
        parsed.searchParams.delete(param);
      }
    }

    parsed.searchParams.sort();
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return raw.toLowerCase().replace(/\/$/, '');
  }
}

export function ticketUrlSet(event: EventIdentity): Set<string> {
  return new Set(
    (event.ticketSources || [])
      .map((source) => normalizeTicketUrl(source.url))
      .filter(Boolean)
  );
}

export function hasSharedTicketUrl(a: EventIdentity, b: EventIdentity): boolean {
  const aUrls = ticketUrlSet(a);
  if (aUrls.size === 0) return false;
  for (const url of ticketUrlSet(b)) {
    if (aUrls.has(url)) return true;
  }
  return false;
}

export function hasSameSource(a: EventIdentity, b: EventIdentity): boolean {
  return Boolean(
    a.sourcePlatform &&
    a.sourceId &&
    b.sourcePlatform === a.sourcePlatform &&
    b.sourceId === a.sourceId
  );
}

export function mergeTicketSources(
  existingSources: TicketSource[] = [],
  incomingSources: TicketSource[] = []
): TicketSource[] {
  const merged: TicketSource[] = [];
  const seenUrls = new Set<string>();
  const seenPlatformUrl = new Set<string>();

  for (const source of [...existingSources, ...incomingSources]) {
    const normalizedUrl = normalizeTicketUrl(source.url);
    const platformUrlKey = `${source.platform}:${normalizedUrl}`;

    if (normalizedUrl && seenUrls.has(normalizedUrl)) {
      continue;
    }
    if (seenPlatformUrl.has(platformUrlKey)) {
      continue;
    }

    if (normalizedUrl) seenUrls.add(normalizedUrl);
    seenPlatformUrl.add(platformUrlKey);
    merged.push(source);
  }

  return merged;
}

export function scoreEventSimilarity(a: EventIdentity, b: EventIdentity): EventSimilarity {
  const aTitle = normalizeTitle(a.name, a.venue);
  const bTitle = normalizeTitle(b.name, b.venue);
  const aArtist = normalizeArtist(a.artist);
  const bArtist = normalizeArtist(b.artist);
  const aVenue = normalizeVenue(a.venue);
  const bVenue = normalizeVenue(b.venue);

  const titleSimilarity = aTitle && bTitle ? Fuzzball.token_set_ratio(aTitle, bTitle) : 0;
  const artistSimilarity = aArtist && bArtist ? Fuzzball.token_set_ratio(aArtist, bArtist) : 0;
  const venueSimilarity = aVenue && bVenue ? Fuzzball.token_set_ratio(aVenue, bVenue) : 0;
  const sameStockholmDay = Boolean(a.date && b.date && stockholmDayKey(a.date) === stockholmDayKey(b.date));
  const timeDistanceMinutes = a.date && b.date ? minutesBetween(a.date, b.date) : null;
  const sharedTicketUrl = hasSharedTicketUrl(a, b);
  const sameSource = hasSameSource(a, b);
  const artistReliable = isReliableArtist(a) && isReliableArtist(b);
  const venueReliable = isReliableVenue(a) && isReliableVenue(b);

  const overallSimilarity = artistReliable
    ? (titleSimilarity * 0.45) + (artistSimilarity * 0.35) + (venueSimilarity * 0.2)
    : (titleSimilarity * 0.7) + (venueSimilarity * 0.3);

  return {
    titleSimilarity,
    artistSimilarity,
    venueSimilarity,
    overallSimilarity,
    sameStockholmDay,
    timeDistanceMinutes,
    sharedTicketUrl,
    sameSource,
    artistReliable,
    venueReliable,
  };
}

export function classifySimilarity(score: EventSimilarity): 'duplicate' | 'maybe' | 'not_duplicate' {
  if (score.sharedTicketUrl || score.sameSource) {
    return 'duplicate';
  }

  if (!score.sameStockholmDay) {
    return 'not_duplicate';
  }

  if (score.venueSimilarity >= 90 && score.titleSimilarity >= 94) {
    return 'duplicate';
  }

  if (
    score.artistReliable &&
    score.venueSimilarity >= 80 &&
    score.artistSimilarity >= 85 &&
    score.titleSimilarity >= 82
  ) {
    return 'duplicate';
  }

  if (
    score.artistReliable &&
    !score.venueReliable &&
    score.artistSimilarity >= 90 &&
    score.titleSimilarity >= 94 &&
    (score.timeDistanceMinutes === null || score.timeDistanceMinutes <= 720)
  ) {
    return 'duplicate';
  }

  if (
    score.artistReliable &&
    !score.venueReliable &&
    score.artistSimilarity >= 96 &&
    score.titleSimilarity >= 70 &&
    score.timeDistanceMinutes !== null &&
    score.timeDistanceMinutes <= 90
  ) {
    return 'duplicate';
  }

  if (
    score.timeDistanceMinutes !== null &&
    score.timeDistanceMinutes <= 90 &&
    score.venueSimilarity >= 85 &&
    score.titleSimilarity >= 88
  ) {
    return 'duplicate';
  }

  if (score.venueSimilarity >= 75 && score.titleSimilarity >= 86) {
    return 'maybe';
  }

  if (
    score.artistReliable &&
    score.venueSimilarity >= 70 &&
    score.artistSimilarity >= 80 &&
    score.titleSimilarity >= 70
  ) {
    return 'maybe';
  }

  return 'not_duplicate';
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
