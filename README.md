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

### 3. Start Hacking!

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

## 🔧 Development Commands

```bash
# Format code
make format

# Run type checking and linting
make check

# Run tests
make test

# Run the application
make run

# View all available commands
make help
```

## 📁 Project Structure

```
agents-hackathon/
├── .claude/               # Claude Code configuration
│   └── claude-settings.json
├── src/                   # Main application code
├── tests/                 # Test files
├── tmp/                   # Scratch directory (git-ignored)
├── Makefile              # Workshop + development commands
└── README.md             # This file
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