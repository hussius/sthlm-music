# Stockholm Music Events Calendar

## What This Is

A public web app that aggregates music events from major Stockholm ticket platforms (Ticketmaster SE, AXS/Live Nation, DICE) into a unified calendar. Shows events in calendar grid views (month/week/day) with filtering by date, genre, artist name, and venue. Fully open access with no authentication required.

## Core Value

Comprehensive event coverage - capture all Stockholm music events in one place so people don't miss shows scattered across multiple platforms.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Automated daily crawling of Ticketmaster SE, AXS/Live Nation, and DICE
- [ ] Display events in calendar views (month grid, week grid, day grid)
- [ ] Filter events by date/time range
- [ ] Filter events by genre
- [ ] Filter events by artist/band name
- [ ] Filter events by venue
- [ ] 12-month rolling window (only show events within next year)
- [ ] Link to original ticket platform for purchasing
- [ ] Public access with no authentication required

### Out of Scope

- Ticket purchasing within the app — link to platforms, don't sell tickets
- Events outside Stockholm — geographic focus
- Non-music events — concerts, gigs, festivals only
- Events beyond 12-month horizon — keep focused on near-term planning

## Context

**Problem:** Stockholm's music events are scattered across multiple ticket platforms. No single source has comprehensive coverage, causing people to miss shows they'd want to attend.

**Success metric:** Becomes the go-to calendar for Stockholm music fans - people use it as their primary source for discovering and tracking events.

**Sources to crawl:**
- Ticketmaster SE (major international acts)
- AXS/Live Nation (big venues and festivals)
- DICE (clubs and smaller venues)

**Crawling approach:** Automated daily updates to keep calendar current as new events are announced.

## Constraints

- **Timeline**: 12-month rolling window (hard limit) — only show events within next year
- **Tech stack**: No constraints — choose what makes sense for web crawling, data storage, and calendar UI
- **Geography**: Stockholm only — don't expand to other cities in v1

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| No authentication | Lower barrier to adoption, faster to build | — Pending |
| 12-month window | Focus on near-term planning, manageable data scope | — Pending |
| 3 platforms for v1 | Balance comprehensiveness with implementation complexity | — Pending |
| Link to platforms for tickets | Avoid payment processing complexity and liability | — Pending |

---
*Last updated: 2026-02-20 after initialization*
