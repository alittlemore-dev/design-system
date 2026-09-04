# design-system

[🇷🇺 Russian version](./README_RU.md)

An Angular design-system library for application-independent UI components, shared styles,
Markdown rendering and editing, and public test utilities.

## Architecture

- [Package topology](../docs/package-topology.md)
- [Package distribution](../docs/package-distribution.md)
- [Angular compatibility](../docs/angular-compatibility.md)
- [Dependency contracts](../docs/dependency-contracts.md)
- [Release workflows](../docs/release-workflows.md)
- [Changelog](../CHANGELOG.md)

## Demo application

The repository contains an independent Angular SSR application in [`demo/`](../demo/README.md).
Before every run, the runner builds the production package, creates a `.tgz`, installs it into the
demo through public entry points, and restores `demo/node_modules` from its lock file afterward.

Start the interactive demo:

```sh
make demo
```

## Make commands

| Command                     | Description                                                       |
| --------------------------- | ----------------------------------------------------------------- |
| `make install`              | Install dependencies from the lock file.                          |
| `make test`                 | Run Angular Jest tests and repository tool tests.                 |
| `make test-watch`           | Run Angular Jest tests in watch mode.                             |
| `make test-coverage`        | Run Angular Jest tests with coverage reports.                     |
| `make lint`                 | Lint TypeScript, Angular templates, and repository tools.         |
| `make typecheck`            | Type-check production sources and Jest tests.                     |
| `make format`               | Format repository-owned source, configuration, and docs.          |
| `make format-check`         | Verify repository formatting without changing files.              |
| `make build`                | Build the partial-Ivy production library package.                 |
| `make watch`                | Rebuild the library when source files change.                     |
| `make verify-package`       | Build and verify public APIs, dependencies, and archive content.  |
| `make check`                | Run the complete local quality gate.                              |
| `make test-api-surface`     | Run the API-surface checker tests.                                |
| `make check-api-surface`    | Build and verify public APIs and import boundaries.               |
| `make update-api-surface`   | Update API reports after an intentional public API change.        |
| `make test-styles`          | Run source style, contrast, preload, SSR, and CSP contract tests. |
| `make check-styles`         | Verify style contracts against sources and the built package.     |
| `make demo`                 | Build the package and start the interactive demo application.     |
| `make check-demo`           | Verify the demo's production SSR, hydration, and strict CSP.      |
| `make install-demo-browser` | Install Chromium for the browser smoke test.                      |
| `make check-demo-browser`   | Run the demo's SSR/CSP and Chromium smoke tests.                  |
