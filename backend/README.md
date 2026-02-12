# Backend

Python backend service built with FastAPI and uv.

## Setup

```bash
cd backend
uv sync
```

## Development

```bash
# Run the application
make run

# Run tests
make test

# Format code
make format

# Run all checks (format, type, lint)
make check
```

## API

The API runs on `http://localhost:8098` by default.

**Endpoints:**
- `GET /` - Hello World endpoint

Add your own endpoints in `src/main.py`!

## Structure

```
backend/
├── src/           # Application code
│   └── main.py   # FastAPI application
├── tests/        # Test files
├── pyproject.toml
└── Makefile
```

## Frontend Integration

The frontend can connect to this API at `http://localhost:8098`. Configure CORS in `src/main.py` if needed.
