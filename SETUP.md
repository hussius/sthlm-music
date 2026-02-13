# Setup Guide

Complete setup guide for new developers joining the Agents Hackathon project.

## Prerequisites

Before you begin, ensure you have these tools installed:

### Required

- **Python 3.12+** - [Download from python.org](https://www.python.org/downloads/)
- **uv** - Fast Python package manager
  ```bash
  curl -LsSf https://astral.sh/uv/install.sh | sh
  ```
- **Node.js 18+** - JavaScript runtime
  - [Download from nodejs.org](https://nodejs.org/)
  - Or use [nvm](https://github.com/nvm-sh/nvm) or [fnm](https://github.com/Schniz/fnm)
- **npm** - Node package manager (comes with Node.js)

### Optional but Recommended

- **Git** - Version control (usually pre-installed on Mac/Linux)
- **A code editor** - VS Code, Cursor, or your favorite editor

## Quick Start (Automated)

Run a single command to set up everything:

```bash
make install
```

This command will:
1. ✅ Check all prerequisites are installed
2. ✅ Copy `.env.example` files to `.env`
3. ✅ Install backend dependencies (Python via uv)
4. ✅ Install frontend dependencies (Node.js via npm)
5. ✅ Set up pre-commit hooks for both services

## Manual Setup (Step by Step)

If you prefer to understand each step or `make install` fails:

### 1. Verify Prerequisites

```bash
make check-prereqs
```

If any tools are missing, install them and run the check again.

### 2. Set Up Environment Files

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env
```

**Edit these files** if you need custom ports or API keys:
- `backend/.env` - Backend configuration (port 8098 by default)
- `frontend/.env` - Frontend configuration (port 3000 by default)

### 3. Install Backend Dependencies

```bash
cd backend
make install
```

This runs `uv sync` to install Python packages.

### 4. Configure Codon Component Library Access (Optional)

**Only needed if you want to use Codon's internal component library.**

The frontend uses `@codongit/codon-component-library` which is a private npm package hosted on GitLab. To access it:

#### Option A: Set Up GitLab Token (Recommended for Codon Team)

1. **Get your GitLab Personal Access Token:**
   - Check your password manager (1Password) for "CCL NPM Token"
   - OR create a new one:
     - Go to https://gitlab.com/-/user_settings/personal_access_tokens
     - Create a token with **`read_api`** scope
     - Name it "CCL NPM Access" or similar
     - Copy the token (you won't see it again!)

2. **Add token to frontend `.env` file:**
   ```bash
   # In frontend/.env, uncomment and add your token:
   CCL_NPM_TOKEN=glpat-your-token-here
   ```

3. **Verify it works:**
   ```bash
   cd frontend
   export $(grep -v '^#' .env | xargs)
   npm install
   # Should install without 401 errors
   ```

#### Option B: Skip CCL (If Not on Codon Team)

If you don't have access to the Codon Component Library:

1. **Remove CCL from package.json:**
   ```bash
   cd frontend
   npm uninstall @codongit/codon-component-library
   ```

2. **Remove CCL imports from your code** (if any exist)

### 5. Install Frontend Dependencies

```bash
cd frontend
npm install
```

This installs all Node.js packages including React, Vite, and dev tools.

**Note:** The Makefile will automatically load the `CCL_NPM_TOKEN` from `.env` if it exists.

### 6. Set Up Pre-Commit Hooks

```bash
# Backend
cd backend
make setup-pre-commit

# Frontend
cd frontend
npm run prepare
```

Pre-commit hooks automatically format and check code before each commit.

## Running the Application

### Start Backend Server

In one terminal:

```bash
cd backend
make dev
# OR: make run
```

Backend runs on **http://localhost:8098**
API docs available at **http://localhost:8098/docs**

### Start Frontend Dev Server

In another terminal:

```bash
cd frontend
npm run dev
```

Frontend runs on **http://localhost:3000**
Hot Module Replacement (HMR) enabled for instant updates

### Visit the App

Open your browser to **http://localhost:3000**

## Verify Setup

### Check Backend

```bash
curl http://localhost:8098/docs
# Should return FastAPI Swagger UI HTML
```

### Check Frontend

Visit http://localhost:3000 in your browser - you should see the frontend application.

### Run Tests

```bash
# Backend tests
cd backend
make test

# Frontend tests
cd frontend
npm test

# Or run all tests from root
make test-all
```

## Common Issues

### "command not found: uv"

**Solution:** Install uv:
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
# Restart your terminal after installation
```

### "command not found: node" or "command not found: npm"

**Solution:** Install Node.js from https://nodejs.org/ or use a version manager:
```bash
# Using fnm (recommended)
curl -fsSL https://fnm.vercel.app/install | bash
fnm install 20
fnm use 20
```

### Backend import errors: "ModuleNotFoundError: No module named 'src'"

**Solution:** Always use `uv run` or make commands:
```bash
# ✅ Correct
uv run python src/main.py
make dev

# ❌ Wrong - bypasses uv environment
python src/main.py
```

### Frontend can't connect to backend

**Solution:** Check CORS configuration:
1. Backend `.env` has: `CORS_ORIGINS=http://localhost:3000`
2. Frontend `.env` has: `VITE_API_URL=http://localhost:8098`
3. Both services are running
4. Restart both services after changing `.env` files

### Pre-commit hooks failing

**Solution:** Run formatters manually to fix issues:
```bash
# Backend
cd backend
make format

# Frontend
cd frontend
npm run format
```

### "Cannot find module '@codongit/codon-component-library'" or "401 Unauthorized"

**Problem:** The Codon Component Library (CCL) is a private npm package requiring GitLab authentication.

**Solution Option 1 - Add Token (Codon Team):**

1. Get your GitLab token from 1Password ("CCL NPM Token") OR create one:
   - Visit: https://gitlab.com/-/user_settings/personal_access_tokens
   - Scope: `read_api`
   - Copy the token

2. Add to `frontend/.env`:
   ```bash
   CCL_NPM_TOKEN=glpat-your-token-here
   ```

3. Reinstall:
   ```bash
   cd frontend
   export $(grep -v '^#' .env | xargs)
   npm install
   ```

4. Verify CCL is installed:
   ```bash
   ls node_modules/@codongit/codon-component-library
   # Should show package contents
   ```

**Solution Option 2 - Remove CCL (Non-Codon Team):**

```bash
cd frontend
npm uninstall @codongit/codon-component-library
# Remove any imports of CCL components from your code
```

**Why this happens:** The `.npmrc` file configures GitLab as a registry for `@codongit` packages, requiring authentication via the `CCL_NPM_TOKEN` environment variable.

## Workshop Safety Setup (Optional)

For additional safety during the hackathon:

```bash
make workshop-setup
```

This installs:
- **DCG (Destructive Command Guard)** - Blocks dangerous git commands
- **Sandboxing** - Restricts Claude Code to project directory
- **Auto-format hooks** - Code auto-formats after Claude edits

Verify safety features:
```bash
make verify-safety
```

## Project Structure

```
agents-hackathon/
├── backend/              # Python FastAPI backend
│   ├── src/             # Python source code
│   ├── tests/           # Backend tests
│   ├── .env             # Backend environment config
│   └── Makefile         # Backend commands
├── frontend/            # React + TypeScript frontend
│   ├── src/             # React components and code
│   ├── tests/           # Frontend tests
│   ├── .env             # Frontend environment config
│   └── package.json     # Frontend dependencies
├── docs/                # Documentation and ADRs
├── .claude/             # Claude Code configuration
├── Makefile             # Root-level commands
└── SETUP.md             # This file
```

## Environment Variables Reference

### Backend (`.env`)

```bash
HOST=127.0.0.1                    # Server host
PORT=8098                         # Server port
ENVIRONMENT=development           # development | production | test
CORS_ORIGINS=http://localhost:3000  # Allowed frontend origins
LOG_LEVEL=INFO                    # DEBUG | INFO | WARNING | ERROR
```

### Frontend (`.env`)

```bash
PORT=3000                         # Frontend dev server port
VITE_API_URL=http://localhost:8098  # Backend API URL
# CCL_NPM_TOKEN=xxx               # Optional Codon component library
```

## Next Steps

Once setup is complete:

1. **Explore the codebase**
   - Backend: `backend/CLAUDE.md` for coding guidelines
   - Frontend: `frontend/CLAUDE.md` for React patterns
   - Root: `CLAUDE.md` for overall philosophy

2. **Run tests to verify everything works**
   ```bash
   make test-all
   ```

3. **Start coding!**
   - Use `/checkpoint` to commit frequently
   - Use `/adr` to document architectural decisions
   - Follow the TAPE workflow for significant features

4. **Read the documentation**
   - `CLAUDE.md` - Development philosophy and workflow
   - `docs/adr/` - Architecture Decision Records
   - `.claude/rules/` - Detailed guidelines

## Getting Help

- **Commands:** Run `make help` to see all available commands
- **Backend help:** `cd backend && make help`
- **Frontend help:** Check `frontend/package.json` scripts
- **Issues:** Report at https://github.com/anthropics/claude-code/issues

---

**Happy hacking! 🚀**
