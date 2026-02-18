# agents_hackathon

Template repo for Codon's agentic coding hackathon.

## Prerequisites

- [`uv`](https://docs.astral.sh/uv/getting-started/installation/) — Python package manager
- [`node` / `npm`](https://nodejs.org/) — required for Playwright MCP
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview) — AI coding agent

## Setup

```bash
git clone <your-fork>
cd agents-hackathon
make install
```

That's it. `make install` handles:
1. Python dependencies via `uv sync`
2. [DCG](https://github.com/Dicklesworthstone/destructive_command_guard) — a safety guard that prevents Claude from running destructive commands, installed locally to `.claude/bin/`
3. [Playwright MCP](https://github.com/microsoft/playwright-mcp) — browser automation tools for Claude, installed locally to `.claude/node_modules/`

Nothing is written to your machine outside the project directory.

## Development

| Command | Description |
|---|---|
| `make run` | Start the server |
| `make test` | Run tests |
| `make format` | Format code |
| `make check` | Lint and type check |

## Safety

DCG is pre-configured as a Claude Code `PreToolUse` hook. After `make install`, Claude Code automatically intercepts potentially destructive shell commands before they run. The binary lives at `.claude/bin/dcg` and is gitignored — each developer installs it locally.

## A note on tooling philosophy

DCG and Playwright MCP are scoped to this repo intentionally. In normal practice you'd install these once on your machine — DCG globally via its install script, and Playwright MCP as a global Claude Code MCP server — and they'd be available across all your projects.

We're doing it this way here to keep the hackathon environment clean: no modifications to your global Claude config, no risk of conflicting with tools you already have set up, and nothing left behind on your machine after the event. Everything lives inside the project directory and disappears when you delete it.

If you decide you want these tools permanently after the hackathon, both projects have straightforward global install instructions in their respective repos.
