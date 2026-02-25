# Requirements: Stockholm Music Events Calendar

**Defined:** 2026-02-20
**Core Value:** Comprehensive event coverage - capture all Stockholm music events in one place so people don't miss shows scattered across multiple platforms.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Data Collection

- [ ] **DATA-01**: System crawls Ticketmaster SE daily for Stockholm music events
- [x] **DATA-02**: System crawls AXS/Live Nation daily for Stockholm music events
- [x] **DATA-03**: System crawls DICE daily for Stockholm music events
- [x] **DATA-04**: System crawls priority venue websites directly (Kollektivet Livet, Slaktkyrkan, Hus 7, Fasching, Nalen, Fylkingen, Slakthuset, Fållan, Landet, Mosebacke, Kägelbanan, Pet Sounds, Debaser)
- [ ] **DATA-05**: System deduplicates events across all sources (same event shown once)
- [ ] **DATA-06**: System maintains 12-month rolling window (events within next year only)
- [x] **DATA-07**: System normalizes event data to common schema (venue, date, genre, artist)

### Discovery & Filtering

- [x] **FILT-01**: User can filter events by date range (month/week/day selection)
- [ ] **FILT-02**: User can filter events by genre (5-10 core genres: Rock, Pop, Electronic, Jazz, Hip-hop, Metal, Indie, Folk, Classical, World)
- [ ] **FILT-03**: User can filter events by venue (all venues from all sources)
- [x] **FILT-04**: User can search for events by artist/band name
- [x] **FILT-05**: User can search for events by event name

### Display & UI

- [x] **DISP-01**: User can view events in chronological list view
- [ ] **DISP-02**: User sees event details: name, date, time, venue, genre, artist(s)
- [ ] **DISP-03**: User sees ticket availability status for each event
- [x] **DISP-04**: Calendar is mobile-responsive (works on phones and tablets)
- [x] **DISP-05**: Calendar displays in Stockholm local time (Europe/Stockholm timezone)

### Integration

- [x] **INTG-01**: User can click through to original ticket platform (Ticketmaster SE, AXS, DICE, or venue website) to purchase tickets
- [x] **INTG-02**: Ticket links are deep links (direct to event page, not homepage)

### Performance & Quality

- [x] **PERF-01**: Search results return in under 200ms
- [x] **PERF-02**: Page loads work smoothly with 10,000+ events in database
- [ ] **QUAL-01**: Events are deduplicated with >95% accuracy (minimal false positives/negatives)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Enhanced Discovery

- **FILT-06**: User can apply multiple filters simultaneously (genre + venue + date)
- **FILT-07**: User can filter by subgenres (hierarchical genre taxonomy)
- **DISP-06**: User can view events in calendar grid (month view)
- **DISP-07**: User can view events in calendar grid (week view)
- **DISP-08**: User sees trending/popularity indicators ("selling fast", "last tickets")
- **DISP-09**: User sees venue capacity information

### Export & Integration

- **INTG-03**: User can export filtered events to iCal format
- **INTG-04**: User can subscribe to iCal feed for continuous updates

### Personalization

- **USER-01**: User can create account to save preferences
- **USER-02**: User can track favorite artists for notifications
- **USER-03**: User receives personalized event recommendations

### Expansion

- **EXPA-01**: System supports additional Swedish cities (Gothenburg, Malmö)
- **EXPA-02**: System provides public API for third-party integrations

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Ticket purchasing within app | Complex payment processing, legal liability - always link to official sellers |
| User accounts in v1 | Adds complexity without validation - defer until traffic justifies |
| Artist tracking notifications in v1 | Requires email infrastructure - Songkick/Bandsintown already do this well |
| Social features (sharing, attending with friends) | Major scope expansion - focus on aggregation first |
| Real-time seat selection | Not aggregator's role - belongs on ticketing platforms |
| Event creation/submission | Opens door to spam and moderation burden |
| Personalized AI recommendations in v1 | Requires ML infrastructure - excellent filtering is sufficient for v1 |
| Multi-city support in v1 | Dilutes Stockholm focus - validate single city first |
| Events beyond 12-month horizon | Keep focused on near-term planning |
| Non-music events | Concerts, gigs, festivals only - clear product focus |
| RSS feeds in v1 | Lower priority than iCal - defer until requested |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 5 | Pending |
| DATA-02 | Phase 5 | Pending |
| DATA-03 | Phase 5 | Pending |
| DATA-04 | Phase 5 | Pending |
| DATA-05 | Phase 5 | Pending |
| DATA-06 | Phase 5 | Pending |
| DATA-07 | Phase 1 | Complete |
| QUAL-01 | Phase 5 | Pending |
| FILT-01 | Phase 2 | Complete |
| FILT-02 | Phase 6 | Pending |
| FILT-03 | Phase 6 | Pending |
| FILT-04 | Phase 2 | Complete |
| FILT-05 | Phase 2 | Complete |
| PERF-01 | Phase 2 | Complete |
| PERF-02 | Phase 2 | Complete |
| DISP-01 | Phase 3 | Complete |
| DISP-02 | Phase 6 | Pending |
| DISP-03 | Phase 6 | Pending |
| DISP-04 | Phase 3 | Complete |
| DISP-05 | Phase 3 | Complete |
| INTG-01 | Phase 3 | Complete |
| INTG-02 | Phase 3 | Complete |

**Coverage:**
- v1 requirements: 22 total
- Mapped to phases: 22
- Unmapped: 0
- Complete: 11 | Pending: 11

---
*Requirements defined: 2026-02-20*
*Last updated: 2026-02-25 after v1.0 audit gap closure phase creation*
