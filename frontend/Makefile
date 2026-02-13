include .env
export $(shell sed -n 's/=.*//p' .env)

run:
	npm run dev -- --port ${PORT}

preview:
	npm run build && node api.js

link-ccl:
	npm link @codongit/codon-component-library

install-dependencies:
	source .env && export CCL_NPM_TOKEN && npm install

format:
	npm run format

check:
	npm run check
