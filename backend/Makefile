# TODO: replace with just? (https://github.com/casey/just)
.PHONY: help
help:
	@echo "Agents Hackathon - Workshop Commands"
	@echo ""
	@echo "Setup:"
	@echo "  make install           - Install dependencies"
	@echo "  make setup-pre-commit  - Install pre-commit git hooks"
	@echo ""
	@echo "Safety Setup:"
	@echo "  make workshop-setup    - Complete safety setup (DCG + sandboxing + hooks)"
	@echo "  make setup-dcg         - Install Destructive Command Guard"
	@echo "  make setup-sandbox     - Configure Claude Code sandboxing"
	@echo "  make setup-hooks       - Install auto-format hook"
	@echo "  make verify-safety     - Verify all safety measures are active"
	@echo ""
	@echo "Development:"
	@echo "  make run               - Run the application"
	@echo "  make test              - Run tests"
	@echo "  make format            - Format code with ruff"
	@echo "  make check             - Run all checks (format, type, lint)"
	@echo "  make pre-commit        - Run pre-commit hooks on all files"
	@echo ""

# ============================================================================
# Workshop Safety Setup
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
# Development Commands
# ============================================================================

.PHONY: install setup-pre-commit format check test run

install:
	uv sync
	@echo ""
	@echo "📦 Dependencies installed! Next steps:"
	@echo "  1. Run 'make setup-pre-commit' to install git hooks"
	@echo "  2. Run 'make run' to start the server"
	@echo ""

setup-pre-commit:
	@echo "🪝 Installing pre-commit hooks..."
	uv run pre-commit install
	@echo "✓ Pre-commit hooks installed"
	@echo ""
	@echo "Hooks will run automatically before each commit:"
	@echo "  • Ruff formatting"
	@echo "  • Ruff linting"
	@echo "  • ty type checking"
	@echo "  • Pytest tests"
	@echo ""
	@echo "To run manually: make pre-commit"
	@echo ""

pre-commit:
	uv run pre-commit run --all-files

format:
	uv run ruff format .
	uv run ruff check --fix .
	uv run ruff check --select I --fix .

check:
	uv run ruff format --check .
	uv run ruff check --select I --fix --diff .
	uv run ty check .
	uv run ruff check

test:
	uv run python -m pytest

run:
	uv run src/main.py
