# Package topology

Status: accepted on 2026-08-25.

## Decision

The design system will be published as one Angular package with a primary UI entry point and
secondary entry points for Markdown rendering, the Markdown editor, styles, and consumer-facing
test utilities.

The package is one installation, versioning, and release unit. Secondary entry points define
public API and bundle boundaries; they do not create separately installable dependency sets.

The package name and final public subpaths are selected by the subsequent
[Package distribution](package-distribution.md) decision. The notation below describes the roles
whose concrete import specifiers that decision names.

## Context and decision drivers

The initial consumers are `my-site` and `personal-workspace`, with other internal applications
possible later. The shared implementation has three distinct capability groups:

- application-independent UI components and UI infrastructure;
- safe Markdown rendering that read-only views can consume without the editor;
- an interactive Markdown editor that uses both shared UI infrastructure and Markdown rendering.

All current consumers use Angular, and the renderer is an Angular library rather than a
framework-independent rendering core. The consumers can migrate to the design system in a
coordinated change. The package must have one version and be released atomically.

A single package means that installing any entry point installs the dependency set declared by the
whole package, including Markdown and CodeMirror dependencies. This is an accepted trade-off. The
entry-point boundaries must still prevent unused capabilities from entering application bundles.

## Public entry-point topology

### Primary UI entry point

The package's primary entry point owns application-independent UI:

- standalone UI components and their public input, output, and forms contracts;
- notifications and their neutral models;
- theme and modal UI infrastructure;
- form-validation presentation behavior;
- shared presentation utilities.

It must not re-export Markdown-rendering or Markdown-editor APIs. Consumers that need those
capabilities import their secondary entry points explicitly.

### Markdown-rendering secondary entry point

The Markdown-rendering entry point owns:

- Markdown parsing and rendering integration;
- syntax highlighting and the supported-language configuration;
- sanitization of rendered content;
- application-independent rendering and extension contracts;
- Markdown presentation styles.

It is independently consumable by read-only views. It must not depend on the UI or Markdown-editor
entry points.

### Markdown-editor secondary entry point

The Markdown-editor entry point owns:

- the Angular editor component and its public contracts;
- CodeMirror configuration, extensions, commands, presentation, and table editing;
- editor preview integration through the Markdown-rendering entry point;
- application-independent translation, locale, wiki-link, navigation, and image-capability
  contracts.

It may depend on the public UI and Markdown-rendering entry points. It must not import their
internal source paths.

### Styles secondary entry points

Styles remain grouped by their logical owner:

- theme tokens, Bootstrap overrides, Angular CDK overlay styles, and common UI styles belong to UI;
- Markdown presentation styles belong to Markdown rendering;
- editor-specific styles belong to the Markdown editor and remain scoped or packaged with it.

The subsequent [Package distribution](package-distribution.md) decision names the public style
subpaths as `styles/theme-tokens`, `styles/bootstrap-overrides`, `styles/cdk-overlay`, `styles/ui`,
and `styles/markdown`. Their packaging configuration remains deferred. Importing a UI style must
not implicitly import Markdown-editor styles.

### Testing secondary entry point

The testing entry point contains only utilities intentionally supported for consumer tests. It is
not re-exported by any production entry point and must not be reachable from production bundles.
Internal test fixtures and helpers remain private unless consumers have a concrete need for them.

## Dependency rules

The allowed internal dependency direction is:

```text
Markdown editor ──> primary UI
       │
       └──────────> Markdown rendering

Markdown rendering    primary UI
        └────── no dependency ──────┘
```

The rules are:

- consumers import only documented package entry points;
- neighboring entry points also communicate only through public entry points;
- the primary UI entry point does not aggregate or re-export Markdown APIs;
- UI and Markdown rendering do not import the Markdown editor;
- Markdown rendering does not import UI;
- the testing entry point depends only on public contracts owned by the capability it supports;
- consumer-specific integrations never become package dependencies.

These rules keep the entry-point graph acyclic and allow build tools to exclude unused entry points
from consumer bundles. Bundle isolation is a required property to verify during package scaffolding;
secondary entry points alone do not prove it.

## Consumer integration boundary

Consumers use the entry points independently for UI and read-only Markdown views. The Markdown
editor uses the package renderer for preview and shared UI infrastructure where required.

Authentication, application routes, backend APIs, i18n catalogs, wiki-link semantics, navigation,
and file transport remain in consumer applications. Consumers connect them through explicit,
application-independent adapter contracts exposed by the relevant entry point. Application errors
cross the boundary through neutral public contracts; the package does not call consumer services or
select application-specific error presentation.

The concrete adapter shapes and error contracts are defined by the later renderer and editor
contract work, not by this topology decision.

## Release and dependency consequences

- There is one package manifest, package archive, installed version, and release operation.
- UI, Markdown rendering, and the editor cannot be installed or versioned independently.
- A breaking change in any public entry point is a breaking change to the package.
- Consumers cannot combine entry points from different package versions.
- All package-level dependencies are installed even when a consumer imports only one entry point.
- Explicit imports and an acyclic, side-effect-controlled entry-point graph preserve the ability to
  omit unused capabilities from application bundles.
- Splitting an entry point into a separate package later requires a new architecture decision and a
  consumer migration; it is not an implementation detail.

## Enforcement and verification

Later repository-foundation work must turn these documented boundaries into executable checks:

- public API-surface verification must detect unintended exports;
- internal-path import checks must cover both consumers and imports between entry points;
- package-content verification must confirm the intended entry points and exclude test-only code
  from production surfaces;
- production builds must confirm that UI-only and renderer-only consumers do not bundle the editor;
- behavioral, SSR, strict-CSP, and security tests remain owned by the entry point whose contract they
  exercise;
- consumer integration checks must use packaged entry points rather than sibling source files.

These checks are already represented by subsequent items in `docs/TODO.md`; this decision does not
add or implement them.

## Alternatives considered

### Separate UI, Markdown-rendering, and Markdown-editor packages

This option provides physical dependency isolation: UI consumers do not install Markdown or
CodeMirror dependencies, and renderer consumers do not install CodeMirror. It was rejected for the
current topology in favor of one installation, versioning, and release unit for the coordinated
migration.

### Two packages with the editor separated

This option isolates CodeMirror while combining UI and rendering. It was rejected because it only
partially isolates dependencies and weakens the UI-versus-rendering boundary without removing the
need to coordinate releases.

## Decisions delegated to subsequent work

The subsequent [Package distribution](package-distribution.md) decision selects the package name,
registry visibility, ownership, public subpaths, local-development workflow, and initial versioning
scheme.

This document still does not select:

- the detailed semantic-versioning and changelog workflow beyond that initial scheme;
- the Angular workspace and packaging configuration;
- which dependencies are runtime dependencies, peer dependencies, or development dependencies;
- the implementation details of API-surface, bundle, and package-content checks.

Those choices belong to the subsequent repository-foundation items in `docs/TODO.md`.
