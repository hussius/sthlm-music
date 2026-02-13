# Agents Hackathon Development Guidelines

Welcome to the Agents Hackathon! This guide establishes our development philosophy and workflow for building with AI coding agents.

## 🎯 Philosophy

**You own the vision. Claude handles the implementation.**

This hackathon is about exploring what's possible when you combine human creativity with AI execution. Be ambitious, experiment fearlessly, and document your journey.

## 🎬 TAPE Workflow (Think → ADR → Plan → Execute)

For significant features and architectural decisions, use the **TAPE methodology**:

### 1️⃣ **Talk Phase**
Discuss your idea conversationally with Claude:
- Explore different approaches and trade-offs
- Consider alternatives and edge cases
- Continue until you've explored all angles
- **Goal:** Reach clarity on what you want to build

### 2️⃣ **ADR Phase**
Run `/adr [title]` to create an Architecture Decision Record:
- Claude documents the decision in `/docs/adr/ADR-NNNN-title.md`
- Review the ADR and approve before implementation
- ADRs are immutable once accepted (create new ones to supersede)
- **Goal:** Document your reasoning for future reference

### 3️⃣ **Plan Phase**
Request a detailed implementation plan:
- Claude creates a step-by-step plan referencing the ADR
- Includes files to modify, key changes, testing strategy
- Verify you're **90% confident** before proceeding
- **Goal:** Reduce wasted implementation time

### 4️⃣ **Execute Phase**
Implement with frequent checkpoints:
- Run `/checkpoint [type]: [message]` after each logical chunk
- Claude commits your work and updates the worklog
- Tests run before commits (when applicable)
- **Goal:** Create save points you can roll back to

### When to Use TAPE

**Use TAPE for:**
- New features with architectural impact
- Significant refactors
- Technology/framework/library choices
- Database schema changes
- API design decisions

**Skip TAPE for:**
- Small bug fixes
- Documentation updates
- Minor tweaks and adjustments
- Obvious implementations

## 💾 Commit Philosophy

**Commit early, commit often.** Treat commits as save points in a game.

### When to Commit
- After each complete function/component
- After each test suite passes
- After each refactor completes
- Before trying something risky
- End of each work session

### Commit Format
Use [Conventional Commits](https://www.conventionalcommits.org/):
- `feat(scope): add new feature`
- `fix(scope): resolve bug`
- `refactor(scope): restructure code`
- `docs(scope): update documentation`
- `test(scope): add tests`

**Examples:**
- `feat(auth): add JWT token validation`
- `fix(api): handle null user response`
- `refactor(db): extract query builder to helper`

### Automated Checkpoints
Use `/checkpoint [message]` to automate:
1. Run tests (if applicable)
2. Stage and commit changes
3. Append entry to worklog with timestamp and file list

## 🚫 Hard Rules (Non-Negotiable)

1. **No secrets in code** - Use environment variables for all credentials
2. **ADRs for architectural decisions** - Document your reasoning
3. **Test before committing** - Broken commits slow everyone down
4. **Branch for experiments** - Keep main branch stable

## 🎨 Creative Freedom

Within the hard rules, you have **complete creative freedom**:
- Try unconventional approaches
- Experiment with new patterns
- Challenge conventional wisdom (with justification)
- Build something surprising

**This is a hackathon** - take risks, learn fast, have fun!

## 📚 Additional Resources

- **Detailed workflows:** See `.claude/rules/` for in-depth guidance
- **Skills documentation:** `.claude/skills/` for automation tools
- **ADR templates:** `docs/adr/template.md`
- **Your worklog:** `docs/worklog/` to track your journey
- **Backend specifics:** `backend/CLAUDE.md`
- **Frontend specifics:** `frontend/CLAUDE.md`

---

*Remember: The goal isn't perfect code. It's learning, experimenting, and building something cool.*
