# Testing Patterns

**Analysis Date:** 2026-02-20

## Test Framework

**Runner:**
- Pytest (version `>=8.0.0` in `pyproject.toml` dev dependencies)
- Configuration: Default pytest behavior (no custom config file found)

**Assertion Library:**
- Pytest built-in assertions (standard `assert` statements)

**Run Commands:**
```bash
make test              # Run all tests via 'uv run pytest'
uv run pytest          # Direct invocation
uv run pytest -v       # Verbose output (not configured in Makefile)
uv run pytest --cov    # Coverage (if pytest-cov installed)
```

## Test File Organization

**Location:**
- Separate directory structure: `tests/` directory at project root
- Source code: `/Users/hussmikael/agents-hackathon/src/`
- Tests: `/Users/hussmikael/agents-hackathon/tests/`

**Naming:**
- Test files prefixed with `test_`: `test_main.py`
- Test functions named `test_*`: `test_package()`
- Matches Pytest's default discovery pattern

**Structure:**
```
/Users/hussmikael/agents-hackathon/
├── src/
│   └── main.py          # Application code
├── tests/
│   └── test_main.py     # Corresponding tests
```

## Test Structure

**Suite Organization:**
From `/Users/hussmikael/agents-hackathon/tests/test_main.py`:
```python
"""Mock test file."""


def test_package() -> None:
    """Use pytest to test the package."""
    assert True
```

**Patterns:**
- Module-level docstring describing test file purpose
- Individual test functions with docstrings
- Each test is a function with signature `def test_*() -> None:`
- Descriptive docstring explaining what test verifies
- Direct assertions with pytest

**Setup/Teardown:**
- Not used in current minimal example
- Would use Pytest fixtures if needed: `@pytest.fixture`

**Assertion Pattern:**
```python
assert True  # Simple boolean assertions
```

## Mocking

**Framework:** Not configured/used in current codebase

**When to Implement:**
- Would use `unittest.mock` or `pytest-mock` for external dependencies
- FastAPI provides `TestClient` for endpoint testing (not yet applied)

**Patterns (Expected):**
```python
# Expected pattern for mocking (not yet implemented)
from unittest.mock import patch, MagicMock

def test_something():
    with patch('module.function') as mock_func:
        mock_func.return_value = expected_value
        # Test code
```

**What to Mock:**
- External API calls
- Database connections
- File I/O operations
- Time-dependent logic

**What NOT to Mock:**
- Business logic being tested
- Validation logic
- Local application code (unless circular dependency)

## Fixtures and Factories

**Test Data:**
- Not yet implemented in test suite
- Recommended pattern for FastAPI testing:
```python
import pytest
from fastapi.testclient import TestClient
from src.main import app

@pytest.fixture
def client():
    return TestClient(app)

def test_hello_world(client):
    response = client.get("/")
    assert response.status_code == 200
```

**Location:**
- Would place in `tests/conftest.py` for shared fixtures
- Could create `tests/fixtures.py` for factory functions
- Currently using direct inline test patterns

## Coverage

**Requirements:** Not enforced (no pytest.ini or coverage configuration found)

**View Coverage:**
```bash
uv run pytest --cov=src --cov-report=html
```

**Configuration:** None specified in `pyproject.toml`

## Test Types

**Unit Tests:**
- Current test: `test_package()` in `/Users/hussmikael/agents-hackathon/tests/test_main.py`
- Scope: Individual functions or methods
- Approach: Direct assertions on function output
- Example pattern: `assert True` for verification

**Integration Tests:**
- Not yet implemented
- Would test FastAPI endpoints using `TestClient`
- Expected pattern:
```python
from fastapi.testclient import TestClient
from src.main import app

def test_hello_endpoint():
    client = TestClient(app)
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"Hello": "World"}
```

**E2E Tests:**
- Not implemented (no test framework for E2E configured)
- Would use Playwright (installed in `.claude` for MCP, not for testing)

## Async Testing

**Pattern:** Not yet implemented (no async functions in current code)

**Expected pattern (when needed):**
```python
import pytest

@pytest.mark.asyncio
async def test_async_function():
    result = await async_function()
    assert result == expected_value
```

## Error/Exception Testing

**Pattern:** Not yet implemented

**Expected pattern:**
```python
import pytest

def test_error_handling():
    with pytest.raises(ValueError):
        function_that_raises()
```

## CI/CD Integration

**Pipeline:** GitLab CI (configured in `.gitlab-ci.yml`)

**Test Stage:** Not explicitly defined; linting stage runs format/check

**Command in CI:**
```bash
uv run --frozen ruff format --check .
uv run --frozen ruff check --select I --fix --diff .
uv run --frozen ty check .
uv run --frozen ruff check
```

**Note:** CI currently runs linting/type checking, not pytest tests (no test stage in pipeline)

## Dependencies

**Test Dependencies (from `pyproject.toml`):**
```
pytest>=8.0.0          # Test runner
```

**Not configured:**
- `pytest-cov`: Coverage measurement
- `pytest-asyncio`: Async test support
- `pytest-mock`: Enhanced mocking
- `fastapi[testing]`: TestClient for endpoint testing

## Recommended Test Patterns

**For New Endpoint Tests:**
```python
from fastapi.testclient import TestClient
from src.main import app

def test_hello_world():
    """Test the hello_world endpoint."""
    client = TestClient(app)
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"Hello": "World"}
```

**For Pydantic Model Tests:**
```python
from pydantic import BaseModel, ValidationError
import pytest

def test_model_validation():
    """Test model accepts valid data."""
    model = MyModel(field="value")
    assert model.field == "value"

def test_model_invalid():
    """Test model rejects invalid data."""
    with pytest.raises(ValidationError):
        MyModel(field=123)  # Invalid type
```

---

*Testing analysis: 2026-02-20*
