# Package topology

Status: accepted on 2026-08-25.

## Decision

The design system is published as one Angular package with a primary UI entry point and secondary
entry points for Markdown rendering, the Markdown editor, test utilities, and styles.

The package is one installation, versioning, and release unit. Secondary entry points define
public API and bundle boundaries; they do not create separately installable dependency sets.

The package name and public subpaths are defined by
[Package distribution](package-distribution.md).

## Decision drivers

The package contains three capability groups:

- application-independent UI components and UI infrastructure;
- safe Markdown rendering that remains independent of the editor;
- an interactive Markdown editor that uses the UI and Markdown entry points.

One package provides an atomic public contract and release. Installing any entry point installs the
dependency set declared by the package manifest, including Markdown and CodeMirror dependencies.
Entry-point boundaries must still prevent unused capabilities from entering application bundles.

## Public entry-point topology

### Primary UI entry point

The primary entry point owns:

- standalone UI components and their public input, output, and forms contracts;
- notifications and their neutral models;
- theme and modal UI infrastructure;
- form-validation presentation behavior;
- shared presentation utilities.

It must not re-export Markdown-rendering or Markdown-editor APIs.

### Markdown-rendering secondary entry point

The Markdown-rendering entry point owns:

- Markdown parsing and rendering integration;
- syntax highlighting and the supported-language configuration;
- sanitization of rendered content;
- application-independent rendering and extension contracts;
- Markdown presentation styles.

It must not depend on the UI or Markdown-editor entry points.

### Markdown-editor secondary entry point

The Markdown-editor entry point owns:

- the Angular editor component and its public contracts;
- CodeMirror configuration, extensions, commands, presentation, and table editing;
- editor preview integration through the Markdown-rendering entry point;
- application-independent translation, locale, link, navigation, and image-capability contracts.

It may depend on the public UI and Markdown-rendering entry points. It must not import their
internal source paths.

### Styles secondary entry points

Styles are grouped by their logical owner:

- theme tokens, Bootstrap overrides, Angular CDK overlay styles, and common UI styles belong to UI;
- Markdown presentation styles belong to Markdown rendering;
- editor-specific styles remain scoped to or packaged with the Markdown editor.

The public style subpaths are `styles/theme-tokens`, `styles/bootstrap-overrides`,
`styles/cdk-overlay`, `styles/ui`, and `styles/markdown`. Importing a UI style must not implicitly
import Markdown-editor styles.

### Testing secondary entry point

The testing entry point contains only intentionally public test utilities. It is not re-exported by
any production entry point and must not be reachable from production bundles. Repository-only test
fixtures and helpers remain private.

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

- neighboring entry points communicate only through public entry points;
- the primary UI entry point does not aggregate or re-export Markdown APIs;
- UI and Markdown rendering do not import the Markdown editor;
- Markdown rendering does not import UI;
- the testing entry point depends only on public contracts owned by the capability it supports;
- application-specific integrations do not become package dependencies.

These rules keep the entry-point graph acyclic and allow build tools to exclude unused entry points
from application bundles.

## Package boundary

Public APIs remain application-independent. Authentication, application routes, backend APIs, i18n
catalogs, link semantics, navigation policy, and file transport are outside the package. Relevant
capabilities cross the boundary through neutral public contracts; the package does not call
application services or select application-specific behavior.

Concrete adapter implementations remain outside this repository. Their shared requirements may
inform a neutral package contract during migration, but their application data models and workflows
do not become package dependencies.

## Release and dependency consequences

- There is one package manifest, archive, installed version, and release operation.
- UI, Markdown rendering, and the editor cannot be installed or versioned independently.
- A breaking change in any public entry point is a breaking change to the package.
- Entry points from different package versions cannot be combined.
- All package-level dependencies are installed even when only one entry point is imported.
- Explicit imports and an acyclic, side-effect-controlled graph preserve bundle isolation.
- Splitting an entry point into a separate package requires a new architecture decision.

## Enforcement and verification

Repository checks must enforce these boundaries:

- API-surface verification detects unintended exports;
- internal-path import checks cover imports between entry points;
- package-content verification confirms the intended entry points and excludes test-only code;
- production builds confirm partial-Ivy compilation;
- repository-owned bundle fixtures confirm that UI-only and renderer-only imports do not include
  the editor;
- behavioral, SSR, strict-CSP, accessibility, and security tests remain owned by the relevant entry
  point.

## Alternatives considered

### Separate UI, Markdown-rendering, and Markdown-editor packages

This option physically isolates dependency installation, but creates separate versioning and
release units. It was rejected in favor of one atomic package contract.

### Two packages with the editor separated

This option isolates CodeMirror while combining UI and rendering. It was rejected because it only
partially isolates dependencies and weakens the UI-versus-rendering boundary.

## Decisions delegated to subsequent work

The following remain separate implementation decisions:

- detailed semantic-versioning and changelog workflow;
- Angular workspace and packaging configuration;
- runtime, peer, and development dependency classification;
- API-surface, bundle, and package-content implementation details.
