# @alittlemore.dev/design-system

Application-independent Angular UI and Markdown building blocks.

The package exposes these TypeScript APIs:

- `@alittlemore.dev/design-system` for application-independent UI;
- `@alittlemore.dev/design-system/markdown` for Markdown rendering;
- `@alittlemore.dev/design-system/markdown-editor` for the interactive Markdown editor;
- `@alittlemore.dev/design-system/testing` for public test utilities.

## Independent UI components

Import UI components only from the primary entry point:

```ts
import {
  EmptyStateComponent,
  ErrorMessageComponent,
  FoldableTreeComponent,
  LoadingSpinnerComponent,
  LocalizedDatePickerComponent,
  LocalizedDateRangePickerComponent,
  LocalizedDateTimePickerComponent,
  LocalizedDateTimeRangePickerComponent,
  LocalizedTimePickerComponent,
  LocalizedTimeRangePickerComponent,
  NotificationAreaComponent,
  NotificationService,
  SiteSelectComponent,
  type LocalizedDateRange,
  type LocalizedDatePickerLabels,
  type LocalizedDateRangePickerLabels,
  type LocalizedDateTimeRange,
  type LocalizedDateTimePickerLabels,
  type LocalizedDateTimeRangePickerLabels,
  type LocalizedRangeRequirements,
  type LocalizedTimePickerLabels,
  type LocalizedTimePickerMode,
  type LocalizedTimeRange,
  type LocalizedTimeRangePickerLabels,
  type SiteSelectOption,
} from '@alittlemore.dev/design-system';
```

| Import                                  | Selector                             | Purpose                                                         |
| --------------------------------------- | ------------------------------------ | --------------------------------------------------------------- |
| `EmptyStateComponent`                   | `ds-empty-state`                     | Displays a consumer-supplied empty-state message.               |
| `LoadingSpinnerComponent`               | `ds-loading-spinner`                 | Displays a named loading status.                                |
| `ErrorMessageComponent`                 | `ds-error-message`                   | Displays an `ErrorDisplay` and emits `retry`.                   |
| `FoldableTreeComponent`                 | `ds-foldable-tree`                   | Renders consumer-owned tree data and emits selected item keys.  |
| `LocalizedDatePickerComponent`          | `ds-localized-date-picker`           | Provides a localized calendar-date form control.                |
| `LocalizedDateRangePickerComponent`     | `ds-localized-date-range-picker`     | Provides an inclusive localized calendar-date range control.    |
| `LocalizedDateTimePickerComponent`      | `ds-localized-datetime-picker`       | Provides a localized local-wall-clock datetime control.         |
| `LocalizedDateTimeRangePickerComponent` | `ds-localized-datetime-range-picker` | Provides an inclusive local-wall-clock datetime range control.  |
| `LocalizedTimePickerComponent`          | `ds-localized-time-picker`           | Provides a localized local-wall-clock time control.             |
| `LocalizedTimeRangePickerComponent`     | `ds-localized-time-range-picker`     | Provides a same-day local-wall-clock time range control.        |
| `NotificationAreaComponent`             | `ds-notification-area`               | Renders and dismisses notifications from `NotificationService`. |
| `SiteSelectComponent`                   | `ds-site-select`                     | Provides a select-only combobox form control.                   |

All labels, messages, option text, and localized date-picker strings are consumer-owned. Supply
them through component inputs and application i18n; the package does not provide translations or
depend on an i18n service.

Place one notification area in the application shell and provide its translated close label from
the consumer. Inject `NotificationService` wherever the application needs to publish a success or
error message; both kinds auto-dismiss after five seconds.

```ts
import { Component, inject } from '@angular/core';
import { NotificationAreaComponent, NotificationService } from '@alittlemore.dev/design-system';

@Component({
  standalone: true,
  imports: [NotificationAreaComponent],
  template: `
    <ds-notification-area closeLabel="Close notification" />
    <button type="button" (click)="notifications.success('Saved')">Save</button>
  `,
})
export class ApplicationShellComponent {
  readonly notifications = inject(NotificationService);
}
```

`SiteSelectComponent` integrates with Angular Reactive Forms. It receives its value, touched and
disabled state through the control, while the consumer continues to own validation presentation:

```ts
import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { SiteSelectComponent, type SiteSelectOption } from '@alittlemore.dev/design-system';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, SiteSelectComponent],
  template: `
    <ds-site-select
      inputId="site"
      [options]="siteOptions"
      controlSize="default"
      appearance="default"
      [required]="true"
      [invalid]="site.invalid && site.touched"
      [controlDisabled]="false"
      [formControl]="site"
    />
  `,
})
export class SiteFormComponent {
  readonly site = new FormControl('', { nonNullable: true, validators: [Validators.required] });
  readonly siteOptions: readonly SiteSelectOption[] = [
    { value: 'alpha', label: 'Alpha site' },
    { value: 'beta', label: 'Beta site' },
  ];
}
```

Both form controls also support controlled use. Bind `value` and update the owning state from
`valueChange`; when `value` is supplied it is the external source of truth:

```html
<ds-site-select
  inputId="site"
  [options]="siteOptions"
  [value]="selectedSite()"
  (valueChange)="selectedSite.set($event)"
  controlSize="default"
  appearance="default"
  [required]="false"
  [invalid]="false"
  [controlDisabled]="false"
/>
```

### Localized date, time, and datetime pickers

The six localized temporal controls keep canonical model values separate from localized display.
Use `LocalizedDatePickerComponent`, `LocalizedTimePickerComponent`, or
`LocalizedDateTimePickerComponent` for a single value, and use the corresponding range component
for a composite start/end field. Their selectors and imports are listed in the table above.

The canonical TypeScript values are exactly:

```ts
// LocalizedDatePickerComponent
const date: string | null = '2026-09-11'; // YYYY-MM-DD or null

// LocalizedTimePickerComponent
const time: string | null = '14:30'; // HH:mm or null

// LocalizedDateTimePickerComponent
const dateTime: string | null = '2026-09-11T14:30'; // YYYY-MM-DDTHH:mm or null

interface LocalizedDateRange {
  readonly start: string | null; // YYYY-MM-DD or null
  readonly end: string | null; // YYYY-MM-DD or null
}

interface LocalizedTimeRange {
  readonly start: string | null; // HH:mm or null
  readonly end: string | null; // HH:mm or null
}

interface LocalizedDateTimeRange {
  readonly start: string | null; // YYYY-MM-DDTHH:mm or null
  readonly end: string | null; // YYYY-MM-DDTHH:mm or null
}
```

`null` is the only canonical empty single value or range endpoint; an empty range is the non-null
object `{ start: null, end: null }`. Empty text commits `null`. Malformed, incomplete, out-of-range,
or unavailable text remains visible as an invalid draft and does not replace the last canonical
value. Manual entry commits a valid value, valid range, or permitted empty value on Enter or blur.
Opening a picker dialog instead creates an isolated draft: calendar and time selections, Today,
Now, and Clear do not emit a model or Angular Forms change. Done commits the complete valid draft;
Cancel, Escape, and outside dismissal restore the last canonical value. Clear therefore becomes a
committed empty value only after Done.

Each range is one accessible, composite field with one trigger and start/end endpoints inside the
same shell. Date and datetime range dialogs preview the interval from the selected start through a
hovered or keyboard-focused candidate end without committing it, and announce that preview with
consumer-supplied localized text. Calendar selections alternate between replacing start and end;
when a replacement crosses the other endpoint, the two dates are ordered automatically. This cycle
continues after a complete range, so changing either boundary never requires Clear or a visible
endpoint-mode switch.

Single-value controls use `required`. Range controls instead use the breaking
`LocalizedRangeRequirements` contract:

```ts
interface LocalizedRangeRequirements {
  readonly start: boolean;
  readonly end: boolean;
  readonly paired: boolean;
}
```

`paired` leaves an entirely empty optional range valid, but once either endpoint is present it
requires the opposite endpoint. The complete requirements truth table is:

| `start` | `end` | `paired` | Effective start requirement | Effective end requirement |
| ------- | ----- | -------- | --------------------------- | ------------------------- |
| false   | false | false    | Never                       | Never                     |
| false   | false | true     | When end is present         | When start is present     |
| false   | true  | false    | Never                       | Always                    |
| false   | true  | true     | When end is present         | Always                    |
| true    | false | false    | Always                      | Never                     |
| true    | false | true     | Always                      | When start is present     |
| true    | true  | false    | Always                      | Always                    |
| true    | true  | true     | Always                      | Always                    |

Range endpoints may be independently nullable when the requirements permit it. Non-null endpoints
must still be canonical, available, and ordered. Equal endpoints are valid. A
`LocalizedTimeRange` is always a same-day interval, so `start` must be earlier than or equal to
`end`; an overnight range such as `22:00` to `02:00` is invalid. Datetime ranges use their complete
date and time values, so the same time-order rule applies when both endpoints are on the same date.

Valid `min` and `max` inputs are inclusive and use the canonical format for that picker. Invalid
bound strings are ignored. `disabledDates` uses canonical `YYYY-MM-DD` values on date-capable
pickers and disables each whole local calendar date. A complete date or datetime range cannot cross
a disabled date.

Time-capable controls accept `timePickerMode: LocalizedTimePickerMode`, where the value is `auto`,
`native`, or `custom`. `custom` uses the package's segmented 24-hour HH:mm control with direct
numeric entry, keyboard stepping, and visible mouse increment/decrement buttons above and below
each segment. `native` uses a minute-precision browser time input when running in a browser. `auto`
chooses native UI for a coarse pointer and custom UI otherwise, evaluating that capability whenever
the dialog opens; server rendering remains custom. Time-range and datetime-range dialogs show both
time endpoints together and route edits to the focused endpoint. Today applies the current local
calendar date to the alternating calendar boundary, and Now applies the current local time at
minute precision (plus the current local date for a focused datetime endpoint). Both honor
availability and remain draft-only until Done.

Dates and times are local wall-clock strings. They have no offset or zone and the package never
converts them to UTC. `dateLocale` affects date parsing, display, calendar labels, and week layout
only; application code decides which timezone, if any, gives a value meaning.

Every picker label contract is required and exhaustive:
`LocalizedDatePickerLabels`, `LocalizedDateRangePickerLabels`, `LocalizedTimePickerLabels`,
`LocalizedTimeRangePickerLabels`, `LocalizedDateTimePickerLabels`, and
`LocalizedDateTimeRangePickerLabels`. Supply every visible label, message, hint, action, and range
preview announcement through application i18n.

All six pickers support controlled `value`/`valueChange` use and implement `ControlValueAccessor`
and `Validator`. In Reactive Forms, bind one `FormControl` to the whole range component rather than
creating a control for each endpoint:

```ts
import { FormControl } from '@angular/forms';
import type { LocalizedDateTimeRange } from '@alittlemore.dev/design-system';

export class AvailabilityForm {
  readonly availability = new FormControl<LocalizedDateTimeRange>(
    { start: null, end: null },
    { nonNullable: true },
  );
}
```

```html
<ds-localized-datetime-range-picker
  inputId="availability"
  [formControl]="availability"
  controlSize="default"
  dateLocale="en-US"
  [labels]="dateTimeRangeLabels"
  [requirements]="{ start: false, end: false, paired: true }"
  [invalid]="availability.invalid && availability.touched"
  [controlDisabled]="false"
  [readonly]="false"
  timePickerMode="auto"
/>
```

If an application payload represents missing endpoints by omitting properties, map the canonical
range at the application boundary:

```ts
function createAvailabilityPayload(range: LocalizedDateTimeRange) {
  const payload = {
    ...(range.start === null ? {} : { availableFrom: range.start }),
    ...(range.end === null ? {} : { availableTo: range.end }),
  };
  return payload;
}
```

## Markdown rendering

Import the renderer independently from the editor:

```ts
import {
  MarkdownRendererService,
  type MarkdownWikiLinkRenderConfig,
} from '@alittlemore.dev/design-system/markdown';

const wikiLinks: MarkdownWikiLinkRenderConfig = {
  namespaces: [{ key: 'docs', label: 'Documentation' }],
  resolve: ({ namespace, key }) =>
    namespace === 'docs' ? { href: `/docs/${encodeURIComponent(key)}`, openIn: 'same-tab' } : null,
};

const html = inject(MarkdownRendererService).render(markdown, { wikiLinks });
```

The renderer drops authored HTML, rejects unsafe link and image schemes, sanitizes the generated
HTML, highlights supported fenced-code languages, and emits resolved wiki-links as native anchors.
Unknown namespaces, unresolved targets, and wiki-like text inside inline or fenced code remain
plain Markdown text. Import `styles/markdown` in the consuming application's global SCSS for the
code and Prism presentation.

Wiki syntax is application-independent and fixed as `[[namespace:key|label]]`; the label is
optional. The package also exports `parseMarkdownWikiLinks`,
`createMarkdownWikiLinkTargetLookup`, and `findMissingMarkdownWikiLinkTargets` for validation and
content tooling.

## Markdown editor

Import the standalone editor from its secondary entry point:

```ts
import {
  MarkdownEditorComponent,
  type MarkdownEditorImageConfig,
  type MarkdownEditorLabels,
  type MarkdownEditorWikiLinkConfig,
} from '@alittlemore.dev/design-system/markdown-editor';
```

```html
<ds-markdown-editor
  [value]="markdown()"
  accessibleLabel="Article body"
  [labels]="editorLabels"
  [imageConfig]="imageConfig"
  [imageInteractionsDisabled]="saving()"
  [wikiLinks]="wikiLinks"
  (valueChange)="markdown.set($event)"
  (imageUploadPendingChange)="imageUploadPending.set($event)"
/>
```

`MarkdownEditorLabels` is exhaustive by design: the consumer owns every visible editor, search,
table, upload, preview, shortcut, and accessibility string. This keeps the package independent of
an application i18n service. `value` is controlled state; external synchronization does not emit a
second `valueChange`. `focus()` is the only imperative public editor action.

Image transport and image preview are deliberately separate. Choose any combination of `picker`,
`paste`, and `drop` for one editor instance:

```ts
const publicImages: MarkdownEditorImageConfig = {
  upload: {
    sources: ['picker', 'paste', 'drop'],
    acceptedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    upload: (file) => articleImages.upload(file), // Observable<{ source: string }>
  },
  preview: { kind: 'direct' },
};

const protectedImages: MarkdownEditorImageConfig = {
  upload: {
    sources: ['paste', 'drop'],
    acceptedMimeTypes: ['image/png'],
    upload: (file) => attachments.upload(file),
  },
  preview: {
    kind: 'blob',
    revision: attachmentRevision(),
    load: (source) => attachments.loadAuthorizedBlob(source),
  },
};
```

`direct` leaves safe rendered image URLs in the preview DOM. `blob` removes each protected source
before binding the preview, loads it through the supplied observable, uses a temporary object URL,
and revokes that URL on retry, revision or configuration changes, document changes, mode changes,
and destruction. Set `upload: null` for a read-only editor that still needs either preview strategy,
or set the whole `imageConfig` to `null` when no image integration is needed. MIME matching is
exact. Uploads run sequentially in stable insertion order; a failure pauses the queue until the
consumer-facing retry or dismiss action is used. `imageInteractionsDisabled` pauses new actions and
queued retries without removing active previews or discarding queued work.

Ordinary file attachments are intentionally not part of the current contract; only images are
accepted in this version.

Wiki completion and rendering share one neutral configuration:

```ts
const wikiLinks: MarkdownEditorWikiLinkConfig = {
  namespaces: [
    { key: 'articles', label: 'Articles' },
    { key: 'people', label: 'People' },
  ],
  loadTargets: () => contentIndex.snapshot(), // Observable<MarkdownWikiLinkTargetGroup[]>
  resolve: ({ namespace, key }) => ({
    href: `/content/${namespace}/${encodeURIComponent(key)}`,
    openIn: 'same-tab',
  }),
};
```

The target snapshot supplies completion labels, descriptions, and badges. A registry error is
reported in the editor status area but never blocks manual editing or preview. Set `wikiLinks` to
`null` to disable wiki completion and interpretation.

`MarkdownEditorStickyBottomInsetDirective` is available as
`[dsMarkdownEditorStickyBottomInset]` for forms with a sticky action footer. It maintains the
editor's bottom inset with a narrowly scoped, nonce-bearing runtime style and remains SSR-safe.

## Styles

The public SCSS entry points are:

- `styles/theme-tokens`: light and dark custom properties except Bootstrap's `--bs-*` mappings;
- `styles/bootstrap-overrides`: Bootstrap's base styles, theme mappings, button overrides, and focused
  form-control presentation;
- `styles/cdk-overlay`: the official Angular CDK overlay structural styles;
- `styles/ui`: application-independent global UI selectors;
- `styles/markdown`: `.markdown-code` and Prism token presentation.

Import tokens first, then Bootstrap, followed by only the optional capabilities an application uses:

```scss
@use '@alittlemore.dev/design-system/styles/theme-tokens';
@use '@alittlemore.dev/design-system/styles/bootstrap-overrides';
@use '@alittlemore.dev/design-system/styles/cdk-overlay';
@use '@alittlemore.dev/design-system/styles/ui';
@use '@alittlemore.dev/design-system/styles/markdown';
```

`bootstrap-overrides` already emits the Bootstrap base. Do not import Bootstrap separately or the
application will duplicate its global CSS.

The independent UI components currently require this style composition and the package's Bootstrap
peer prerequisite. Keep `theme-tokens` before `bootstrap-overrides`; include `cdk-overlay` when
using CDK overlays and `ui` when using the UI components. Bootstrap retirement is a separate
roadmap item, so consumers must continue to satisfy the current Bootstrap peer dependency.

The package deliberately excludes unused `.accent-border` and `.link-inactive` selectors. It also
excludes application-owned `.form-bordered`, `.force-display-block`, article and matrix selectors,
the cookie-consent banner, and application Markdown-wrapper selectors.

## Initial theme preload

`@alittlemore.dev/design-system/theme-preload` exports the classic `theme-preload.js` web asset. Copy
that file from the installed package into the application's web output, then load the self-hosted
copy synchronously in `<head>` before application code and without `async` or `defer`:

```json
{
  "glob": "theme-preload.js",
  "input": "node_modules/@alittlemore.dev/design-system",
  "output": "/assets/design-system"
}
```

```html
<script src="/assets/design-system/theme-preload.js" nonce="YOUR_CSP_NONCE"></script>
```

Omit `nonce` when the application's policy does not require it. Keep both the preload and compiled
CSS external under strict CSP; do not copy the script into an inline block.

The preload accepts only `light` or `dark`. It applies a valid `chosenTheme` value from
`localStorage`, otherwise a valid server-rendered `data-bs-theme`, otherwise `light`. Missing or
unavailable browser globals and storage do not throw; server execution is a no-op.
