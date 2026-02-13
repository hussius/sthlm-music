---
paths:
  - "**/*"
---

# TAPE Workflow Implementation Details

This document provides detailed guidance for implementing the TAPE (Think → ADR → Plan → Execute) workflow during the hackathon.

## When to Use TAPE

### Definitely Use TAPE For:
- **Architectural decisions:** Framework choices, database design, API structure
- **Technology selection:** Which library/tool to use
- **Significant refactors:** Restructuring major components
- **Data modeling:** Schema design, state management patterns
- **Integration patterns:** How services communicate
- **Security decisions:** Authentication, authorization, encryption approaches

### Skip TAPE For:
- **Bug fixes:** Fix the bug, commit with clear message
- **Documentation:** Update docs as you go
- **Minor refactors:** Extracting a function, renaming variables
- **Obvious implementations:** Standard CRUD operations, typical components
- **UI tweaks:** Styling, layout adjustments

**Rule of thumb:** If you'd want to explain the decision to your team 6 months from now, use TAPE.

## Talk Phase: Requirements Gathering

**CRITICAL:** Before diving into technical exploration or design, you MUST understand what the user actually wants.

### Required Questions to Ask

When a user proposes a feature or project, **always start by asking:**

1. **Goal & Purpose**
   - What problem are you trying to solve?
   - Who will use this? (yourself, team, demo, production users)
   - What's the primary goal? (learning, productivity, portfolio, competition)

2. **Scope & Priorities**
   - What's the timeline? (hours, days, weeks)
   - What features are must-have vs nice-to-have?
   - If you could only build ONE thing, what would it be?

3. **Technical Constraints**
   - Any technology preferences or requirements?
   - Any existing systems this needs to integrate with?
   - Performance/scalability requirements?
   - Mobile/desktop/both?

4. **User Experience Expectations**
   - Should this be simple and fast, or rich and polished?
   - What's more important: functionality or visual appeal?
   - Any accessibility requirements?

5. **Success Criteria**
   - How will you know this is "done"?
   - What does success look like?
   - What's the minimum viable version?

### ❌ NEVER Skip Requirements Gathering

**Bad approach:**
```
User: "I want a recipe timeline app"
Claude: [Immediately explores codebase and designs complex system]
```

**Good approach:**
```
User: "I want a recipe timeline app"
Claude: "That sounds great! Let me understand what you need:
- Is this for your personal use or a portfolio demo?
- What's your timeline - quick MVP or fully polished?
- Which features matter most: shopping list, timeline, or progress tracking?
- Any architectural preferences (database, etc.)?"
```

### Talk Phase Workflow

1. **User describes idea** - Initial feature request
2. **Ask clarifying questions** - Understand goals, priorities, constraints
3. **Discuss alternatives** - Explore different approaches conversationally
4. **Align on direction** - Confirm understanding before documenting
5. **Move to ADR phase** - Only after you understand what to build

### Common Talk Phase Mistakes

❌ **Assuming complexity:** User says "timeline" → you design elaborate visual chart
   - **Fix:** Ask if simple list view is sufficient first

❌ **Assuming scope:** User says "shopping list" → you add category sorting, unit conversion, purchase tracking
   - **Fix:** Ask what minimal version looks like

❌ **Assuming tech stack:** Immediately choosing database/libraries without asking preferences
   - **Fix:** Present options and ask user's preference

❌ **Assuming priorities:** Treating all features as equally important
   - **Fix:** Ask user to rank features by importance

### Example Talk Phase Conversation

**User:** "I want to build a recipe timeline app that creates shopping lists"

**Claude:** "Great idea! Let me understand what you're looking for:

**Purpose & Goal:**
- Is this for your personal use when cooking, or a portfolio/demo project?
- What's the main problem you're solving - forgetting ingredients, bad timing, or something else?

**Scope & Timeline:**
- How much time do you want to invest? (Quick prototype or fully featured app?)
- If you had to pick ONE feature to get working first, what would it be?

**Technical Preferences:**
- Any strong preferences on database (SQLite vs PostgreSQL)?
- Should this work offline or is internet connection fine?
- Desktop-only or mobile support needed?

**User Experience:**
- Should this be dead simple (paste URL → get list) or rich/interactive?
- Is visual appeal critical or is functionality the priority?

Once I understand your priorities, we can design the right solution."

## ADR Format and Storage

### Naming Convention
ADRs use zero-padded 4-digit numbers:
- `ADR-0001-use-fastapi-for-backend.md`
- `ADR-0002-implement-jwt-authentication.md`
- `ADR-0003-choose-postgresql-over-mongodb.md`

### Storage Location
All ADRs live in `/docs/adr/` at the repository root.

### ADR Lifecycle

**1. Proposed (Draft)**
- Initial ADR created during Talk/ADR phase
- Open for discussion and revision
- Can be modified before acceptance

**2. Accepted**
- Decision approved and ready for implementation
- **Now immutable** - don't edit accepted ADRs
- Reference this ADR during implementation

**3. Deprecated**
- Decision no longer relevant or superseded
- Add note pointing to new ADR
- Keep file for historical record

**4. Superseded**
- Replaced by a newer decision
- Link to the superseding ADR
- Explain why the change was needed

### What Goes in an ADR

**Do include:**
- The decision itself (what are we doing?)
- Context (why are we deciding this now?)
- Alternatives considered with pros/cons
- Trade-offs and consequences
- References to related decisions

**Don't include:**
- Implementation details (that's for the Plan phase)
- Code snippets (unless demonstrating a concept)
- Exact configurations (those go in code/docs)
- Step-by-step instructions (that's for the Plan)

### Example ADR Sections

```markdown
# ADR-0001: Use FastAPI for Backend Framework

## Status
Accepted

## Context
We need to build a REST API to serve our frontend application. The API needs to handle
real-time data updates, support multiple concurrent users, and provide good developer
experience during the hackathon. Team has Python experience but limited backend framework
knowledge.

## Decision
Use FastAPI as our backend framework with uvicorn as the ASGI server.

## Consequences

### Positive
- Built-in async/await support for real-time features
- Automatic OpenAPI documentation (helps frontend integration)
- Type hints catch bugs during development (important for fast-paced hackathon)
- Modern Python 3.12 features supported
- Easy WebSocket support if needed

### Negative
- Smaller ecosystem than Flask (fewer plugins available)
- Team needs to learn async patterns (learning curve during hackathon)
- Less StackOverflow answers than Flask (could slow debugging)

### Neutral
- Different from our usual Flask approach
- Requires Python 3.8+ (we're on 3.12, not an issue)

## Alternatives Considered

### Flask
**Pros:** Team familiarity, huge ecosystem, simple mental model
**Cons:** Limited async support, manual OpenAPI documentation
**Rejected because:** Async support is crucial for our real-time requirements

### Django
**Pros:** Batteries included, admin interface, ORM built-in
**Cons:** Heavy for API-only service, slower to learn, too much structure for hackathon
**Rejected because:** Overkill for our scope, would slow us down

### Express.js (Node)
**Pros:** Team has JavaScript experience from frontend
**Cons:** Split stack (Python + JS), deployment complexity, npm ecosystem quirks
**Rejected because:** Prefer unified Python stack for simpler deployment
```

## Plan Phase Guidelines

After ADR acceptance, create an implementation plan:

### Plan Structure

1. **Files to modify/create**
   - List each file with brief description
   - Note any new directories needed

2. **Key changes per file**
   - High-level changes (not line-by-line)
   - Important functions/classes to add

3. **Testing strategy**
   - What to test
   - How to verify correctness

4. **Migration/rollout steps**
   - Any database migrations
   - Dependency updates
   - Configuration changes

5. **ADR references**
   - Link back to relevant ADR(s)
   - Explain how plan implements the decision

### Plan Example

```markdown
# Implementation Plan: FastAPI Backend (ADR-0001)

## Files to Create

1. `backend/src/main.py` - FastAPI app initialization
2. `backend/src/routes/` - API route handlers
3. `backend/src/models/` - Pydantic models
4. `backend/tests/test_api.py` - API endpoint tests

## Key Changes

### main.py
- Initialize FastAPI app
- Configure CORS for frontend
- Set up middleware (logging, error handling)
- Include route modules

### routes/users.py
- GET /users - List users
- POST /users - Create user
- GET /users/{id} - Get user details
- Implement validation with Pydantic

### models/user.py
- UserCreate model (input validation)
- UserResponse model (output serialization)
- Use Python 3.12 type hints

## Testing Strategy

- Unit tests for each endpoint
- Test request validation (good and bad inputs)
- Test response serialization
- Integration test for full user flow

## Dependencies

Add to pyproject.toml:
- fastapi[standard]>=0.115.0
- uvicorn[standard]>=0.30.0
- pydantic>=2.0.0

## Success Criteria

- All tests pass
- OpenAPI docs accessible at /docs
- Frontend can fetch users successfully
```

### Before Executing

**Verification checklist:**
- [ ] Plan references the ADR
- [ ] All necessary files identified
- [ ] Testing strategy clear
- [ ] You're 90% confident this will work
- [ ] You've discussed any concerns with Claude

**If not 90% confident:** Discuss concerns, revise plan, or create additional ADRs.

## Execute Phase Best Practices

### Frequent Checkpoints

Use `/checkpoint` after:
- Each file completed and tested
- Each feature working end-to-end
- Each major function implemented
- Before trying a risky approach
- End of work session

### Reference ADRs During Implementation

In code comments, reference the ADR:
```python
# Per ADR-0001, using FastAPI for async support
app = FastAPI()
```

In commit messages, reference the ADR:
```
feat(api): implement FastAPI app initialization

Implements ADR-0001. Sets up FastAPI with CORS, error handling middleware,
and user routes. OpenAPI docs available at /docs.
```

### When Plans Change

**Small deviations:**
- Document in commit message
- Update plan in comments

**Major deviations:**
- Pause implementation
- Discuss with Claude
- Update ADR if architectural change
- Revise plan before continuing

### Verification During Execution

After each checkpoint:
- [ ] Tests pass
- [ ] Plan still makes sense
- [ ] Code aligns with ADR decisions
- [ ] Ready to continue or done

## Common Pitfalls

### ❌ Skipping Requirements Gathering (Talk Phase)
**Problem:** Jump straight to technical design without understanding user needs
**Example:** User says "recipe app" → Claude immediately designs database schema and complex algorithms
**Result:** Building wrong thing, over-engineering, missing actual requirements
**Fix:** ALWAYS ask questions about goals, priorities, and constraints BEFORE exploring code or designing solutions

### ❌ Making Assumptions Without Asking
**Problem:** Assuming user wants complex features, specific technologies, or particular UX
**Example:** Assuming "timeline" means visual chart vs simple list, assuming PostgreSQL vs SQLite
**Result:** Wasted effort building unwanted features, choosing wrong tools
**Fix:** Present options and ask user preference. Ask "what's the minimal version?" Ask "which features matter most?"

### ❌ ADRs Too Detailed
**Problem:** Including implementation details in ADR
**Result:** ADR becomes outdated when code changes
**Fix:** ADR = decision + reasoning. Plan = implementation details.

### ❌ Plan Too Vague
**Problem:** "Add user authentication" without specifics
**Result:** Confusion during execution, missed requirements
**Fix:** Specific files, functions, tests in plan

### ❌ Forgetting to Checkpoint
**Problem:** Working for hours without commits
**Result:** Can't pinpoint when bug introduced, lose work if mistake
**Fix:** Use `/checkpoint` every 30-60 minutes minimum

### ❌ Not Verifying Plan
**Problem:** Executing plan without 90% confidence
**Result:** Wasted implementation time, need to redo work
**Fix:** Ask questions, discuss concerns before executing

## TAPE Workflow Quick Reference

```
┌─────────────────────────────────────────────┐
│  TALK: Explore solutions conversationally   │
│  Goal: Reach clarity on what to build       │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  ADR: Document decision                     │
│  Tool: /adr [title]                         │
│  Goal: Capture reasoning for future         │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  PLAN: Create implementation roadmap        │
│  Goal: 90% confidence before coding         │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  EXECUTE: Implement with checkpoints        │
│  Tool: /checkpoint [message]                │
│  Goal: Build with save points               │
└─────────────────────────────────────────────┘
```

---

*The TAPE workflow reduces wasted effort and documents your thinking for future you.*
