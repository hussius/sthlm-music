---
paths:
  - "**/*.py"
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
---

# Commit Policy for AI-Assisted Development

This document defines commit frequency, formatting, and automation for the hackathon.

## Core Principle

**Commit early, commit often.** Even more than normal hand-coding.

### Why Frequent Commits with AI?

1. **Checkpoints:** If AI's next suggestion breaks something, you have recent save points
2. **Debugging:** Easy to pinpoint which change caused issues
3. **Documentation:** Commit messages document your development process
4. **Safety net:** Can revert or cherry-pick without losing hours of work

Think of commits as "save points in a game" - save before boss fights (risky changes).

## When to Commit

### Always Commit After:
- ✅ Each complete function/component implementation
- ✅ Each test suite passes
- ✅ Each refactor completes successfully
- ✅ Adding/updating documentation
- ✅ Fixing a bug

### Always Commit Before:
- ⚠️ Trying something risky or experimental
- ⚠️ Major refactoring
- ⚠️ Switching context/tasks
- ⚠️ End of work session (even if incomplete)

### Commit Frequency Guidelines

**Minimum:** Every 30-60 minutes of active work
**Ideal:** After each logical unit of work (10-30 minutes)
**Maximum:** Never go 2+ hours without committing

**If you're unsure:** Commit. Better too many than too few.

## Commit Message Format

Use **Conventional Commits** format:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code restructuring without behavior change
- `docs`: Documentation changes
- `test`: Adding or updating tests
- `style`: Formatting, whitespace, semicolons (no code change)
- `chore`: Build process, dependencies, tooling
- `perf`: Performance improvements

### Scope

Optional but recommended. Indicates which part of codebase:
- `auth`, `api`, `db`, `ui`, `routing`, etc.

### Description

- Use imperative mood: "add" not "added" or "adds"
- Don't capitalize first letter
- No period at the end
- Max 72 characters

### Examples

**Good:**
```
feat(auth): add JWT token validation
fix(api): handle null response from user service
refactor(db): extract query builder into helper function
docs(readme): update setup instructions for M1 Macs
test(user): add edge case tests for email validation
```

**Bad:**
```
fix stuff                           # Too vague
Added new feature for users         # Wrong tense, no type
feat: authentication system         # Scope missing, too broad
Fixed the bug                       # No context, which bug?
```

## Atomic Commits

Each commit should contain **one logical change**:

**✅ Good atomic commits:**
```
feat(auth): add User model
feat(auth): add JWT token generation
feat(auth): add login endpoint
test(auth): add authentication tests
```

**❌ Bad non-atomic commit:**
```
feat(auth): add authentication, fix bug in API, update README
```

### Why Atomic Commits?

- Easy to understand what changed
- Easy to revert if needed
- Easy to cherry-pick to other branches
- Clear git history for AI to analyze

## Automated Checkpoints

Use `/checkpoint <type>(<scope>): <description>` to automate:

1. Run tests in current directory (backend or frontend)
2. If tests pass:
   - Stage all changes (`git add .`)
   - Create commit with provided message
   - Append entry to worklog with timestamp and file list
3. If tests fail:
   - Show test failures
   - Ask if you want to commit anyway (sometimes WIP commits are okay)

### Checkpoint Examples

```
/checkpoint feat(auth): add JWT token validation
/checkpoint fix(api): handle null user response
/checkpoint test(user): add email validation tests
/checkpoint docs: update API documentation
```

### When to Skip Tests

Use `/checkpoint --no-test` to skip test runs when:
- Working on tests themselves
- Making documentation-only changes
- Creating WIP (work in progress) commits
- Tests require manual setup (database, external services)

Example:
```
/checkpoint --no-test wip(feature): incomplete user service implementation
```

## Branch Strategy

### Branch Naming

```
<type>/<short-description>
```

Examples:
- `feat/user-authentication`
- `fix/api-null-handling`
- `refactor/extract-db-queries`

### When to Create Branches

**Always branch for:**
- New features
- Experiments
- Refactors

**Can work on main for:**
- Small bug fixes (if team agrees)
- Documentation updates
- Initial project setup

**During hackathon:**
- Create branch for each major feature/experiment
- Merge to main when working
- Don't worry too much about perfect branch hygiene
- Focus on forward progress

## Work Diary Integration

Each `/checkpoint` automatically updates your worklog in `docs/worklog/`:

```markdown
## 2026-02-12 14:30 - feat(auth): add JWT authentication

**Files changed:**
- backend/src/auth.py
- backend/src/middleware.py
- backend/tests/test_auth.py

**Summary:**
Generated automatically from commit and git diff.
```

### Manual Worklog Entries

You can also add manual entries for non-code work:
- Design discussions
- Debugging sessions
- Research and learning

Just edit your worklog file in `docs/worklog/your-name.md`

## Handling Failed Commits

### Tests Failing

1. **Review test output carefully**
2. **Fix the code or tests**
3. **Re-run tests manually:** `make test`
4. **Try checkpoint again**

If tests fail but you want to save WIP:
```
/checkpoint --no-test wip(feature): incomplete implementation, tests failing
```

### Merge Conflicts

If you get merge conflicts:
1. **Don't panic**
2. **Run:** `git status` to see conflicted files
3. **Ask Claude:** "Help me resolve merge conflicts in [file]"
4. **After resolving:** `git add [file]` and commit

### Accidentally Committed Secrets

If you committed API keys or secrets:

1. **Immediately:** Revoke/rotate the credentials
2. **Remove from history:** Ask Claude to help with `git filter-branch` or BFG Repo-Cleaner
3. **Don't push** the commit if it's still local
4. **Learn:** Use environment variables and `.env` files (added to `.gitignore`)

## Commit Hygiene for AI Code

### AI-Generated Code Standards

- **Review before committing** - Don't blindly accept AI suggestions
- **Test thoroughly** - AI code should pass stricter tests
- **Document complex logic** - Add comments explaining "why" not "what"
- **Check for secrets** - AI might accidentally generate fake API keys

### Commit Message Checklist

Before each commit, verify:
- [ ] Message follows Conventional Commits format
- [ ] Description is clear and specific
- [ ] Scope is appropriate (if used)
- [ ] Type matches the change
- [ ] No secrets in code or message
- [ ] Tests pass (or --no-test used intentionally)

## Quick Reference

```bash
# Manual commit
git add .
git commit -m "feat(scope): description"

# Automated checkpoint (recommended)
/checkpoint feat(scope): description

# Skip tests
/checkpoint --no-test wip(scope): description

# Check status
git status

# View recent commits
git log --oneline -10

# View your worklog
cat docs/worklog/your-name.md
```

---

*Frequent, atomic commits with clear messages make AI-assisted development safer and more productive.*
