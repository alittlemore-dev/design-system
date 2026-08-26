# design-system

[🇷🇺 Russian version](./README_RU.md)

An Angular design-system library for application-independent UI components, shared styles,
Markdown rendering and editing, and consumer test utilities used by `my-site` and
`personal-workspace`.

## Architecture

- [Package topology](../docs/package-topology.md)
- [Package distribution](../docs/package-distribution.md)
- [Angular compatibility](../docs/angular-compatibility.md)

## Make commands

| Command | Description |
| --- | --- |
| `make install` | Install dependencies from the lock file. |
| `make build` | Build the production library package. |
| `make watch` | Rebuild the library when source files change. |
| `make test-api-surface` | Run the API-surface checker tests. |
| `make check-api-surface` | Build and verify public APIs and import boundaries. |
| `make update-api-surface` | Update API reports after an intentional public API change. |
