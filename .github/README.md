# design-system

[🇷🇺 Russian version](./README_RU.md)

An Angular design-system library for application-independent UI components, shared styles,
Markdown rendering and editing, and public test utilities.

## Architecture

- [Package topology](../docs/package-topology.md)
- [Package distribution](../docs/package-distribution.md)
- [Angular compatibility](../docs/angular-compatibility.md)
- [Dependency contracts](../docs/dependency-contracts.md)

## Make commands

| Command                   | Description                                                       |
| ------------------------- | ----------------------------------------------------------------- |
| `make install`            | Install dependencies from the lock file.                          |
| `make test`               | Run Angular Jest tests and repository tool tests.                 |
| `make test-watch`         | Run Angular Jest tests in watch mode.                             |
| `make test-coverage`      | Run Angular Jest tests with coverage reports.                     |
| `make lint`               | Lint TypeScript, Angular templates, and repository tools.         |
| `make typecheck`          | Type-check production sources and Jest tests.                     |
| `make format`             | Format repository-owned source, configuration, and docs.          |
| `make format-check`       | Verify repository formatting without changing files.              |
| `make build`              | Build the partial-Ivy production library package.                 |
| `make watch`              | Rebuild the library when source files change.                     |
| `make verify-package`     | Build and verify public APIs, dependencies, and archive content.  |
| `make check`              | Run the complete local quality gate.                              |
| `make test-api-surface`   | Run the API-surface checker tests.                                |
| `make check-api-surface`  | Build and verify public APIs and import boundaries.               |
| `make update-api-surface` | Update API reports after an intentional public API change.        |
| `make test-styles`        | Run source style, contrast, preload, SSR, and CSP contract tests. |
| `make check-styles`       | Verify style contracts against sources and the built package.     |
