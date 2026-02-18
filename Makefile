# TODO: replace with just? (https://github.com/casey/just)
.PHONY: install install-dcg install-playwright-mcp format check test run

install:
	uv sync
	$(MAKE) install-dcg
	$(MAKE) install-playwright-mcp

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
