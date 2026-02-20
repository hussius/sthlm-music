# Codebase Concerns

**Analysis Date:** 2026-02-20

## Minimal Application Scope

**Current State:**
- Project is a template repo designed for the Codon agentic coding hackathon
- Only contains mock/placeholder code as a starting point
- Single FastAPI endpoint returning hardcoded response
- Single placeholder test that always passes
- No actual domain logic, data models, or features implemented

**Impact:** The project is intentionally skeletal and designed to be replaced with actual implementation. This is not a concern but rather by design.

## Test Coverage Gaps

**Placeholder Testing:**
- Files: `tests/test_main.py`
- What's not tested: The current test (`test_package`) is a placeholder that asserts `True` with no actual coverage of `src/main.py`
- Risk: As actual functionality is added to `src/main.py`, there will be no guidance from existing test patterns. New code will need comprehensive tests from the start.
- Priority: **High** - Address immediately when implementing real features

**No Test Data / Fixtures:**
- Location: No fixtures or test factories established
- Risk: Future tests will need to establish patterns for test data setup
- Recommendation: Create `tests/conftest.py` with shared fixtures and factories once domain models are introduced

## Incomplete Dependencies

**Unused but Declared Dependencies:**
- `sqlmodel>=0.0.31` is in `pyproject.toml` but not imported anywhere
- `pydantic>=2.12.3` is imported but only indirectly via FastAPI
- Files: `pyproject.toml` (lines 7-11)
- Impact: Project declares more than it needs, making it harder to understand actual requirements
- Recommendation: Remove or document why these are pre-declared for the hackathon template

## Configuration Concerns

**Hardcoded Server Binding:**
- File: `src/main.py` (line 17)
- Current: `uvicorn.run(app, host="127.0.0.1", port=8098)`
- Risk: Localhost binding means server cannot accept external connections. Port 8098 is non-standard and may conflict. These should be configurable via environment variables for production use.
- Fix approach: Use `os.getenv("HOST", "0.0.0.0")` and `os.getenv("PORT", "8000")` patterns

**Incomplete Environment Configuration:**
- File: `.env.example` only contains `OPENAI_API_KEY=` placeholder
- Missing: Database URL, logging level, debug flags, other required config
- Risk: As real features are added, developers must create their own `.env` files from scratch with no template guidance
- Recommendation: Expand `.env.example` with all required keys as features are implemented

## Deployment Concerns

**Docker Build Incomplete:**
- File: `Dockerfile`
- Current: Copies dependencies but doesn't install the project itself (missing `uv pip install -e .`)
- Also: Missing `EXPOSE` directive, no `CMD` or `ENTRYPOINT` instruction
- Impact: Docker image won't run the application without manual command specification
- Fix approach: Add final stages to install project and define entry point

**CI/CD Linting Only:**
- File: `.gitlab-ci.yml`
- Current: Only runs format checks and type checking, no tests executed
- Missing: `uv run pytest` in CI pipeline
- Impact: Broken tests won't block merge requests. As functionality is added, CI must be updated to run test suite.
- Priority: **High** - Add test stage to `script` before merging real features

## Development Workflow Concerns

**Makefile TODOs:**
- File: `Makefile` (line 1)
- Note: `# TODO: replace with just? (https://github.com/casey/just)` indicates future refactoring planned
- Impact: Low priority, but represents a known technical debt for future cleanup

**Pre-commit Hooks Limited:**
- File: `.pre-commit-config.yaml`
- Current: Only Ruff format and lint hooks configured
- Missing: No type checking, security scanning, or test hooks
- Recommendation: Consider adding pre-commit hooks for `ty` (type checker) and pytest when feature development begins

## Security Observations

**No Input Validation:**
- File: `src/main.py`
- Current mock endpoint doesn't validate any inputs (it accepts no parameters)
- Risk: When real endpoints are added, developers must remember to validate and sanitize inputs
- Recommendation: Use Pydantic models for all request/response schemas to enforce validation

**OPENAI_API_KEY in Plain .env:**
- File: `.env.example`
- Note: The environment file would contain secrets if populated
- Risk: Developers might accidentally commit `.env` to git despite `.gitignore` rules
- Current mitigation: `.env` is in `.gitignore`
- Recommendation: Ensure `.env` stays in `.gitignore` throughout project lifecycle

**No CORS Configuration:**
- File: `src/main.py`
- Current: No CORS middleware configured
- Risk: If frontend is added that calls this API from a different domain, requests will fail
- Recommendation: Add `CORSMiddleware` configuration from `fastapi.middleware.cors` when building real features

## Error Handling Gaps

**No Error Handling:**
- File: `src/main.py`
- Current: Mock endpoint has no error handling
- Missing: No custom exception handlers, no validation error responses
- Risk: Real endpoints need proper error handling for operational stability
- Recommendation: Establish error handling patterns early (custom exception classes, FastAPI exception handlers)

## Logging Not Configured

**No Logging Setup:**
- Files: `src/main.py`, entire `src/` directory
- Current: No logging framework initialized or configured
- Impact: As application scales, debugging without logs becomes very difficult
- Recommendation: Configure Python logging at application startup (consider `structlog` for structured JSON logs)

## Database Strategy Unclear

**SQLModel Declared but No Schema:**
- File: `pyproject.toml` (line 10)
- Current: Dependency included but no models, tables, or database connection
- Missing: Database URL configuration, migration strategy, connection pooling setup
- Risk: Without early DB design, code will lack consistency in data access patterns
- Recommendation: Define SQLModel base setup and connection patterns in `src/` before implementing features

## Performance Considerations

**Uvicorn Direct Execution:**
- File: `src/main.py` (lines 14-17)
- Current: Uses single-worker Uvicorn directly
- Risk: No production-grade application server (Gunicorn/uWSGI), no worker configuration
- Impact: Single worker cannot handle concurrent requests efficiently
- Recommendation: Switch to Gunicorn with multiple Uvicorn workers for production

**No Async Patterns:**
- File: `src/main.py`
- Current: Endpoint is synchronous (`def hello_world()` not `async def`)
- Risk: As I/O-bound operations are added (DB queries, API calls), lack of async will create bottlenecks
- Recommendation: Establish async patterns from the start (use `async def` for all endpoint handlers)

## Project Structure Risks

**Monolithic Structure Ready:**
- Current: All application code in `src/main.py`
- Risk: As features grow, this single file will become unmaintainable
- Recommendation: Establish module structure early:
  - `src/api/routes/` for endpoint definitions
  - `src/services/` for business logic
  - `src/models/` for SQLModel and Pydantic schemas
  - `src/db/` for database session and setup

## Documentation Gaps

**No API Documentation:**
- Files: None
- Current: Docstrings exist but no formal API docs configured
- Impact: As endpoints multiply, developers need OpenAPI/Swagger documentation
- Current state: FastAPI auto-generates docs at `/docs` and `/redoc`, but no custom documentation
- Recommendation: Ensure meaningful endpoint descriptions in docstrings for auto-generated docs

---

*Concerns audit: 2026-02-20*
