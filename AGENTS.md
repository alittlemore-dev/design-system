# AGENTS.md

## Architecture references

- Read [Package topology](docs/package-topology.md) before changing package boundaries, public entry
  points, or dependencies between UI, Markdown rendering, and the Markdown editor.
- Read [Package distribution](docs/package-distribution.md) before changing the package identity,
  registry, public subpaths, publishing authority, local package workflow, or versioning baseline.
- Read [Angular compatibility](docs/angular-compatibility.md) before changing Angular framework,
  compiler, TypeScript, RxJS, or Node baselines, peer ranges, or package compatibility
  verification.

## Package boundaries

- Design-system packages must expose only application-independent contracts.
- Compatibility, dependency, publication, and package-verification decisions must derive only from
  package sources, public contracts, repository configuration, and generated package artifacts.
- Migration tasks may name source repositories only to identify code and tests to extract; source
  application versions, release workflows, and delivery checks are not package contracts.

## Component quality

- New and migrated components must be standalone, use `OnPush` change detection, be accessible, remain SSR-safe and strict-CSP-compatible, and have behavioral test coverage.
