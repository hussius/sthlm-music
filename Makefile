# TODO: replace with just? (https://github.com/casey/just)
.PHONY: install install-dcg install-playwright-mcp install-mem-lite install-gsd format check test run

install:
	uv sync
	uv run pre-commit install
	$(MAKE) install-dcg
	$(MAKE) install-playwright-mcp
	$(MAKE) install-mem-lite
	$(MAKE) install-gsd

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
	uv run pytest

run:
	uv run src/main.py

install-dcg:
	@mkdir -p .claude/bin
	curl -fsSL "https://raw.githubusercontent.com/Dicklesworthstone/destructive_command_guard/master/install.sh" \
		| bash -s -- --dest "$(CURDIR)/.claude/bin"
	@echo "DCG installed at .claude/bin/dcg (project-local, gitignored)"

install-playwright-mcp:
	npm install --prefix .claude @playwright/mcp
	@echo "Playwright MCP installed at .claude/node_modules/.bin/playwright-mcp (project-local, gitignored)"

install-mem-lite:
	@if [ -d ".claude/mem-lite/.git" ]; then \
		git -C .claude/mem-lite pull --ff-only; \
	else \
		git clone https://github.com/sdsrss/claude-mem-lite .claude/mem-lite; \
	fi
	npm install --prefix .claude/mem-lite --omit=dev
	bash .claude/mem-lite/scripts/setup.sh
	@echo "claude-mem-lite installed at .claude/mem-lite (project-local, gitignored)"

install-gsd:
	@if [ -d ".claude/gsd/.git" ]; then \
		git -C .claude/gsd pull --ff-only; \
	else \
		git clone https://github.com/gsd-build/get-shit-done.git .claude/gsd; \
	fi
	@mkdir -p .claude/commands
	@if [ ! -e ".claude/commands/gsd" ]; then \
		ln -s ../gsd/commands/gsd .claude/commands/gsd; \
	fi
	@echo "GSD installed at .claude/gsd, commands linked at .claude/commands/gsd (project-local, gitignored)"
