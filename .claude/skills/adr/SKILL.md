---
name: adr
description: Create Architecture Decision Record from Talk phase conversation
---

# Create Architecture Decision Record

You just completed a Talk phase conversation about an architectural decision. Now create an ADR to document it.

## Steps

### 1. Determine ADR Number

Check `/docs/adr/` directory for existing ADRs and find the next number:
- Look for files matching `ADR-NNNN-*.md`
- Find the highest number
- Use next sequential number (e.g., if ADR-0003 exists, create ADR-0004)
- If no ADRs exist, start with ADR-0001

### 2. Create ADR File

Create `/docs/adr/ADR-NNNN-kebab-case-title.md` with this structure:

```markdown
# ADR-NNNN: [Title from our conversation]

## Status

Proposed

## Context

[Describe the situation/problem we discussed, including:
- What triggered this decision
- Current state of the system
- Constraints and requirements
- Why this decision is needed now]

## Decision

[State clearly what we decided to do. Be specific about:
- The approach we're taking
- Key technologies or patterns involved
- How it will be implemented at a high level]

## Consequences

### Positive
[Benefits we discussed:
- What problems this solves
- What opportunities it creates
- Performance/quality improvements]

### Negative
[Trade-offs we acknowledged:
- New complexities introduced
- Limitations accepted
- Maintenance burden added]

### Neutral
[Changes that are neither clearly good nor bad:
- New patterns to learn
- Different mental model required]

## Alternatives Considered

### [Alternative 1 Name]
**Pros:**
- [Benefits we discussed]

**Cons:**
- [Drawbacks we identified]

**Why rejected:**
- [Reasoning from our conversation]

### [Alternative 2 Name]
[Same structure...]

## Notes

[Any additional context:
- Links to relevant discussions
- References to related ADRs
- Open questions or future work]

---

**Created:** [Today's date: YYYY-MM-DD]
**Author:** [User's name if known, or "Hackathon Team"]
**Related ADRs:** [Any ADRs we referenced]
```

### 3. Present to User

Show the complete ADR and say:

"I've created **ADR-NNNN: [Title]** documenting our decision to [brief summary].

Please review:
- Does the Context accurately capture the situation?
- Is the Decision clear and specific?
- Are the Consequences (pros/cons) complete?
- Did I miss any alternatives we discussed?

If approved, I'll change Status to 'Accepted' and we can move to the Plan phase."

### 4. Handle User Feedback

**If user requests changes:**
- Edit the ADR based on feedback
- Present updated version
- Repeat until approved

**If user approves:**
- Change `Status: Proposed` to `Status: Accepted`
- Commit the ADR:
  ```
  /checkpoint docs(adr): add ADR-NNNN [title]
  ```
- Say: "ADR accepted! Ready to create an implementation plan? Just ask me to create a plan referencing this ADR."

## Example ADR Creation

**After Talk phase about choosing a database:**

```markdown
# ADR-0001: Use PostgreSQL for Primary Database

## Status

Proposed

## Context

Our hackathon project needs persistent storage for user data, posts, and relationships.
We discussed that we need:
- Reliable data persistence
- Support for relationships between entities (users, posts, comments)
- ACID transactions for data integrity
- Team has basic SQL experience

This decision is needed now because we're about to implement the data layer.

## Decision

Use PostgreSQL as our primary database with SQLAlchemy as the ORM.

## Consequences

### Positive
- Strong ACID guarantees prevent data corruption
- Excellent support for relationships via foreign keys
- JSON column type for flexible data when needed
- Huge ecosystem and community support
- Free and open source

### Negative
- Requires running a separate database server (not just a file)
- SQL knowledge required for complex queries
- Schema migrations add deployment complexity
- Slightly more setup than SQLite

### Neutral
- Different from MongoDB which team heard about
- Requires learning SQLAlchemy ORM patterns

## Alternatives Considered

### SQLite
**Pros:**
- Simplest setup (just a file)
- No separate server needed
- Great for development

**Cons:**
- Limited concurrency
- No network access (problematic for deployment)
- Weaker at relationships

**Why rejected:**
We anticipate multiple concurrent users and want practice with production-grade databases.

### MongoDB
**Pros:**
- Flexible schema
- JSON-native
- Horizontally scalable

**Cons:**
- Weak at relationships (lots of manual joins)
- Eventually consistent by default
- Team less familiar with NoSQL

**Why rejected:**
Our data is highly relational (users→posts→comments). SQL is better fit.

## Notes

If we hit scale issues during hackathon (unlikely), we can reconsider. For now, PostgreSQL
balances learning value with practical needs.

---

**Created:** 2026-02-12
**Author:** Hackathon Team
**Related ADRs:** None
```

## Tips

- **Be comprehensive but concise** - Capture key points from conversation without being verbose
- **Use user's language** - Reflect how they described things
- **Be honest about trade-offs** - Don't oversell the decision
- **Reference our discussion** - Include specific points we talked about
- **Ask clarifying questions** - If anything is unclear during ADR creation

## Common Mistakes to Avoid

❌ **Too vague:** "We decided to use a database"
✅ **Specific:** "Use PostgreSQL 15 with SQLAlchemy 2.0 ORM"

❌ **Implementation details:** "Create users table with id, name, email columns"
✅ **Decision focus:** "Use relational database for structured user data"

❌ **Missing alternatives:** Only listing the chosen option
✅ **Show reasoning:** List all alternatives discussed with pros/cons

❌ **Hiding trade-offs:** Only positive consequences
✅ **Balanced view:** Honest about negatives and neutrals

---

*Good ADRs document not just what we decided, but why - preserving reasoning for future reference.*
