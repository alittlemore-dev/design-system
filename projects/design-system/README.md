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
  NotificationAreaComponent,
  NotificationService,
  SiteSelectComponent,
  type LocalizedDateRange,
  type LocalizedDateRangePickerLabels,
  type LocalizedDateTimePickerLabels,
  type LocalizedDateTimeRange,
  type LocalizedDateTimeRangePickerLabels,
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

`LocalizedDatePickerComponent` supports the same controlled `value`/`valueChange` mode and is
also a `ControlValueAccessor` and `Validator` for Reactive Forms.

### Localized date and datetime pickers

All four localized pickers keep machine-readable model values separate from localized display:

- calendar dates use exactly `YYYY-MM-DD`;
- datetimes use exactly `YYYY-MM-DDTHH:mm` and native minute-precision time fields;
- datetime values are local wall-clock values. They have no offset or zone and are never converted
  to UTC. The consumer decides which timezone, if any, gives a wall-clock value meaning;
- `dateLocale` affects only date parsing, formatting, calendar labels, and week layout. It never
  changes a canonical model value.

`LocalizedDateRange` and `LocalizedDateTimeRange` are readonly `{ start: string; end: string }`
values. Empty endpoints are part of the contract. An optional all-empty range is valid, while a
required all-empty range is invalid. A picker can emit a start-only range such as
`{ start: '2026-08-28', end: '' }` while calendar selection is in progress; a partial range remains
invalid until both endpoints are complete and ordered. A non-empty datetime endpoint is always a
complete canonical datetime; an unfinished date or time stays in the fields as a draft rather than
being emitted as a malformed model value. Equal start and end values are allowed.

Valid `min` and `max` bounds are inclusive and use the model format of their picker. Invalid bound
strings are ignored. `disabledDates` always contains canonical `YYYY-MM-DD` values and disables the
whole calendar date, including every time on that date. For either range picker, the complete
inclusive interval must not contain a disabled date: disabled endpoints are rejected, and an end
date is unavailable when the interval from the selected start would cross a disabled date.

Every label input is required and exhaustive so the package never chooses consumer-facing language.
The datetime and range label contracts extend the base date labels:

```ts
import type {
  LocalizedDatePickerLabels,
  LocalizedDateRangePickerLabels,
  LocalizedDateTimePickerLabels,
  LocalizedDateTimeRangePickerLabels,
} from '@alittlemore.dev/design-system';

const dateLabels: LocalizedDatePickerLabels = {
  placeholder: 'MM/DD/YYYY',
  openCalendar: 'Open calendar',
  changeCalendar: 'Change date',
  dialog: 'Choose a date',
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  openMonthYearPicker: 'Choose month and year',
  previousYear: 'Previous year',
  nextYear: 'Next year',
  clear: 'Clear',
  close: 'Close',
  formatHint: 'Enter a date as MM/DD/YYYY.',
  invalidDate: 'Enter an available date.',
  requiredDate: 'Choose a date.',
  keyboardHelp: 'Use arrow keys to move through dates.',
};

const dateRangeLabels: LocalizedDateRangePickerLabels = {
  ...dateLabels,
  groupLabel: 'Availability date range',
  startDate: 'Start date',
  endDate: 'End date',
  selectStartDate: 'Choose the start date.',
  selectEndDate: 'Choose the end date.',
  invalidRange: 'Enter an available date range in chronological order.',
  requiredRange: 'Choose both dates.',
};

const dateTimeLabels: LocalizedDateTimePickerLabels = {
  ...dateLabels,
  groupLabel: 'Appointment date and time',
  dateInput: 'Date',
  timeInput: 'Time',
  timeFormatHint: 'Enter a 24-hour time as HH:mm.',
  invalidTime: 'Enter an available date and time.',
  requiredTime: 'Choose a time.',
};

const dateTimeRangeLabels: LocalizedDateTimeRangePickerLabels = {
  ...dateLabels,
  groupLabel: 'Scheduled date and time range',
  startDate: 'Start date',
  startTime: 'Start time',
  endDate: 'End date',
  endTime: 'End time',
  selectStartDate: 'Choose the start date.',
  selectEndDate: 'Choose the end date.',
  timeFormatHint: 'Enter a 24-hour time as HH:mm.',
  invalidTime: 'Enter valid start and end times.',
  requiredTime: 'Choose both times.',
  invalidRange: 'Enter an available date and time range in chronological order.',
  requiredRange: 'Choose both dates and times.',
};
```

In controlled mode, bind `value` and accept each canonical emission into the owning state. When
`value` is supplied it remains the source of truth:

```html
<ds-localized-date-range-picker
  inputId="availability"
  [value]="availability()"
  (valueChange)="availability.set($event)"
  controlSize="default"
  dateLocale="en-US"
  [labels]="dateRangeLabels"
  [required]="false"
  [invalid]="false"
  [controlDisabled]="false"
  [readonly]="false"
  min="2026-01-01"
  max="2026-12-31"
  [disabledDates]="['2026-08-31']"
/>
```

All four pickers also implement `ControlValueAccessor` and `Validator`. Omit `value` and bind a
Reactive Forms control when Angular Forms should own the value, disabled state, touched state, and
validation lifecycle:

```ts
import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  LocalizedDateTimePickerComponent,
  type LocalizedDateTimePickerLabels,
} from '@alittlemore.dev/design-system';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, LocalizedDateTimePickerComponent],
  template: `
    <ds-localized-datetime-picker
      inputId="appointment"
      [formControl]="appointment"
      controlSize="default"
      dateLocale="en-US"
      [labels]="labels"
      [required]="true"
      [invalid]="appointment.invalid && appointment.touched"
      [controlDisabled]="false"
      [readonly]="false"
      min="2026-08-01T08:00"
      max="2026-09-30T18:00"
      [disabledDates]="['2026-08-31']"
    />
  `,
})
export class AppointmentFormComponent {
  readonly appointment = new FormControl('', { nonNullable: true });
  readonly labels: LocalizedDateTimePickerLabels = dateTimeLabels;
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
