---
name: review-plan
description: Verify implementation plan aligns with ADR decisions
---

# Review Implementation Plan Against ADR

Before executing an implementation plan, verify it aligns with your Architecture Decision Records.

## Purpose

Catch misalignments early:
- Plan uses different technology than ADR specified
- Plan ignores consequences mentioned in ADR
- Plan contradicts architectural decisions
- Plan missing considerations from ADR

## Steps

### 1. Identify Relevant ADRs

Ask user: "Which ADR(s) should I review this plan against?"

**Or search automatically:**
- Check plan for ADR references ("Per ADR-0001...")
- Check `/docs/adr/` for related decisions
- Consider recent accepted ADRs

**If no ADRs found:**
```
⚠️ No ADRs found related to this plan.

This might be okay if:
- This is a small implementation that didn't need an ADR
- You haven't created ADRs yet

Should I proceed without ADR validation, or would you like to create an ADR first?
```

### 2. Review Plan Alignment

For each relevant ADR, check:

#### ✅ Technology Alignment
**ADR says:** "Use PostgreSQL as primary database"
**Plan should:** Use PostgreSQL, not MySQL/MongoDB

**If misaligned:**
```
❌ Technology mismatch detected!

ADR-0001 specifies: PostgreSQL
Plan proposes: MongoDB

Either:
1. Update plan to use PostgreSQL (per ADR)
2. Create new ADR to supersede ADR-0001 if MongoDB is now better
```

#### ✅ Consequences Addressed
**ADR acknowledges:** "Async patterns have learning curve"
**Plan should:** Include learning resources, simple examples, or pairing

**If not addressed:**
```
⚠️ ADR-0001 noted: "Team needs to learn async patterns"

Plan doesn't address this. Consider adding:
- Link to async/await tutorial
- Simple examples in plan
- Note about pair programming for first async feature
```

#### ✅ Constraints Respected
**ADR says:** "Must support Python 3.8+ (we're on 3.12)"
**Plan should:** Not use Python 3.13-only features

**If violated:**
```
❌ Constraint violation!

ADR-0001 constraint: Python 3.8+ compatibility
Plan uses: match/case statements (Python 3.10+)

Update plan to use if/elif/else instead.
```

#### ✅ Alternatives Not Reintroduced
**ADR rejected:** Flask (lacks async support)
**Plan should:** Not suggest Flask components

**If reintroduced:**
```
⚠️ ADR-0001 explicitly rejected Flask due to limited async support.

Plan proposes: Using Flask-SQLAlchemy

Consider:
- Use SQLAlchemy directly (without Flask wrapper)
- Or create new ADR explaining why Flask integration is now acceptable
```

### 3. Generate Review Report

Provide structured feedback:

```markdown
# Implementation Plan Review

**Plan:** [Plan title/summary]
**Reviewed against:** ADR-0001, ADR-0003

## ✅ Alignments

1. **Technology choice:** Plan correctly uses FastAPI per ADR-0001
2. **Database:** PostgreSQL with SQLAlchemy as specified in ADR-0002
3. **Testing:** Includes pytest tests addressing quality concerns from ADR-0001

## ⚠️ Warnings

1. **Learning curve:** ADR-0001 noted async patterns require learning. Plan could include:
   - Link to async/await tutorial for team
   - Simple example showing pattern

2. **Deployment complexity:** ADR-0002 mentioned "schema migrations add deployment complexity."
   Plan should include:
   - Alembic migration strategy
   - Rollback procedure

## ❌ Critical Issues

None found.

## 📝 Recommendations

1. Add async/await learning resources to plan
2. Specify Alembic migration approach
3. Otherwise plan aligns well with architectural decisions

**Overall assessment:** ✅ Plan is ready to execute after addressing recommendations.
```

### 4. Handle User Response

**If issues found:**
- Wait for user to decide: fix plan or update ADR
- Offer to help with either approach
- Re-review after changes

**If no issues:**
- ✅ Give green light to proceed with execution
- Remind user to reference ADR in commits

## Example Review

**ADR-0001: Use FastAPI for Backend**

Key decision: FastAPI for async support and auto-generated docs

**Implementation Plan:**
```markdown
# FastAPI Backend Implementation

## Files to create:
- backend/src/main.py - Flask app initialization
- backend/src/routes/users.py - User endpoints
...
```

**Review Output:**
```
❌ Critical technology mismatch!

ADR-0001 Decision: "Use FastAPI as our backend framework"
Plan proposes: Flask app initialization

This contradicts the core architectural decision.

Options:
1. Fix plan to use FastAPI instead of Flask
2. Create ADR-0005 superseding ADR-0001 if you now prefer Flask

Why this matters: ADR-0001's main reasoning was "async/await support for real-time features"
which Flask lacks.

I recommend fixing the plan to use FastAPI as decided. Would you like me to revise it?
```

## Edge Cases

### Multiple ADRs

If plan spans multiple ADRs:
- Review against all relevant ADRs
- Note interactions between ADRs
- Check for conflicts between ADRs

### ADR Status

**If ADR is "Proposed" (not Accepted):**
```
⚠️ ADR-0003 is still in "Proposed" status.

Accept the ADR before implementing to formalize the decision.

Change status to "Accepted" if decision is final.
```

**If ADR is "Deprecated":**
```
❌ ADR-0002 is marked "Deprecated"

Don't implement plans based on deprecated decisions.

Check for superseding ADR or create new ADR.
```

### No Plan Provided

If user runs `/review-plan` without context:
```
I don't see an implementation plan to review.

Either:
1. Share your plan (paste it or point to file)
2. Ask me to create a plan first
3. Describe what you want to implement

What would you like to do?
```

### Conflicting ADRs

If ADRs conflict:
```
⚠️ Potential ADR conflict detected:

ADR-0001: "Use PostgreSQL for relational data"
ADR-0004: "Use MongoDB for user preferences"

These overlap - both handle user-related data.

Consider:
- Clarify boundaries (PostgreSQL for core data, MongoDB for preferences?)
- Update ADRs to resolve conflict
- Create superseding ADR with unified approach
```

## Tips

- **Review before execution** - Catch issues early
- **Check recent ADRs** - May supersede older ones
- **Consider consequences** - ADRs often note trade-offs to address
- **Link ADRs in plan** - Makes review easier (e.g., "Per ADR-0001...")
- **Update ADRs if needed** - Plans sometimes reveal better approaches

## Quick Reference

```bash
# Basic review
/review-plan

# Review specific ADR
"Review this plan against ADR-0001"

# Review multiple
"Review plan against ADR-0001 and ADR-0003"

# After changes
"I updated the plan, please review again"
```

---

*Reviewing plans against ADRs ensures implementation stays aligned with architectural decisions.*
