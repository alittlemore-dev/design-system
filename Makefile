NPM ?= npm

.PHONY: install build watch test-api-surface check-api-surface update-api-surface

install:
	$(NPM) ci

build:
	$(NPM) run build

watch:
	$(NPM) run watch

test-api-surface:
	$(NPM) run test:api-surface

check-api-surface:
	$(NPM) run check:api-surface

update-api-surface:
	$(NPM) run update:api-surface
