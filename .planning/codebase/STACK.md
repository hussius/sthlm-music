# Technology Stack

**Analysis Date:** 2026-02-20

## Languages

**Primary:**
- Python 3.12 - Backend application code and development tooling

## Runtime

**Environment:**
- Python 3.12+ (minimum requirement specified in `pyproject.toml`)

**Package Manager:**
- `uv` (Astral's fast Python package manager)
- Lockfile: `uv.lock` (present and frozen)

## Frameworks

**Core:**
- FastAPI 0.129.0 - Web framework for REST API development
- Starlette (as FastAPI dependency) - ASGI web framework
- SQLModel 0.0.31 - SQL database ORM combining SQLAlchemy and Pydantic

**Web Server:**
- Uvicorn 0.17.0+ (standard extra via FastAPI) - ASGI server for running FastAPI applications
- Uvloop (optional performance improvement for async I/O)

**Configuration & Validation:**
- Pydantic 2.12.3+ - Data validation and settings management
- Pydantic Settings - Environment variable management via Pydantic
- Python-dotenv - Load environment variables from `.env` files

**CLI & Tools:**
- Typer - Building CLI applications
- Fastapi-cli - FastAPI development CLI commands
- Click 8.3.1 - Command-line interface utility

## Key Dependencies

**Critical:**
- SQLAlchemy (via SQLModel) - SQL toolkit and ORM
- Starlette - ASGI framework
- Pydantic - Data validation and serialization

**Infrastructure:**
- Uvicorn - ASGI server implementation
- Httpx 0.28.1 - HTTP client library for async/sync requests
- Httpcore 1.0.9 - Low-level HTTP client

**HTTP/Network:**
- H11 0.16.0 - HTTP/1.1 protocol implementation
- Anyio 4.12.1 - Async I/O library abstraction
- Httptools 0.7.1 - Fast HTTP parsing
- Websockets - WebSocket protocol support

**Utilities:**
- Typing-extensions - Backported typing features for older Python
- Certifi 2026.1.4 - Mozilla CA bundle for SSL verification
- Jinja2 3.1.6 - Template engine

**Development/Admin:**
- Email-validator 2.3.0 - Email validation library
- Python-multipart - Multipart form data parsing

## Testing

**Framework:**
- Pytest 8.0.0+ - Test runner and framework

**Infrastructure:**
- Pluggy 1.6.0 - Plugin system for pytest
- Iniconfig 2.3.0 - INI configuration parsing
- Packaging 26.0 - Package version handling

## Linting & Code Quality

**Code Style:**
- Ruff 0.3.0+ - Fast Python linter and formatter
  - Covers: Pycodestyle (E), Pyflakes (F), isort (I), pyupgrade (UP), typing (TC), naming (N), security (S), docstrings (D), annotations (ANN)
  - Config: `pyproject.toml` with line-length of 88 characters
  - Pre-commit hook: `v0.15.1` via `ruff-pre-commit`

**Type Checking:**
- Ty 0.0.15 - Type checker for Python

## Build & Development

**Build System:**
- Setuptools (implicit via `uv`) - Python package building

**Pre-commit:**
- Pre-commit 4.5.1 - Git hook framework
  - Hooks: Ruff format and lint checks

## Runtime Configuration

**Environment:**
- Python environment variables via Pydantic Settings
- `.env` file support via python-dotenv
- Example: `.env.example` specifies `OPENAI_API_KEY` configuration

**Build Configuration:**
- `pyproject.toml` - Project metadata and tool configuration
- `uv.lock` - Frozen dependency lock file (reproducible builds)

## Deployment

**Containerization:**
- Docker - Container platform
- Dockerfile uses Python 3.12-slim base image
- Multi-stage build with `uv` binary copied from official `uv` container

**Container Build Process:**
- `FROM python:3.12-slim` base
- `uv` installed from official container
- Dependencies installed via `uv sync --frozen` (no dev dependencies)
- Project code copied and executed

**CI/CD:**
- GitLab CI (`.gitlab-ci.yml`) - Continuous integration pipeline
- Image: `python:3.12-slim`
- Pipeline stages: lint
- Lint job: runs ruff format check, ruff lint check, ty type check

## Platform Requirements

**Development:**
- Python 3.12+ (minimum)
- Node.js / npm - Required for Playwright MCP tool
- Git - Required for development workflow and pre-commit hooks
- Docker (optional) - For containerized development/deployment

**Production:**
- Deployment target: Docker containers or serverless Python environments
- ASGI-compatible server (Uvicorn or alternatives)
- Python 3.12 runtime

## Developer Tools (Project-Local)

**Installed via Make:**
- DCG (Destructive Command Guard) - Safety guard at `.claude/bin/dcg`
- Playwright MCP - Browser automation at `.claude/node_modules/.bin/playwright-mcp`
- claude-mem-lite - Persistent memory at `.claude/mem-lite/`
- GSD (get-shit-done) - Workflow automation at `.claude/gsd/`

---

*Stack analysis: 2026-02-20*
