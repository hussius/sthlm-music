# External Integrations

**Analysis Date:** 2026-02-20

## APIs & External Services

**AI/LLM Services:**
- OpenAI - Configured but not actively integrated in current codebase
  - SDK: Not installed (would be via `openai` package)
  - Auth: `OPENAI_API_KEY` environment variable (defined in `.env.example`)
  - Status: Template/placeholder for future integration

## Data Storage

**Databases:**
- SQL-compatible databases (SQLAlchemy/SQLModel support)
  - Connection: Environment variable configuration via Pydantic Settings
  - Client: SQLModel (combines SQLAlchemy + Pydantic)
  - ORM: SQLAlchemy (via SQLModel)
  - Status: ORM infrastructure available, no active database in template code

**File Storage:**
- Local filesystem only (no cloud storage integration detected)

**Caching:**
- None detected in current stack

## Authentication & Identity

**Auth Provider:**
- Custom implementation expected (no third-party auth libraries installed)
- Email validation available via `email-validator` package
- Pydantic Settings provides environment-based configuration

**Approach:**
- Pydantic-based validation for credentials
- Environment variable configuration for secrets

## Monitoring & Observability

**Error Tracking:**
- Sentry SDK 7.14.0+ available (installed as dependency via transitive deps)
  - Has integrations for OpenAI, Anthropic, LangChain
  - Status: Available but not actively configured
- Built-in support not implemented in template code

**Logs:**
- Standard Python logging (via Uvicorn/FastAPI)
- Console-based output only in template

**HTTP Tracing:**
- Httpx provides HTTP client instrumentation capability
- Starlette/FastAPI middleware hooks available

## CI/CD & Deployment

**Hosting:**
- Docker-compatible (Dockerfile present)
- GitLab CI pipeline configured

**CI Pipeline:**
- GitLab CI with stages: `lint`
- Lint stage: Python 3.12-slim image, runs ruff and ty checks
- Pipeline triggers: merge requests, commits to branches

**Deployment Approach:**
- Docker containerization with `uv` for reproducible builds
- Frozen lock file (`uv.lock`) for dependency reproducibility
- No production deployment targets configured in template

## Environment Configuration

**Required Environment Variables:**
- `OPENAI_API_KEY` - Placeholder (specified in `.env.example`)

**Configuration Method:**
- Environment variables via Python-dotenv (`.env` file)
- Pydantic Settings for typed configuration management
- Uvicorn configuration via environment and CLI

**Secrets Storage:**
- `.env` file (locally only, gitignored)
- `.env.example` as template showing required keys

## HTTP Client Configuration

**HTTP Library:**
- Httpx 0.28.1 - async/sync HTTP client
- Used by: FastAPI dependencies and custom code
- Supports both async and synchronous operations
- Includes: retry logic, timeouts, SSL verification

**DNS Resolution:**
- Dnspython 2.8.0 - DNS resolution library (for async DNS lookups)

## Webhook & Callback Infrastructure

**Incoming Webhooks:**
- FastAPI routes can receive POST requests for webhooks
- Template includes GET endpoint at `/` but webhook endpoints not implemented
- Multipart form parsing available via `python-multipart`

**Outgoing Webhooks:**
- Httpx available for making outbound HTTP calls
- No active webhook integrations implemented

## Development Tools (Non-Production)

**Code Quality Integration:**
- Pre-commit hooks for Ruff (format and lint checks)
- Ruff integrates with CI pipeline

**Testing Infrastructure:**
- Pytest for unit/integration tests
- Pytest runs in CI pipeline (via Makefile: `make test`)

**Type Checking:**
- Ty for Python static type analysis
- Integrated in CI pipeline

---

*Integration audit: 2026-02-20*
