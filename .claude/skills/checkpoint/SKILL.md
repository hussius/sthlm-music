---
name: checkpoint
description: Commit work and update worklog automatically
args:
  message: Commit message in Conventional Commits format (e.g., "feat(auth): add JWT validation")
  no-test: Optional flag to skip running tests before commit
---

# Create Development Checkpoint

Automate committing your work and updating the worklog with a single command.

## What This Does

1. ✅ Runs tests (if applicable and not --no-test)
2. ✅ Stages all changes
3. ✅ Creates commit with proper formatting
4. ✅ Appends entry to worklog with timestamp and details
5. ✅ Confirms success

## Usage

```
/checkpoint <type>(<scope>): <description>
/checkpoint --no-test <type>(<scope>): <description>
```

### Examples

```
/checkpoint feat(auth): add JWT token validation
/checkpoint fix(api): handle null user response
/checkpoint refactor(db): extract query builder
/checkpoint --no-test wip(feature): incomplete user service
```

## Steps

### 1. Validate Message Format

Check that message follows Conventional Commits format:
- Has type: `feat`, `fix`, `refactor`, `docs`, `test`, `style`, `chore`, `perf`, `wip`
- Optional scope in parentheses: `(auth)`, `(api)`, `(db)`
- Colon and space: `: `
- Description in imperative mood: "add" not "added"

**If invalid format:**
- Explain the issue
- Show correct format examples
- Ask user to retry with proper format

### 2. Determine Test Strategy

**Check if we should run tests:**

**Run tests if:**
- `--no-test` flag NOT present
- AND we're in backend/ or frontend/ directory
- AND tests exist (check for `tests/` directory or `test_*.py` / `*.test.ts` files)
- AND message type is: `feat`, `fix`, `refactor`, `perf`

**Skip tests if:**
- `--no-test` flag present
- OR message type is: `docs`, `style`, `chore`
- OR no tests exist
- OR in root directory

### 3. Run Tests (if applicable)

**For backend (Python):**
```bash
cd backend && make test
```

**For frontend (if package.json exists):**
```bash
cd frontend && npm test
```

**If tests fail:**
- Show test output
- Ask: "Tests failed. Options:
  1. Fix the tests/code and try again
  2. Commit anyway with --no-test (use for WIP commits)
  3. Cancel checkpoint

  What would you like to do?"
- Wait for user decision

**If tests pass:**
- ✅ Continue to commit step

### 4. Stage and Commit

```bash
git add -A
git commit -m "<message>

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

**Handle commit failures:**
- If pre-commit hooks fail, show output and explain
- If nothing to commit, inform user: "No changes to commit. Working tree is clean."
- If other error, show error and suggest fixes

### 5. Update Worklog

**This project uses three global worklog files:**

1. **`/docs/worklog/backend.md`** - Backend-specific changes
2. **`/docs/worklog/frontend.md`** - Frontend-specific changes
3. **`/docs/worklog/project.md`** - Cross-cutting/infrastructure changes

**Determine which worklog(s) to update:**
- Changes ONLY in `backend/` → Update `backend.md`
- Changes ONLY in `frontend/` → Update `frontend.md`
- Changes in BOTH `backend/` AND `frontend/` → Update BOTH files
- Root-level files (Makefile, README, CLAUDE.md, etc.) → Update `project.md`
- Infrastructure files (docs/, .claude/, .github/) → Update `project.md`

**Create worklog file if doesn't exist:**

```markdown
# Backend Worklog
# (or "Frontend Worklog" or "Project Worklog")

Development journal for backend/frontend/project changes in the Agents Hackathon.

---
```

**Append entry format:**

```markdown
## [YYYY-MM-DD HH:MM] - [Commit message]

**Commit:** [7-char hash]
**ADR:** [ADR-NNNN-title or N/A]

**Files changed:**
- [List of files from git diff]

**Summary:**
[Brief summary of what changed - generate from git diff]

**Notes:**
[Any additional context if relevant]

---
```

### 6. Confirm Success

Show user:
```
✅ Checkpoint created successfully!

Commit: [first 7 chars of commit hash]
Message: [commit message]
Files changed: [count] files
Worklog updated: docs/worklog/[name].md

View commit: git show HEAD
View worklog: cat docs/worklog/[name].md | tail -30
```

## Detailed Example

**User command:**
```
/checkpoint feat(auth): add JWT token generation
```

**Execution:**

1. **Validate:** ✅ Valid Conventional Commits format

2. **Test strategy:** We're in backend/, tests exist, type is `feat` → run tests

3. **Run tests:**
   ```bash
   cd backend && make test
   ```
   Output: All tests passed ✅

4. **Stage and commit:**
   ```bash
   git add -A
   git commit -m "feat(auth): add JWT token generation

   Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
   ```
   Commit hash: `a3f7b2c`

5. **Update worklog** (`docs/worklog/drew.md`):
   ```markdown
   ## 2026-02-12 15:45 - feat(auth): add JWT token generation

   **Files changed:**
   - backend/src/auth/jwt.py
   - backend/src/auth/__init__.py
   - backend/tests/test_jwt.py

   **Summary:**
   Created JWT token generation functionality using PyJWT library. Tokens include
   user ID and expiration timestamp (24h default). Added tests for generation and
   validation including expiration edge cases.

   **Notes:**
   Implements security approach from ADR-0003. Tokens are signed with HS256 algorithm
   using secret from environment variable.

   ---
   ```

6. **Confirm:**
   ```
   ✅ Checkpoint created successfully!

   Commit: a3f7b2c
   Message: feat(auth): add JWT token generation
   Files changed: 3 files
   Worklog updated: docs/worklog/drew.md

   View commit: git show HEAD
   View worklog: cat docs/worklog/drew.md | tail -30
   ```

## Edge Cases

### No Changes to Commit

If `git status` shows no changes:
```
⚠️ No changes to commit. Working tree is clean.

Either:
- You already committed these changes
- No files were modified
- All changes are in .gitignore

Use 'git status' to verify.
```

### Merge Conflicts

If user has unresolved merge conflicts:
```
❌ Cannot create checkpoint: Merge conflicts detected

Resolve conflicts first:
1. Check conflicted files: git status
2. Edit files to resolve conflicts
3. Stage resolved files: git add [file]
4. Try checkpoint again

Need help resolving? Ask me: "Help resolve merge conflicts"
```

### Detached HEAD

If in detached HEAD state:
```
⚠️ Warning: You're in a detached HEAD state.

Create a branch first: git checkout -b [branch-name]

Then try checkpoint again.
```

### Large Commits

If commit involves 20+ files:
```
⚠️ Large commit detected: 25 files changed

Consider splitting into smaller commits:
- Easier to review
- Easier to debug
- Easier to revert if needed

Proceed anyway? (yes/no)
```

## Worklog Entry Quality

### Good Summary

✅ **Generated from git diff:**
```
Created JWT token generation functionality using PyJWT library. Tokens include
user ID and expiration (24h). Added validation tests including expiration edge cases.
```

❌ **Too vague:**
```
Added JWT stuff.
```

❌ **Too detailed:**
```
Added import for PyJWT on line 3, defined generate_token function on lines 10-25
with parameters user_id (int) and expiration_hours (int, default 24)...
```

### When to Add Notes

Add Notes section when:
- Referencing an ADR: "Implements ADR-0003"
- Known issues: "Tests pass but performance needs optimization"
- Future work: "TODO: Add refresh token support"
- Learning: "Discovered PyJWT is easier than manual JWT creation"
- Context: "This fixes the bug reported in #42"

Skip Notes section if commit is straightforward.

## Tips

- **Use descriptive commit messages** - Future you will thank you
- **Checkpoint often** - Every 30-60 minutes minimum
- **Don't fear small commits** - Better than losing work
- **Review before checkpoint** - Quick git diff to verify changes
- **Use --no-test sparingly** - Tests catch bugs early

## Quick Reference

```bash
# Standard checkpoint
/checkpoint feat(auth): add JWT validation

# Skip tests (for WIP commits)
/checkpoint --no-test wip(feature): incomplete implementation

# Documentation only
/checkpoint docs(readme): update setup instructions

# After fixing a bug
/checkpoint fix(api): handle null response from user service

# After refactoring
/checkpoint refactor(db): extract query builder to utils

# View your worklog
cat docs/worklog/your-name.md
```

---

*Regular checkpoints create save points you can always roll back to, making experimentation safer.*
