NPM ?= npm

.PHONY: install test test-watch test-coverage lint typecheck format format-check build watch verify-package check test-api-surface check-api-surface update-api-surface test-styles check-styles

install:
	$(NPM) ci

test:
	$(NPM) test

test-watch:
	$(NPM) run test:watch

test-coverage:
	$(NPM) run test:coverage

lint:
	$(NPM) run lint

typecheck:
	$(NPM) run typecheck

format:
	$(NPM) run format

format-check:
	$(NPM) run format:check

build:
	$(NPM) run build

watch:
	$(NPM) run watch

verify-package:
	$(NPM) run verify:package

check:
	$(NPM) run check

test-api-surface:
	$(NPM) run test:api-surface

check-api-surface:
	$(NPM) run check:api-surface

update-api-surface:
	$(NPM) run update:api-surface

test-styles:
	$(NPM) run test:styles

check-styles:
	$(NPM) run check:styles
