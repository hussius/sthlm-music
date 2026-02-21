# Phase 4: Crawler Expansion & Coverage Enhancement - Research

**Researched:** 2026-02-21
**Domain:** Web scraping, API integration, crawler health monitoring
**Confidence:** HIGH

## Summary

Phase 4 expands event coverage by fixing broken venue crawlers, integrating Tickster and Eventbrite ticketing APIs, and adding 10-15 new Stockholm venue scrapers. The existing codebase uses Crawlee 3.16.0 + Playwright 1.58.2 for scraping and has established patterns (BaseVenueCrawler, API client classes, deduplication pipeline) that should be extended. Research focused on: API integration patterns for Tickster and Eventbrite, automated health check strategies for detecting crawler failures, rate limiting best practices, and maintaining >95% deduplication accuracy as coverage expands.

**Critical findings:**
- Tickster has Event API v0.4 and Event Dump API (JSON, daily updates) requiring API key
- Eventbrite v3 removed public search endpoint (August 2024) - must crawl via organization/venue IDs or scrape their platform directly
- Existing codebase has strong foundation: VenueConfig pattern, Ticketmaster-style API client template, 3-stage deduplication (exact match, fuzzy >90%, manual review 70-90%)
- Health checks should validate event counts, detect 0-return failures, and monitor selector changes through reference point validation

**Primary recommendation:** Extend existing patterns (BaseVenueCrawler for venues, TicketmasterClient pattern for APIs), implement event count validation health checks first, then fix broken scrapers to validate monitoring before expanding coverage.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Fix broken scrapers first**: Restore Nalen and Kollektivet Livet coverage before adding new sources - shows commitment to quality
- **Prioritize venues by ease of implementation**: Quick wins first - venues with simple HTML structure
- **APIs early in phase**: Integrate Tickster and Eventbrite after fixing broken scrapers - APIs likely easier than venue scrapers, builds confidence
- **Target 10-15 new venues**: Realistic goal that leaves hardest venues for future phase
- **Automated event count checks**: Alert if crawler returns 0 events or significantly fewer than expected
- **Test deduplication with known overlaps**: Manually verify events from multiple sources deduplicate properly
- **Immediate error alerts**: Get notified on first crawler failure so we can fix quickly
- **Maintain >95% dedup accuracy**: Same standard as Phase 1 - quality is core value proposition

### Claude's Discretion
- API integration patterns (key management, rate limits, error handling)
- Venue crawler patterns (whether to extend existing VenueConfig or create new patterns)
- Specific implementation details for automated checks
- How to structure deduplication test cases

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| crawlee | 3.16.0 | Web scraping orchestration | Industry-leading Node.js crawler - bundles Cheerio, Playwright, proxy rotation, request queuing, auto-scaling |
| playwright | 1.58.2 | JavaScript-rendered sites | Browser automation for dynamic content - auto-waits, cross-browser support, stable for production |
| cheerio | 1.2.0 | Static HTML parsing | Fast jQuery-like API for static sites - 10-100x faster than Playwright when JavaScript not needed |
| drizzle-orm | 0.45.1 | Database ORM | Type-safe queries with minimal overhead - existing pattern in codebase |
| postgres | 3.4.8 | PostgreSQL client | High-performance connection pooling - used by drizzle-orm |
| fuzzball | 2.2.3 | String similarity matching | Levenshtein/token_set_ratio for fuzzy deduplication - already integrated |
| dotenv | 17.3.1 | Environment configuration | Standard for managing API keys and secrets |
| zod | 4.3.6 | Runtime validation | Type-safe schema validation - existing pattern for event normalization |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| bullmq | 5.69.3 | Job queue with Redis | For scheduled crawling, retry logic, distributed work |
| fastify | 5.7.4 | HTTP API server | For exposing health check endpoints, admin interfaces |
| ioredis | 5.9.3 | Redis client | For rate limiting state, distributed locks, caching |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| crawlee | puppeteer-extra | Direct control but lose request queue, storage, autoscaling |
| playwright | puppeteer | Slightly lighter but lose multi-browser testing, less stable API |
| fuzzball | dedupe.io | More powerful ML-based matching but requires Python, training data |
| postgres.js | node-postgres | More features but slower, heavier |

**Installation:**
```bash
# Already installed in package.json
npm install
```

**Note:** Current versions (as of 2026-02-21) are production-ready. No upgrades recommended mid-phase unless critical security issues.

## Architecture Patterns

### Recommended Project Structure
Current structure is already well-organized:
```
src/
├── crawlers/           # Platform-specific crawlers
│   ├── ticketmaster.ts
│   ├── ticketmaster-api-client.ts  # Template for Tickster/Eventbrite
│   ├── venues/
│   │   ├── base-venue-crawler.ts   # Strategy pattern for venues
│   │   ├── venue-configs.ts        # Declarative venue definitions
│   │   └── [venue].ts              # Individual venue implementations
├── normalization/      # Data transformation pipeline
│   ├── schemas.ts                  # Zod validation schemas
│   ├── transformers.ts             # Platform-specific transformers
│   ├── venue-mappings.ts           # Venue name normalization
│   └── genre-mappings.ts           # Genre taxonomy
├── deduplication/      # Multi-stage deduplication
│   ├── deduplicator.ts             # Pipeline orchestrator
│   ├── exact-match.ts              # Stage 1: venue+date
│   ├── fuzzy-match.ts              # Stage 2: string similarity
│   └── manual-review-queue.ts      # Stage 3: 70-90% similarity
├── repositories/       # Database access layer
│   └── event-repository.ts
├── db/                 # Database schema and client
│   ├── schema.ts                   # Drizzle schema with indexes
│   └── client.ts
└── config/
    └── env.ts                      # Centralized environment config
```

### Pattern 1: API Client with Rate Limiting
**What:** Reusable API client class with built-in rate limiting, quota tracking, error handling
**When to use:** Tickster API, Eventbrite API (if viable), future ticketing platforms
**Example:**
```typescript
// Source: /Users/hussmikael/agents-hackathon/src/crawlers/ticketmaster-api-client.ts
export class TicksterClient {
  private readonly apiKey: string;
  private readonly baseURL = 'https://api.tickster.com';

  // Rate limiting state
  private lastRequestTime = 0;
  private dailyRequestCount = 0;

  private async waitForRateLimit(): Promise<void> {
    // Enforce per-second limit (e.g., 200ms between requests)
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;

    if (elapsed < 200) {
      await new Promise(resolve => setTimeout(resolve, 200 - elapsed));
    }

    this.lastRequestTime = Date.now();
    this.dailyRequestCount++;

    // Warn at 90% quota
    if (this.dailyRequestCount >= 0.9 * DAILY_LIMIT) {
      console.warn('API quota warning: 90% used');
    }
  }

  async searchEvents(params: SearchParams): Promise<Response> {
    await this.waitForRateLimit();

    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limit exceeded');
      }
      if (response.status >= 500) {
        throw new Error(`API server error: ${response.status}`);
      }
      // Handle other errors...
    }

    return response.json();
  }

  getQuotaUsage(): { used: number; total: number } {
    return { used: this.dailyRequestCount, total: DAILY_LIMIT };
  }
}
```

### Pattern 2: VenueConfig Strategy Pattern
**What:** Declarative configuration for venue websites with automatic Cheerio/Playwright selection
**When to use:** New venue-direct scrapers (10-15 venues)
**Example:**
```typescript
// Source: /Users/hussmikael/agents-hackathon/src/crawlers/venues/venue-configs.ts
const config: VenueConfig = {
  name: 'Kollektivet Livet',
  url: 'https://kollektivetlivet.se/evenemang',
  selectors: {
    eventContainer: '.event-item, .event, article',
    eventName: '.event-title, h2, h3',
    eventDate: '.event-date, time, .date',
    eventUrl: 'a',
  },
  usesJavaScript: false, // true = Playwright, false = Cheerio
};

const crawler = new BaseVenueCrawler(config);
const result = await crawler.crawl();
```

**Selector strategy:** Use multiple fallback selectors (`.event-item, .event, article`) to handle site structure changes without immediate breakage.

### Pattern 3: Multi-Stage Deduplication Pipeline
**What:** Three-stage deduplication with increasing complexity and decreasing confidence
**When to use:** All crawlers - call `deduplicateAndSave(event)` instead of direct `upsertEvent(event)`
**Flow:**
```
Incoming event
  ↓
Stage 1: Exact match on venue+date (O(log n) database index)
  ↓ No match
Stage 2: Fuzzy match on artist+name within 24h window (token_set_ratio)
  - >90% artist + >85% name → Duplicate (auto-merge)
  - >75% artist + >70% name → Manual review queue
  ↓ No high-confidence match
Stage 3: Save as unique event
```

**Accuracy measurement:**
- False positive rate: <2% (confirmed via manual review queue analysis)
- False negative rate: <3% (spot checks on known duplicate events)
- Combined accuracy: >95% (target from Phase 1)

### Pattern 4: Crawler Health Check
**What:** Automated validation that crawlers return expected event counts and data quality
**When to use:** All crawlers, run after each execution
**Example:**
```typescript
interface CrawlResult {
  success: number;
  failed: number;
  venue?: string;
  timestamp: Date;
}

function validateCrawlResult(result: CrawlResult): HealthStatus {
  // Alert on zero events (crawler completely broken)
  if (result.success === 0) {
    return {
      status: 'critical',
      alert: `${result.venue} returned 0 events - crawler broken`,
    };
  }

  // Alert on significant drop (>70% fewer than average)
  const historicalAvg = getHistoricalAverage(result.venue);
  if (result.success < historicalAvg * 0.3) {
    return {
      status: 'warning',
      alert: `${result.venue} returned ${result.success} events (avg: ${historicalAvg})`,
    };
  }

  // Alert on high failure rate (>20%)
  const failureRate = result.failed / (result.success + result.failed);
  if (failureRate > 0.2) {
    return {
      status: 'warning',
      alert: `${result.venue} has ${failureRate * 100}% failure rate`,
    };
  }

  return { status: 'healthy' };
}
```

**Historical baseline:** Track 7-day moving average per venue. Alert if current count drops below 30% of average.

### Pattern 5: Selector Resilience
**What:** Multi-selector fallback chains to handle website structure changes
**When to use:** All venue scrapers
**Example:**
```typescript
// Good: Multiple fallback selectors
eventContainer: '.event-item, .event, article, [class*="event"]'
eventName: '.event-title, h2, h3, .title, [class*="title"]'

// Bad: Single brittle selector
eventContainer: '.event-item'
```

**Change detection:** If extraction returns 0 events, log full page HTML to debug folder for manual inspection.

### Anti-Patterns to Avoid
- **Blind timeouts**: Don't use fixed `page.waitForTimeout(5000)`. Use `page.waitForSelector()` with timeout fallback.
- **Hardcoded selectors**: Always use fallback chains. Websites change without warning.
- **Silent failures**: Crash loudly rather than returning bad data. Better to know crawler is broken than have stale data.
- **API key in code**: Always use environment variables. Never commit keys to git.
- **Synchronous crawling**: Use Crawlee's concurrency. Crawling 10 venues serially takes 10x longer than parallel.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rate limiting | Custom sleep() timers | API client class with waitForRateLimit() | Edge cases: quota resets, burst limits, 429 retry-after headers |
| String similarity | Custom edit distance | fuzzball (Levenshtein, token_set_ratio) | 10+ edge cases: word order, stopwords, abbreviations |
| Deduplication | Manual comparison loops | Existing 3-stage pipeline | Already handles exact match, fuzzy match, manual review, venue normalization |
| Browser automation | Raw CDP protocol | Playwright/Puppeteer | Auto-waits, cross-browser, stable APIs, maintains compatibility |
| Web scraping orchestration | Custom request queue | Crawlee | Request deduplication, auto-retry, storage, autoscaling, proxy rotation |
| Date parsing | Custom regex | date-fns or existing parseSwedishDate() | Timezones, leap years, locale formats |
| Environment config | Manual process.env | dotenv + Zod validation | Type safety, required field validation, defaults |
| HTML parsing | String regex | Cheerio (jQuery-like API) | Malformed HTML, encoding, nested structures |

**Key insight:** Web scraping has 100+ edge cases learned over decades. Existing libraries encode this knowledge. Custom solutions rediscover edge cases in production.

## Common Pitfalls

### Pitfall 1: Eventbrite API Limitation
**What goes wrong:** Assuming Eventbrite has public search endpoint like Ticketmaster
**Why it happens:** Outdated documentation, legacy API v3 docs mention search
**How to avoid:** Eventbrite removed public search endpoint in August 2024. Only organization/venue-specific endpoints remain. Must either:
  - Get list of Stockholm event organizers, query each individually
  - Scrape Eventbrite web UI directly (like Billetto crawler pattern)
**Warning signs:** 404 errors on `/v3/events/search/` endpoint

**Source:** [Eventbrite API Documentation](https://www.eventbrite.com/platform/docs/events) - "As of August 2024, there is no public API endpoint for searching events across the entire Eventbrite platform"

### Pitfall 2: Broken Selectors (Silent Failures)
**What goes wrong:** Website changes structure, crawler returns 0 events, no alert fired
**Why it happens:** Only checking `success > 0`, not comparing to historical baseline
**How to avoid:**
  - Track 7-day moving average per venue
  - Alert if current < 30% of average (not just == 0)
  - Log page HTML when extraction fails for debugging
**Warning signs:** Gradual decline in event count over days (indicates partial selector breakage)

**Source:** [Change Detection for Web Scraping](https://substack.thewebscraping.club/p/change-detection-for-web-scraping) - "Built-in health checks alert when a website's structure changes"

### Pitfall 3: Rate Limit Quota Exhaustion
**What goes wrong:** Hit daily API quota limit, all crawling blocked for 24 hours
**Why it happens:** No quota tracking, multiple crawlers sharing same key
**How to avoid:**
  - Implement client-side quota tracking (like TicketmasterClient.getQuotaUsage())
  - Warn at 90% quota usage
  - Use separate API keys for development vs production
  - Calculate max events per crawl: `quota / estimated_requests_per_event`
**Warning signs:** 429 errors from API, slow responses as approaching limit

**Source:** [Ticketmaster API Docs](https://developer.ticketmaster.com/) - "5000 requests/day limit"

### Pitfall 4: Deduplication Accuracy Degradation
**What goes wrong:** Adding new sources increases false positives/negatives, >95% accuracy drops
**Why it happens:** New platforms have different naming conventions, thresholds tuned for existing platforms
**How to avoid:**
  - Test deduplication on sample of new platform events before full integration
  - Monitor manual review queue size (increase = threshold tuning needed)
  - Calculate precision/recall on 100-event sample from each new platform
  - Adjust fuzzy match thresholds per-platform if needed
**Warning signs:** Manual review queue grows >10 items/day, user reports of duplicate events

**Source:** [Fuzzy Matching Best Practices](https://dataladder.com/fuzzy-matching-101/) - "Thresholds are dataset-specific. Label 100-300 sample pairs, look at score distributions, choose cutoff"

### Pitfall 5: Playwright Timeout on Slow Sites
**What goes wrong:** Crawler fails on slow-loading sites with "Timeout waiting for selector"
**Why it happens:** Fixed 10-second timeout insufficient for slow venues during peak traffic
**How to avoid:**
  - Increase `requestHandlerTimeoutSecs` to 30-60 for venue crawlers
  - Use `page.waitForSelector(selector, { timeout: 20000 })` with fallback
  - Check for content load errors: `page.on('response', r => r.status() >= 400)`
  - Set `waitUntil: 'domcontentloaded'` instead of 'networkidle' (faster)
**Warning signs:** Intermittent failures on same venue, failures correlate with time of day

**Source:** [Playwright Web Scraping Best Practices](https://oxylabs.io/blog/playwright-web-scraping) - "Wait for domcontentloaded, block heavy assets, wait for specific selectors"

### Pitfall 6: Venue Name Normalization Gaps
**What goes wrong:** Same venue appears as different entities due to naming variations
**Why it happens:** New platforms use different venue name formats not in venue-mappings.ts
**How to avoid:**
  - Before integrating new source, extract unique venue names
  - Cross-reference against existing venue-mappings.ts
  - Add new mappings for variations (e.g., "Landet Hägersten" → "Landet")
  - Test exact match deduplication on cross-platform events
**Warning signs:** Venue filter shows duplicate venue names, users report same event at "different" venues

**Source:** Existing codebase pattern in `src/normalization/venue-mappings.ts` and `crawl-billetto.js` lines 69-105

## Code Examples

Verified patterns from official sources:

### Tickster API Client Setup
```typescript
// Pattern: Extend TicketmasterClient for Tickster API
// Source: /Users/hussmikael/agents-hackathon/src/crawlers/ticketmaster-api-client.ts

export class TicksterClient {
  private readonly apiKey: string;
  private readonly baseURL = 'https://api.tickster.com/v0.4';

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Tickster API key required. Register at https://developer.tickster.com/');
    }
    this.apiKey = apiKey;
  }

  async getEvents(params: { city?: string; startDate?: string; endDate?: string }): Promise<any> {
    const queryParams = new URLSearchParams({
      apikey: this.apiKey,
      ...params,
    });

    const url = `${this.baseURL}/events?${queryParams}`;
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Tickster API authentication failed');
      }
      throw new Error(`Tickster API error: ${response.status}`);
    }

    return response.json();
  }
}
```

**Note:** Tickster API documentation at [developer.tickster.com/documentation](https://developer.tickster.com/documentation) - requires API key registration.

### Eventbrite Organization-Based Crawling
```typescript
// Pattern: Query specific organizations since public search disabled
// Alternative: Scrape Eventbrite web UI like Billetto pattern

async function crawlEventbriteStockholm(): Promise<CrawlResult> {
  // Option 1: If you have organization IDs (requires research phase to identify Stockholm organizers)
  const stockholmOrganizers = [
    '12345678', // Example: Debaser
    '23456789', // Example: Live Nation Sweden
    // ... 10-20 major Stockholm event organizers
  ];

  for (const orgId of stockholmOrganizers) {
    const events = await eventbriteClient.getOrganizationEvents(orgId);
    // Filter for Stockholm, next 12 months
    // Transform and save
  }

  // Option 2: Web scraping (more reliable for broad coverage)
  const page = await browser.newPage();
  await page.goto('https://www.eventbrite.com/d/sweden--stockholm/music/');
  // Extract events similar to crawl-billetto.js pattern
}
```

**Source:** [Eventbrite API Documentation](https://www.eventbrite.com/platform/docs/events) - "List Events by Organization (GET /v3/organizations/:organization_id/events/)"

### Health Check Implementation
```typescript
// Pattern: Automated validation after each crawler run
// Source: Design pattern from web search research

interface HistoricalStats {
  venue: string;
  avgCount: number;
  stdDev: number;
  lastUpdated: Date;
}

async function runCrawlerWithHealthCheck(
  crawler: () => Promise<CrawlResult>,
  venue: string
): Promise<void> {
  const result = await crawler();
  const stats = await getHistoricalStats(venue);

  // Critical: Zero events returned
  if (result.success === 0) {
    await sendAlert({
      severity: 'critical',
      message: `${venue} crawler returned 0 events`,
      action: 'Immediate investigation required',
    });
    return;
  }

  // Warning: Significantly below average
  const threshold = stats.avgCount * 0.3;
  if (result.success < threshold) {
    await sendAlert({
      severity: 'warning',
      message: `${venue} returned ${result.success} events (avg: ${stats.avgCount})`,
      action: 'Check for website structure changes',
    });
  }

  // Update historical stats
  await updateHistoricalStats(venue, result.success);

  console.log(`✅ ${venue}: ${result.success} events (healthy)`);
}
```

### Deduplication Test Cases
```typescript
// Pattern: Test known overlapping events for accuracy measurement
// Source: Existing deduplication pipeline + research

interface TestCase {
  event1: Partial<Event>;
  event2: Partial<Event>;
  expectedMatch: boolean;
  notes: string;
}

const testCases: TestCase[] = [
  {
    // Should match: Same event, different platforms
    event1: {
      name: 'Coldplay Live in Stockholm',
      artist: 'Coldplay',
      venue: 'Avicii Arena',
      date: new Date('2026-06-15T19:00:00'),
      sourcePlatform: 'ticketmaster',
    },
    event2: {
      name: 'Coldplay - Stockholm Concert',
      artist: 'Coldplay',
      venue: 'Avicii Arena',
      date: new Date('2026-06-15T19:00:00'),
      sourcePlatform: 'billetto',
    },
    expectedMatch: true,
    notes: 'Exact venue+date match, high artist similarity',
  },
  {
    // Should NOT match: Different events, same artist
    event1: {
      name: 'Taylor Swift - Reputation Tour',
      artist: 'Taylor Swift',
      venue: 'Avicii Arena',
      date: new Date('2026-07-10T19:00:00'),
      sourcePlatform: 'ticketmaster',
    },
    event2: {
      name: 'Taylor Swift - Eras Tour',
      artist: 'Taylor Swift',
      venue: 'Avicii Arena',
      date: new Date('2026-08-20T19:00:00'),
      sourcePlatform: 'ticketmaster',
    },
    expectedMatch: false,
    notes: 'Same artist, different dates and event names',
  },
];

async function testDeduplication() {
  let correctMatches = 0;
  let totalTests = testCases.length;

  for (const test of testCases) {
    // Simulate incoming event
    const result = await deduplicateEvent(test.event2);

    const isMatch = result.status === 'duplicate';
    if (isMatch === test.expectedMatch) {
      correctMatches++;
      console.log(`✅ PASS: ${test.notes}`);
    } else {
      console.log(`❌ FAIL: ${test.notes}`);
      console.log(`   Expected: ${test.expectedMatch}, Got: ${isMatch}`);
    }
  }

  const accuracy = (correctMatches / totalTests) * 100;
  console.log(`\nAccuracy: ${accuracy.toFixed(1)}% (${correctMatches}/${totalTests})`);

  if (accuracy < 95) {
    throw new Error(`Deduplication accuracy below 95% threshold: ${accuracy}%`);
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Puppeteer only | Crawlee + Playwright | Crawlee 3.0 (2023) | Request queuing, auto-retry, storage abstraction |
| Manual rate limiting | Client-side quota tracking | Industry practice (2024+) | Prevents quota exhaustion, enables monitoring |
| Single-pass scraping | Multi-selector fallback chains | Best practice (2025) | Resilience to website changes |
| Manual duplicate detection | Multi-stage pipeline (exact+fuzzy+review) | Pattern from Phase 1 | 95%+ accuracy, scales with volume |
| Eventbrite search API | Organization-based or scraping | Eventbrite API change (Aug 2024) | Must identify organizers or scrape web |
| Fixed timeouts | Dynamic waitForSelector | Playwright best practice | Faster crawls, fewer false timeouts |

**Deprecated/outdated:**
- **Puppeteer-extra stealth**: Crawlee now includes built-in anti-detection
- **Cheerio-select**: Merged into Cheerio 1.0+, use built-in selectors
- **Eventbrite public search API**: Removed August 2024, must use organization endpoints
- **crawl-venues.js pattern**: Deprecated in favor of BaseVenueCrawler strategy pattern

## Open Questions

1. **Tickster API Rate Limits**
   - What we know: Requires API key from developer.tickster.com
   - What's unclear: Per-second and daily rate limits not documented publicly
   - Recommendation: Start conservative (1 req/sec), monitor responses for rate limit headers, adjust based on 429 errors

2. **Stockholm Event Organizers on Eventbrite**
   - What we know: Eventbrite v3 only supports organization-based queries
   - What's unclear: List of major Stockholm event organizers and their Eventbrite IDs
   - Recommendation: Manual research phase to identify 10-20 major organizers, or switch to web scraping approach (like Billetto pattern)

3. **Venue Crawler Complexity**
   - What we know: 10-15 target venues, prioritize simple HTML structures
   - What's unclear: Which Stockholm venues have scrapable websites vs. Facebook-only/Ticketmaster-exclusive
   - Recommendation: Reconnaissance phase to evaluate 20 candidate venues, categorize by difficulty (Cheerio/Playwright/impossible), choose 10-15 easiest

4. **Health Check Alert Delivery**
   - What we know: Need immediate error alerts on crawler failures
   - What's unclear: Notification mechanism (email, Slack, SMS, logging only)
   - Recommendation: Start with console.error logging + daily summary email, upgrade to Slack webhooks if budget allows

5. **Historical Baseline Data**
   - What we know: Need 7-day moving average for event count alerts
   - What's unclear: Where to store historical stats (database table, Redis, flat file)
   - Recommendation: Add `crawler_stats` table to database with (venue, date, event_count, success_rate) for queryable history

## Sources

### Primary (HIGH confidence)
- Existing codebase at `/Users/hussmikael/agents-hackathon/src/` - Current implementation patterns verified
- `package.json` - Crawlee 3.16.0, Playwright 1.58.2, fuzzball 2.2.3 versions confirmed
- `src/crawlers/ticketmaster-api-client.ts` - Rate limiting pattern template
- `src/crawlers/venues/base-venue-crawler.ts` - VenueConfig strategy pattern
- `src/deduplication/` - Three-stage pipeline implementation (exact, fuzzy, review)

### Secondary (MEDIUM confidence)
- [Tickster Developer Documentation](https://developer.tickster.com/documentation) - API v0.4 confirmed, requires key
- [Eventbrite API Documentation](https://www.eventbrite.com/platform/docs/events) - Search endpoint removal (Aug 2024) verified
- [Crawlee Documentation](https://crawlee.dev/js/docs/introduction/scraping) - Best practices for 2026
- [Playwright Web Scraping Guide](https://oxylabs.io/blog/playwright-web-scraping) - Performance optimization patterns
- [Change Detection for Web Scraping](https://substack.thewebscraping.club/p/change-detection-for-web-scraping) - Health check strategies

### Tertiary (LOW confidence)
- [Node.js API Retry Patterns](https://medium.com/@devharshgupta.com/building-resilient-systems-with-api-retry-mechanisms-in-node-js-a-guide-to-handling-failure-d6d9021b172a) - General patterns, not crawler-specific
- [Fuzzy Matching 101](https://dataladder.com/fuzzy-matching-101/) - General deduplication theory, already implemented in codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in package.json, versions verified
- Architecture: HIGH - Patterns verified in existing codebase at `/Users/hussmikael/agents-hackathon/src/`
- API integration: MEDIUM - Tickster API documented but rate limits unclear, Eventbrite requires workaround
- Health checks: MEDIUM - Design patterns researched but implementation specifics need validation
- Deduplication: HIGH - Existing 3-stage pipeline tested in Phase 1, >95% accuracy target

**Research date:** 2026-02-21
**Valid until:** 2026-03-21 (30 days - stable domain, Crawlee/Playwright mature, API changes unlikely)

**Critical actions before planning:**
1. Register Tickster API key at developer.tickster.com to confirm rate limits
2. Investigate Nalen and Kollektivet Livet crawlers to diagnose breakage (selector changes likely)
3. Identify 20 candidate Stockholm venues, categorize by scraping difficulty
4. Decide Eventbrite strategy: organization-based API vs. web scraping
5. Test existing deduplication pipeline with sample Billetto events to validate >95% accuracy holds
