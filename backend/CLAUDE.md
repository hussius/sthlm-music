# Backend Development Guidelines

Python FastAPI backend with uv package management.

## Stack

- **Framework:** FastAPI 0.115+
- **Package Manager:** uv
- **Testing:** pytest
- **Linting/Formatting:** ruff
- **Type Checking:** ty (pyright)
- **Python Version:** 3.12+

## ⚠️ CRITICAL: Use uv for Everything

**ALL Python operations must go through uv.** This is non-negotiable.

### Correct Commands

```bash
# Running Python scripts
uv run python src/main.py        # ✅ Correct
python src/main.py               # ❌ WRONG - bypasses uv environment

# Running tests
uv run python -m pytest          # ✅ Correct
pytest                           # ❌ WRONG - not in PATH
make test                        # ✅ Correct - uses uv internally

# Installing packages
uv add fastapi                   # ✅ Correct
pip install fastapi              # ❌ WRONG - don't use pip

# Removing packages
uv remove package                # ✅ Correct
pip uninstall package            # ❌ WRONG

# Syncing dependencies
uv sync                          # ✅ Correct - installs from lock file
```

### Why uv?

- Manages virtual environment automatically (no activation needed)
- Ensures correct Python version (3.12+)
- Faster dependency resolution than pip
- Consistent environment across team and CI
- Integrated with project configuration

### Development Workflow

```bash
# Initial setup
make install                     # Installs dependencies via uv

# Daily development
make dev                         # Runs server via uv
make test                        # Runs tests via uv
make format                      # Formats code via uv
make check                       # Lints and type checks via uv
```

All Makefile commands use `uv run` internally - never call Python directly.

## Import Best Practices

**CRITICAL:** Use absolute imports from `src` to avoid import errors.

### Project Structure

```
backend/
├── src/                    # Python package root
│   ├── __init__.py        # Makes src a package
│   ├── main.py            # FastAPI app entry point
│   ├── models/            # Pydantic models
│   ├── routes/            # API route handlers
│   ├── services/          # Business logic
│   └── db/                # Database utilities
├── tests/                 # Tests (separate from src)
├── pyproject.toml         # Package config
└── Makefile
```

The `pyproject.toml` configures package discovery:
```toml
[tool.setuptools]
package-dir = {"" = "src"}
```

This means **all imports must start from `src.`**

### Import Examples

**✅ CORRECT - Absolute imports from src:**

```python
# In src/routes/users.py
from src.models.user import User, UserCreate, UserResponse
from src.services.auth import authenticate_user
from src.db.connection import get_db
from fastapi import APIRouter, Depends, HTTPException

router = APIRouter()

@router.post("/users", response_model=UserResponse)
async def create_user(user: UserCreate, db = Depends(get_db)):
    # Implementation
    pass
```

**✅ CORRECT - Standard library and third-party first:**

```python
# Standard library imports
from typing import List, Optional
from datetime import datetime

# Third-party imports
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

# Local imports (from src)
from src.models.user import User
from src.routes import users, auth
```

**❌ WRONG - Relative imports:**

```python
# DON'T DO THIS
from models.user import User           # ❌ ModuleNotFoundError
from ..models.user import User         # ❌ Fragile, breaks easily
from .models import User               # ❌ Wrong relative path
import models                          # ❌ Ambiguous
```

**❌ WRONG - Incorrect absolute imports:**

```python
from backend.src.models.user import User  # ❌ Wrong - no 'backend' in path
from models.user import User              # ❌ Wrong - missing 'src'
```

### Testing Imports

When creating a new Python file, **always test imports work:**

```bash
# Test import works
uv run python -c "from src.models.user import User"

# Should print nothing if successful
# If it fails, check your import path
```

### Creating New Files Checklist

1. ✅ Check existing files for import patterns
2. ✅ Use absolute imports starting with `src.`
3. ✅ Follow the project structure in `pyproject.toml`
4. ✅ Test imports: `uv run python -c "from src.your.module import Thing"`
5. ✅ Run type checker: `make check`
6. ✅ Run tests: `make test`

### Common Import Errors

**Error:** `ModuleNotFoundError: No module named 'models'`
**Fix:** Change `from models.user import User` to `from src.models.user import User`

**Error:** `ImportError: attempted relative import with no known parent package`
**Fix:** Use absolute imports: `from src.models.user import User`

**Error:** `ModuleNotFoundError: No module named 'src'`
**Fix:** Ensure you're running via `uv run python` and `pyproject.toml` is configured correctly

## Code Style

### Python Conventions

Follow PEP 8 with these specifics:

- **Type hints:** Required for all functions
  ```python
  def create_user(name: str, email: str) -> User:
      ...
  ```

- **Docstrings:** Required for public functions
  ```python
  def validate_email(email: str) -> bool:
      """Validate email format using regex.

      Args:
          email: Email address to validate

      Returns:
          True if valid, False otherwise
      """
  ```

- **Naming:**
  - Functions/variables: `snake_case`
  - Classes: `PascalCase`
  - Constants: `UPPER_SNAKE_CASE`
  - Private: `_leading_underscore`

### FastAPI Patterns

**Route handlers:**
```python
@app.post("/users", response_model=UserResponse, status_code=201)
async def create_user(user: UserCreate) -> UserResponse:
    """Create a new user."""
    # Implementation
```

**Dependency injection:**
```python
from fastapi import Depends

def get_db() -> Database:
    """Database connection dependency."""
    # Return db connection

@app.get("/users/{user_id}")
async def get_user(user_id: int, db: Database = Depends(get_db)):
    # Use db
```

**Error handling:**
```python
from fastapi import HTTPException

@app.get("/users/{user_id}")
async def get_user(user_id: int):
    user = await db.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
```

## Project Structure

```
backend/
├── src/
│   ├── main.py           # FastAPI app setup
│   ├── models/           # Pydantic models
│   ├── routes/           # Route handlers
│   ├── services/         # Business logic
│   ├── db/               # Database utilities
│   └── middleware/       # Custom middleware
├── tests/
│   ├── test_routes.py
│   └── test_services.py
├── pyproject.toml
└── Makefile
```

## Testing

### Test Structure

```python
import pytest
from fastapi.testclient import TestClient
from src.main import app

client = TestClient(app)

def test_create_user():
    """Test user creation endpoint."""
    response = client.post("/users", json={
        "name": "Test User",
        "email": "test@example.com"
    })
    assert response.status_code == 201
    assert response.json()["name"] == "Test User"
```

### Running Tests

**Always use Makefile or uv:**

```bash
make test                                    # ✅ Run all tests (via uv)
uv run python -m pytest                     # ✅ Direct pytest via uv
uv run python -m pytest -v                  # ✅ Verbose output
uv run python -m pytest tests/test_routes.py # ✅ Specific test file
uv run python -m pytest -k "test_user"      # ✅ Pattern matching

# ❌ NEVER use these:
pytest                                       # ❌ Not in PATH
python -m pytest                            # ❌ Bypasses uv
```

### Test Coverage

- **Routes:** Test all endpoints (happy path + error cases)
- **Services:** Test business logic with mocked dependencies
- **Models:** Test validation rules
- **Integration:** Test full request/response cycles

Aim for 80%+ coverage on new code.

## Database

### If Using SQL

- **ORM:** SQLAlchemy (if chosen in ADR)
- **Migrations:** Alembic
- **Connection:** Use async engine with `asyncpg`

### If Using NoSQL

- **MongoDB:** motor (async driver)
- **Redis:** redis-py or aioredis

**Note:** Check ADRs for database decisions

## API Design

### RESTful Conventions

- `GET /users` - List users
- `GET /users/{id}` - Get user
- `POST /users` - Create user
- `PUT /users/{id}` - Update user (full)
- `PATCH /users/{id}` - Update user (partial)
- `DELETE /users/{id}` - Delete user

### Response Models

Always define request and response models:

```python
from pydantic import BaseModel

class UserCreate(BaseModel):
    """Request model for creating users."""
    name: str
    email: str

class UserResponse(BaseModel):
    """Response model for user data."""
    id: int
    name: str
    email: str
    created_at: datetime
```

### Error Responses

Consistent error format:

```python
{
    "detail": "Error message",
    "error_code": "USER_NOT_FOUND",  # Optional
    "field": "email"  # Optional, for validation errors
}
```

## Environment Variables

Required `.env` file:

```bash
# Server
PORT=8098
ENVIRONMENT=development

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Database (if applicable)
DATABASE_URL=postgresql://user:pass@localhost/dbname

# Security
JWT_SECRET=your-secret-key-here
```

**Never commit `.env`** - it's in `.gitignore`

## Common Commands

**Use Makefile commands (which use uv internally) or uv directly:**

```bash
# Setup
make install                    # Install all dependencies via uv
make setup-pre-commit          # Install pre-commit hooks

# Development
make dev                       # Start dev server (via uv)
make run                       # Run app (via uv)

# Code Quality
make format                    # Format code with ruff (via uv)
make check                     # Lint + type check (via uv)
make test                      # Run tests (via uv)
make pre-commit                # Run all pre-commit hooks

# Dependencies
uv add package-name            # ✅ Add dependency
uv add --dev package-name      # ✅ Add dev dependency
uv remove package-name         # ✅ Remove dependency
uv sync                        # ✅ Sync dependencies from lock file
uv lock                        # ✅ Update lock file

# ❌ NEVER use these:
pip install package            # ❌ WRONG - use uv add
pip uninstall package          # ❌ WRONG - use uv remove
python src/main.py             # ❌ WRONG - use make run or uv run
pytest                         # ❌ WRONG - use make test

# Running Python scripts directly
uv run python src/main.py      # ✅ Correct way to run scripts
uv run python -m module        # ✅ Run Python modules

# Database (if using Alembic)
uv run alembic revision --autogenerate -m "description"
uv run alembic upgrade head
```

## Performance

### Async Best Practices

- Use `async def` for I/O-bound operations
- Use `def` for CPU-bound operations
- Don't mix blocking and non-blocking code

```python
# Good: async endpoint with async database call
@app.get("/users")
async def list_users():
    users = await db.fetch_all("SELECT * FROM users")
    return users

# Bad: async endpoint with blocking call
@app.get("/users")
async def list_users():
    users = db.fetch_all_blocking()  # Blocks event loop!
    return users
```

### Caching

For expensive operations:
```python
from functools import lru_cache

@lru_cache(maxsize=128)
def expensive_computation(param: str) -> Result:
    # Cache results for repeated calls
    ...
```

## Security

### Input Validation

Pydantic handles basic validation:

```python
from pydantic import BaseModel, EmailStr, constr

class UserCreate(BaseModel):
    name: constr(min_length=1, max_length=100)
    email: EmailStr
```

### Authentication

If implementing auth:
- JWT tokens (check ADRs for decision)
- Hash passwords with bcrypt
- Use FastAPI security utilities

```python
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer

security = HTTPBearer()

async def get_current_user(token: str = Depends(security)):
    # Validate token, return user
    ...
```

### CORS

Configure CORS in main.py:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Debugging

### Logs

Use Python logging:

```python
import logging

logger = logging.getLogger(__name__)

@app.get("/users")
async def list_users():
    logger.info("Fetching all users")
    users = await db.get_users()
    logger.info(f"Found {len(users)} users")
    return users
```

### Interactive Debugging

Use `breakpoint()` for debugging:

```python
@app.get("/debug")
async def debug_endpoint():
    result = some_function()
    breakpoint()  # Pauses here for inspection
    return result
```

## Common Patterns

### Dependency Injection

```python
from typing import Annotated
from fastapi import Depends

Database = Annotated[DB, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]

@app.get("/profile")
async def get_profile(user: CurrentUser, db: Database):
    # user and db automatically injected
    ...
```

### Background Tasks

```python
from fastapi import BackgroundTasks

def send_email(email: str):
    # Send email logic
    ...

@app.post("/users")
async def create_user(user: UserCreate, background_tasks: BackgroundTasks):
    # Create user
    background_tasks.add_task(send_email, user.email)
    return user
```

## Hackathon Tips

- **Start simple:** Basic CRUD before complex features
- **Test as you go:** Don't accumulate untested code
- **Use OpenAPI docs:** Visit `/docs` to test endpoints
- **Check ADRs:** Reference architectural decisions
- **Commit frequently:** Use `/checkpoint` after each feature

---

*For general guidelines, see root `CLAUDE.md`. For frontend integration, see `frontend/CLAUDE.md`.*
