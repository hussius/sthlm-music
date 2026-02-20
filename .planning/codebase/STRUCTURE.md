# Codebase Structure

**Analysis Date:** 2026-02-20

## Directory Layout

```
agents-hackathon/
├── src/                              # Source code package
│   └── main.py                       # FastAPI application entry point
├── tests/                            # Test suite
│   └── test_main.py                  # Application tests
├── .claude/                          # Claude Code configuration and tools
│   ├── bin/                          # Local tool binaries
│   │   ├── dcg                       # Destructive Command Guard (gitignored)
│   │   └── .gitkeep
│   ├── agents/                       # GSD agent definitions
│   ├── gsd/                          # GSD workflow system (git clone, local)
│   ├── mem-lite/                     # Memory system for persistence (git clone, local)
│   ├── hooks/                        # Claude Code hooks
│   ├── commands/                     # GSD commands
│   ├── settings.json                 # Claude Code settings
│   ├── settings.local.json           # Local Claude Code settings
│   ├── package.json                  # Node dependencies for Claude tools
│   └── package-lock.json
├── .planning/                        # GSD planning output (generated)
│   └── codebase/                     # Codebase analysis documents
├── .gitlab/                          # GitLab CI configuration
│   └── merge_request_templates/      # MR templates
├── .git/                             # Git repository metadata
├── .venv/                            # Python virtual environment (gitignored)
├── pyproject.toml                    # Python project configuration
├── uv.lock                           # uv dependency lock file
├── Makefile                          # Build and development commands
├── Dockerfile                        # Container image definition
├── CLAUDE.md                         # Claude Code instructions
├── README.md                         # Project documentation
├── .dockerignore                     # Files to exclude from Docker build
├── .gitignore                        # Git ignore rules
├── .gitlab-ci.yml                    # GitLab CI/CD pipeline
├── .pre-commit-config.yaml           # Pre-commit hook configuration
├── .env.example                      # Environment variable template
└── gsd-file-manifest.json            # GSD file tracking (generated)
```

## Directory Purposes

**src/**
- Purpose: Core application source code
- Contains: Python modules, FastAPI application definition
- Key files: `main.py` (primary entry point)

**tests/**
- Purpose: Test suite for application validation
- Contains: pytest test files
- Key files: `test_main.py` (application tests)

**.claude/**
- Purpose: Claude Code local configuration and development tools
- Contains: Settings, agent definitions, local tool installations
- Subpurpose (bin/): Locally-installed safety and build tools
- Subpurpose (agents/): GSD agent definitions for workflow automation
- Subpurpose (gsd/): GSD workflow system (cloned from GitHub, gitignored)
- Subpurpose (mem-lite/): Memory persistence system (cloned from GitHub, gitignored)
- Subpurpose (hooks/): Claude Code pre-tool-use hooks for integration

**.planning/**
- Purpose: GSD workflow state and analysis output (generated)
- Contains: Roadmaps, phase plans, codebase analysis documents
- Note: Created by GSD on first use, not committed to git initially

**.gitlab/**
- Purpose: GitLab-specific configuration
- Contains: Merge request templates for different branch workflows

## Key File Locations

**Entry Points:**
- `src/main.py`: FastAPI application server entry point, defines routes and runs uvicorn
- `Makefile`: CLI entry point for development tasks

**Configuration:**
- `pyproject.toml`: Python project metadata, dependencies, tool configuration (ruff, setuptools)
- `Makefile`: Build and development automation
- `Dockerfile`: Container runtime configuration
- `.pre-commit-config.yaml`: Git pre-commit hook configuration
- `.gitlab-ci.yml`: CI/CD pipeline definition

**Core Logic:**
- `src/main.py`: Only source file - contains complete application logic

**Testing:**
- `tests/test_main.py`: Test suite (currently minimal - single passing test)
- `pytest.ini` or `pyproject.toml [tool.pytest]`: pytest configuration (none currently, uses defaults)

## Naming Conventions

**Files:**
- Python source files: `lowercase_with_underscores.py` (e.g., `main.py`, `test_main.py`)
- Config files: Snake case and dotfiles (e.g., `.pre-commit-config.yaml`, `.env.example`)
- Documentation: UPPERCASE.md (e.g., `README.md`, `CLAUDE.md`)

**Directories:**
- Source code: `src/` (standard Python package convention)
- Tests: `tests/` (co-located outside src/, standard pytest convention)
- Tools/config: Dotted directories for dotfiles (`.claude/`, `.git/`, `.gitlab/`)
- Generated/build artifacts: Dotted directories (`.planning/`, `.venv/`)

**Python Modules:**
- Package setup: setuptools via pyproject.toml with package-dir mapping
- Module discovery: Automatic via setuptools.packages.find with where=["src"]

## Where to Add New Code

**New Feature:**
- Primary code: Create new module in `src/` (e.g., `src/services/user.py` for user service)
- Tests: Create corresponding test file in `tests/` (e.g., `tests/test_user.py`)
- Routes: Add new @app.get()/@app.post() handlers to `src/main.py` or import from new modules
- Dependencies: Add to `dependencies = []` in `pyproject.toml`, then run `uv sync`

**New Component/Module:**
- Implementation: `src/[module_name]/` or `src/[module_name].py` depending on size
- Pattern: Follow existing FastAPI patterns (type hints, docstrings, Pydantic models)
- Organization: Group related functionality - e.g., database models in `src/models/`, handlers in `src/routes/`

**Utilities:**
- Shared helpers: `src/utils/` directory (e.g., `src/utils/helpers.py`)
- Constants: `src/config.py` or `src/constants.py`
- Middleware: `src/middleware/` directory if cross-cutting concerns needed

**Configuration:**
- Environment variables: `.env` file (see `.env.example` template)
- Application config: `src/config.py` for settings management

## Special Directories

**.claude/ (local tooling):**
- Purpose: Local Claude Code environment configuration
- Generated: bin/, gsd/, mem-lite/ are cloned/installed (not generated from code)
- Committed: settings.json and agents/ are committed; bin/, gsd/, mem-lite/ are gitignored
- Installation: Controlled by `make install` (runs install-gsd, install-dcg, install-mem-lite)
- Symlinks: `.claude/commands/gsd/` links to GSD commands installed locally

**.planning/ (GSD state):**
- Purpose: Persistent workflow state and analysis documents
- Generated: Yes - created by GSD on first use
- Committed: Only the analysis documents (ARCHITECTURE.md, STRUCTURE.md, etc.); plans and roadmaps may be auto-generated
- Structure: Contains subdirectories for different analysis types (codebase/, phase-plans/, etc.)

**.venv/ (Python environment):**
- Purpose: Virtual environment with installed dependencies
- Generated: Yes - created by `uv sync`
- Committed: No - gitignored
- Management: Use `uv sync` to update; never edit directly

**node_modules/ (Node packages):**
- Purpose: Node dependencies for Claude tools (Playwright MCP, GSD, mem-lite)
- Generated: Yes - created by `npm install` in .claude/
- Committed: No - gitignored
- Management: Use `npm install` in `.claude/`; created for tool dependencies, not application code

## Import and Module Patterns

**Package imports:**
- Application import: `from src.main import app` (after installation via uv)
- Internal imports: Relative imports within src/ (e.g., `from src.models import User`)
- Third-party: Standard import names (e.g., `from fastapi import FastAPI`)

**Setuptools configuration:**
- Package discovery: `setuptools.packages.find` looks in `src/` directory
- Package directory: `package-dir = {"": "src"}` tells setuptools src/ is the root
- Installation: `uv sync` installs package in editable mode via pyproject.toml configuration

---

*Structure analysis: 2026-02-20*
