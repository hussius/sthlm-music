# Coding Conventions

**Analysis Date:** 2026-02-20

## Naming Patterns

**Files:**
- All lowercase with underscores: `main.py`, `test_main.py`
- Module files represent a single functional area
- Test files prefixed with `test_`: `test_main.py`

**Functions:**
- snake_case: `hello_world()` in `/Users/hussmikael/agents-hackathon/src/main.py`
- Descriptive names that indicate purpose
- No single-letter function names

**Variables:**
- snake_case throughout: standard Python convention
- Module-level variables in UPPER_CASE if constants

**Types:**
- Type hints required on all function signatures
- Return type always annotated: `-> dict[str, str]`, `-> None`
- Use modern Python 3.12+ syntax: `dict[str, str]` not `Dict[str, str]`
- Generic types fully parameterized

## Code Style

**Formatting:**
- Line length: 88 characters (configured in `pyproject.toml` under `[tool.ruff]`)
- Tool: Ruff (configured as formatter and linter)
- Run via: `make format` which runs:
  - `uv run ruff format .`
  - `uv run ruff check --fix .`
  - `uv run ruff check --select I --fix .` (import sorting)

**Linting:**
- Tool: Ruff (`ruff>=0.3.0` in `pyproject.toml`)
- Enforced rules (from `[tool.ruff.lint]`):
  - `E`: pycodestyle errors (whitespace, indentation)
  - `F`: pyflakes errors (unused imports, undefined names)
  - `I`: import sorting (isort compatibility)
  - `UP`: pyupgrade (modern Python syntax)
  - `TC`: typing issues (import-related type checking)
  - `N`: naming conventions (PEP8 names)
  - `S`: security issues (SQL injection, hardcoded passwords)
  - `D`: docstring issues
  - `ANN`: annotations (enforce type hints)
- Ignored rules:
  - `D203`: blank line before class docstring (incompatible with D211)
  - `D212`: summary line on next line (incompatible with D213)
  - `ANN401`: Allow `Any` type where appropriate
- Test-specific exceptions in `[tool.ruff.lint.extend-per-file-ignores]`:
  - `S101` disabled in `tests/*.py` (allows assert statements)

## Import Organization

**Order:**
1. Standard library imports: `import uvicorn`
2. Third-party imports: `from fastapi import FastAPI`
3. Local application imports: (relative or absolute from src)

**Path Aliases:**
- No import aliases configured
- Direct imports from packages: `from fastapi import ...`

**Style:**
- Ruff enforces import sorting via `I` rule
- Imports are organized and deduplicated automatically on format
- Run `uv run ruff check --select I --fix .` to sort

## Error Handling

**Patterns:**
- FastAPI framework handles HTTP error responses via exceptions
- Return values are explicitly typed with return type annotations
- All paths should have type hints for error detection

## Logging

**Framework:** Not configured; uses built-in Python logging (print-based if needed)

**Patterns:**
- No custom logging configuration in current codebase
- FastAPI provides request/response logging via uvicorn

## Comments

**When to Comment:**
- Avoid unnecessary comments; code should be self-documenting
- Comments on non-obvious logic only

**JSDoc/TSDoc:**
- Python uses docstrings in triple quotes
- All functions require docstrings (enforced by `D` rule in Ruff)
- Example from `/Users/hussmikael/agents-hackathon/src/main.py`:
  ```python
  def hello_world() -> dict[str, str]:
      """Mock endpoint for API application."""
      return {"Hello": "World"}
  ```
- Single-line docstring format: triple quotes on same line for short descriptions
- Module-level docstring required: `"""Mock main file for application."""`

## Function Design

**Size:** Guidelines not explicitly set; keep functions focused and tested

**Parameters:**
- All parameters should be type-hinted
- Return type always specified
- Example: `def hello_world() -> dict[str, str]:` with no parameters

**Return Values:**
- All return paths must have explicit type annotation
- Empty returns must be annotated `-> None`
- Structured returns (dict, Pydantic models) must be fully typed

## Module Design

**Exports:**
- Functions intended for external use are defined at module level
- No explicit `__all__` mechanism observed
- FastAPI decorators indicate public endpoints: `@app.get("/")`

**Barrel Files:**
- Not applicable in current structure
- Single main module at `/Users/hussmikael/agents-hackathon/src/main.py`

## Type Hints

**Requirements:**
- Type hints mandatory on all function definitions (enforced by `ANN` rule)
- Modern Python syntax required (PEP 585: `dict[str, str]` not `Dict[str, str]`)
- No `Any` types in production code (except where ANN401 is allowed)

**Example:**
```python
# From /Users/hussmikael/agents-hackathon/src/main.py
def hello_world() -> dict[str, str]:
    """Mock endpoint for API application."""
    return {"Hello": "World"}
```

## Python Version

**Target:** Python 3.12+ (configured in `pyproject.toml`: `requires-python = ">=3.12"`)

**Implications:**
- Use modern type hints: `dict[str, str]` (not `Dict`)
- Use modern string formatting (f-strings preferred)
- Pydantic V2 syntax required (dependency: `pydantic>=2.12.3`)

## Validation

**Framework:** Pydantic V2 (dependency in `pyproject.toml`)

**Patterns:**
- Use Pydantic models for data validation where applicable
- FastAPI integrates Pydantic for request/response validation

---

*Convention analysis: 2026-02-20*
