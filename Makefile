# TODO: replace with just? (https://github.com/casey/just)
.PHONY: format check test run
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
