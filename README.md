# Agents Hackathon

A forkable repo for the Codon agents internal hackathon. Build with Claude Code in a safe, sandboxed environment!

## 🚀 Quick Start

### 1. Safety Setup (Required - Do This First!)

Protect yourself from accidental disasters while working with Claude Code:

```bash
make workshop-setup
```

This installs three layers of protection:
- **DCG (Destructive Command Guard)** - Blocks dangerous git/filesystem commands before they execute
- **Filesystem Sandboxing** - Restricts Claude Code to this project directory only
- **Auto-format Hook** - Automatically formats code after Claude edits (keeps code style consistent)

**Takes ~2 minutes. Seriously, do this first!**

### 2. Verify Protection

```bash
make verify-safety
```

You should see:
- ✓ DCG installed
- ✓ Sandboxing is enabled
- ✓ Scratch directory exists
- ✓ Auto-format hook installed

### 3. Setup Backend & Frontend

#### Backend Setup (Python FastAPI)

```bash
cd backend

# Create your environment file
cp .env.example .env

# Install dependencies (uses uv)
make install

# Run the development server
make dev
```

The backend will be available at `http://localhost:8098`

**Backend Environment Variables:**
- `PORT` - Server port (default: 8098)
- `ENVIRONMENT` - development/production/test
- `CORS_ORIGINS` - Allowed frontend origins
- Add API keys as needed for your project

#### Frontend Setup (React + TypeScript + Vite)

```bash
cd frontend

# Create your environment file
cp .env.example .env

# Install dependencies
npm install

# Run the development server
npm run dev
```

The frontend will be available at `http://localhost:3000`

**Frontend Environment Variables:**
- `PORT` - Dev server port (default: 3000)
- `VITE_API_URL` - Backend API URL (default: http://localhost:8098)
- `CCL_NPM_TOKEN` - (OPTIONAL) Only needed for Codon Component Library

**Note:** If you don't have access to the Codon Component Library, you can:
1. Skip setting `CCL_NPM_TOKEN`
2. Remove `@codongit/codon-component-library` from `package.json`
3. Remove any imports of CCL components from the code

### 4. Start Hacking!

You're now protected and ready to build. Claude Code can:
- ✅ Read/write files in this project
- ✅ Use the `./tmp/` directory for scratch work
- ✅ Search the web and call APIs
- ❌ Cannot touch other projects or system files
- ❌ Cannot run destructive commands without confirmation

## 🛡️ What's Protected

### Layer 1: Destructive Command Guard
Blocks catastrophic commands like:
- `git reset --hard` (loses uncommitted work)
- `rm -rf ./src` (deletes source code)
- `git checkout --` (discards changes)

When blocked, you'll see **why** and get safer alternatives.

### Layer 2: Filesystem Sandboxing
Claude Code is restricted to:
- This project directory only
- Cannot access `~/.ssh`, `~/.aws`, or other sensitive files
- Cannot modify other projects on your machine

**OS-level enforcement** - uses Linux bubblewrap / macOS seatbelt primitives.

### Layer 3: Auto-format Hook
After every code edit Claude makes:
- Code is automatically formatted with `ruff`
- Linting checks run in the background
- Ensures consistent code style without manual intervention
- You'll see system notifications when code is auto-formatted

**Keeps code clean** - no more "forgot to run the formatter" commits.

## 📋 Prerequisites

- [uv](https://docs.astral.sh/uv/) - Python package manager
- [Claude Code](https://claude.com/claude-code) - AI coding assistant
- Git
- Python 3.12+

## 🔧 Development Workflow

### Quick Commands (Run from repo root)

```bash
# Start both frontend and backend in one command
make dev-all

# Or run them separately
make dev-backend    # Start backend on :8098
make dev-frontend   # Start frontend on :3000

# Code quality
make format-all     # Format all code (backend + frontend)
make check-all      # Lint and typecheck everything
make test-all       # Run all tests

# See all available commands
make help
```

### Backend Commands (run from ./backend/)

```bash
cd backend

make install        # Install Python dependencies with uv
make dev           # Start FastAPI dev server with auto-reload
make test          # Run pytest tests
make format        # Format Python code with ruff
make check         # Lint and typecheck Python code
make help          # Show all backend commands
```

### Frontend Commands (run from ./frontend/)

```bash
cd frontend

npm install        # Install Node dependencies
npm run dev        # Start Vite dev server with HMR
npm run build      # Build for production
npm run test       # Run tests
npm run format     # Format code with Prettier
npm run check      # Lint, typecheck, and test
make help          # Show all frontend commands
```

### Typical Development Flow

**Terminal 1 - Backend:**
```bash
cd backend
make dev
# Backend running on http://localhost:8098
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# Frontend running on http://localhost:3000
```

**Terminal 3 - Your work:**
```bash
# Make changes, run tests, commit frequently
git status
make test-all
git add .
git commit -m "feat: add amazing feature"
```

**Claude Code Integration:**
- Claude can read/write files in both frontend/ and backend/
- Auto-format hook will format your code after Claude edits
- Use `/checkpoint` frequently to save progress
- Ask Claude to run tests after changes

## 📁 Project Structure

```
agents-hackathon/
├── .claude/                    # Claude Code configuration
│   ├── settings.json          # Sandbox config
│   └── hooks/                 # Auto-format hook
├── backend/                   # Python FastAPI backend
│   ├── src/                   # Application code
│   ├── tests/                 # Backend tests
│   ├── pyproject.toml
│   └── Makefile              # Backend commands
├── frontend/                  # Frontend application
│   └── README.md             # Frontend setup guide
├── tmp/                       # Scratch directory (git-ignored)
├── Makefile                   # Root orchestration commands
└── README.md                  # This file
```

## 🆘 Troubleshooting

### "DCG blocked my command but I need to run it"
DCG shows you why and suggests alternatives. If you really need to override, follow the instructions it provides.

### "Claude Code can't access a file I need"
**Option 1:** Copy it into your project:
```bash
cp ~/path/to/file ./tmp/
```

**Option 2:** Temporarily adjust sandboxing:
```bash
vim ~/.claude/settings.json
# Add path to "allowedPaths" array
```

### "I want my original Claude settings back"
We automatically backup before modifying:
```bash
make restore-claude-settings
```

### "Setup failed or something broke"
Check what's working:
```bash
make verify-safety
```

## 📚 Learn More

- [DCG GitHub](https://github.com/Dicklesworthstone/destructive_command_guard) - Destructive Command Guard
- [Claude Code Sandboxing Docs](https://code.claude.com/docs/en/sandboxing) - Official documentation
- [Security Best Practices](https://www.backslash.security/blog/claude-code-security-best-practices)

## ⚠️ Important Notes

These safety tools prevent **accidental** disasters, but won't save you from:
- Bad architectural decisions
- Logic bugs in code
- Test failures
- Merge conflicts

**Always review Claude's changes before accepting them!**

## 🤝 Contributing

This is a hackathon starter template. Fork it, modify it, break it, rebuild it. That's the point!

When you build something cool:
1. Commit frequently (`git commit -m "descriptive message"`)
2. Run tests before committing (`make test`)
3. Format your code (`make format`)
4. Have fun! 🎉
