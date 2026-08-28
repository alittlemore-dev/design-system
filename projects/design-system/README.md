# @alittlemoron/design-system

Application-independent Angular UI and Markdown building blocks.

The package exposes these TypeScript APIs:

- `@alittlemoron/design-system` for application-independent UI;
- `@alittlemoron/design-system/markdown` for Markdown rendering;
- `@alittlemoron/design-system/markdown-editor` for the interactive Markdown editor;
- `@alittlemoron/design-system/testing` for public test utilities.

## Independent UI components

Import UI components only from the primary entry point:

```ts
import {
  EmptyStateComponent,
  ErrorMessageComponent,
  FoldableTreeComponent,
  LoadingSpinnerComponent,
  LocalizedDatePickerComponent,
  NotificationAreaComponent,
  NotificationService,
  SiteSelectComponent,
  type SiteSelectOption,
} from '@alittlemoron/design-system';
```

| Import                         | Selector                   | Purpose                                                         |
| ------------------------------ | -------------------------- | --------------------------------------------------------------- |
| `EmptyStateComponent`          | `ds-empty-state`           | Displays a consumer-supplied empty-state message.               |
| `LoadingSpinnerComponent`      | `ds-loading-spinner`       | Displays a named loading status.                                |
| `ErrorMessageComponent`        | `ds-error-message`         | Displays an `ErrorDisplay` and emits `retry`.                   |
| `FoldableTreeComponent`        | `ds-foldable-tree`         | Renders consumer-owned tree data and emits selected item keys.  |
| `LocalizedDatePickerComponent` | `ds-localized-date-picker` | Provides a localized calendar-date form control.                |
| `NotificationAreaComponent`    | `ds-notification-area`     | Renders and dismisses notifications from `NotificationService`. |
| `SiteSelectComponent`          | `ds-site-select`           | Provides a select-only combobox form control.                   |

All labels, messages, option text, and localized date-picker strings are consumer-owned. Supply
them through component inputs and application i18n; the package does not provide translations or
depend on an i18n service.

Place one notification area in the application shell and provide its translated close label from
the consumer. Inject `NotificationService` wherever the application needs to publish a success or
error message; both kinds auto-dismiss after five seconds.

```ts
import { Component, inject } from '@angular/core';
import { NotificationAreaComponent, NotificationService } from '@alittlemoron/design-system';

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
import { SiteSelectComponent, type SiteSelectOption } from '@alittlemoron/design-system';

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
also a `ControlValueAccessor` and `Validator` for Reactive Forms. Its model value, `min`, `max`,
and `disabledDates` use canonical calendar-date ISO strings (`YYYY-MM-DD`); locale affects only
the user-facing parsing and display. Provide every `LocalizedDatePickerLabels` value and
`dateLocale` from the consumer.

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
@use '@alittlemoron/design-system/styles/theme-tokens';
@use '@alittlemoron/design-system/styles/bootstrap-overrides';
@use '@alittlemoron/design-system/styles/cdk-overlay';
@use '@alittlemoron/design-system/styles/ui';
@use '@alittlemoron/design-system/styles/markdown';
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

`@alittlemoron/design-system/theme-preload` exports the classic `theme-preload.js` web asset. Copy
that file from the installed package into the application's web output, then load the self-hosted
copy synchronously in `<head>` before application code and without `async` or `defer`:

```json
{
  "glob": "theme-preload.js",
  "input": "node_modules/@alittlemoron/design-system",
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
