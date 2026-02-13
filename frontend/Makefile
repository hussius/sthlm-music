# Frontend Makefile
.PHONY: help install run dev build test format check preview

help:
	@echo "Frontend Commands"
	@echo ""
	@echo "Setup:"
	@echo "  make install           - Install dependencies"
	@echo ""
	@echo "Development:"
	@echo "  make dev               - Start development server"
	@echo "  make run               - Alias for dev"
	@echo "  make build             - Build for production"
	@echo "  make preview           - Preview production build"
	@echo ""
	@echo "Code Quality:"
	@echo "  make format            - Format code with Prettier"
	@echo "  make check             - Run linting and type checks"
	@echo "  make test              - Run tests"
	@echo ""

install:
	@if [ -f .env ] && grep -q "CCL_NPM_TOKEN" .env 2>/dev/null; then \
		echo "📦 Installing with CCL_NPM_TOKEN..."; \
		. .env && export CCL_NPM_TOKEN && npm install; \
	else \
		echo "📦 Installing dependencies..."; \
		npm install; \
	fi
	@echo "✓ Frontend dependencies installed"

dev:
	@if [ -f .env ]; then \
		. .env && npm run dev -- --port $${PORT:-3000}; \
	else \
		npm run dev; \
	fi

run: dev

build:
	npm run build

preview:
	npm run build && node api.js

test:
	npm test

format:
	npm run format

check:
	npm run check

# Advanced: Link local Codon Component Library (for Codon employees)
link-ccl:
	npm link @codongit/codon-component-library
