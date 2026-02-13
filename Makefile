# Agents Hackathon - Root Makefile
# Orchestrates setup and commands across backend and frontend

.PHONY: help
help:
	@echo "Agents Hackathon - Monorepo Commands"
	@echo ""
	@echo "🚀 Quick Start:"
	@echo "  make install              - Complete setup (checks prereqs, installs deps, sets up env)"
	@echo "  make check-prereqs        - Check system prerequisites"
	@echo "  make setup-git-automation - Configure Claude Code git automation (commit/push)"
	@echo ""
	@echo "🛡️  Safety Setup:"
	@echo "  make workshop-setup    - Complete safety setup (DCG + sandboxing + hooks)"
	@echo "  make setup-dcg         - Install Destructive Command Guard"
	@echo "  make setup-sandbox     - Configure Claude Code sandboxing"
	@echo "  make setup-hooks       - Install auto-format hook"
	@echo "  make verify-safety     - Verify all safety measures are active"
	@echo ""
	@echo "🚀 Development:"
	@echo "  make dev-backend       - Run backend server"
	@echo "  make dev-frontend      - Run frontend dev server"
	@echo "  make test-all          - Run tests (backend + frontend)"
	@echo "  make format-all        - Format all code"
	@echo "  make check-all         - Run all checks"
	@echo ""
	@echo "📦 Per-Directory:"
	@echo "  cd backend && make help"
	@echo "  cd frontend && make help"
	@echo ""

# ============================================================================
# Complete Setup (one command to rule them all)
# ============================================================================

.PHONY: install
install: check-prereqs setup-env install-deps setup-pre-commit setup-git-automation
	@echo ""
	@echo "✅ Complete setup finished!"
	@echo ""
	@echo "Next steps:"
	@echo "  1. Review .env files and add any API keys you need:"
	@echo "     - backend/.env"
	@echo "     - frontend/.env"
	@echo "  2. Start backend: make dev-backend (in new terminal)"
	@echo "  3. Start frontend: make dev-frontend (in new terminal)"
	@echo "  4. Visit http://localhost:3000 in your browser"
	@echo ""
	@echo "Optional: Run 'make workshop-setup' for additional safety features"
	@echo ""

.PHONY: check-prereqs
check-prereqs:
	@echo "🔍 Checking system prerequisites..."
	@echo ""
	@MISSING=""; \
	if ! command -v uv >/dev/null 2>&1; then \
		echo "✗ uv not found"; \
		echo "  Install: curl -LsSf https://astral.sh/uv/install.sh | sh"; \
		MISSING="$$MISSING uv"; \
	else \
		echo "✓ uv installed: $$(uv --version)"; \
	fi; \
	if ! command -v node >/dev/null 2>&1; then \
		echo "✗ Node.js not found"; \
		echo "  Install: https://nodejs.org/ or use nvm/fnm"; \
		MISSING="$$MISSING node"; \
	else \
		NODE_VERSION=$$(node --version | sed 's/v//'); \
		echo "✓ Node.js installed: v$$NODE_VERSION"; \
		MAJOR=$$(echo $$NODE_VERSION | cut -d. -f1); \
		if [ "$$MAJOR" -lt 18 ]; then \
			echo "  ⚠️  Node.js 18+ recommended (you have $$MAJOR)"; \
		fi; \
	fi; \
	if ! command -v npm >/dev/null 2>&1; then \
		echo "✗ npm not found"; \
		MISSING="$$MISSING npm"; \
	else \
		echo "✓ npm installed: $$(npm --version)"; \
	fi; \
	PYTHON_VERSION=$$(uv run python --version 2>/dev/null | sed 's/Python //'); \
	if [ -z "$$PYTHON_VERSION" ]; then \
		if ! command -v python3 >/dev/null 2>&1; then \
			echo "✗ Python 3 not found"; \
			MISSING="$$MISSING python3"; \
		else \
			echo "✓ Python installed: $$(python3 --version | sed 's/Python //')"; \
		fi; \
	else \
		echo "✓ Python (via uv): $$PYTHON_VERSION"; \
		MAJOR=$$(echo $$PYTHON_VERSION | cut -d. -f1); \
		MINOR=$$(echo $$PYTHON_VERSION | cut -d. -f2); \
		if [ "$$MAJOR" -lt 3 ] || [ "$$MAJOR" -eq 3 -a "$$MINOR" -lt 12 ]; then \
			echo "  ⚠️  Python 3.12+ required (you have $$PYTHON_VERSION)"; \
			MISSING="$$MISSING python3.12"; \
		fi; \
	fi; \
	echo ""; \
	if [ -n "$$MISSING" ]; then \
		echo "❌ Missing prerequisites:$$MISSING"; \
		echo ""; \
		echo "Install missing tools and run 'make check-prereqs' again"; \
		exit 1; \
	else \
		echo "✅ All prerequisites satisfied!"; \
		echo ""; \
	fi

.PHONY: setup-env
setup-env:
	@echo "📝 Setting up environment files..."
	@echo ""
	@if [ ! -f backend/.env ]; then \
		cp backend/.env.example backend/.env; \
		echo "✓ Created backend/.env from backend/.env.example"; \
	else \
		echo "✓ backend/.env already exists"; \
	fi
	@if [ ! -f frontend/.env ]; then \
		cp frontend/.env.example frontend/.env; \
		echo "✓ Created frontend/.env from frontend/.env.example"; \
	else \
		echo "✓ frontend/.env already exists"; \
	fi
	@echo ""

.PHONY: install-deps
install-deps:
	@echo "📦 Installing dependencies..."
	@echo ""
	@echo "→ Backend (Python via uv)..."
	@cd backend && uv sync
	@echo ""
	@echo "→ Frontend (Node.js via npm)..."
	@cd frontend && npm install
	@echo ""
	@echo "✓ All dependencies installed"
	@echo ""

.PHONY: setup-pre-commit
setup-pre-commit:
	@echo "🪝 Setting up pre-commit hooks..."
	@echo ""
	@echo "→ Backend pre-commit hooks..."
	@cd backend && uv run pre-commit install
	@echo ""
	@echo "→ Frontend Husky hooks (via npm prepare)..."
	@cd frontend && npm run prepare 2>/dev/null || echo "  (Husky already initialized)"
	@echo ""
	@echo "✓ Pre-commit hooks installed"
	@echo ""

.PHONY: setup-git-automation
setup-git-automation:
	@./.claude/setup-git-permissions.sh

# ============================================================================
# Workshop Safety Setup (applies to entire repo)
# ============================================================================

.PHONY: workshop-setup
workshop-setup: setup-dcg setup-sandbox setup-hooks
	@echo ""
	@echo "✅ Workshop safety setup complete!"
	@echo ""
	@echo "Protection layers active:"
	@echo "  ✓ DCG (Destructive Command Guard) - Blocks dangerous git/filesystem commands"
	@echo "  ✓ Sandboxing - Claude Code limited to this project: $$(pwd)"
	@echo "  ✓ Auto-format hook - Code automatically formatted after edits"
	@echo ""
	@echo "Safe to start hacking! Run 'make verify-safety' anytime to check status."
	@echo ""

.PHONY: setup-dcg
setup-dcg:
	@echo "📦 Installing Destructive Command Guard (DCG)..."
	@echo ""
	@if command -v dcg >/dev/null 2>&1; then \
		echo "✓ DCG already installed"; \
		dcg --version 2>&1 || echo "version check failed"; \
	else \
		echo "Downloading and installing DCG..."; \
		curl -fsSL "https://raw.githubusercontent.com/Dicklesworthstone/destructive_command_guard/master/install.sh?$$(date +%s)" | bash -s -- --easy-mode; \
		echo "✓ DCG installed successfully"; \
	fi
	@echo ""

.PHONY: setup-sandbox
setup-sandbox:
	@echo "🔒 Configuring Claude Code sandboxing..."
	@echo ""
	@mkdir -p ~/.claude
	@if [ -f ~/.claude/settings.json ]; then \
		echo "⚠️  Existing ~/.claude/settings.json found"; \
		echo "   Creating backup: ~/.claude/settings.json.backup.$$(date +%s)"; \
		cp ~/.claude/settings.json ~/.claude/settings.json.backup.$$(date +%s); \
	fi
	@sed "s|\$${PROJECT_DIR}|$$(pwd)|g" .claude/settings.json > ~/.claude/settings.json
	@echo "✓ Sandbox configured for: $$(pwd)"
	@echo "✓ Settings written to: ~/.claude/settings.json"
	@echo ""
	@echo "Claude Code can now only access files in this directory."
	@echo "Use ./tmp/ for scratch work if needed."
	@echo ""

.PHONY: setup-hooks
setup-hooks:
	@echo "🪝 Installing auto-format hook..."
	@echo ""
	@mkdir -p ~/.claude/hooks
	@cp .claude/hooks/post-tool-use.sh ~/.claude/hooks/
	@chmod +x ~/.claude/hooks/post-tool-use.sh
	@echo "✓ Hook installed: ~/.claude/hooks/post-tool-use.sh"
	@echo "✓ Code will auto-format after Claude edits"
	@echo ""

.PHONY: verify-safety
verify-safety:
	@echo "🔍 Verifying workshop safety setup..."
	@echo ""
	@if command -v dcg >/dev/null 2>&1; then \
		echo "✓ DCG installed: $$(dcg --version 2>&1 || echo 'version check failed')"; \
	else \
		echo "✗ DCG not found - run 'make setup-dcg'"; \
	fi
	@echo ""
	@if [ -f ~/.claude/settings.json ]; then \
		echo "✓ Claude Code settings found"; \
		if grep -q '"enabled": true' ~/.claude/settings.json 2>/dev/null; then \
			echo "✓ Sandboxing is enabled"; \
			echo "  Allowed path: $$(grep -A 1 allowedPaths ~/.claude/settings.json | tail -1 | tr -d ' ",' || echo 'unknown')"; \
		else \
			echo "⚠️  Sandboxing config exists but may not be enabled"; \
		fi; \
	else \
		echo "✗ Claude Code settings not found - run 'make setup-sandbox'"; \
	fi
	@echo ""
	@if [ -d ./tmp ]; then \
		echo "✓ Scratch directory exists: ./tmp/"; \
	else \
		echo "⚠️  Scratch directory missing - creating it now..."; \
		mkdir -p ./tmp; \
		echo "✓ Created ./tmp/"; \
	fi
	@echo ""
	@if [ -f ~/.claude/hooks/post-tool-use.sh ]; then \
		echo "✓ Auto-format hook installed"; \
	else \
		echo "✗ Auto-format hook not found - run 'make setup-hooks'"; \
	fi
	@echo ""

.PHONY: restore-claude-settings
restore-claude-settings:
	@echo "🔄 Restoring Claude Code settings..."
	@LATEST_BACKUP=$$(ls -t ~/.claude/settings.json.backup.* 2>/dev/null | head -1); \
	if [ -n "$$LATEST_BACKUP" ]; then \
		cp "$$LATEST_BACKUP" ~/.claude/settings.json; \
		echo "✓ Restored from: $$LATEST_BACKUP"; \
	else \
		echo "✗ No backup found"; \
	fi

# ============================================================================
# Development Commands (orchestrate backend + frontend)
# ============================================================================

.PHONY: dev-backend
dev-backend:
	@cd backend && make run

.PHONY: dev-frontend
dev-frontend:
	@if [ -f frontend/package.json ]; then \
		cd frontend && npm run dev; \
	else \
		echo "⚠️  Frontend not set up yet. Initialize your frontend framework first:"; \
		echo "  cd frontend && npm create vite@latest . -- --template react-ts"; \
	fi

.PHONY: test-all
test-all:
	@echo "Running backend tests..."
	@cd backend && make test
	@echo ""
	@if [ -f frontend/package.json ]; then \
		echo "Running frontend tests..."; \
		cd frontend && npm test; \
	else \
		echo "⚠️  Frontend not set up, skipping frontend tests"; \
	fi

.PHONY: format-all
format-all:
	@echo "Formatting backend..."
	@cd backend && make format
	@echo ""
	@if [ -f frontend/package.json ]; then \
		echo "Formatting frontend..."; \
		cd frontend && npm run format 2>/dev/null || echo "No format script in frontend"; \
	fi

.PHONY: check-all
check-all:
	@echo "Checking backend..."
	@cd backend && make check
	@echo ""
	@if [ -f frontend/package.json ]; then \
		echo "Checking frontend..."; \
		cd frontend && npm run lint 2>/dev/null || echo "No lint script in frontend"; \
	fi
