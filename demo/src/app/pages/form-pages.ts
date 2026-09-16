import { ChangeDetectionStrategy, Component, computed, effect, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  ControlValidationStateDirective,
  LocalizedDatePickerComponent,
  SiteSelectComponent,
  formatLocalizedDate,
  type LocalizedDatePickerControlSize,
  type LocalizedDatePickerLabels,
  type SiteSelectAppearance,
  type SiteSelectControlSize,
  type SiteSelectOption,
} from '@alittlemore.dev/design-system';

import { DemoPageComponent } from '../shared/demo-page.component';

@Component({
  selector: 'demo-form-validation-page',
  standalone: true,
  imports: [ControlValidationStateDirective, DemoPageComponent, FormsModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <demo-page
      title="Form validation"
      description="Adds Bootstrap invalid state and ARIA semantics only after an Angular form control is both invalid and touched."
    >
      <div demo-preview>
        <form [formGroup]="validationForm" novalidate>
          <label class="form-label" for="demo-required-field">Profile name</label>
          <input
            id="demo-required-field"
            class="form-control"
            data-demo-validation-input
            formControlName="field"
            aria-describedby="demo-validation-hint"
          />
          <p id="demo-validation-hint" class="form-text">
            Leave this blank and move focus away to observe the shared validation state.
          </p>
        </form>
        <p class="demo-output">
          Status: {{ validationForm.controls.field.status }} · touched:
          {{ validationForm.controls.field.touched }}
        </p>
      </div>
      <div demo-controls class="demo-form-stack">
        <div class="form-check">
          <input
            id="validation-required"
            class="form-check-input"
            type="checkbox"
            [ngModel]="required()"
            (ngModelChange)="required.set($event)"
          />
          <label class="form-check-label" for="validation-required">Validators.required</label>
        </div>
        <div class="form-check">
          <input
            id="validation-disabled"
            class="form-check-input"
            type="checkbox"
            [ngModel]="disabled()"
            (ngModelChange)="disabled.set($event)"
          />
          <label class="form-check-label" for="validation-disabled">Disable form control</label>
        </div>
        <button type="button" class="btn btn-outline-secondary" (click)="reset()">
          Reset value and touched state
        </button>
      </div>
    </demo-page>
  `,
})
export class FormValidationPageComponent {
  protected readonly required = signal(true);
  protected readonly disabled = signal(false);
  protected readonly validationForm = new FormGroup({
    field: new FormControl('', { nonNullable: true, validators: Validators.required }),
  });

  private readonly validationConfigurationEffect = effect(() => {
    const control = this.validationForm.controls.field;
    control.setValidators(this.required() ? Validators.required : []);
    if (this.disabled()) {
      control.disable();
    } else {
      control.enable();
    }
    control.updateValueAndValidity();
  });

  protected reset(): void {
    this.validationForm.reset();
  }
}

@Component({
  selector: 'demo-site-select-page',
  standalone: true,
  imports: [DemoPageComponent, FormsModule, SiteSelectComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <demo-page
      title="Site select"
      description="A controlled select-only combobox with configurable sizing, appearance, validation, and disabled state."
    >
      <div demo-preview>
        <label class="form-label" for="demo-site">Workspace</label>
        <ds-site-select
          data-demo-site-select
          inputId="demo-site"
          [options]="siteOptions"
          [value]="selectedSite()"
          [controlSize]="controlSize()"
          [appearance]="appearance()"
          [required]="required()"
          [invalid]="invalid()"
          [controlDisabled]="disabled()"
          testId="demo-site-select"
          (valueChange)="selectedSite.set($event)"
        />
        <p class="demo-output" data-demo-site-selection>Selected: {{ selectedSite() }}</p>
      </div>
      <div demo-controls class="demo-form-stack" data-demo-site-configurator>
        <div>
          <label class="form-label" for="site-appearance">appearance</label>
          <select
            id="site-appearance"
            class="form-select"
            data-demo-site-appearance
            [ngModel]="appearance()"
            (ngModelChange)="appearance.set($event)"
          >
            <option value="default">default</option>
            <option value="bordered">bordered</option>
          </select>
        </div>
        <div>
          <label class="form-label" for="site-size">controlSize</label>
          <select
            id="site-size"
            class="form-select"
            data-demo-site-size
            [ngModel]="controlSize()"
            (ngModelChange)="controlSize.set($event)"
          >
            <option value="default">default</option>
            <option value="small">small</option>
          </select>
        </div>
        <div class="form-check">
          <input
            id="site-required"
            class="form-check-input"
            type="checkbox"
            [ngModel]="required()"
            (ngModelChange)="required.set($event)"
          />
          <label class="form-check-label" for="site-required">required</label>
        </div>
        <div class="form-check">
          <input
            id="site-invalid"
            class="form-check-input"
            data-demo-site-invalid
            type="checkbox"
            [ngModel]="invalid()"
            (ngModelChange)="invalid.set($event)"
          />
          <label class="form-check-label" for="site-invalid">invalid</label>
        </div>
        <div class="form-check">
          <input
            id="site-disabled"
            class="form-check-input"
            data-demo-site-disabled
            type="checkbox"
            [ngModel]="disabled()"
            (ngModelChange)="disabled.set($event)"
          />
          <label class="form-check-label" for="site-disabled">controlDisabled</label>
        </div>
      </div>
    </demo-page>
  `,
})
export class SiteSelectPageComponent {
  protected readonly selectedSite = signal('alpha');
  protected readonly appearance = signal<SiteSelectAppearance>('default');
  protected readonly controlSize = signal<SiteSelectControlSize>('default');
  protected readonly required = signal(false);
  protected readonly invalid = signal(false);
  protected readonly disabled = signal(false);
  protected readonly siteOptions: readonly SiteSelectOption[] = [
    { value: 'alpha', label: 'Alpha workspace' },
    { value: 'beta', label: 'Beta workspace' },
    { value: 'gamma', label: 'Gamma workspace' },
  ];
}

@Component({
  selector: 'demo-localized-date-picker-page',
  standalone: true,
  imports: [DemoPageComponent, FormsModule, LocalizedDatePickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <demo-page
      title="Localized date picker"
      description="Keeps canonical ISO state while locale, bounds, validation, sizing, and read-only behavior remain consumer-controlled."
    >
      <div demo-preview>
        <p class="demo-output" data-demo-localized-date>Formatted date: {{ formattedDate() }}</p>
        <label class="form-label" for="demo-date">Review date</label>
        <ds-localized-date-picker
          inputId="demo-date"
          [value]="selectedDate()"
          [controlSize]="controlSize()"
          [dateLocale]="locale()"
          [labels]="labels()"
          [required]="required()"
          [invalid]="invalid()"
          [controlDisabled]="disabled()"
          [readonly]="readonly()"
          [min]="min()"
          [max]="max()"
          [disabledDates]="disabledDates()"
          (valueChange)="selectedDate.set($event)"
          (validityChange)="valid.set($event)"
        />
        <p class="demo-output" data-demo-date-selection aria-live="polite">
          Committed: {{ selectedDate() ?? '(null)' }}
        </p>
        <p class="demo-output">Emitted validity: {{ valid() }}</p>
      </div>
      <div demo-controls class="demo-form-stack">
        <div>
          <label class="form-label" for="date-locale">dateLocale</label>
          <select
            id="date-locale"
            class="form-select"
            [ngModel]="locale()"
            (ngModelChange)="locale.set($event)"
          >
            <option value="en-US">en-US</option>
            <option value="de-DE">de-DE</option>
          </select>
        </div>
        <div>
          <label class="form-label" for="date-size">controlSize</label>
          <select
            id="date-size"
            class="form-select"
            [ngModel]="controlSize()"
            (ngModelChange)="controlSize.set($event)"
          >
            <option value="default">default</option>
            <option value="small">small</option>
          </select>
        </div>
        @for (toggle of toggles; track toggle.key) {
          <div class="form-check">
            <input
              [id]="'date-' + toggle.key"
              class="form-check-input"
              type="checkbox"
              [ngModel]="toggle.value()"
              (ngModelChange)="toggle.value.set($event)"
            />
            <label class="form-check-label" [for]="'date-' + toggle.key">{{ toggle.label }}</label>
          </div>
        }
      </div>
    </demo-page>
  `,
})
export class LocalizedDatePickerPageComponent {
  protected readonly selectedDate = signal<string | null>('2026-08-28');
  protected readonly locale = signal<'en-US' | 'de-DE'>('en-US');
  protected readonly controlSize = signal<LocalizedDatePickerControlSize>('default');
  protected readonly required = signal(false);
  protected readonly invalid = signal(false);
  protected readonly disabled = signal(false);
  protected readonly readonly = signal(false);
  protected readonly limitRange = signal(true);
  protected readonly disableAugust29 = signal(false);
  protected readonly valid = signal(true);

  protected readonly toggles = [
    { key: 'required', label: 'required', value: this.required },
    { key: 'invalid', label: 'invalid', value: this.invalid },
    { key: 'disabled', label: 'controlDisabled', value: this.disabled },
    { key: 'readonly', label: 'readonly', value: this.readonly },
    { key: 'range', label: 'min/max: August–September 2026', value: this.limitRange },
    { key: 'disabled-date', label: 'Disable August 29', value: this.disableAugust29 },
  ] as const;

  protected readonly min = computed(() => (this.limitRange() ? '2026-08-01' : undefined));
  protected readonly max = computed(() => (this.limitRange() ? '2026-09-30' : undefined));
  protected readonly disabledDates = computed<readonly string[]>(() =>
    this.disableAugust29() ? ['2026-08-29'] : [],
  );
  protected readonly formattedDate = computed(() =>
    this.selectedDate() === null
      ? 'No date selected'
      : formatLocalizedDate(`${this.selectedDate()}T12:00:00+00:00`, this.locale(), 'date'),
  );
  protected readonly labels = computed<LocalizedDatePickerLabels>(() => ({
    placeholder: this.locale() === 'de-DE' ? 'TT.MM.JJJJ' : 'MM/DD/YYYY',
    openCalendar: 'Open calendar',
    changeCalendar: 'Change date',
    dialog: 'Choose a date',
    previousMonth: 'Previous month',
    nextMonth: 'Next month',
    openMonthYearPicker: 'Choose month and year',
    previousYear: 'Previous year',
    nextYear: 'Next year',
    clear: 'Clear',
    cancel: 'Cancel',
    done: 'Done',
    today: 'Today',
    formatHint:
      this.locale() === 'de-DE' ? 'Enter a date as TT.MM.JJJJ' : 'Enter a date as MM/DD/YYYY',
    selectDate: 'Choose a date.',
    invalidDate: 'Enter an available date.',
    unavailableDate: 'That date is unavailable.',
    requiredDate: 'Choose a date.',
    keyboardHelp: 'Use arrow keys to move through dates.',
  }));
}
