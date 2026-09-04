# TODO

## Repository foundation

- [x] Decide and document the package topology: one package with secondary entry points or separate UI, Markdown-rendering, and Markdown-editor packages.
- [x] Select the package name, registry visibility, ownership, local-development workflow, and initial versioning scheme.
- [x] Scaffold an Angular 22 library workspace with strict TypeScript, standalone Angular artifacts, SCSS support, and partial-Ivy production builds.
- [x] Select and verify the repository's Angular, TypeScript, RxJS, and Node.js compatibility baseline.
- [x] Configure public entry points for UI, styles, Markdown rendering, the Markdown editor, and test utilities.
- [x] Add an API-surface check that detects unintended public exports and imports through internal package paths.
- [x] Select and configure the Angular, Angular CDK, Bootstrap, RxJS, CodeMirror, Marked, Prism, and DOMPurify dependency contracts for each entry point.
- [x] Configure Jest, Angular testing support, ESLint, TypeScript checks, Prettier, production builds, and package-content verification.
- [x] Add repository scripts and thin Make targets for installation, tests, lint, type checks, format checks, builds, and package verification.
- [x] Configure CI to run the Make-based checks and build the distributable package.
- [ ] Configure strict push-to-main npm publication for unique versions, create matching CI-owned `vX.Y.Z` tags and a tag-only recovery path, bootstrap 0.1.0 through CI, migrate the package to trusted publishing, and revoke the bootstrap token.
- [x] Document the local packed-archive, stable-release, semantic-versioning, and changelog workflows.
- [x] Add a repository-owned Angular demo that installs the packed archive through public entry points and exercises the current UI, UI styles, theme preload, SSR, hydration, and strict CSP.
- [x] Preserve owning-page scroll when ArrowUp or ArrowDown moves between visible Markdown-table cells immediately after input.
- [ ] add dependabot

## Design tokens and shared styles

- [ ] Fully retire Bootstrap: replace all Bootstrap components, utility classes, variables, styles, and animations with repository-owned components, styles, and animations, then remove the Bootstrap dependencies, overrides, entry points, and Bootstrap-specific checks.
- [x] Migrate the byte-identical light and dark theme tokens from `my-site` and `personal-workspace`.
- [x] Implement separate SCSS entry points for theme tokens, Bootstrap overrides, Angular CDK overlay styles, common UI styles, and Markdown-rendering styles.
- [x] Classify the duplicated global component styles in `my-site` and `personal-workspace` as reusable UI, Markdown presentation, or application-specific styles.
- [x] Migrate the reusable selectors into their owning SCSS entry points.
- [x] Migrate the common color-contrast and shared-style regression tests from `my-site` and `personal-workspace`.
- [x] Add package-level checks for Bootstrap mappings, light and dark themes, SSR, strict CSP, and initial theme rendering.

## Independent UI components

- [x] Add regression tests for typed inputs and outputs, Angular Forms integration, keyboard behavior, accessibility semantics, `OnPush` rendering, SSR, and strict CSP.
- [x] error message component
  - [x] Migrate the duplicated `ErrorMessageComponent` from `my-site` and `personal-workspace`, define an `ErrorDisplay` contract, and migrate its tests.
- [x] loading spinner component
  - [x] Migrate the duplicated `LoadingSpinnerComponent` from `my-site` and `personal-workspace` and test its accessible-label contract.
- [x] empty state component
  - [x] Migrate the duplicated `EmptyStateComponent` from `my-site` and `personal-workspace` and test its public rendering contract.
- [x] select component
  - [x] Migrate the duplicated `SiteSelectComponent` from `my-site` and `personal-workspace` with option, size, and appearance contracts, template, styles, and tests.
- [x] foldable tree component
  - [x] Migrate the duplicated `FoldableTreeComponent` from `my-site` and `personal-workspace` with neutral item and section contracts, template, styles, and tests.
- [x] date picker component
  - [x] Migrate the duplicated `LocalizedDatePickerComponent` from `my-site` and `personal-workspace` with labels and control contracts, template, styles, and tests.
- [ ] date range picker component
  - [ ] Implements the duplicated `LocalizedDatePickerComponent` from current repo with logic for range selection.
- [ ] datetime picker component
  - [ ] Implements the duplicated `LocalizedDatePickerComponent` from current repo with logic for datetime selection.
- [ ] datetime range picker component
  - [ ] Implements the duplicated `LocalizedDatePickerComponent` from current repo with logic for datetime range selection.

## Notifications

- [x] Migrate the byte-identical `NotificationService`, notification model, auto-dismiss behavior, browser-timer cleanup, and tests from `my-site` and `personal-workspace`.
- [x] Migrate the duplicated `NotificationAreaComponent`, responsive placement, transition styles, and tests from `my-site` and `personal-workspace`.
- [x] Replace the source implementations' direct `TranslatePipe` dependency with an application-independent close-label contract.
- [x] Add regression tests for polite live-region behavior, alert semantics, manual dismissal, automatic dismissal, animation state, and server execution.

## Shared UI infrastructure

- [x] Migrate the byte-identical `ThemeService`, `ThemeName` contract, and tests from `my-site` and `personal-workspace`.
- [x] Migrate the byte-identical `ModalPageScrollLockService` and tests from `my-site` and `personal-workspace`.
- [x] Migrate the byte-identical `ModalScrollDirective` and tests from `my-site` and `personal-workspace`.
- [x] Add regression coverage for reference-counted page locking, nested modals, SSR execution, wheel scrolling, touch scrolling, and Angular CDK integration.

## Form validation behavior

- [x] Extract the shared behavior of `AdminControlValidationStateDirective` from `my-site` and `ControlValidationStateDirective` from `personal-workspace` into an application-independent package directive.
- [x] Migrate and consolidate directive tests for invalid and touched controls, `is-invalid`, `aria-invalid`, native control targeting, and Angular Forms integration.

## Presentation utilities and test helpers

- [x] Migrate `formatLocalizedDate` and its byte-identical tests from `my-site` and `personal-workspace`.
- [x] Confirm that the unused `slugify` implementation in `personal-workspace` has no shared package contract and exclude it from migration. `personal-workspace` has no production imports; only `my-site` applies the same code to application-owned slug fields.
- [x] Migrate the duplicated `site-select-testing.ts` helpers from `my-site` and `personal-workspace` into the public testing entry point.
- [x] Verify that production bundles do not contain the testing entry point.

## Markdown rendering

- [x] Extend the repository demo to exercise the packed Markdown-rendering entry point and public Markdown styles.
- [x] Implement the Markdown-rendering entry point independently of the interactive editor.
- [x] Migrate the byte-identical Prism syntax highlighter and supported-language configuration from `my-site` and `personal-workspace`.
- [x] Consolidate the duplicated Marked rendering, code-block highlighting, sanitization, and `.markdown-code` styles from `my-site` and `personal-workspace`.
- [x] Migrate and consolidate renderer regression tests from `my-site` and `personal-workspace` for scripts, event-handler attributes, unsafe URL schemes, escaped Markdown, unknown languages, and highlighted code output.
- [x] Define application-independent Markdown parsing, rendering, completion-metadata, and navigation extension contracts.
- [x] Extract only neutral extension contracts from the `my-site` wiki-link implementation and the empty `personal-workspace` wiki-link stubs; keep their application semantics out of the package.

## Markdown editor

- [x] Extend the repository demo to exercise the packed Markdown-editor entry point and its browser interactions.
- [x] Create the package editor from the `personal-workspace` and `my-site` implementation, including image capabilities, protected preview loading, pending-upload state, disabled interactions, MIME validation, object-URL cleanup, and syntax-tree-safe table selection.
- [x] Migrate the CodeMirror editor component, template, component styles, and editor theme styles from `personal-workspace`.
- [x] Migrate Markdown commands, editor extensions, presentation decorations, table parsing and editing, link completion infrastructure, sticky-bottom-inset behavior, and Markdown-table utilities from `personal-workspace`.
- [x] Migrate and consolidate editor regression tests from `my-site` and `personal-workspace` for commands, presentation, tables, selections, interactions, links, fullscreen behavior, uploads, accessibility, CSP, browser lifecycle, and malformed input.
- [x] Replace direct application translation, locale, and link dependencies in the source implementations with application-independent public contracts.
- [x] Derive neutral image and link capability requirements from `my-site` article-image upload and wiki-link behavior and from `personal-workspace` authenticated image-upload, attachment, and protected-preview behavior without adding application services to the package.
- [x] Promote the split `MarkdownEditorImageConfig` upload and preview strategies into the package API.
- [x] Connect editor preview to the package Markdown renderer and Prism highlighter.
- [x] Connect fullscreen behavior to the package modal page-scroll lock.
- [x] Add regression coverage for minimal CodeMirror transactions, undo and redo, selection direction, history, scroll intent, IME behavior, keyboard navigation, focus restoration, CSP nonce propagation, SSR guards, and object-URL revocation.
- [x] Prevent the owning page or scroll container from jumping while table rows are added and their cells are filled in the Markdown editor.
- [x] Convert Shift+Arrow text selection crossing a Markdown-table boundary into whole-cell selection without moving the table in the viewport.
- [x] Preserve an existing wiki-link alias after `|` when a target is selected from suggestions.
- [x] Clear semantic Markdown-table cell selection when an unmodified arrow moves the caret to another cell.
- [x] Make Shift+ArrowUp and Shift+ArrowDown whole-cell selection deterministic across every table column and direction.
- [x] Preserve an existing escaped wiki-link alias separator (`\|`) when completing a target inside a Markdown table.
- [x] Preserve external scroll while undoing or redoing Markdown-table content and structure changes.
- [x] Ignore malformed table copy/cut events without clipboard data instead of reporting a browser error.
- [x] Convert vertical Shift+Arrow selection to semantic cells whenever native geometry leaves a populated Markdown-table cell.
- [x] Keep horizontal Shift+Arrow cell selection within its current Markdown-table row instead of wrapping into a rectangle.
- [x] Render escaped Markdown-table punctuation without its escape marker and delete each visible escaped character atomically.
- [x] Preserve the visible character column and active target cell when ArrowUp or ArrowDown moves between populated Markdown-table cells.
- [x] Keep delayed Markdown-table cursor measurement safe when Source mode removes the table selection StateField.
- [x] Keep literal backslashes visible and independently editable where punctuation is not syntactically escaped inside Markdown-table inline code or raw HTML.
- [x] Exclude hidden Markdown-table escape markers from fallback caret geometry so the visible cursor stays aligned around escaped characters.
- [x] Keep ArrowUp and ArrowDown in the same table column when pressed immediately after typing into an empty cell.
- [x] Keep table-cell navigation from scrolling a visible target while minimally revealing a genuinely offscreen target.
- [ ] Eliminate the inline `style` attribute CSP violation from Markdown-editor Source mode without changing its placement or interactions.
- [ ] Add ordinary-file attachment support with a separate transport and insertion contract, configurable picker, paste, and drop sources, exact MIME and size validation, sequential retryable queues, and non-image preview semantics.
