# Changelog

All notable changes to this repository are documented in this file. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and releases follow the semantic-versioning
policy in [Release workflows](docs/release-workflows.md).

## [Unreleased]

### Added

- Add localized date-range, datetime, and datetime-range form controls with canonical values,
  consumer-owned labels, inclusive availability bounds, disabled-date support, and packed-demo
  examples.

### Changed

- Make `main` pushes version-driven: every push runs the package gate, while npm publication and
  release tagging occur only when the published package version changes.
- Run the read-only Make gate on every pushed commit as well as pull requests to `main`, while
  keeping push and pull-request concurrency separate so cancellation does not make PRs appear
  failed.
- Verify the packed package in the current-version demo during pull-request and release gates, and
  reject workspace dependency drift away from every declared peer floor.
- Split Dependabot policy by floor workspace, published manifest, and current-version demo; keep
  routine peer-floor bumps out of the floor workspace and group related Angular and CodeMirror
  updates.
- Require an up-to-date successful CI check before `main` accepts a commit.

### Deprecated

### Removed

### Fixed

- Use the same SVG calendar icon across localized date, date-range, datetime, and datetime-range
  picker controls instead of platform-dependent emoji glyphs.
- Preserve the owning page scroll position through delayed browser layout frames when vertical
  arrow navigation moves between rendered Markdown-table cells.
- Isolate packed-demo npm subprocesses from the user cache so consumer validation is reproducible
  under restricted local and CI environments.

### Security

## [0.2.1] - 2026-09-04

### Added

- Configure weekly Dependabot version updates for root and demo npm packages and pinned GitHub
  Actions.

### Changed

### Deprecated

### Removed

### Fixed

### Security

- Remove the bootstrap npm-token fallback from the release job so package publication authenticates
  only through the configured GitHub Actions trusted publisher.

## [0.2.0] - 2026-09-04

### Added

### Changed

- Move the package identity and every public import, style, and web-asset subpath from
  `@alittlemoron/design-system` to the npm organization scope
  `@alittlemore.dev/design-system`, while preserving the existing public contracts.

### Deprecated

### Removed

### Fixed

- Retry the post-publication npm registry lookup through bounded propagation delay before requiring
  tag-only recovery.

### Security

## [0.1.0] - 2026-09-04

### Added

- Prepare the initial `0.1.0` release of `@alittlemoron/design-system` with application-independent
  UI components, shared styles and theme preload, Markdown rendering and editing, public testing
  utilities, and a packed-archive demo.
- Add pull-request CI, strict push-to-`main` npm publication, CI-owned annotated release tags, and
  tag-only recovery for a published version whose tag creation failed.

### Changed

### Deprecated

### Removed

### Fixed

### Security
