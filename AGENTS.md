# AGENTS.md

## Architecture references

- Read [Package topology](docs/package-topology.md) before changing package boundaries, public entry
  points, or dependencies between UI, Markdown rendering, and the Markdown editor.

## Package boundaries

- Design-system packages must expose only application-independent UI contracts. Consumer-specific APIs, authentication, i18n catalogs, wiki-link semantics, routes, and file transport stay in consumer applications and integrate through explicit adapters.
- Consumers must use documented package entry points and must not import design-system internals or retain permanent sibling file dependencies.

## Component quality

- New and migrated components must be standalone, use `OnPush` change detection, be accessible, remain SSR-safe and strict-CSP-compatible, and have behavioral test coverage.
