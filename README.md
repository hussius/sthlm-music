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
4. [claude-mem-lite](https://github.com/sdsrss/claude-mem-lite) — lightweight persistent memory for Claude, installed locally to `.claude/mem-lite/`
5. [GSD](https://github.com/gsd-build/get-shit-done) — structured workflow commands for Claude, installed locally to `.claude/gsd/` with commands symlinked into `.claude/commands/gsd/`

Nothing is written to your machine outside the project directory (except `~/.claude-mem-lite/` for the memory database). GSD creates a `.planning/` directory inside the project the first time you use it.

## Development

```bash
claude --dangerously-skip-permissions
```

Inside the session, optionally enable sandboxing for an extra safety layer:

```
/sandbox
```

Then kick off your project:

```
/gsd:new-project
```

GSD will interview you about what you're building, spin up parallel research agents, and produce a roadmap with scoped phases before you write a line of code.

---

### GSD workflow

Once your project is initialized, GSD guides you through phases. A typical flow:

| Command | When to use |
|---|---|
| `/gsd:progress` | Check where you are and what's next |
| `/gsd:discuss-phase N` | Clarify approach and lock decisions before planning |
| `/gsd:plan-phase N` | Research solutions and generate atomic task plans |
| `/gsd:execute-phase N` | Run all tasks in parallel waves, each with a fresh context |
| `/gsd:verify-work N` | Walk through acceptance testing; diagnose failures automatically |
| `/gsd:quick` | Skip the ceremony for small fixes and one-off tasks |
| `/gsd:pause-work` | End a session — saves full state so you can resume later |
| `/gsd:resume-work` | Pick up exactly where you left off |

For a full command reference: `/gsd:help`

---

| Command | Description |
|---|---|
| `make run` | Start the server |
| `make test` | Run tests |
| `make format` | Format code |
| `make check` | Lint and type check |

## Workflow tooling

This repo bundles two tools for managing AI context across sessions:

**[claude-mem-lite](https://github.com/sdsrss/claude-mem-lite)** is a passive memory system. It observes every tool call during a session, batches related operations into episodes, and uses a small LLM (Haiku) to compress them into searchable observations stored in a local SQLite database. At the start of each new session it injects a compact summary of relevant past work — decisions made, bugs fixed, patterns established. The goal is to eliminate the amnesia that makes AI agents frustrating on multi-session projects.

**[GSD (get-shit-done)](https://github.com/gsd-build/get-shit-done)** is an active workflow system delivered as 31 slash commands (`/gsd:*`). It guides development through explicit phases — discuss, plan, execute, verify — and combats context rot (quality degradation as the context window fills) by spawning sub-agents with fresh contexts for each execution task. State is persisted in a `.planning/` directory: roadmaps, research outputs, phase plans, and session handoffs.

The two are complementary: claude-mem-lite captures the *implicit* history of what happened and why; GSD manages the *explicit* state of where you are in a project and what comes next.

## Safety

DCG is pre-configured as a Claude Code `PreToolUse` hook. After `make install`, Claude Code automatically intercepts potentially destructive shell commands before they run. The binary lives at `.claude/bin/dcg` and is gitignored — each developer installs it locally.

### Sandboxing

Claude Code has native OS-level sandboxing that restricts filesystem writes and outbound network access. **You need to enable this yourself** by running `/sandbox` inside Claude Code at the start of your session.

We don't enable it by default in this repo because it conflicts with standard dev tooling caches (`uv`, `npm`, `pre-commit`) that write outside the project directory. Configuring those exceptions adds meaningful complexity. For a hackathon, DCG covers the most dangerous cases and sandbox is a valuable extra layer if you want it — just be prepared for some tool friction.

**macOS:** Works out of the box — no setup needed beyond the `/sandbox` command.

**Linux / WSL2:** Requires two packages first:

```bash
# Ubuntu/Debian
sudo apt-get install bubblewrap socat

# Fedora
sudo dnf install bubblewrap socat
```

> WSL1 is not supported. WSL2 only.

## A note on tooling philosophy

DCG, Playwright MCP, claude-mem-lite, and GSD are scoped to this repo intentionally. In normal practice you'd install these once on your machine — DCG globally via its install script, Playwright MCP as a global Claude Code MCP server, claude-mem-lite via its plugin system, and GSD via its interactive installer — and they'd be available across all your projects.

We're doing it this way here to keep the hackathon environment clean: no modifications to your global Claude config, no risk of conflicting with tools you already have set up, and nothing left behind on your machine after the event. Everything lives inside the project directory and disappears when you delete it.

If you decide you want these tools permanently after the hackathon, all four projects have straightforward global install instructions in their respective repos.
