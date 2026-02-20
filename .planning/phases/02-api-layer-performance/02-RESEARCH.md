# Phase 2: API Layer & Performance - Research

**Researched:** 2026-02-20
**Domain:** Node.js REST API development with PostgreSQL query optimization
**Confidence:** HIGH

## Summary

Phase 2 builds a REST API layer that serves filtered event data with sub-200ms response times for any query combination. The phase inherits a PostgreSQL 17 database with Drizzle ORM, existing indexes on date/genre/artist/venue, and 10,000+ events capacity from Phase 1.

The primary technical challenge is maintaining sub-200ms response times across multiple filter dimensions (date range, genre, venue, artist/event name search) while handling 10,000+ events. This requires careful framework selection, query optimization, index strategy, and architecture decisions.

**Primary recommendation:** Use Fastify with Zod validation, implement cursor-based pagination, add GIN trigram indexes for text search, leverage existing B-tree indexes for filters, and structure routes using a layered controller-service-repository pattern. Avoid caching in v1 to reduce complexity—proper indexing and query optimization should achieve the 200ms target without caching.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FILT-01 | User can filter events by date range | PostgreSQL B-tree date index (already exists) + Drizzle `gte()`/`lte()` operators enable fast range queries |
| FILT-02 | User can filter events by genre | PostgreSQL B-tree genre index (already exists) + Drizzle `eq()` operator for exact match filtering |
| FILT-03 | User can filter events by venue | PostgreSQL unique index on venue+date (already exists) enables fast venue filtering via `eq()` operator |
| FILT-04 | User can search for events by artist/band name | Requires GIN trigram index with pg_trgm extension for ILIKE queries; Drizzle supports via `ilike()` operator |
| FILT-05 | User can search for events by event name | Requires GIN trigram index with pg_trgm extension for ILIKE queries; Drizzle supports via `ilike()` operator |
| PERF-01 | Search results return in under 200ms | Fastify delivers 2-3x better JSON performance than Express; proper indexing eliminates need for caching in v1 |
| PERF-02 | Page loads work smoothly with 10,000+ events | Cursor-based pagination delivers O(1) performance regardless of depth; offset pagination degrades 17x at scale |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Fastify | ^5.x | HTTP framework | 2-3x faster than Express; 46,318 req/s vs Express ~20,000 req/s (2026 benchmarks); JSON schema optimization |
| Zod | ^4.3.6 (already installed) | Request/response validation | TypeScript-first validation; integrates with Fastify via type providers; already used in Phase 1 |
| Drizzle ORM | 0.45.1 (already installed) | Database queries | Already established in Phase 1; supports advanced filtering with `eq()`, `gte()`, `ilike()` operators |
| PostgreSQL | 17 (already installed) | Database | Already established; GIN/GiST indexes for text search; B-tree for range/equality queries |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| fastify-type-provider-zod | ^2.x | Fastify-Zod integration | Connect Zod schemas to Fastify's validation system for type-safe routes |
| @fastify/cors | ^10.x | CORS handling | Enable cross-origin requests for frontend (Phase 3) |
| @fastify/helmet | ^12.x | Security headers | Production security best practice |
| autocannon | ^8.x | Load testing | Validate sub-200ms target under load; Node.js-native HTTP benchmarking |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Fastify | Express 5 | Express is more familiar but 2-3x slower; benchmarks show Fastify better for JSON APIs |
| Fastify | Hono | Hono shows 3x better performance in some benchmarks but optimized for serverless/edge; Fastify better for traditional Node.js server |
| Cursor pagination | Offset pagination | Offset simple but degrades 17x at scale (OFFSET 10000 takes seconds vs 10ms on page 1) |
| GIN trigram index | PostgreSQL full-text search | Full-text search requires tsvector columns + different query syntax; trigrams work with existing text columns + ILIKE |

**Installation:**
```bash
npm install fastify@^5 fastify-type-provider-zod@^2 @fastify/cors@^10 @fastify/helmet@^12 autocannon@^8
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── api/
│   ├── routes/          # Route definitions (thin)
│   │   ├── events.ts    # GET /api/events with filters
│   │   └── health.ts    # GET /health
│   ├── controllers/     # Request/response handling (medium)
│   │   └── events.controller.ts
│   ├── services/        # Business logic (thick)
│   │   └── events.service.ts
│   └── validators/      # Zod schemas
│       └── events.schema.ts
├── repositories/        # Database access (already exists from Phase 1)
│   └── events.repository.ts
├── db/                  # Database config (already exists)
│   ├── schema.ts
│   └── connection.ts
└── server.ts            # Fastify app initialization
```

### Pattern 1: Layered Architecture
**What:** Separate routes (web layer) → controllers (request handling) → services (business logic) → repositories (data access)
**When to use:** All routes
**Why:** Clean separation of concerns; testable; follows Node.js production standards

**Example:**
```typescript
// routes/events.ts - thin, declares endpoints only
export async function eventsRoutes(fastify: FastifyInstance) {
  fastify.get('/api/events', {
    schema: {
      querystring: EventFiltersSchema,
      response: { 200: EventsResponseSchema }
    }
  }, eventsController.getEvents);
}

// controllers/events.controller.ts - medium, handles req/res
export class EventsController {
  async getEvents(request: FastifyRequest, reply: FastifyReply) {
    const filters = EventFiltersSchema.parse(request.query);
    const result = await eventsService.findEvents(filters);
    return reply.send(result);
  }
}

// services/events.service.ts - thick, business logic
export class EventsService {
  async findEvents(filters: EventFilters) {
    // Validate date range
    // Apply default pagination
    // Call repository
    return eventsRepository.findByFilters(filters);
  }
}

// repositories/events.repository.ts - data access only
export class EventsRepository {
  async findByFilters(filters: EventFilters) {
    return db.select().from(events).where(...).limit(20);
  }
}
```

### Pattern 2: Query Building with Drizzle Operators
**What:** Use Drizzle's comparison operators (`eq()`, `gte()`, `lte()`, `ilike()`, `and()`, `or()`) instead of raw SQL
**When to use:** All database queries
**Why:** Type-safe, parameterized automatically (prevents SQL injection), optimized internally

**Example:**
```typescript
import { eq, gte, lte, ilike, and, or } from 'drizzle-orm';

// Build query conditionally
const conditions = [];

if (filters.genre) {
  conditions.push(eq(events.genre, filters.genre));
}

if (filters.dateFrom) {
  conditions.push(gte(events.date, filters.dateFrom));
}

if (filters.dateTo) {
  conditions.push(lte(events.date, filters.dateTo));
}

if (filters.artistSearch) {
  conditions.push(ilike(events.artist, `%${filters.artistSearch}%`));
}

const query = db
  .select()
  .from(events)
  .where(and(...conditions))
  .orderBy(events.date)
  .limit(filters.limit);
```

### Pattern 3: Cursor-Based Pagination
**What:** Use unique position markers (e.g., event ID + date) instead of OFFSET
**When to use:** All list endpoints that paginate
**Why:** O(1) performance at any depth; offset degrades 17x when accessing deep pages

**Example:**
```typescript
// First page request: GET /api/events?limit=20
// Response includes cursor: { events: [...], nextCursor: "2024-03-15T19:00:00Z_uuid" }

// Next page: GET /api/events?cursor=2024-03-15T19:00:00Z_uuid&limit=20
const query = db
  .select()
  .from(events)
  .where(
    cursor
      ? or(
          gt(events.date, cursorDate),
          and(eq(events.date, cursorDate), gt(events.id, cursorId))
        )
      : undefined
  )
  .orderBy(events.date, events.id)
  .limit(filters.limit + 1); // Fetch +1 to know if more exist
```

### Pattern 4: Fastify with Type Providers
**What:** Connect Zod schemas to Fastify for runtime validation + TypeScript inference
**When to use:** All routes
**Why:** Single source of truth for validation; automatic type inference; no duplicate type definitions

**Example:**
```typescript
import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

const app = Fastify().withTypeProvider<ZodTypeProvider>();

// Set Zod as validator/serializer
app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

// Define schema once
const EventFiltersSchema = z.object({
  genre: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  artistSearch: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.number().min(1).max(100).default(20)
});

// Fastify infers types automatically
app.get('/api/events', {
  schema: {
    querystring: EventFiltersSchema,
    response: {
      200: z.object({
        events: z.array(EventSchema),
        nextCursor: z.string().nullable()
      })
    }
  }
}, async (request, reply) => {
  // request.query is fully typed as z.infer<typeof EventFiltersSchema>
  const { genre, dateFrom } = request.query;
  // ...
});
```

### Anti-Patterns to Avoid
- **Passing entire `req` object to services:** Extract only needed data in controller, pass primitive values/DTOs to services
- **Business logic in controllers:** Controllers should only handle HTTP concerns (parse request, call service, format response)
- **Using `SELECT *`:** Always select only needed columns to reduce data transfer
- **Forgetting to use operators:** Writing `where(table.column = value)` instead of `where(eq(table.column, value))` breaks queries
- **Offset pagination for large datasets:** Performance degrades linearly; use cursor-based instead

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Request validation | Manual type checking, throwing errors | Zod + Fastify type provider | Handles validation, coercion, error messages, TypeScript inference; already installed |
| Connection pooling | Custom connection manager | Drizzle's built-in pool (already configured) | Handles lifecycle, timeouts, recycling; set `max: 10` in Phase 1 |
| JSON serialization | `JSON.stringify()` loops | Fastify's automatic serialization | 2-3x faster with JSON schema; security via whitelisting fields |
| Text search | String.includes(), regex in Node.js | PostgreSQL GIN trigram indexes | Database-level filtering is orders of magnitude faster; indexes enable sub-ms lookups |
| Pagination | Manual OFFSET logic | Cursor-based with Drizzle operators | Prevents off-by-one errors, handles edge cases, consistent performance |
| API documentation | Manual OpenAPI writing | Generate from Zod schemas | Single source of truth; schemas are already required for validation |

**Key insight:** For sub-200ms response times, push computation to PostgreSQL (indexed queries) rather than pulling data into Node.js for filtering. Database engines are optimized for these operations; application code is not.

## Common Pitfalls

### Pitfall 1: N+1 Query Problem
**What goes wrong:** Fetching events in one query, then looping to fetch related data (e.g., ticket sources) in separate queries
**Why it happens:** ORMs make it easy to access relations without realizing each access triggers a query
**How to avoid:**
- Drizzle doesn't have implicit relation loading (good!)
- Use `$inferSelect` types and JSONB for ticket sources (already done in Phase 1 schema)
- If you add relations later, always use explicit eager loading
**Warning signs:** Response time increases linearly with result count; database connection pool exhaustion

### Pitfall 2: Missing Indexes for Text Search
**What goes wrong:** `ILIKE '%search%'` queries on artist/event name trigger full table scans, taking seconds on 10,000+ rows
**Why it happens:** B-tree indexes can't optimize leading wildcard patterns
**How to avoid:**
- Install `pg_trgm` extension: `CREATE EXTENSION pg_trgm;`
- Create GIN trigram indexes on artist and name columns
- GIN index allows fast ILIKE searches regardless of wildcard position
**Warning signs:** Queries with `artistSearch` or `eventSearch` take >200ms; `EXPLAIN ANALYZE` shows Seq Scan

### Pitfall 3: Forgetting Connection Pooling Config
**What goes wrong:** App crashes under load with "too many connections" or "connection timeout" errors
**Why it happens:** Default pool settings may not match production workload
**How to avoid:**
- Set `max: 10` connections (already done in Phase 1)
- Set `idleTimeoutMillis: 30000` (30 seconds)
- Set `connectionTimeoutMillis: 5000` (don't wait forever)
- Set `maxUses: 7500` to prevent memory leaks in long-running processes
**Warning signs:** Intermittent connection errors under load; slow response times during traffic spikes

### Pitfall 4: Building Filters with String Concatenation
**What goes wrong:** SQL injection vulnerabilities; TypeScript can't catch errors
**Why it happens:** Temptation to build dynamic WHERE clauses with template strings
**How to avoid:**
- Always use Drizzle operators: `eq()`, `gte()`, `lte()`, `ilike()`
- Build array of conditions, combine with `and()` or `or()`
- Drizzle automatically parameterizes values
**Warning signs:** Using template strings in WHERE clauses; TypeScript errors about string types

### Pitfall 5: Not Testing at Scale
**What goes wrong:** App performs well with 100 events in development but fails with 10,000+ in production
**Why it happens:** Index performance only matters at scale; small datasets fit in memory
**How to avoid:**
- Seed database with 10,000+ test events before testing
- Use `autocannon` to load test: `autocannon -c 100 -d 30 http://localhost:3000/api/events`
- Run `EXPLAIN ANALYZE` on queries to verify index usage
- Monitor response times at p50, p95, p99 percentiles
**Warning signs:** Works in dev but slow in production; inconsistent response times

### Pitfall 6: Over-Fetching Data
**What goes wrong:** Selecting all columns when only a few are needed; fetching 100 events when UI shows 20
**Why it happens:** Convenience of `SELECT *` or large default page sizes
**How to avoid:**
- Always specify columns in Drizzle: `.select({ id: events.id, name: events.name })`
- Default page size: 20 items, max: 100
- Use projection to exclude large JSONB fields when not needed
**Warning signs:** Network payload larger than expected; high database bandwidth usage

## Code Examples

Verified patterns from official sources:

### Fastify Server Initialization
```typescript
// Source: https://fastify.dev/docs/latest/Guides/Getting-Started/
import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';

export async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info'
    }
  }).withTypeProvider<ZodTypeProvider>();

  // Security
  await fastify.register(helmet);
  await fastify.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000'
  });

  // Zod validation
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);

  // Routes
  await fastify.register(eventsRoutes);
  await fastify.register(healthRoutes);

  return fastify;
}

// Start server
const server = await buildServer();
await server.listen({ port: 3000, host: '0.0.0.0' });
```

### Drizzle Query with Multiple Filters
```typescript
// Source: https://orm.drizzle.team/docs/select
import { eq, gte, lte, ilike, and, or, gt } from 'drizzle-orm';
import { events } from './db/schema';
import { db } from './db/connection';

export async function findEvents(filters: EventFilters) {
  const conditions = [];

  // Genre filter (exact match, uses B-tree index)
  if (filters.genre) {
    conditions.push(eq(events.genre, filters.genre));
  }

  // Date range filter (uses B-tree index)
  if (filters.dateFrom) {
    conditions.push(gte(events.date, new Date(filters.dateFrom)));
  }
  if (filters.dateTo) {
    conditions.push(lte(events.date, new Date(filters.dateTo)));
  }

  // Venue filter (exact match, uses unique index)
  if (filters.venue) {
    conditions.push(eq(events.venue, filters.venue));
  }

  // Artist search (uses GIN trigram index)
  if (filters.artistSearch) {
    conditions.push(ilike(events.artist, `%${filters.artistSearch}%`));
  }

  // Event name search (uses GIN trigram index)
  if (filters.eventSearch) {
    conditions.push(ilike(events.name, `%${filters.eventSearch}%`));
  }

  // Cursor pagination
  if (filters.cursor) {
    const [cursorDate, cursorId] = parseCursor(filters.cursor);
    conditions.push(
      or(
        gt(events.date, cursorDate),
        and(eq(events.date, cursorDate), gt(events.id, cursorId))
      )
    );
  }

  // Execute query
  const results = await db
    .select({
      id: events.id,
      name: events.name,
      artist: events.artist,
      venue: events.venue,
      date: events.date,
      time: events.time,
      genre: events.genre,
      ticketSources: events.ticketSources,
      price: events.price
    })
    .from(events)
    .where(and(...conditions))
    .orderBy(events.date, events.id)
    .limit(filters.limit + 1); // Fetch +1 to check if more exist

  // Build response with nextCursor
  const hasMore = results.length > filters.limit;
  const items = hasMore ? results.slice(0, -1) : results;
  const nextCursor = hasMore
    ? buildCursor(items[items.length - 1].date, items[items.length - 1].id)
    : null;

  return { events: items, nextCursor };
}
```

### GIN Trigram Index Migration
```sql
-- Source: https://www.postgresql.org/docs/current/pgtrgm.html
-- Enable pg_trgm extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN trigram indexes for text search
-- GIN is preferred over GiST for read-heavy workloads
CREATE INDEX CONCURRENTLY idx_events_artist_trgm ON events USING GIN (artist gin_trgm_ops);
CREATE INDEX CONCURRENTLY idx_events_name_trgm ON events USING GIN (name gin_trgm_ops);

-- Verify index usage
EXPLAIN ANALYZE
SELECT * FROM events
WHERE artist ILIKE '%metallica%';
-- Should show "Bitmap Index Scan using idx_events_artist_trgm"
```

### Response Time Monitoring Middleware
```typescript
// Source: https://nodejs.org/api/perf_hooks.html
import { performance } from 'perf_hooks';

export async function responseTimePlugin(fastify: FastifyInstance) {
  fastify.addHook('onRequest', async (request, reply) => {
    request.startTime = performance.now();
  });

  fastify.addHook('onResponse', async (request, reply) => {
    const duration = performance.now() - request.startTime;

    // Log slow requests (>200ms target)
    if (duration > 200) {
      fastify.log.warn({
        method: request.method,
        url: request.url,
        duration: `${duration.toFixed(2)}ms`,
        statusCode: reply.statusCode
      }, 'Slow request detected');
    }

    // Add header for debugging
    reply.header('X-Response-Time', `${duration.toFixed(2)}ms`);
  });
}
```

### Load Testing with Autocannon
```typescript
// Source: https://github.com/mcollina/autocannon
import autocannon from 'autocannon';

const result = await autocannon({
  url: 'http://localhost:3000/api/events',
  connections: 100, // Concurrent connections
  duration: 30, // Test duration in seconds
  pipelining: 1,
  title: 'Events API Load Test',
  requests: [
    {
      method: 'GET',
      path: '/api/events?genre=rock&limit=20'
    },
    {
      method: 'GET',
      path: '/api/events?dateFrom=2024-03-01&dateTo=2024-03-31'
    },
    {
      method: 'GET',
      path: '/api/events?artistSearch=metallica'
    }
  ]
});

console.log(autocannon.printResult(result));
// Target: avg latency < 200ms, p99 < 500ms
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Express + JSON.stringify | Fastify + JSON schema | 2019-2020 | 2-3x faster serialization; type safety |
| Offset pagination (`LIMIT/OFFSET`) | Cursor-based pagination | 2022-2024 | Consistent O(1) performance at scale vs linear degradation |
| Full-text search (tsvector) | GIN trigram indexes (pg_trgm) | 2023-2024 | Works with existing text columns; simpler queries with ILIKE |
| JSON Schema + TypeScript types | Zod schemas | 2023-2024 | Single source of truth; runtime + compile-time validation |
| Connection per request | Connection pooling | Always best practice | 20-30ms saved per request; prevents exhaustion |
| Manual SQL string building | ORM with operators (Drizzle) | 2023-2024 | Type safety, SQL injection prevention, cleaner code |

**Deprecated/outdated:**
- **Sequelize/TypeORM:** Heavy ORMs with complex APIs and N+1 issues; Drizzle/Kysely preferred for TypeScript
- **Offset pagination at scale:** Performance degrades 17x at depth; cursor-based is standard for modern APIs
- **`response-time` npm package:** Node.js `perf_hooks` API is built-in and more accurate
- **Manual connection management:** Always use connection pools; manual = guaranteed leaks under load

## Open Questions

1. **Should we implement caching with Redis in v1?**
   - What we know: Caching adds complexity (invalidation, Redis infrastructure, cache key management)
   - What's unclear: Can we hit 200ms target with indexes alone?
   - Recommendation: Start without caching. Proper indexes should achieve target. Add caching only if testing shows we can't hit 200ms consistently.

2. **How aggressive should rate limiting be?**
   - What we know: Sub-200ms target implies we can handle 5+ requests/sec per user
   - What's unclear: Expected traffic patterns (burst vs steady)
   - Recommendation: Start without rate limiting in v1. Add only if abuse occurs. Focus on performance first.

3. **Should we implement ETags for caching?**
   - What we know: ETags enable client-side caching via 304 responses
   - What's unclear: How often do event listings change? Would ETags help or add overhead?
   - Recommendation: Defer to v2. Event data changes frequently (new events added daily), so cache hit rate may be low.

## Sources

### Primary (HIGH confidence)
- [Fastify Official Documentation](https://fastify.dev/docs/latest/) - Getting started, type providers
- [Drizzle ORM Select Documentation](https://orm.drizzle.team/docs/select) - Query patterns, operators
- [PostgreSQL Official Documentation - pg_trgm](https://www.postgresql.org/docs/current/pgtrgm.html) - Trigram indexes
- [PostgreSQL Official Documentation - Full-Text Search](https://www.postgresql.org/docs/current/textsearch.html) - Text search types
- [Node.js Performance Hooks API](https://nodejs.org/api/perf_hooks.html) - Response time monitoring

### Secondary (MEDIUM confidence)
- [Fastify Benchmarks](https://fastify.dev/benchmarks/) - Performance comparisons (verified via official site)
- [Better Stack: Fastify vs Express vs Hono](https://betterstack.com/community/guides/scaling-nodejs/fastify-vs-express-vs-hono/) - Framework comparison
- [Drizzle ORM PostgreSQL Best Practices Guide](https://gist.github.com/productdevbook/7c9ce3bbeb96b3fabc3c7c2aa2abc717) - Community practices
- [API with NestJS #164: Drizzle ORM Indexes](http://wanago.io/2024/09/02/api-nestjs-drizzle-orm-indexes-postgresql/) - Index strategies
- [Speakeasy: Filtering Responses Best Practices](https://www.speakeasy.com/api-design/filtering-responses) - REST API filtering patterns
- [Speakeasy: Pagination Best Practices](https://www.speakeasy.com/api-design/pagination) - Pagination strategies

### Tertiary (LOW confidence - requires verification)
- [Medium: Fastify, Express, Hono Backend Benchmarks](https://medium.com/@sohail_saifii/i-built-the-same-backend-in-hono-fastify-and-express-the-benchmarks-were-shocking-8b23d606e0e4) - Performance claims need verification
- [Embedded Blog: API Pagination Guide](https://embedded.gusto.com/blog/api-pagination/) - Cursor vs offset
- [Milan Jovanovic: Cursor Pagination Deep Dive](https://www.milanjovanovic.tech/blog/understanding-cursor-pagination-and-why-its-so-fast-deep-dive) - Performance analysis
- [Node.js Performance Monitoring Blog](https://www.atatus.com/blog/nodejs-performance-monitoring/) - Monitoring strategies

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Fastify, Drizzle, PostgreSQL are well-documented and established; performance claims verified via official benchmarks
- Architecture: HIGH - Layered architecture and cursor pagination are industry standard patterns with extensive documentation
- Pitfalls: HIGH - N+1, missing indexes, connection pooling issues are well-documented problems with proven solutions

**Research date:** 2026-02-20
**Valid until:** ~2026-04-20 (60 days) - API frameworks and PostgreSQL patterns are relatively stable; revisit if major version changes occur
