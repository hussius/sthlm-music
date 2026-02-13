# Pre-Commit Hooks Setup Guide

This project uses pre-commit hooks to ensure code quality before commits. Both backend and frontend have their own pre-commit configurations.

## 🔧 Backend Pre-Commit Setup

The backend uses Python's `pre-commit` framework.

### Hooks Configured

- **Ruff formatter** - Formats Python code automatically
- **Ruff linter** - Lints and fixes Python code issues
- **ty** - Type checking with pyright wrapper
- **Pytest** - Runs tests before commit
- **Basic file checks** - Trailing whitespace, YAML/TOML syntax, large files, merge conflicts

### Installation

```bash
cd backend
make setup-pre-commit
```

This will:
1. Install pre-commit via uv
2. Install git hooks
3. Configure all checks

### Manual Run

To run pre-commit checks manually on all files:

```bash
cd backend
make pre-commit
```

Or on staged files only:

```bash
cd backend
uv run pre-commit run
```

### Skipping Hooks (Not Recommended)

If you absolutely need to skip pre-commit hooks:

```bash
git commit --no-verify -m "your message"
```

⚠️ **Warning:** Only skip hooks if you know what you're doing. CI will still run these checks.

---

## 🎨 Frontend Pre-Commit Setup

The frontend uses Husky + lint-staged.

### Hooks Configured

- **Prettier** - Formats TypeScript, TSX, and CSS files
- **ESLint** - Lints and fixes TypeScript/TSX code
- **Type checking** - TypeScript compiler check

### Installation

**Prerequisites:** You need a GitLab auth token for the `@codongit/codon-component-library` package.

1. Set up your NPM auth token:
   ```bash
   export CCL_NPM_TOKEN="your-gitlab-token-here"
   ```

2. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```

3. Husky will auto-install hooks via the `prepare` script

### Manual Run

To run pre-commit checks manually:

```bash
cd frontend
npm run pre-commit
```

Or run individual checks:

```bash
cd frontend
npm run format  # Format all files
npm run check   # Run all checks (format, lint, type, test)
```

### What Gets Checked

Lint-staged only checks **staged files**, not your entire codebase. This makes commits fast.

- `*.ts` and `*.tsx` files → Prettier + ESLint
- `*.css` files → Prettier

### Skipping Hooks (Not Recommended)

```bash
git commit --no-verify -m "your message"
```

⚠️ **Warning:** Only skip if absolutely necessary.

---

## 🚀 Quick Start (Both Services)

### First Time Setup

```bash
# Backend
cd backend
make install
make setup-pre-commit

# Frontend (after setting CCL_NPM_TOKEN)
cd frontend
npm install
```

That's it! Pre-commit hooks are now active.

### Making Your First Commit

1. Make your changes
2. Stage files: `git add .`
3. Commit: `git commit -m "feat: your feature"`
4. Hooks run automatically ✨

If hooks fail:
- Backend: Fix Python errors, re-stage, commit again
- Frontend: Fix TypeScript/formatting errors, re-stage, commit again

### Verification

**Backend:**
```bash
cd backend
make pre-commit  # Should run successfully
```

**Frontend:**
```bash
cd frontend
npm run pre-commit  # Should run successfully
```

---

## 🛠️ Troubleshooting

### Backend Issues

**"pre-commit: command not found"**
```bash
cd backend
uv sync  # Re-install dependencies
make setup-pre-commit
```

**"pytest failed"**
- Fix the failing tests
- Or temporarily skip: `SKIP=pytest git commit -m "message"`

**"ruff format failed"**
```bash
cd backend
make format  # Auto-fix formatting
git add .
git commit -m "your message"
```

**"ty check failed"**
- Fix type errors in your Python code
- Run `make check` to see all issues
- Or temporarily skip: `SKIP=ty git commit -m "message"`

### Frontend Issues

**"husky: command not found"**
```bash
cd frontend
npm install  # Re-install dependencies
```

**"lint-staged: command not found"**
```bash
cd frontend
npm install lint-staged --save-dev
```

**"ESLint errors"**
```bash
cd frontend
npm run format  # Auto-fix most issues
# Manually fix remaining issues
git add .
git commit -m "your message"
```

**"Cannot find module '@codongit/codon-component-library'"**
- Ensure `CCL_NPM_TOKEN` environment variable is set
- Run `npm install` again

---

## 📝 Configuration Files

### Backend

- `.pre-commit-config.yaml` - Pre-commit hook definitions
- `pyproject.toml` - Ruff and tool configurations
- `Makefile` - Convenience commands

### Frontend

- `.husky/pre-commit` - Git hook script
- `package.json` - Husky and lint-staged config
- `eslint.config.js` - ESLint rules
- `prettier.config.js` (if exists) - Prettier rules

---

## 🎯 Best Practices

1. **Run checks before staging:**
   ```bash
   # Backend
   cd backend && make format && make check

   # Frontend
   cd frontend && npm run format && npm run check
   ```

2. **Commit frequently:** Pre-commit hooks make small commits fast and safe

3. **Fix issues immediately:** Don't accumulate linting errors

4. **Use the `/checkpoint` skill:** Automates testing + committing

5. **Keep hooks fast:** If pytest is slow, consider running only affected tests

---

## 🔗 Additional Resources

- [pre-commit documentation](https://pre-commit.com/)
- [Husky documentation](https://typicode.github.io/husky/)
- [lint-staged documentation](https://github.com/lint-staged/lint-staged)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

**Questions?** Check the main `CLAUDE.md` or service-specific `CLAUDE.md` files for more guidance.
