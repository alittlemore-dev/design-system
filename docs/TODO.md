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
- [x] Configure read-only CI on every push and pull request to run the Make-based checks and build the distributable package.
- [x] Configure version-driven push-to-main npm publication for unique versions, create matching CI-owned `vX.Y.Z` tags and a tag-only recovery path, and bootstrap the former package identity at `0.1.0` through CI.
- [x] Retry post-publication npm registry confirmation through bounded propagation delay before requiring tag-only recovery.
- [x] Create and verify the `alittlemore.dev` npm organization, bootstrap `@alittlemore.dev/design-system@0.2.0` through CI, configure trusted publishing, delete `NPM_TOKEN`, and verify `0.2.1` as the first ordinary OIDC release.
- [x] Document the local packed-archive, stable-release, semantic-versioning, and changelog workflows.
- [x] Add a repository-owned Angular demo that installs the packed archive through public entry points and exercises the current UI, UI styles, theme preload, SSR, hydration, and strict CSP.
- [x] Preserve owning-page scroll when ArrowUp or ArrowDown moves between visible Markdown-table cells immediately after input.
- [x] Add weekly Dependabot version updates for root, published-package, and demo npm dependencies and GitHub Actions.
- [x] Enforce peer floors in the workspace, verify the packed package in a current-version consumer during CI and release, group coupled Dependabot updates, and require an up-to-date successful CI check for `main`.
- [x] Give packed-demo npm subprocesses an isolated temporary cache so consumer validation never depends on user-cache permissions.
- [x] Make `make install-demo-browser` resolve the demo's declared Playwright range before downloading Chromium so it installs the revision used by packed no-lock demo checks.
- [x] Wait for the Site-select disabled state in the real-browser smoke before asserting its live control update.
- [x] Preserve owning-page scroll through a late third layout frame when ArrowUp or ArrowDown moves between rendered Markdown-table cells.
- [x] Update the demo Express dependency tree so `qs` resolves to `6.16.0` or newer, then verify that `npm --prefix demo audit` reports no vulnerabilities.

- [x] Exclude the vulnerable Angular 22.1.0 HTTP transfer-cache baseline and verify the raised peer floor through package and packed-demo checks.

- [ ] Upgrade ng-packagr beyond 22.1.x only after its declaration bundler preserves the Markdown editor public exports and excludes implementation symbols.

- [x] Apply the request CSP nonce to critical CSS emitted by Angular 22.2 and verify packed-demo SSR and Chromium checks.

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
- [x] date range picker component
  - [x] Implements the duplicated `LocalizedDatePickerComponent` from current repo with logic for range selection.
- [x] datetime picker component
  - [x] Implements the duplicated `LocalizedDatePickerComponent` from current repo with logic for datetime selection.
- [x] datetime range picker component
  - [x] Implements the duplicated `LocalizedDatePickerComponent` from current repo with logic for datetime range selection.
- [x] Replace emoji calendar glyphs in the new range and datetime picker toggles with the existing inline SVG icon.
- [x] Verify transactional Done, Cancel, and Clear behavior across all six localized temporal pickers.
- [x] Verify composite single-shell range fields and date/datetime range preview behavior.
- [x] Verify nullable canonical value shapes and independent start/end/paired requirements contracts.
- [x] Verify the localized time and same-day time-range components.
- [x] Verify adaptive custom/native HH:mm UI and Today/Now draft actions.
- [x] Verify the 0.3.0 documentation, packed demo, and public contracts.
- [x] Fix calendar time-draft forwarding, time-first datetime ranges, and stale pending-edit confirmation.
- [x] Finalize segmented HH:mm edits atomically before boundary advance and confirmation.
- [x] Preserve malformed committed temporal values per endpoint until canonical replacement or explicit Clear.
- [x] Align required, invalid, and unavailable temporal validation with raw endpoint presence and validator precedence.
- [x] Make the localized date picker retain and validate malformed runtime/CVA values without throwing.
- [x] Ignore cross-kind min/max bounds consistently in temporal dialog controls and controllers.
- [x] Route Today and new range starts through consistent clearing, advance, and reorder transitions.
- [x] Keep closed temporal-dialog SSR markup free of wall-clock-dependent content across hydration time zones.
- [x] Derive localized date-picker Clear visibility from the current dialog draft.
- [x] Alternate calendar-selected range boundaries after every accepted date without visible endpoint-mode controls.
- [x] Show both start and end time editors together in time-range and datetime-range dialogs.
- [x] Add visible mouse-operable increment and decrement controls to each custom time segment.
- [ ] Support pasting a complete date, time, or datetime range separated by an en dash into either range endpoint and distribute the parsed values between both endpoints.

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
- [x] Keep modal-dialog destruction SSR-safe by avoiding native dialog lifecycle methods on the server.

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
- [x] Keep wiki-link suggestions visible at the start of an embedded Markdown editor by limiting CodeMirror scroll margins to the header and footer overlap.
- [ ] Add ordinary-file attachment support with a separate transport and insertion contract, configurable picker, paste, and drop sources, exact MIME and size validation, sequential retryable queues, and non-image preview semantics.
- [x] Restore borders and spacing for tables in the embedded Markdown editor preview.
- [x] Ignore delayed native drawer close events after the drawer has reopened.
- [x] Keep native dropdown popover targets distinct from static Angular host IDs.
- [ ] Complete the custom Obsidian-like Markdown editor roadmap.
  - [ ] Add a backend-synced editor profile for every authenticated content editor.
    - [ ] Make hotkeys fully configurable with command search, multiple bindings, conflict
          detection, and reset per command, section, or the whole profile.
    - [ ] Add appearance settings for font family, font size, line height, readable width,
          wrapping, line numbers, tab width, editor height, theme, and syntax palette.
    - [ ] Add behavior settings for the default tab, spellcheck, auto-pairs, smart lists and
          fences, Tab behavior, and image insertion.
  - [ ] Add an accessible Markdown command palette with fuzzy search, current shortcuts,
        recent/pinned commands, and a touch/mobile entry point
        ([Obsidian hotkeys](https://obsidian.md/help/hotkeys),
        [command palette](https://obsidian.md/help/plugins/command-palette)).
  - [ ] Add typed wiki-link autocomplete for articles and matrix questions, target preview, and
        missing/unpublished target warnings.
    - [x] Autocomplete typed article and matrix targets and show each target's localized title and
          publication status in the completion list.
    - [ ] Add shared inline missing/unpublished target diagnostics and a content preview without
          making an unavailable target registry look like an empty registry.
  - [ ] Add selection-aware typed wiki-link insertion and deep heading targets
        ([Obsidian internal links](https://obsidian.md/help/links)).
    - [ ] Turn selected text into the custom label when the author types `[[` and then chooses an
          article or matrix target.
    - [ ] Autocomplete headings in the current document and in a selected target, persist stable
          localized fragments, and warn when a referenced heading no longer exists.
  - [ ] Safely refactor typed wiki links when an article or matrix slug changes.
    - [ ] Show the affected localized documents and reference count before confirming a slug
          change.
    - [ ] Rewrite authorized references transactionally while preserving labels, publication
          rules, revision history, and an auditable failure result for every reference not changed.
  - [ ] Add a Markdown outline, heading navigation, and folding for heading, list, and code
        sections.
  - [ ] Add advanced table editing, callouts, footnotes, templates/snippets, math, and diagrams
        only together with centralized renderer support and XSS regression tests
        ([Obsidian Markdown syntax](https://obsidian.md/help/syntax)).
    - [x] Complete the advanced source-preserving table-editing portion through the dedicated
          interactive Markdown table work below.
    - [ ] Add renderer-backed callouts with commands for inserting, wrapping, changing type, and
          creating accessible nested or collapsible callouts.
    - [ ] Add renderer-backed block and inline footnotes with source navigation between each
          reference and definition.
    - [ ] Add reusable templates/snippets with preview, explicit insertion position, and
          placeholder navigation without introducing a second content model.
    - [ ] Add math and diagrams through the centralized sanitized renderer with explicit resource
          limits and safe failure states for malformed or expensive input.
  - [ ] Add the complete Markdown attachment workflow: progress, cancel, retry, required alt text,
        existing-file reuse, and orphan cleanup
        ([Obsidian attachments](https://obsidian.md/help/attachments)).
    - [ ] Add per-file progress, in-flight cancellation, required alt-text authoring, existing-file
          selection, and deterministic cleanup of uploads abandoned before a successful save.
  - [ ] Extend Markdown attachments to safe media embeds and author-controlled image presentation
        ([Obsidian embeds](https://obsidian.md/help/embeds)).
    - [ ] Insert and preview supported PDF, audio, and video attachments without exposing private
          object URLs or bypassing consumer-specific upload restrictions.
    - [ ] Let authors set accessible image alt text, caption, and bounded display dimensions while
          keeping the stored Markdown portable and the public layout responsive.
  - [ ] Add RU/EN spelling and grammar assistance, word/character/read-time statistics, and
        localized content diagnostics.
    - [ ] Add grammar assistance, shared word/character/read-time statistics, and localized
          diagnostics with clear source ranges and advisory-only failure behavior.
  - [ ] Add editor profile import/export and settings synchronization between devices.
  - [ ] Add a true source-preserving Live Preview mode that hides inactive Markdown syntax and
        reveals the exact delimiters around the active cursor or selection
        ([Obsidian editing modes](https://obsidian.md/help/edit-and-read)).
    - [ ] Render headings, emphasis, links, lists, tasks, callouts, code, media, and other supported
          syntax inline without replacing the canonical Markdown document.
    - [ ] Preserve selection, history, IME, clipboard, screen-reader output, scroll position, wiki
          link completion, and interactive-table invariants while syntax appears or disappears.
  - [ ] Convert pasted rich HTML into sanitized portable Markdown while retaining an explicit
        plain-text paste path ([Obsidian editor settings](https://obsidian.md/help/settings)).
    - [ ] Preserve supported headings, paragraphs, emphasis, lists, links, tables, quotes, and code
          while dropping scripts, event handlers, unsafe URL schemes, unsupported styles, and hidden
          content.
    - [ ] Keep image paste routed through the existing ordered upload workflow and make every
          conversion result one undoable CodeMirror transaction.
  - [ ] Make task-list checkboxes interactive in Editor and author preview modes.
    - [ ] Toggle the exact canonical `[ ]` or `[x]` marker through an undoable transaction without
          disturbing selection, scroll, nested-list structure, or surrounding Markdown.
    - [ ] Support pointer and keyboard activation with an accessible state while keeping public
          reading views non-mutating.
  - [ ] Add Obsidian-style `==highlight==` and author-only `%%comment%%` syntax through the shared
        parser, commands, presentation, and sanitized renderer
        ([Obsidian formatting syntax](https://obsidian.md/help/syntax)).
    - [ ] Render highlights accessibly and preserve their delimiters in Source and active Live
          Preview editing contexts.
    - [ ] Keep comments visible to authors where appropriate but remove them from public preview,
          rendered pages, excerpts, SEO analysis, search indexing, and public exports.
  - [ ] Add theme-aware indentation guides for nested Markdown lists and other supported indented
        blocks ([Obsidian editor settings](https://obsidian.md/help/settings)).
    - [ ] Keep guides correct across wrapped lines, folding, multi-selection, responsive layouts,
          fullscreen mode, and both light and dark themes without creating editable fake geometry.
- [ ] Make the Markdown table editor JSDOM interaction and invariant suites deterministic without
      relying on background parsing or viewport timing, and eliminate the leaked Jest worker reported
      by full frontend test runs.
- [x] Apply the green theme accent to Bootstrap checkbox, radio, and switch states and verify
      focused, mixed, and disabled controls in both themes with the packed demo.
- [x] Let consumers defer datetime error messages and invalid styling until form submission while
      preserving required, format, range, and native validation.
- [x] Allow npm publish-time scanning to complete before release confirmation exhausts its retries.
- [x] Keep Bootstrap overrides compatible with preloaded Bootstrap and preserve form-control
      validation styles while applying the green accent.

- [x] Give inline sidebar panels a unique ID without duplicating the host ID, and verify toggle,
      Escape, projection, and focus restoration against the actual panel.
- [x] Make the packed navigation browser smoke handle badges in link names and await keyboard
      disclosure rendering before asserting the resulting state.
- [x] Keep keyboard focus outlines fully visible inside scrolling inline navigation panels and
      the collapsed sidebar rail in both themes.

- [x] Use readable text tokens for navigation captions and demo entry links, and verify their
      rendered contrast in light and dark themes.

# Demo regressions

- [x] Keep navigation badges on one line beside wrapping link labels, and verify their geometry in the packed catalogue at mobile, intermediate, and desktop widths in both themes.
- [x] Keep the navigation preview entirely in English and verify its labelled actions.
- [x] Wait for native datetime validation to settle before checking deferred-error behavior in the browser smoke.

## Calendar extraction

- [x] Apply semantic entry classes through the FullCalendar 7 rendering API and verify compact, clipped, separated entries in both themes.
- [x] Initialize and update calendar timers outside Angular's zone so hydration completes, while keeping selection callbacks reactive.
- [x] Respect exclusive all-day end dates in the demo's selected-day list and cover the last included and first excluded days.

- [x] Keep SiteSelect open when a delayed scroll event arrives without a position change; continue closing on actual viewport movement and cover the calendar Year-to-Month transition.

- [x] Eliminate the FullCalendar 7 ResizeObserver loop diagnostic during initial busy-day layout and Day view changes, then pass the packed calendar browser test without console errors ([upstream issue #8082](https://github.com/fullcalendar/fullcalendar/issues/8082)).
- [x] Retain modal focus when choosing an entry from the demo's selected-day list, and restore the busy-day trigger on Escape.

- [x] Keep the calendar runtime out of initial UI-consumer bundles, and verify delayed rendering and retry after a runtime load failure in the packed demo.
