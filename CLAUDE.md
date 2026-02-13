# Agents Hackathon Development Guidelines

Welcome to the Agents Hackathon! This guide establishes our development philosophy and workflow for building with AI coding agents.

## 🎯 Philosophy

**You own the vision. Claude handles the implementation.**

This hackathon is about exploring what's possible when you combine human creativity with AI execution. Be ambitious, experiment fearlessly, and document your journey.

## 🏗️ Project Structure

This is a **full-stack application** with separate backend and frontend:

### Quick Setup for New Developers

**One command to set up everything:**
```bash
make install
```

This checks prerequisites, sets up environment files, installs all dependencies, and configures pre-commit hooks.

**Detailed setup guide:** See [SETUP.md](SETUP.md) for step-by-step instructions and troubleshooting.

### Backend (`/backend`)
- **Framework:** FastAPI 0.115+
- **Language:** Python 3.12+
- **Package Manager:** uv (not pip!)
- **Port:** 8098 (default)
- **Commands:**
  - `make install` - Install dependencies with uv
  - `make dev` - Start development server
  - `make test` - Run tests
- **IMPORTANT:** All Python commands must be run through `uv`:
  - Use `uv run python script.py` NOT `python script.py`
  - Use `uv run python -m pytest` NOT `pytest`
  - Use `uv add package` NOT `pip install package`
  - The uv environment is managed automatically - no need to activate virtualenvs
- **Details:** See `backend/CLAUDE.md` for FastAPI patterns, code style, and backend-specific guidelines

### Frontend (`/frontend`)
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **Port:** 3000 (default)
- **Commands:**
  - `npm install` - Install dependencies
  - `npm run dev` - Start development server with HMR
  - `npm test` - Run tests
  - `npm run build` - Production build
- **Details:** See `frontend/CLAUDE.md` for React patterns, component structure, and frontend-specific guidelines

### Running the Full Stack
1. **Backend:** `cd backend && make dev` (starts on port 8098)
2. **Frontend:** `cd frontend && npm run dev` (starts on port 3000)
3. **API Docs:** http://localhost:8098/docs (Swagger UI)
4. **Frontend:** http://localhost:3000

### Environment Variables
Both services use `.env` files:
- **Backend:** Copy `backend/.env.example` to `backend/.env`
- **Frontend:** Copy `frontend/.env.example` to `frontend/.env`
- Frontend API URL: Set `VITE_API_URL=http://localhost:8098`
- Backend CORS: Set `CORS_ORIGINS=http://localhost:3000`

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

**Scope examples for full-stack:**
- `backend/` prefix: `feat(backend/auth): add JWT token validation`
- `frontend/` prefix: `feat(frontend/login): add login form component`
- Feature-based: `feat(auth): add JWT validation` (when touching both)
- `fix(api): handle null user response`
- `refactor(db): extract query builder to helper`

### Worklog System

**Three global worklog files track all development:**

- **`docs/worklog/backend.md`** - Backend-specific changes
  - Use when: Changes only affect `backend/` directory
  - Examples: API endpoints, database models, Python utilities

- **`docs/worklog/frontend.md`** - Frontend-specific changes
  - Use when: Changes only affect `frontend/` directory
  - Examples: React components, UI styling, frontend routing

- **`docs/worklog/project.md`** - Cross-cutting and infrastructure changes
  - Use when: Changes affect both services or project infrastructure
  - Examples: Documentation, CI/CD, build system, root config files, setup scripts

**Worklog entry format:**
```markdown
## YYYY-MM-DD HH:MM - commit message

**Commit:** abc1234
**ADR:** ADR-NNNN-title (or N/A if no related ADR)

**Files changed:**
- path/to/file1
- path/to/file2

**Summary:**
Brief description of what changed and why.

**Notes:**
Additional context, learnings, or future work (optional).

---
```

### Automated Checkpoints
Use `/checkpoint [message]` to automate:
1. Run tests (if applicable)
2. Stage and commit changes
3. Append entry to appropriate worklog(s) with timestamp, commit hash, and ADR reference

## 🚫 Hard Rules (Non-Negotiable)

1. **No secrets in code** - Use environment variables for all credentials
2. **ADRs for architectural decisions** - Document your reasoning
3. **Test before committing** - Broken commits slow everyone down
4. **Branch for experiments** - Keep main branch stable
5. **Use uv for all Python operations** - Never use pip, python, or pytest directly
6. **Smart imports in Python** - Use absolute imports from project root to avoid import errors

## 📋 Coding Principles

### Python Import Best Practices

**CRITICAL:** Always use smart, absolute imports to avoid `ModuleNotFoundError` and import issues.

**✅ Good - Absolute imports from project root:**
```python
# In backend/src/routes/users.py
from src.models.user import User, UserCreate
from src.services.auth import get_current_user
from src.db.connection import get_db
```

**❌ Bad - Relative imports or incorrect paths:**
```python
# DON'T DO THIS
from models.user import User  # Will fail - not found
from ..models.user import User  # Fragile relative import
import user  # Ambiguous
```

**Project structure assumptions:**
- Backend uses `src/` as the package root
- All imports should start from `src.`
- Use `pyproject.toml` `[tool.setuptools]` configuration for package discovery

**When creating new Python files:**
1. Understand the project structure first (check existing files)
2. Use absolute imports matching existing patterns
3. Test imports work: `uv run python -c "from src.module import Class"`
4. If imports fail, check `pyproject.toml` package configuration

### Backend: Always Use uv

**✅ Correct commands:**
```bash
uv run python script.py          # Run Python scripts
uv run python -m pytest          # Run tests
uv run python -m module          # Run modules
uv add package                   # Add dependencies
uv remove package                # Remove dependencies
uv sync                          # Sync dependencies
```

**❌ Never use these:**
```bash
python script.py                 # ❌ Wrong - bypasses uv
pytest                           # ❌ Wrong - not in PATH
pip install package              # ❌ Wrong - use uv add
```

**Why?** uv manages the virtual environment automatically. Using `uv run` ensures:
- Correct Python version (3.12+)
- All dependencies available
- Consistent environment across team
- No need to manually activate virtualenvs

## 🎨 Creative Freedom

Within the hard rules, you have **complete creative freedom**:
- Try unconventional approaches
- Experiment with new patterns
- Challenge conventional wisdom (with justification)
- Build something surprising

**This is a hackathon** - take risks, learn fast, have fun!

## 🔄 Full-Stack Development Tips

### API Development Workflow
1. **Define data models** - Start with TypeScript interfaces and Pydantic models
2. **Implement backend endpoint** - FastAPI route with validation
3. **Test in Swagger** - Use `/docs` to verify endpoint works
4. **Add frontend service** - API client function in `frontend/src/services/`
5. **Build UI component** - React component that calls the service
6. **Test end-to-end** - Verify in browser with both services running

### Common Patterns
- **CORS:** Backend must allow frontend origin in `CORS_ORIGINS`
- **Environment vars:** Frontend vars must start with `VITE_` prefix
- **Type sharing:** Keep TypeScript/Pydantic models in sync manually
- **Error handling:** Use try/catch in frontend, raise HTTPException in backend
- **Loading states:** Always show loading/error states in UI

### Debugging Tips
- **API not reachable?** Check both services are running and CORS is configured
- **Type errors?** Verify request/response types match between frontend/backend
- **CORS errors?** Check browser console and backend logs
- **Can't find endpoint?** Use `/docs` to see all available routes

## 📚 Additional Resources

- **Detailed workflows:** See `.claude/rules/` for in-depth guidance
- **Skills documentation:** `.claude/skills/` for automation tools
- **ADR templates:** `docs/adr/template.md`
- **Your worklog:** `docs/worklog/` to track your journey
- **Backend specifics:** `backend/CLAUDE.md`
- **Frontend specifics:** `frontend/CLAUDE.md`

---

*Remember: The goal isn't perfect code. It's learning, experimenting, and building something cool.*
