# Dependency contracts

Status: accepted on 2026-08-26.

## Decision

`@alittlemore.dev/design-system` uses a hybrid dependency model. Angular, Angular CDK, RxJS, and
Bootstrap are peer dependencies. Markdown, sanitization, syntax highlighting, CodeMirror, and
Lezer packages are runtime dependencies installed with the design system.

There is one npm manifest covering every public entry point. The entry-point ownership below explains
which capability introduces each package; its peer and runtime dependency maps are the aggregate
union of those contracts.

## Entry-point ownership

| Owner                  | Peer dependencies                                                                               | Runtime dependencies                                                                                                |
| ---------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Primary UI             | Angular common, core, and forms; Angular CDK; RxJS; Bootstrap                                   | None beyond package infrastructure                                                                                  |
| Markdown rendering     | Angular common and core                                                                         | Marked, Prism, DOMPurify                                                                                            |
| Markdown editor        | Primary UI and Markdown public entry points; Angular common, core, and forms; Angular CDK; RxJS | CodeMirror autocomplete, commands, Markdown language, language, search, state, and view; Lezer common and highlight |
| Testing                | Angular core and package public contracts                                                       | None; Jest is repository-only                                                                                       |
| Bootstrap overrides    | Bootstrap                                                                                       | None                                                                                                                |
| CDK overlay styles     | Angular CDK                                                                                     | None                                                                                                                |
| Package infrastructure | None                                                                                            | tslib                                                                                                               |

The editor must import UI and Markdown capabilities through
`@alittlemore.dev/design-system` and `@alittlemore.dev/design-system/markdown`. It must not replace those
entry-point relationships with source-relative imports. Jest and the repository test configuration
are not published.

## Published ranges

The required peer ranges are:

- `@angular/common`, `@angular/core`, `@angular/forms`, and `@angular/cdk`:
  `>=22.1.0 <23.0.0`;
- `rxjs`: `>=7.8.2 <8.0.0`;
- `bootstrap`: `>=5.3.8 <6.0.0`.

The runtime dependency ranges are:

- `marked` `^18.0.9`, `prismjs` `^1.30.0`, and `dompurify` `^3.4.13`;
- `@codemirror/autocomplete` `^6.20.3`, `@codemirror/commands` `^6.10.4`,
  `@codemirror/lang-markdown` `^6.5.2`, `@codemirror/language` `^6.12.4`,
  `@codemirror/search` `^6.7.1`, `@codemirror/state` `^6.7.1`, and `@codemirror/view`
  `^6.43.8`;
- `@lezer/common` `^1.5.2` and `@lezer/highlight` `^1.2.3`;
- `tslib` `^2.3.0`.

The workspace installs the exact peer floors: Angular and CDK 22.1.0, RxJS 7.8.2, and Bootstrap
5.3.8. This makes the production build exercise the published peer floors.
Runtime and tool dependencies are pinned exactly in the workspace lock file while the published
manifest permits compatible updates within the ranges above.

`@angular/platform-browser` and `zone.js` support repository tests only. Jest, jsdom, ESLint,
TypeScript, Prettier, and their adapters are workspace development dependencies and never appear in
the published manifest. Dart Sass `1.101.0` is also a direct workspace test dependency: source and
built-package checks compile every public SCSS entry point and their documented composition. Sass is
not a published runtime dependency.

The Bootstrap style entry point compiles Bootstrap's base before the package mappings and overrides.
Consumers must not add a second Bootstrap stylesheet import.

## Enforcement

`ng-packagr` receives an anchored allowlist for every runtime dependency. Adding another non-peer
dependency therefore requires an explicit configuration and contract change.

The package-content verifier derives the expected manifest from the entry-point map, builds the
aggregate peer and runtime dependency contracts, and compares them with the production package. It
also inspects `npm pack --dry-run --json` and rejects files outside the documented package
structure.

Raising a peer floor or changing a major Angular, CDK, RxJS, Bootstrap, Marked, DOMPurify, or
CodeMirror contract requires repository verification and the versioning process defined by the
package distribution decision.
