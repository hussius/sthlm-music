---
created: 2026-02-25T21:08:42.943Z
title: Fix pre-commit hook blocking commits
area: tooling
files:
  - .git/hooks/pre-commit
---

## Problem

All `git commit` attempts fail with:

```
`pre-commit` not found.  Did you forget to activate your virtualenv?
```

The pre-commit hook runs but can't find the `pre-commit` binary in PATH. This blocked committing the v1.0 audit gap closure changes (staged: `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, `.planning/v1.0-MILESTONE-AUDIT.md`).

The project has a `.pre-commit-config.yaml` or hook that requires the `pre-commit` Python package to be installed and available in the shell environment.

## Solution

1. Install pre-commit: `pip install pre-commit` or `brew install pre-commit`
2. Activate virtualenv if one is being used: `source venv/bin/activate`
3. Run `pre-commit install` to wire hooks
4. Then commit the staged planning files:
   ```
   git commit -m "docs(roadmap): add gap closure phases 5-6 from v1.0 audit"
   ```

Alternatively, if pre-commit is not intentionally used, remove the hook: `rm .git/hooks/pre-commit`
