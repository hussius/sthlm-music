# Python Backend Development Rules

Critical rules for working with the Python backend. **These rules MUST be followed strictly to avoid import errors and environment issues.**

## Rule 1: Always Use uv for Python Operations

**NEVER run Python commands directly. ALL Python operations must go through `uv`.**

### ✅ Correct Commands

```bash
uv run python src/main.py              # Run scripts
uv run python -m pytest                # Run tests
uv run python -m module.name           # Run modules
uv run python -c "from src.x import y" # Test imports
uv add package                         # Add dependencies
uv add --dev package                   # Add dev dependencies
uv remove package                      # Remove dependencies
uv sync                                # Sync from lock file
```

### ❌ NEVER Use These

```bash
python src/main.py        # ❌ Bypasses uv environment
pytest                    # ❌ Not in PATH, will fail
pip install package       # ❌ Use uv add instead
pip uninstall package     # ❌ Use uv remove instead
python -m pip install     # ❌ Wrong package manager
```

### Why This Matters

- uv manages the virtual environment automatically
- Ensures correct Python version (3.12+)
- Ensures all dependencies are available
- No need to manually activate virtualenvs
- Consistent environment across team and CI

### Using Makefile

The Makefile already uses uv internally, so these are safe:

```bash
make install       # Uses uv sync
make dev           # Uses uv run
make test          # Uses uv run python -m pytest
make format        # Uses uv run ruff
make check         # Uses uv run ruff and ty
```

## Rule 2: Use Absolute Imports from src Package Root

**CRITICAL:** The backend uses `src/` as the package root. ALL imports MUST be absolute imports starting with `src.`

### Project Structure

```
backend/
├── src/              # Package root (configured in pyproject.toml)
│   ├── __init__.py
│   ├── main.py
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── db/
└── tests/
```

The `pyproject.toml` configures this:

```toml
[tool.setuptools]
package-dir = {"" = "src"}
```

### ✅ Correct Imports

```python
# In any file in src/
from src.models.user import User, UserCreate, UserResponse
from src.services.auth import authenticate_user, hash_password
from src.db.connection import get_db, close_db
from src.routes.users import router as users_router
from src.main import app

# Standard library and third-party first
from typing import List, Optional
from datetime import datetime
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel

# Then local imports (src.*)
from src.models.user import User
```

### ❌ WRONG Imports

```python
# Missing src. prefix
from models.user import User              # ❌ ModuleNotFoundError
from routes.users import router           # ❌ ModuleNotFoundError

# Relative imports
from ..models.user import User            # ❌ Fragile, breaks easily
from .models import User                  # ❌ Wrong relative path

# Incorrect absolute paths
from backend.src.models.user import User  # ❌ No 'backend' in path
import models                             # ❌ Ambiguous
```

### Import Order

Follow this order (enforced by ruff):

1. Standard library imports
2. Third-party package imports
3. Local package imports (from `src.*`)

Example:

```python
# 1. Standard library
import os
from typing import Optional
from datetime import datetime

# 2. Third-party
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sqlalchemy import select

# 3. Local (src.*)
from src.models.user import User
from src.services.auth import get_current_user
from src.db.connection import get_db
```

## Rule 3: Test Imports Before Committing

**Always test that your imports work before committing code with new imports.**

### Testing Imports

```bash
# Test a single import
uv run python -c "from src.models.user import User"

# Test multiple imports
uv run python -c "
from src.models.user import User, UserCreate
from src.services.auth import authenticate_user
print('All imports successful')
"

# Or just run the type checker
make check
```

If the import fails, you'll see:

```
ModuleNotFoundError: No module named 'models'
```

Fix by adding the `src.` prefix.

## Rule 4: Creating New Python Files

When creating a new Python file, follow this checklist:

### ✅ New File Checklist

1. **Check existing files** for import patterns
   ```bash
   # Look at similar files
   cat src/routes/users.py
   cat src/models/user.py
   ```

2. **Use absolute imports** from `src.*`
   ```python
   from src.models.thing import Thing
   ```

3. **Add type hints** to all functions
   ```python
   def get_user(user_id: int) -> User:
       ...
   ```

4. **Test imports work**
   ```bash
   uv run python -c "from src.routes.new_route import router"
   ```

5. **Run type checker**
   ```bash
   make check
   ```

6. **Run tests**
   ```bash
   make test
   ```

7. **Format code**
   ```bash
   make format
   ```

## Rule 5: Common Import Error Solutions

### Error: `ModuleNotFoundError: No module named 'models'`

**Cause:** Missing `src.` prefix in import

**Solution:**
```python
# Change this:
from models.user import User

# To this:
from src.models.user import User
```

### Error: `ModuleNotFoundError: No module named 'src'`

**Cause:** Not running via `uv run python`

**Solution:**
```bash
# Change this:
python src/main.py

# To this:
uv run python src/main.py
# Or:
make run
```

### Error: `ImportError: attempted relative import with no known parent package`

**Cause:** Using relative imports (`.` or `..`)

**Solution:**
```python
# Change this:
from ..models.user import User

# To this:
from src.models.user import User
```

### Error: `command not found: pytest`

**Cause:** Running pytest directly instead of through uv

**Solution:**
```bash
# Change this:
pytest

# To this:
make test
# Or:
uv run python -m pytest
```

## Summary: Quick Reference

### Python Commands
- ✅ `uv run python script.py`
- ✅ `make dev`, `make test`, `make check`
- ❌ `python script.py` (bypasses uv)
- ❌ `pytest` (not in PATH)
- ❌ `pip install` (use uv add)

### Imports
- ✅ `from src.models.user import User`
- ✅ `from src.routes.users import router`
- ❌ `from models.user import User` (missing src)
- ❌ `from ..models import User` (relative)

### Before Committing
1. ✅ Test imports: `uv run python -c "from src.module import Thing"`
2. ✅ Run checks: `make check`
3. ✅ Run tests: `make test`
4. ✅ Format code: `make format`

Pre-commit hooks will enforce these rules automatically.

---

**Remember:** Following these rules prevents `ModuleNotFoundError` and ensures code works consistently across development, CI, and production environments.
