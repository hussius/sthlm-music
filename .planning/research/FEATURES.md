# Feature Landscape

**Domain:** Music Event Aggregation Platform
**Researched:** 2026-02-20
**Confidence:** MEDIUM

## Table Stakes

Features users expect. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Date-based filtering | Core use case - users plan by date | Low | Month/week/day views, date range selection. Industry standard. |
| Venue information | Users need to know where events happen | Low | Venue name, address, capacity. Must link to venue profile/map. |
| Genre filtering | Primary discovery method for music events | Medium | Taxonomy complexity - genres overlap and evolve. Need 5-10 core categories + tags for subgenres. |
| Artist/performer listing | Users search by artist name | Low | Display multiple performers per event. Link to artist profile if available. |
| Ticket purchase links | Users expect direct path to buy tickets | Low | Deep links to Ticketmaster SE, AXS/Live Nation, DICE. Must be official sellers. |
| Event details display | Basic information presentation | Low | Event name, date/time, venue, genre, ticket availability status. |
| Mobile-responsive design | 62.9% of users expect mobile access | Medium | Touch-friendly filters, readable on small screens, fast load times. |
| Search functionality | Users want to find specific events/artists | Medium | Text search across event name, artist, venue. Must be fast (<200ms). |
| List and calendar views | Different planning preferences | Medium | List view (chronological), month/week calendar grids. Toggle between views. |
| Time zone handling | Stockholm-centric but international visitors | Low | Display in local time (Europe/Stockholm). No user-selectable zones needed for v1. |

## Differentiators

Features that set product apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Comprehensive aggregation | Beats competitors by covering ALL major platforms | High | Crawl Ticketmaster SE, AXS/Live Nation, DICE daily. Deduplication critical. |
| 12-month rolling window | Longer planning horizon than typical 3-6 month views | Low | Helps early planners, shows festival lineups announced far ahead. Updates daily to maintain window. |
| Multi-venue coverage | Stockholm-wide view vs single venue calendars | Medium | Aggregate all venues. Enables "what's happening tonight across Stockholm" queries. |
| No authentication required | Frictionless discovery - no barriers | Low | Reduces bounce rate. Users can browse immediately without signup. |
| Advanced filtering combinations | Genre + venue + date range simultaneously | Medium | Boolean logic for filters. "Rock concerts at Annexet in March 2026." Needs efficient indexing. |
| Event deduplication | Same event across platforms shown once | High | Match events by artist + venue + date/time. Handle variations in event names. Critical for UX. |
| Calendar export (iCal) | Users add to personal calendars | Medium | Generate iCal feeds for filtered views. Subscribe to "all rock concerts" in Google Calendar. |
| Trending/popularity indicators | Show what's selling out or popular | Medium | Track ticket availability changes. Highlight "selling fast" or "last tickets." Requires frequent updates. |
| Genre taxonomy with subgenres | Better discovery than flat genre lists | Medium | Hierarchical: "Electronic > Techno" or tags. Helps niche genre fans find events. |
| Venue capacity information | Planning context (intimate vs arena) | Low | Display capacity when available from venue databases. Helps set expectations. |

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| User accounts (v1) | Adds complexity without validation | No auth required. Users browse and link out to buy. Defer until traffic validates need. |
| Artist tracking notifications | Requires persistent user data, email infrastructure | External platforms (Songkick, Bandsintown) already do this well. Link out rather than compete. Focus on comprehensive discovery. |
| Ticket purchasing/checkout | Complex regulations, payment processing, inventory management | Always link to official sellers (Ticketmaster, DICE, etc). Never handle transactions. Legal and technical minefield. |
| Social features (share, attend, friends) | Scope creep, moderation burden | Keep focused on aggregation. Users can share links to events, but no in-platform social graph. |
| Real-time seat selection | Not an aggregator's role | Link to ticketing platform where users select seats. Don't replicate ticketing platform features. |
| Event creation/submission | Opens door to spam, requires moderation | Only show events from official sources (Ticketmaster SE, AXS, DICE). Maintain data quality through controlled sources. |
| Personalized recommendations (v1) | Requires user data and ML infrastructure | Provide excellent filtering instead. Let users define preferences via filters. Defer AI/ML until post-PMF. |
| RSS feeds (v1) | Low user demand, maintenance overhead | Focus on iCal export first (higher value). RSS can come later if requested. |
| Multi-city support (v1) | Dilutes Stockholm focus, complicates crawlers | Start Stockholm-only. Validate before expanding to Gothenburg, Malmö, etc. |
| Back-to-back event scheduling | Users don't plan multiple events in one session | Single event focus. Users link out to buy, don't need trip planning features. |

## Feature Dependencies

```
Event Details Display
    └──requires──> Data Crawling (Ticketmaster SE, AXS, DICE)
                       └──requires──> Event Deduplication

Genre Filtering
    └──requires──> Genre Taxonomy Definition
    └──enhances──> Search Functionality

Calendar Views
    └──requires──> Date-based Filtering
    └──requires──> Event Details Display

Advanced Filtering Combinations
    └──requires──> Date-based Filtering
    └──requires──> Genre Filtering
    └──requires──> Venue Database

Calendar Export (iCal)
    └──requires──> Filtering (date, genre, venue)
    └──requires──> Event Details Display

Trending/Popularity Indicators
    └──requires──> Ticket Availability Tracking
    └──requires──> Frequent Data Updates

Search Functionality
    └──requires──> Event Details Display
    └──requires──> Indexing Strategy

Mobile-Responsive Design
    └──affects──> All UI Features
```

### Dependency Notes

- **Event Deduplication requires Data Crawling:** Can't deduplicate until you have data from multiple sources. Must run after each crawl.
- **Calendar Export requires Filtering:** Users want to export filtered subsets ("all electronic music"), not entire calendar.
- **Advanced Filtering requires Indexing:** Combining genre + venue + date with 12 months of data needs database indexes on those columns for <200ms performance.
- **Trending requires Frequent Updates:** "Selling fast" indicators only work if you check ticket availability multiple times per day.

## MVP Definition

### Launch With (v1)

Minimum viable product for validating comprehensive Stockholm music event aggregation.

- [x] **Data crawling (Ticketmaster SE, AXS/Live Nation, DICE)** — Core value proposition. Without this, nothing else matters.
- [x] **Event deduplication** — Critical for UX. Same event showing 3 times ruins credibility.
- [x] **Event details display** — Name, date, time, venue, genre, ticket link. Table stakes.
- [x] **Date-based filtering** — Month/week/day selection. Primary planning method.
- [x] **Genre filtering** — 5-10 core genres initially. Users discover by genre.
- [x] **Venue filtering** — Show all events at specific venue. Users have venue preferences.
- [x] **Search functionality** — Text search for artist/event name. Fast discovery path.
- [x] **List view** — Chronological event listing. Simpler than calendar grid for v1.
- [x] **Mobile-responsive design** — 60%+ traffic will be mobile. Non-negotiable.
- [x] **Ticket purchase deep links** — Links to official sellers. Revenue path for platforms.
- [x] **12-month rolling window** — Differentiator. Longer horizon than competitors.

### Add After Validation (v1.x)

Features to add once core aggregation is working and traffic validates product-market fit.

- [ ] **Calendar grid view (month/week)** — Add once list view works. Trigger: 1K+ weekly users.
- [ ] **Advanced filtering combinations** — Genre + venue + date. Trigger: user requests via feedback.
- [ ] **Calendar export (iCal)** — Moderate complexity, high value. Trigger: 500+ weekly active users.
- [ ] **Genre taxonomy with subgenres** — Hierarchical genres. Trigger: users report "can't find my genre."
- [ ] **Trending/popularity indicators** — "Selling fast" badges. Trigger: stable crawling infrastructure.
- [ ] **Venue capacity information** — Low complexity, moderate value. Trigger: venue database available.
- [ ] **Multi-venue coverage expansion** — Add smaller venues. Trigger: major venues covered comprehensively.
- [ ] **Time zone handling for international visitors** — Auto-detect user time zone. Trigger: analytics show international traffic.

### Future Consideration (v2+)

Features to defer until product-market fit is established and growth metrics are strong.

- [ ] **User accounts with saved filters** — Defer until retention metrics justify infrastructure. Requires auth, database, sessions.
- [ ] **Artist tracking notifications** — Only if can differentiate from Songkick/Bandsintown. Requires user accounts, email infrastructure, background jobs.
- [ ] **Personalized recommendations** — Defer until user behavior data exists. Requires ML infrastructure, sufficient data volume.
- [ ] **Multi-city support (Gothenburg, Malmö, Copenhagen)** — Validate Stockholm first. Each city needs separate crawlers.
- [ ] **RSS feeds** — Only if users request. Lower priority than iCal.
- [ ] **API for third-party integrations** — Only if external demand exists. Requires auth, rate limiting, documentation.
- [ ] **Social features (share, attend with friends)** — Major scope expansion. Only if core aggregation has strong retention.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Data crawling (3 platforms) | HIGH | HIGH | P1 |
| Event deduplication | HIGH | HIGH | P1 |
| Event details display | HIGH | LOW | P1 |
| Date-based filtering | HIGH | LOW | P1 |
| Genre filtering | HIGH | MEDIUM | P1 |
| Venue filtering | HIGH | LOW | P1 |
| Search functionality | HIGH | MEDIUM | P1 |
| List view | HIGH | LOW | P1 |
| Mobile-responsive design | HIGH | MEDIUM | P1 |
| Ticket purchase links | HIGH | LOW | P1 |
| 12-month rolling window | MEDIUM | LOW | P1 |
| Calendar grid view | MEDIUM | MEDIUM | P2 |
| Advanced filtering combinations | MEDIUM | MEDIUM | P2 |
| Calendar export (iCal) | MEDIUM | MEDIUM | P2 |
| Genre taxonomy with subgenres | MEDIUM | MEDIUM | P2 |
| Trending/popularity indicators | MEDIUM | MEDIUM | P2 |
| Venue capacity information | LOW | LOW | P2 |
| User accounts | MEDIUM | HIGH | P3 |
| Artist tracking notifications | MEDIUM | HIGH | P3 |
| Personalized recommendations | LOW | HIGH | P3 |
| Multi-city support | LOW | HIGH | P3 |
| RSS feeds | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch - core value proposition
- P2: Should have, add when possible - enhances core offering
- P3: Nice to have, future consideration - scope expansion

## Competitor Feature Analysis

| Feature | Songkick | Bandsintown | Our Approach |
|---------|----------|-------------|--------------|
| Data sources | 15M users, tour tracking | 100M users, multi-platform sync | Focused: Ticketmaster SE + AXS + DICE for Stockholm. Comprehensive local coverage beats broad shallow coverage. |
| Artist tracking | Core feature - reliable alerts | Core feature - less reliable alerts | NOT in v1. Link to Songkick/Bandsintown instead. Focus on discovery, not tracking. |
| Venue filtering | Yes, metro area based | Yes, location based | Stockholm-specific. All major venues cataloged. |
| Genre filtering | Limited | Limited | Differentiator: Robust genre taxonomy. Music discovery via genre is underserved. |
| Calendar export | Unknown | Unknown | Planned for v1.x. High value for planners. |
| Time horizon | Typically 6 months | Varies by artist | 12 months rolling. Helps festival planners, early birds. |
| Multi-platform aggregation | Aggregates tours | Aggregates platforms | Focused aggregation: Ticketmaster SE + AXS + DICE. Deduplication across platforms. |
| Personalization | Artist-based | Music library sync | v1: Filter-based. v2+: Potentially ML-based if data supports. |
| Authentication | Required for tracking | Required for tracking | NOT required for v1. Frictionless browsing. |
| Mobile experience | Native apps (iOS/Android) | Native apps (iOS/Android) | Mobile-responsive web. Lower barrier than app install. |

## Stockholm Market Context

Based on research, Stockholm serves as a Nordic hub for major international tours - artists often play only one Nordic date, and it's in Stockholm (e.g., System of a Down, Linkin Park in 2026). This means:

**Opportunity:** Strong demand for comprehensive Stockholm event coverage. Users planning from across Nordics.

**Competition:** Songkick and Bandsintown have Stockholm metro areas but don't offer Stockholm-focused aggregation with local platform coverage.

**Differentiation:** Comprehensive Stockholm coverage (all major local platforms) beats global breadth with shallow Stockholm depth.

## Technical Considerations for Features

### Performance Requirements

- **Search response time:** <200ms for text search (users expect instant results)
- **Filter application:** <100ms for single filter, <300ms for combined filters
- **Page load:** <2s on mobile 4G (Nordic mobile adoption is high)
- **Crawl frequency:** Daily for 12-month window maintenance
- **Deduplication accuracy:** >95% to maintain credibility

### Data Volume Estimates

- **Events per month:** ~400-600 events (estimated from Songkick showing 405 current events)
- **12-month dataset:** ~5,000-7,000 events
- **Crawl operations:** 3 platforms × daily = 21 crawls/week
- **Search index size:** <100MB for 12 months of events (text + metadata)

### Scalability Checkpoints

- **1K weekly users:** Add calendar grid view, advanced filtering
- **5K weekly users:** Implement caching layer for filtered views
- **10K weekly users:** Add cursor-based pagination (keyset pagination) for performance
- **50K weekly users:** Consider read replicas, CDN for static assets
- **100K+ weekly users:** Event-driven architecture for real-time updates

## Sources

### Music Event Aggregation Platforms (MEDIUM confidence - multiple web sources)
- [Top 15 Best Event Ticketing Software Systems in 2026](https://www.eventcube.io/blog/best-event-ticketing-software)
- [Music Industry Platform for the Ultimate Experience - CM.com](https://www.cm.com/live-music/)
- [Best Live Music Discovery Platforms 2026: Ultimate Guide](https://resources.onestowatch.com/best-live-music-discovery-platforms/)

### Event Calendar Features and User Expectations (MEDIUM confidence - industry sources)
- [Event Software Solutions to Empower Events Creators | Timely](https://time.ly/)
- [Event Industry Trends 2026: The Future of Successful Events](https://www.hytix.com/blog/event-industry-trends-2026/)
- [Best Event Planning Platforms/Services Compared 2026](https://www.eventsinminutes.com/blog/best-event-planning-platforms-services-compared-2026/)

### Songkick vs Bandsintown Comparison (MEDIUM confidence - verified across multiple sources)
- [Best Live Music Discovery Platforms 2026: Ultimate Guide](https://resources.onestowatch.com/best-live-music-discovery-platforms/)
- [Bandsintown Or Songkick? You May Not Be Able To Decide](https://unrealbanter.wordpress.com/2012/10/16/bandkick/)
- [Bandsintown vs Songkick | Comparably](https://www.comparably.com/competitors/bandsintown-vs-songkick)

### Concert Discovery Features (MEDIUM confidence - major platform docs)
- [Apple Music introduces concert discovery features](https://artists.apple.com/support/5305-concert-discovery-features)
- [Shazam launches personalized in-app concert discovery hub](https://www.musicbusinessworldwide.com/shazam-launches-personalized-in-app-concert-discovery-hub/)
- [Explore Concert Discovery Apps: Features, User Experience & Availability](https://cinedoctbilisi.com/concert-discovery-apps-features-user-experience-and-availability/)

### Filtering and Calendar Best Practices (MEDIUM confidence - platform documentation)
- [Best Practices for Using Event Categories and Tags for Filtering](https://theeventscalendar.com/knowledgebase/best-practices-for-using-event-categories-and-tags-for-filtering/)
- [Filter Bar | The Events Calendar](https://theeventscalendar.com/products/wordpress-calendar-filter-bar/)

### Calendar Export and Integration (MEDIUM confidence - technical documentation)
- [Setup iCal and RSS Feeds From Your Calendar](https://calendarwiz.freshdesk.com/support/solutions/articles/60000709435-setup-ical-and-rss-feeds-from-your-calendar)
- [Using the iCal Feeds | Events Manager Documentation](https://wp-events-plugin.com/documentation/event-ical-feeds/)

### Performance Optimization (MEDIUM confidence - technical articles)
- [Handling Large Datasets & High-Traffic Queries: Optimizing Pagination, Sorting & Filtering](https://medium.com/@jatin.jain_69313/handling-large-datasets-high-traffic-queries-optimizing-pagination-sorting-filtering-bf9a2d5a9813)
- [A practical guide to scalable pagination: Offset, Keyset and Beyond](https://blogs.halodoc.io/a-practical-guide-to-scalable-pagination/)

### Stockholm Market Context (MEDIUM confidence - official tourism and event sites)
- [Stockholm Concerts, Festivals, Tickets & Tour Dates 2026 & 2027 – Songkick](https://www.songkick.com/metro-areas/32252-sweden-stockholm)
- [Concerts & Events in Stockholm, Sweden | Bandsintown](https://www.bandsintown.com/c/stockholm-sweden)
- [List: Concerts in Stockholm 2026 – Thatsup](https://thatsup.co.uk/stockholm/guide/list-concerts-in-stockholm-2026-stockholm/)

### Anti-Features and Calendar Mistakes (MEDIUM confidence - industry best practices)
- [7 Common Add to Calendar Mistakes and How to Avoid Them](https://www.addevent.com/blog/7-common-add-to-calendar-mistakes-and-how-to-avoid-them)
- [Common Event Planning Mistakes and How to Avoid Them](https://www.eventdex.com/blog/common-event-planning-mistakes-and-how-to-avoid-them/)

### Genre Classification (LOW confidence - academic/technical sources, needs validation)
- [Understanding Music Genres for DSPs | iMusician](https://imusician.pro/en/resources/blog/understanding-music-genres-for-dsps)

---
*Feature research for: Stockholm Music Events Calendar*
*Researched: 2026-02-20*
*Overall confidence: MEDIUM - based on multiple web sources, competitor analysis, and industry documentation. Genre taxonomy and Stockholm market sizing would benefit from additional validation.*
