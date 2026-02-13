# Worklog

This directory contains the development journey throughout the hackathon.

## What's a Worklog?

A worklog is an automated diary of development progress. Each time you run `/checkpoint`, an entry is added with:
- Timestamp
- Commit message
- Files changed
- Brief summary

## Why Keep a Worklog?

- **Track progress:** See how far you've come
- **Debug issues:** Trace when something broke
- **Share learnings:** Document your journey
- **Demo material:** Great content for final presentations

## Structure

Global worklog files organized by project area:

```
worklog/
├── README.md (this file)
├── backend.md (backend changes)
├── frontend.md (frontend changes)
└── project.md (cross-cutting changes, optional)
```

## Example Entry

```markdown
## 2026-02-12 14:30 - feat(auth): add JWT authentication

**Files changed:**
- backend/src/auth.py
- backend/src/middleware.py
- backend/tests/test_auth.py

**Summary:**
Implemented JWT token generation and validation. Added middleware to protect routes.
Tokens expire after 24 hours. Discussed in ADR-0003.

**Learnings:**
- PyJWT library was easier than expected
- Needed to handle token expiration edge cases
- Claude suggested using decorator pattern - worked great!
```

## Getting Started

Run your first checkpoint:
```bash
/checkpoint feat: initial setup
```

Your worklog will be created automatically!
