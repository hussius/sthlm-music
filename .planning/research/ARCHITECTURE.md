# Architecture Research

**Domain:** Event Aggregation Platform (Music Events Calendar)
**Researched:** 2026-02-20
**Confidence:** MEDIUM

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │  Calendar   │  │   Filters    │  │  Search UI   │        │
│  │     UI      │  │     UI       │  │              │        │
│  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘        │
│         │                │                  │                │
│         └────────────────┴──────────────────┘                │
│                          │                                   │
├──────────────────────────┴───────────────────────────────────┤
│                      API LAYER                               │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  REST/GraphQL API (Event queries, filtering)         │    │
│  │  - GET /events?date=...&genre=...&venue=...          │    │
│  │  - Pagination, sorting, aggregation                  │    │
│  └────────────────┬─────────────────────────────────────┘    │
│                   │                                          │
├───────────────────┴──────────────────────────────────────────┤
│                   BUSINESS LOGIC LAYER                       │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐    │
│  │ Deduplication│  │  Enrichment  │  │  Normalization  │    │
│  │   Service    │  │   Service    │  │    Service      │    │
│  └──────┬───────┘  └──────┬───────┘  └────────┬────────┘    │
│         └──────────────────┴──────────────────┬┘             │
│                                               │              │
├───────────────────────────────────────────────┴──────────────┤
│                   DATA PIPELINE LAYER                        │
│  ┌───────────────────────────────────────────────────────┐   │
│  │              Scheduler (Cron/Queue-based)             │   │
│  └─────────┬───────────────────┬────────────┬────────────┘   │
│            │                   │            │                │
│  ┌─────────▼────┐   ┌──────────▼─────┐  ┌──▼────────────┐   │
│  │   Scraper    │   │    Scraper     │  │   Scraper     │   │
│  │ (Platform A) │   │  (Platform B)  │  │ (Platform C)  │   │
│  └──────┬───────┘   └────────┬───────┘  └───┬───────────┘   │
│         └──────────────┬──────┴──────────────┘               │
│                        │                                     │
├────────────────────────┴─────────────────────────────────────┤
│                   STORAGE LAYER                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │              Database (PostgreSQL/MongoDB)           │    │
│  │  - events (normalized: id, title, date, venue...)   │    │
│  │  - venues (deduplicated)                             │    │
│  │  - artists (deduplicated)                            │    │
│  │  - scrape_jobs (tracking, status, last_run)          │    │
│  └──────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Calendar UI** | Display events in calendar format, handle user interactions | React/Vue with FullCalendar, BigCalendar, or custom grid |
| **Filter UI** | Date range, genre, venue, artist filters with instant/deferred dispatch | Controlled components with debounced API calls |
| **REST/GraphQL API** | Serve filtered event data, pagination, sorting | Express/Fastify + endpoint handlers |
| **Deduplication Service** | Match events across platforms using fuzzy matching on title+date+venue | Hash-based or similarity algorithm (Levenshtein distance) |
| **Scraper (per platform)** | Extract event data from ticket platform HTML/API | Playwright/Puppeteer for JS-rendered sites, Axios for APIs |
| **Scheduler** | Trigger daily scrapes, retry failed jobs, queue management | Cron for simple, Celery/BullMQ for production |
| **Database** | Store events, venues, artists, scraping metadata | PostgreSQL (relational, JSONB support) or MongoDB |

## Recommended Project Structure

```
src/
├── scrapers/              # Web scraping layer
│   ├── base/              # Base scraper class, common utilities
│   │   ├── BaseScraper.ts # Abstract scraper interface
│   │   └── antibot.ts     # Proxy rotation, user-agent handling
│   ├── platforms/         # Platform-specific scrapers
│   │   ├── ticketmaster.ts
│   │   ├── songkick.ts
│   │   └── bandsintown.ts
│   └── scheduler.ts       # Scrape job orchestration
├── pipeline/              # Data processing layer
│   ├── deduplicator.ts    # Event deduplication logic
│   ├── enricher.ts        # Add missing metadata (genres, coordinates)
│   └── normalizer.ts      # Standardize date/venue/artist formats
├── api/                   # API layer
│   ├── routes/            # REST endpoints
│   │   ├── events.ts      # GET /events, /events/:id
│   │   └── health.ts      # System health checks
│   ├── middleware/        # CORS, rate limiting, validation
│   └── server.ts          # Express/Fastify app initialization
├── models/                # Data models & database access
│   ├── Event.ts           # Event schema & queries
│   ├── Venue.ts           # Venue schema & queries
│   ├── Artist.ts          # Artist schema & queries
│   └── ScrapeJob.ts       # Job tracking schema
├── ui/                    # Frontend (if monorepo)
│   ├── components/        # Calendar, filters, event cards
│   ├── hooks/             # Data fetching, filter state
│   └── pages/             # Calendar view, event details
└── utils/                 # Shared utilities
    ├── logger.ts          # Structured logging
    └── config.ts          # Environment configuration
```

### Structure Rationale

- **scrapers/:** Isolated scraping logic with platform-specific implementations. Base class enforces common patterns (rate limiting, error handling, anti-bot measures).
- **pipeline/:** Separates raw scraping from data quality. Allows independent testing and iteration on deduplication algorithms.
- **api/:** Clean separation from business logic. Easy to add GraphQL or gRPC later.
- **models/:** Database access centralized. Supports migration to different ORM/query builder without touching business logic.
- **ui/:** Optional monorepo structure. Can be separate repo with API client package.

## Architectural Patterns

### Pattern 1: Modular Monolith for Small Teams

**What:** Single deployable application with well-defined internal module boundaries (scrapers, pipeline, API, UI as separate modules).

**When to use:** Small to medium teams (fewer than 10 developers). Research shows microservices benefits only appear with teams exceeding 10-15 developers; smaller teams experience net productivity losses from coordination overhead.

**Trade-offs:**
- **Pros:** Faster development, simpler deployment, easier debugging, lower infrastructure costs, no network latency between modules.
- **Cons:** Entire app redeploys on any change, modules can become tightly coupled without discipline, harder to scale individual components independently.

**Example:**
```typescript
// Single server.ts with modular imports
import { startScheduler } from './scrapers/scheduler';
import { createApiServer } from './api/server';
import { initDatabase } from './models';

async function bootstrap() {
  await initDatabase();
  startScheduler(); // Background scraping
  createApiServer(); // API endpoints
}

bootstrap();
```

### Pattern 2: Event-Driven Scraping (vs Static Cron)

**What:** Trigger scrapers only when needed (daily schedule, webhook from platform, manual trigger) using message queues instead of hardcoded cron jobs.

**When to use:** Production systems where scraping scales beyond simple daily runs. Event-driven pipelines eliminate redundant crawls and enable real-time responses.

**Trade-offs:**
- **Pros:** Dynamic scheduling, automatic retries, distributed workloads, better failure isolation, scales horizontally.
- **Cons:** More infrastructure (Redis/RabbitMQ), increased complexity, harder to debug job flow.

**Example:**
```typescript
// Using BullMQ for job queue
import { Queue, Worker } from 'bullmq';

const scrapeQueue = new Queue('scraping-jobs');

// Add job
await scrapeQueue.add('scrape-ticketmaster', { platform: 'ticketmaster' });

// Worker processes job
const worker = new Worker('scraping-jobs', async (job) => {
  const scraper = scraperFactory.create(job.data.platform);
  return await scraper.scrape();
});
```

### Pattern 3: Hash-Based Deduplication with Time Windows

**What:** Generate unique hashes from event attributes (normalized title + date + venue) to detect duplicates across platforms. Use time windows to handle slight date/time variations.

**When to use:** Always for event aggregation. Events from multiple platforms need deterministic matching.

**Trade-offs:**
- **Pros:** Fast lookups (O(1) hash comparison), handles exact duplicates perfectly, works across platforms.
- **Cons:** Misses near-duplicates with typos, sensitive to normalization quality, false negatives if venues spelled differently.

**Example:**
```typescript
import crypto from 'crypto';

function generateEventHash(event: RawEvent): string {
  const normalized = {
    title: event.title.toLowerCase().trim(),
    date: event.date.toISOString().split('T')[0], // Date only
    venue: event.venue.toLowerCase().replace(/[^a-z0-9]/g, '')
  };

  const payload = `${normalized.title}|${normalized.date}|${normalized.venue}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

// In deduplicator
const hash = generateEventHash(scrapedEvent);
const existing = await db.events.findOne({ hash });
if (existing) {
  // Merge platform sources instead of creating duplicate
  await db.events.update({ hash }, {
    $addToSet: { sources: scrapedEvent.platform }
  });
} else {
  await db.events.insert({ ...scrapedEvent, hash });
}
```

### Pattern 4: API-Level Filtering (Server-Side)

**What:** Filter events at database query level, not in-memory after fetching all events. API accepts filter parameters and constructs efficient database queries.

**When to use:** Always for production. Client-side filtering doesn't scale beyond small datasets.

**Trade-offs:**
- **Pros:** Reduces network payload, faster response times, supports pagination, database indexes optimize queries.
- **Cons:** More complex API logic, requires proper indexing strategy, filter parameter validation needed.

**Example:**
```typescript
// API endpoint with filters
app.get('/events', async (req, res) => {
  const { startDate, endDate, genre, venue, artist } = req.query;

  const query: any = {};
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }
  if (genre) query.genre = { $in: genre.split(',') };
  if (venue) query.venue = { $regex: venue, $options: 'i' };
  if (artist) query.artists = { $in: artist.split(',') };

  const events = await db.events.find(query)
    .sort({ date: 1 })
    .limit(100);

  res.json({ events, count: events.length });
});
```

### Pattern 5: Denormalized Event Schema for Read Performance

**What:** Store frequently accessed data (venue name, artist names) directly in event document instead of normalizing into separate tables. Keep normalized tables for management but denormalize for API reads.

**When to use:** Read-heavy workloads (event calendar = 99% reads). Stockholm calendar users browse/filter far more than platforms add new events.

**Trade-offs:**
- **Pros:** Single query instead of joins, faster API responses, simpler frontend data structure.
- **Cons:** Data duplication, updates require cascading changes, larger storage footprint.

**Example:**
```typescript
// Normalized (slower reads, requires joins)
{
  id: 1,
  title: "Concert",
  venueId: 42,
  artistIds: [101, 102]
}

// Denormalized (faster reads, no joins)
{
  id: 1,
  title: "Concert",
  venue: { id: 42, name: "Venue Name", address: "..." },
  artists: [
    { id: 101, name: "Artist 1", genre: "Rock" },
    { id: 102, name: "Artist 2", genre: "Jazz" }
  ],
  date: "2026-03-15",
  genre: ["Rock", "Jazz"] // Pre-computed from artists
}
```

## Data Flow

### Scraping to Storage Flow

```
[Daily Scheduler Trigger]
    ↓
[Scrape Queue] → Enqueue 3 jobs (Ticketmaster, Songkick, Bandsintown)
    ↓
[Scraper Workers] → Parallel execution with retry logic
    ↓ (raw HTML/JSON)
[Parse & Extract] → Transform to common event format
    ↓ (RawEvent[])
[Normalizer] → Standardize dates, venues, artist names
    ↓ (NormalizedEvent[])
[Deduplicator] → Generate hashes, detect duplicates
    ↓ (DeduplicatedEvent[])
[Enricher] → Add missing genres, geocode venues (optional)
    ↓ (EnrichedEvent[])
[Database Insert/Update] → Upsert events, track scrape job status
    ↓
[Scrape Job Complete] → Log success/failure, update last_run timestamp
```

### User Request Flow

```
[User Selects Filters] → Date: March 2026, Genre: Rock, Venue: Debaser
    ↓
[Frontend] → Debounced API request (300ms delay)
    ↓
[API: GET /events?startDate=2026-03-01&endDate=2026-03-31&genre=Rock&venue=Debaser]
    ↓
[Query Builder] → Build SQL/Mongo query with filters + indexes
    ↓
[Database Query] → Return matching events (denormalized documents)
    ↓
[API Response] → JSON: { events: [...], count: 42, page: 1 }
    ↓
[Frontend] → Update calendar UI with filtered events
    ↓
[User Sees Results] → Calendar grid shows 42 rock concerts at Debaser in March
```

### State Management (Frontend)

```
[Filter State]
    ↓ (onChange)
[Debounced API Call] → Wait 300ms for user to finish typing
    ↓
[Fetch Events] → GET /events with filters
    ↓ (response)
[Update Event State] → Store in React state or cache
    ↓
[Calendar Renders] → Display events in grid/list view
```

### Key Data Flows

1. **Scrape Orchestration:** Scheduler triggers workers → Workers scrape concurrently → Results flow through pipeline (normalize → dedupe → enrich) → Database persists final events.

2. **Real-Time Filtering:** User changes filters → Debounced API request → Database query with indexes → Fast response (<200ms) → UI updates immediately.

3. **Data Freshness:** Daily scrapes update events → New events inserted, changed events updated → Users always see current data (24-hour freshness guarantee).

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| **0-1k users** | Modular monolith is perfect. Single server (API + scheduler + DB), simple cron jobs, in-memory caching. PostgreSQL on single instance handles this easily. Deploy to single cloud VM or Heroku dyno. |
| **1k-10k users** | Add Redis for caching filtered results (cache popular filter combinations). Move scrapers to separate worker process. Add database read replica for API queries. Use connection pooling. Deploy API and workers separately. Add CDN for static assets. |
| **10k-100k users** | Implement proper job queue (BullMQ/RabbitMQ) for scraping. Horizontal scaling of API servers behind load balancer. Database indexing critical (compound indexes on date+genre+venue). Consider PostgreSQL partitioning by date. Separate scraper workers on dedicated instances. Add full-text search (Elasticsearch/Meilisearch) for artist/venue search. |
| **100k+ users** | Split into microservices (scraping service, API service, search service). Database sharding if needed. Event streaming (Kafka) between services. Consider caching layer (Varnish/Cloudflare). Scraper fleet with distributed coordination. Multiple database replicas for read scaling. Geographic distribution if international. |

### Scaling Priorities

1. **First bottleneck (1k-10k users):** Database queries under heavy filtering. **Fix:** Add compound indexes on (date, genre, venue). Cache popular filter combinations in Redis with 15-minute TTL. Enable query result pagination.

2. **Second bottleneck (10k-100k users):** API server CPU under high request volume. **Fix:** Horizontal scaling behind load balancer. Deploy 3-5 API instances. Use connection pooling to database (max 20 connections per instance). Add response compression (gzip).

3. **Third bottleneck (scraping reliability):** Single scraper process fails and blocks all platforms. **Fix:** Migrate to job queue with separate workers per platform. If Ticketmaster scraper crashes, Songkick/Bandsintown continue unaffected. Add exponential backoff retry logic.

## Anti-Patterns

### Anti-Pattern 1: Client-Side Filtering on Full Dataset

**What people do:** Fetch all events (`GET /events`) to frontend, then filter in JavaScript using `.filter()` on date/genre/venue.

**Why it's wrong:**
- Transfers huge payload (thousands of events) on every page load.
- Slow initial load (3-5 seconds vs 300ms with server-side filtering).
- Doesn't scale beyond small datasets (breaks at 1k+ events).
- Wastes bandwidth and mobile data.

**Do this instead:** API-level filtering with query parameters. Let database indexes do the work. Frontend requests only the data it needs: `GET /events?startDate=2026-03&genre=Rock&limit=100`.

### Anti-Pattern 2: Scraping Without Anti-Bot Measures

**What people do:** Use basic HTTP requests with default user-agent and same IP for all scrapes.

**Why it's wrong:**
- Ticket platforms (especially Ticketmaster) actively block scrapers using fingerprinting, rate limiting, and behavioral analysis.
- Basic scrapers get banned within hours or days.
- Leads to constant IP rotation costs and scraper rewrites.

**Do this instead:** Implement anti-bot patterns from day one:
- Rotate user-agents (mimic real browsers: Chrome, Firefox, Safari).
- Use residential proxies or proxy rotation service.
- Add random delays between requests (2-5 seconds).
- Respect robots.txt and rate limits.
- Use headless browsers (Playwright/Puppeteer) for JavaScript-heavy sites.
- Implement exponential backoff on failures.

### Anti-Pattern 3: Scraping on Every API Request

**What people do:** Trigger scraper when user loads calendar to ensure "real-time" data.

**Why it's wrong:**
- Each page load takes 10-30 seconds (waiting for scrapes to complete).
- Hammers ticket platforms with requests, causing bans.
- Terrible user experience (no loading state works for 30 seconds).
- Platforms detect and block this pattern immediately.

**Do this instead:** Scheduled batch scraping (daily at 3 AM) with stored results. API serves from database. Data is fresh enough (24-hour staleness acceptable for event calendars). Add manual "refresh" trigger for admin if needed, but never on public user requests.

### Anti-Pattern 4: No Deduplication Strategy

**What people do:** Insert every scraped event into database without checking for duplicates. Hope platform IDs prevent duplicates.

**Why it's wrong:**
- Same concert appears 3 times (once per platform).
- Platforms use different IDs for same event (can't rely on their IDs).
- Venue names vary ("Debaser Strand" vs "Debaser Stockholm" vs "Debaser").
- User sees cluttered calendar with duplicates.

**Do this instead:** Implement hash-based deduplication with normalization (Pattern 3 above). Generate consistent hash from `lowercase(title) + date + normalized(venue)`. Store hash as unique index. On duplicate hash, merge platform sources instead of creating new event. Add fuzzy matching for near-duplicates if exact matching misses too many.

### Anti-Pattern 5: Over-Normalization for Read-Heavy Workload

**What people do:** Fully normalize database (events table, venues table, artists table, event_artists join table) following traditional RDBMS principles.

**Why it's wrong:**
- Every API request requires 3-4 table joins.
- Query complexity increases (JOIN performance degrades with scale).
- Frontend receives relational IDs, must make additional requests for venue/artist details.
- Premature optimization for data integrity that doesn't matter here (venues/artists rarely change).

**Do this instead:** Denormalize event schema for API reads (Pattern 5 above). Store venue object and artist array directly in event document. Keep normalized tables for admin/management if needed, but API serves denormalized view. This is a read-heavy workload (99% reads, 1% writes from scrapers). Optimize for reads.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| **Ticket Platforms (Ticketmaster, Songkick, Bandsintown)** | Web scraping with Playwright/Puppeteer | Use headless browsers for JS-rendered content. Implement proxy rotation. Respect rate limits (1 req/2-5 sec). Monitor for HTML structure changes. |
| **Proxy Service (BrightData, Oxylabs)** | HTTP proxy rotation | Essential for avoiding bans. Residential proxies preferred. Budget $50-200/month depending on scraping volume. |
| **Geocoding API (Google Maps, Mapbox)** | REST API for venue coordinates | Optional enrichment. Cache results (venues don't move). Free tier sufficient for Stockholm venues (<100 unique venues). |
| **Search Service (Meilisearch, Elasticsearch)** | Index events for full-text search | Not required for MVP. Add when basic filters insufficient. Sync events on insert/update. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| **Scrapers ↔ Pipeline** | Direct function calls (in-process) or Message Queue (BullMQ) | Start with in-process (simpler). Move to queue when scaling scrapers independently. |
| **Pipeline ↔ Database** | ORM (Prisma/TypeORM) or Query Builder (Kysely) | Use typed queries to prevent runtime errors. Connection pooling required. |
| **API ↔ Database** | ORM/Query Builder with read replicas | API reads from replica, scrapers write to primary. Reduces contention. |
| **Frontend ↔ API** | REST over HTTP with JSON | Add GraphQL later if complex nested queries needed. REST sufficient for MVP. |

## Build Order & Dependencies

### Phase 1: Core Data Pipeline (Backend Foundation)
**Dependencies:** None (greenfield)
**Build:**
1. Database schema (events, venues, artists, scrape_jobs tables)
2. Base scraper class with anti-bot utilities
3. Platform-specific scrapers (start with 1 platform as proof-of-concept)
4. Normalization service (standardize dates, venue names)
5. Deduplication service (hash generation, duplicate detection)
6. Simple cron scheduler (daily scrape trigger)

**Validation:** Successfully scrape 1 platform, store normalized/deduplicated events in database. Manually verify data quality.

### Phase 2: API Layer
**Dependencies:** Phase 1 complete (database populated)
**Build:**
1. REST API framework (Express/Fastify)
2. `/events` endpoint with filtering (date, genre, venue, artist)
3. Query builder with database indexes
4. Pagination support
5. Health check endpoint

**Validation:** API returns filtered events in <200ms. Test with various filter combinations. Verify pagination works.

### Phase 3: Frontend (Calendar UI)
**Dependencies:** Phase 2 complete (API serving data)
**Build:**
1. Calendar component (FullCalendar or custom grid)
2. Filter UI (date picker, dropdowns for genre/venue/artist)
3. Event detail modal/page
4. Debounced filter state management
5. Loading states and error handling

**Validation:** Users can browse events in calendar view, apply filters, see details. UI updates smoothly without lag.

### Phase 4: Production Hardening
**Dependencies:** Phase 3 complete (end-to-end working)
**Build:**
1. Migrate from cron to job queue (BullMQ)
2. Add remaining platform scrapers (scale from 1 to 3)
3. Implement retry logic and error monitoring
4. Add logging and observability (structured logs, alerts)
5. Deploy to production environment

**Validation:** All 3 platforms scrape reliably. Failures auto-retry. Team receives alerts on scraper issues.

### Critical Path
```
Database Schema → Scraper (1 platform) → Deduplication → API → Frontend → Job Queue → Remaining Scrapers
```

**Rationale:** Must prove data pipeline works (scrape → store → dedupe) before building API. Must have API serving data before building UI. Only scale to multiple platforms after single platform validated. This order minimizes rework and validates assumptions early.

## Sources

**Event Aggregation Architecture:**
- [Event Aggregator Pattern - Confluent](https://developer.confluent.io/patterns/stream-processing/event-aggregator/)
- [Event-Driven Architecture Patterns - Gravitee](https://www.gravitee.io/blog/event-driven-architecture-patterns)
- [Event-Driven Architecture 2026 - Estuary](https://estuary.dev/blog/event-driven-architecture/)

**Web Scraping Architecture:**
- [Zero to Production Scraping Pipeline - ScrapeGraph AI](https://scrapegraphai.com/blog/zero-to-production-scraping-pipeline)
- [Web Scraping Infrastructure - GroupBWT](https://groupbwt.com/blog/infrastructure-of-web-scraping/)
- [Web Scraping Best Practices 2026 - ScrapingBee](https://www.scrapingbee.com/blog/web-scraping-best-practices/)
- [Web Scraping Report 2026 - PromptCloud](https://www.promptcloud.com/blog/state-of-web-scraping-2026-report/)
- [Large-Scale Web Scraping - ScrapeHero](https://www.scrapehero.com/how-to-build-and-run-scrapers-on-a-large-scale/)

**Calendar System Architecture:**
- [Google Calendar Backend Architecture - Medium](https://jinlow.medium.com/low-level-design-deep-dive-building-google-calendars-backend-architecture-46177494fc9b)
- [Calendar Server Architecture - Oracle](https://docs.oracle.com/cd/E19396-01/819-0063/cs-architecture.html)
- [Frontend System Design: Google Calendar - Medium](https://medium.com/@shivambh28/frontend-system-design-design-google-calendar-d63004cd539a)

**Data Deduplication:**
- [Data Deduplication Strategies - Medium](https://medium.com/@roopa.kushtagi/data-deduplication-strategies-2256f643066e)
- [Deduplication in Distributed Systems - Architecture Weekly](https://www.architecture-weekly.com/p/deduplication-in-distributed-systems)
- [Event Sourcing Deduplication Patterns - Domain Centric](https://domaincentric.net/blog/event-sourcing-projection-patterns-deduplication-strategies)
- [BigQuery Streaming Deduplication - OneUptime](https://oneuptime.com/blog/post/2026-02-17-how-to-deduplicate-streaming-data-in-bigquery-using-merge-and-window-functions/view)

**Scraping Scheduler Patterns:**
- [Web Scraping Report 2026 - PromptCloud](https://www.promptcloud.com/blog/state-of-web-scraping-2026-report/)
- [Celery & RabbitMQ Scraper Scheduling - ScrapeOps](https://scrapeops.io/web-scraping-playbook/celery-rabbitmq-scraper-scheduling/)
- [Web Scraping Pipeline Scheduling - Medium](https://medium.com/@jonathanmondaut/creating-a-web-scraping-pipeline-scheduling-recurring-tasks-with-various-methods-c43fd4b44509)

**Anti-Bot Patterns:**
- [Modern Anti-Bot Systems and Bypass - Medium](https://python.plainenglish.io/modern-anti-bot-systems-and-how-to-bypass-them-4d28475522d1)
- [Bypass Bot Detection Methods - ZenRows](https://www.zenrows.com/blog/bypass-bot-detection)
- [Ultimate Guide to Web Scraping Antibot Systems 2025 - WebAutomation.io](https://webautomation.io/blog/ultimate-guide-to-web-scraping-antibot-and-blocking-systems-and-how-to-bypass-them/)

**Filtering Architecture:**
- [Frontend Filtering Architecture - Medium](https://medium.com/call-center-studio/from-chaos-to-order-engineering-a-unified-frontend-filtering-architecture-52e4b3d49dbd)
- [Google Calendar Frontend System Design - FrontendLead](https://frontendlead.com/system-design/design-google-calendar-frontend-system-design)

**Database Design:**
- [Event Data Normalization vs Denormalization - Confluent](https://developer.confluent.io/courses/event-design/normalization-vs-denormalization/)
- [Database Schema Design - ByteByteGo](https://blog.bytebytego.com/p/database-schema-design-simplified)
- [Denormalization in Databases - DataCamp](https://www.datacamp.com/tutorial/denormalization)

**Monolith vs Microservices:**
- [Monolith vs Microservices vs Modular Monoliths - ByteByteGo](https://blog.bytebytego.com/p/monolith-vs-microservices-vs-modular)
- [Why Teams Moving Back to Modular Monoliths 2026 - Medium](https://codingplainenglish.medium.com/why-teams-are-moving-back-from-microservices-to-modular-monoliths-in-2026-76a3eb7162b8)
- [Modular Monolith vs Microservices Guide - Binary Republik](https://blog.binaryrepublik.com/2026/02/modular-monolith-vs-microservices.html)
- [Monolith vs Microservices Decision Framework 2026 - Agile Soft Labs](https://www.agilesoftlabs.com/blog/2026/02/monolith-vs-microservices-decision)

**Change Data Capture:**
- [Change Data Capture Introduction - Estuary](https://estuary.dev/blog/the-complete-introduction-to-change-data-capture-cdc/)
- [What is CDC - Confluent](https://www.confluent.io/learn/change-data-capture/)
- [CDC Pipelines Implementation - OneUptime](https://oneuptime.com/blog/post/2026-02-02-change-data-capture-pipelines/view)

---
*Architecture research for: Stockholm Music Events Calendar*
*Researched: 2026-02-20*
*Confidence: MEDIUM (based on multiple web sources verified against industry patterns)*
