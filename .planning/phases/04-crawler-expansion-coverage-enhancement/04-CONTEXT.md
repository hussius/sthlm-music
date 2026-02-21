# Phase 4: Crawler Expansion & Coverage Enhancement - Context

**Gathered:** 2026-02-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Expand event coverage by fixing existing crawlers, integrating new ticketing APIs (Tickster, Eventbrite), and adding 10-15 venue-specific scrapers. Maintain >95% deduplication accuracy while expanding coverage.

</domain>

<decisions>
## Implementation Decisions

### Prioritization strategy
- **Fix broken scrapers first**: Restore Nalen and Kollektivet Livet coverage before adding new sources - shows commitment to quality
- **Prioritize venues by ease of implementation**: Quick wins first - venues with simple HTML structure
- **APIs early in phase**: Integrate Tickster and Eventbrite after fixing broken scrapers - APIs likely easier than venue scrapers, builds confidence
- **Target 10-15 new venues**: Realistic goal that leaves hardest venues for future phase

### Quality assurance
- **Automated event count checks**: Alert if crawler returns 0 events or significantly fewer than expected
- **Test deduplication with known overlaps**: Manually verify events from multiple sources deduplicate properly
- **Immediate error alerts**: Get notified on first crawler failure so we can fix quickly
- **Maintain >95% dedup accuracy**: Same standard as Phase 1 - quality is core value proposition

### Claude's Discretion
- API integration patterns (key management, rate limits, error handling)
- Venue crawler patterns (whether to extend existing VenueConfig or create new patterns)
- Specific implementation details for automated checks
- How to structure deduplication test cases

</decisions>

<specifics>
## Specific Ideas

- Fix broken ones before adding new - demonstrates reliability and trustworthiness
- Easy wins build momentum - start with simple scrapers to establish patterns
- APIs after fixes provides natural progression: restore → expand platforms → expand venues

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-crawler-expansion-coverage-enhancement*
*Context gathered: 2026-02-21*
