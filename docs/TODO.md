# TODO

## Repository foundation

- [x] Decide and document the package topology: one package with secondary entry points or separate UI, Markdown-rendering, and Markdown-editor packages.
- [x] Select the package names, registry visibility, ownership, local-development workflow, and initial versioning scheme.
- [x] Scaffold an Angular 22 library workspace with strict TypeScript, standalone Angular artifacts, SCSS support, and partial-Ivy production builds.
- [x] Select an Angular version compatible with the current versions of `my-site` and `personal-workspace` and verify both consumers against it.
- [x] Configure public entry points for UI, styles, Markdown rendering, the Markdown editor, and test utilities.
- [ ] Add an API-surface check that detects unintended public exports and imports through internal package paths.
- [ ] Select and configure the Angular, Angular CDK, Bootstrap, RxJS, CodeMirror, Marked, Prism, and DOMPurify dependency contracts for each entry point.
- [ ] Configure Jest, Angular testing support, ESLint, TypeScript checks, Prettier, production builds, and package-content verification.
- [ ] Add repository scripts and thin Make targets for installation, tests, lint, type checks, format checks, builds, and package verification.
- [ ] Configure CI to run the Make-based checks and build the distributable packages.
- [ ] Configure strict push-to-main npm publication for unique versions, bootstrap 0.1.0 through CI, migrate the package to trusted publishing, and revoke the bootstrap token.
- [ ] Document the local packed-archive, stable-release, semantic-versioning, and changelog workflows.
- [ ] Add a repository-owned Angular demo application that installs packed archives through public entry points and exercises UI, Markdown rendering, the editor, styles, SSR, and strict CSP without depending on either consumer repository.

## Design tokens and shared styles

- [ ] Move the byte-identical light and dark theme tokens from both applications into the design system.
- [ ] Create separate SCSS entry points for theme tokens, Bootstrap overrides, Angular CDK overlay styles, common UI styles, and Markdown-rendering styles.
- [ ] Classify the selectors in the duplicated global component stylesheet as reusable UI, Markdown presentation, or application-specific styles.
- [ ] Move the reusable selectors identified by the style classification into their corresponding SCSS entry points.
- [ ] Move the common color-contrast and shared-style regression tests into the design-system test suite.
- [ ] Add consumer integration coverage for theme preload and initial-document rendering in both applications.
- [ ] Run SSR, strict-CSP, Bootstrap-mapping, light-theme, dark-theme, and initial-theme-flash checks after the style migration.

## Independent UI components

- [ ] Move `EmptyStateComponent` and add a focused test for its public rendering contract.
- [ ] Move `LoadingSpinnerComponent` and add a focused test for its accessible-label contract.
- [ ] Move `ErrorMessageComponent`, introduce a library-owned `ErrorDisplay` contract, and move the existing component tests.
- [ ] Move `FoldableTreeComponent`, its item and section contracts, template, styles, and existing tests; replace application-specific test IDs with neutral fixtures.
- [ ] Move `LocalizedDatePickerComponent`, its labels and control contracts, template, styles, and existing tests; replace application-specific server-test wording.
- [ ] Move `SiteSelectComponent`, its option, size, and appearance contracts, template, styles, and existing tests.
- [ ] Add design-system regression tests for typed inputs and outputs, Angular Forms integration, keyboard behavior, accessibility semantics, `OnPush` rendering, SSR, and strict CSP where the migrated components exercise those behaviors.
- [ ] Replace the duplicated consumer components with imports from the UI package entry point.

## Notifications

- [ ] Move the byte-identical `NotificationService`, notification model, auto-dismiss behavior, browser-timer cleanup, and existing tests.
- [ ] Move `NotificationAreaComponent`, its responsive placement and transition styles, and existing tests.
- [ ] Replace `NotificationAreaComponent`'s `TranslatePipe` dependency with a consumer-supplied close label or translation contract.
- [ ] Add regression tests for polite live-region behavior, alert semantics, manual dismissal, automatic dismissal, animation state, and server execution.
- [ ] Replace the duplicated notification implementations in both consumers with package imports.

## Shared UI infrastructure

- [ ] Move the byte-identical `ThemeService`, `ThemeName` contract, and existing tests.
- [ ] Move the byte-identical `ModalPageScrollLockService` and its existing tests.
- [ ] Move the byte-identical `ModalScrollDirective` and its existing tests.
- [ ] Add regression coverage for reference-counted page locking, nested modals, SSR execution, wheel scrolling, touch scrolling, and Angular CDK integration.
- [ ] Replace the duplicated theme and modal infrastructure in both consumers with package imports.

## Form validation behavior

- [ ] Extract the shared behavior of `AdminControlValidationStateDirective` and `ControlValidationStateDirective` into a neutral package directive.
- [ ] Add directive tests for invalid and touched controls, `is-invalid`, `aria-invalid`, native control targeting, and Angular Forms integration.
- [ ] Replace the two feature-owned validation-state directives with the package directive.

## Shared presentation utilities and test helpers

- [ ] Move `formatLocalizedDate` and its byte-identical existing tests.
- [ ] Remove the unused `slugify` copy and its isolated tests from `personal-workspace` after confirming it has no production consumers.
- [ ] Move `site-select-testing.ts` into a dedicated package testing entry point.
- [ ] Replace duplicated consumer test-helper imports with the package testing entry point.
- [ ] Verify that production bundles do not contain the package testing entry point.

## Markdown rendering

- [ ] Create a Markdown-rendering entry point that can be consumed independently of the interactive editor.
- [ ] Move the byte-identical Prism-based Markdown syntax highlighter and its supported-language configuration.
- [ ] Extract the duplicated Marked rendering, code-block highlighting, Angular sanitization, and `.markdown-code` presentation styles.
- [ ] Move and consolidate regression tests for scripts, event-handler attributes, unsafe URL schemes, escaped Markdown, unknown languages, and highlighted code output.
- [ ] Define package contracts for optional Markdown parsing, rendering, completion metadata, and navigation extensions.
- [ ] Implement the `my-site` wiki-link extension using the package extension contracts.
- [ ] Remove the empty wiki-link target stubs from `personal-workspace` after switching it to the package renderer.
- [ ] Replace the duplicated read-view renderers in both consumers with the Markdown-rendering entry point.

## Markdown editor

- [ ] Create the package editor from the `personal-workspace` implementation, including image capabilities, protected preview loading, pending-upload state, disabled upload interactions, MIME validation, object-URL cleanup, and syntax-tree-safe table selection.
- [ ] Move the CodeMirror editor component, template, component styles, and editor theme styles.
- [ ] Move Markdown commands, editor foundation extensions, presentation decorations, table parsing and editing, wiki-link completion infrastructure, sticky-bottom-inset behavior, and Markdown-table utilities.
- [ ] Move the union of existing editor regression tests for commands, presentation, tables, selections, interactions, wiki links, fullscreen behavior, uploads, accessibility, CSP, browser lifecycle, and malformed input.
- [ ] Define consumer-supplied translation and locale contracts and replace the direct application i18n dependencies.
- [ ] Define optional wiki-link registry, rendering, completion, validation, and navigation contracts and replace the direct application wiki-link dependencies.
- [ ] Promote `MarkdownEditorImageCapability` into the package API.
- [ ] Connect the editor preview to the package Markdown renderer and Prism highlighter.
- [ ] Connect fullscreen editor behavior to the package modal page-scroll lock.
- [ ] Add regression coverage for minimal CodeMirror transactions, undo and redo, selection direction, history, scroll intent, IME behavior, keyboard navigation, focus restoration, CSP nonce propagation, SSR guards, and object-URL revocation.
- [ ] Implement a `my-site` adapter for admin article and matrix `articleContentImage` uploads, localized public wiki-link preview navigation, target validation, and completion.
- [ ] Implement a `personal-workspace` adapter for authenticated knowledge-item image uploads, attachment binding, protected Blob preview loading, and preview invalidation after attachment changes.
- [ ] Replace the editor in `personal-workspace` with the package editor and its application adapter.
- [ ] Replace the editor in `my-site` with the package editor and its application adapter.

### Consumer migration and release

- [ ] Build and inspect the first distributable package archives.
- [ ] Select and verify an existing published 0.x package version as the initial migration baseline for both consumers.
- [ ] Migrate `personal-workspace` to the shared tokens, styles, UI components, notifications, UI infrastructure, validation behavior, utilities, test helpers, Markdown renderer, and Markdown editor.
- [ ] Run the relevant `personal-workspace` Make targets for tests, lint, type checks, format checks, production build, and SSR or static-runtime verification.
- [ ] Remove the migrated duplicate sources and tests from `personal-workspace` after its checks pass against the package.
- [ ] Migrate `my-site` to the shared tokens, styles, UI components, notifications, UI infrastructure, validation behavior, utilities, test helpers, Markdown renderer, and Markdown editor.
- [ ] Run the relevant `my-site` Make targets for tests, lint, type checks, format checks, production build, hybrid SSR, hydration, CSP, theme preload, public routes, and admin workflows.
- [ ] Remove the migrated duplicate sources and tests from `my-site` after its checks pass against the package.
- [ ] Update both consumer manifests and lock files and verify peer-dependency installation without forced resolution flags.
- [ ] Verify that both consumers import published package entry points rather than design-system sources or permanent sibling `file:` dependencies.
- [ ] Update the README, package-consumption documentation, CI configuration, and dependency-update workflow in all three repositories.
- [ ] Publish the stable 1.0.0 package and consume that exact version in both applications.
- [ ] Evaluate the completed extraction for inclusion in the `my-site` public "How this site is built" case study and update the page if the design system becomes part of its public technical story.
