import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
  type WritableSignal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LocalizedDateRangePickerComponent,
  LocalizedDateTimePickerComponent,
  LocalizedDateTimeRangePickerComponent,
  type LocalizedDatePickerControlSize,
  type LocalizedDatePickerLabels,
  type LocalizedDateRange,
  type LocalizedDateRangePickerLabels,
  type LocalizedDateTimePickerLabels,
  type LocalizedDateTimeRange,
  type LocalizedDateTimeRangePickerLabels,
} from '@alittlemore.dev/design-system';

import { DemoPageComponent } from '../shared/demo-page.component';

type DemoLocale = 'en-US' | 'de-DE';

@Component({
  selector: 'demo-localized-date-range-picker-page',
  standalone: true,
  imports: [DemoPageComponent, FormsModule, LocalizedDateRangePickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <demo-page
      title="Localized date range picker"
      description="Emits canonical inclusive date ranges while locale, bounds, disabled dates, validation, and interaction state remain consumer-controlled."
    >
      <div demo-preview>
        <label class="form-label" for="demo-date-range">Availability window</label>
        <ds-localized-date-range-picker
          inputId="demo-date-range"
          [value]="selectedRange()"
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
          (valueChange)="selectedRange.set($event)"
          (validityChange)="valid.set($event)"
        />
        <p class="demo-output" data-demo-date-range-selection aria-live="polite">
          Selected: {{ selectedRange().start || '(empty)' }} →
          {{ selectedRange().end || '(empty)' }}
        </p>
        <p class="demo-output">Emitted validity: {{ valid() }}</p>
      </div>
      <div demo-controls class="demo-form-stack">
        <div>
          <label class="form-label" for="date-range-locale">dateLocale</label>
          <select
            id="date-range-locale"
            class="form-select"
            data-demo-date-range-locale
            [ngModel]="locale()"
            (ngModelChange)="locale.set($event)"
          >
            <option value="en-US">en-US</option>
            <option value="de-DE">de-DE</option>
          </select>
        </div>
        <div>
          <label class="form-label" for="date-range-size">controlSize</label>
          <select
            id="date-range-size"
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
              [id]="'date-range-' + toggle.key"
              class="form-check-input"
              type="checkbox"
              [ngModel]="toggle.value()"
              (ngModelChange)="toggle.value.set($event)"
            />
            <label class="form-check-label" [for]="'date-range-' + toggle.key">
              {{ toggle.label }}
            </label>
          </div>
        }
      </div>
    </demo-page>
  `,
})
export class LocalizedDateRangePickerPageComponent {
  protected readonly selectedRange = signal<LocalizedDateRange>({
    start: '2026-08-28',
    end: '2026-08-30',
  });
  protected readonly locale = signal<DemoLocale>('en-US');
  protected readonly controlSize = signal<LocalizedDatePickerControlSize>('default');
  protected readonly required = signal(false);
  protected readonly invalid = signal(false);
  protected readonly disabled = signal(false);
  protected readonly readonly = signal(false);
  protected readonly limitRange = signal(true);
  protected readonly disableAugust31 = signal(true);
  protected readonly valid = signal(true);

  protected readonly toggles = pickerToggles({
    required: this.required,
    invalid: this.invalid,
    disabled: this.disabled,
    readonly: this.readonly,
    limitRange: this.limitRange,
    disableAugust31: this.disableAugust31,
  });
  protected readonly min = computed(() => (this.limitRange() ? '2026-08-01' : undefined));
  protected readonly max = computed(() => (this.limitRange() ? '2026-09-30' : undefined));
  protected readonly disabledDates = computed<readonly string[]>(() =>
    this.disableAugust31() ? ['2026-08-31'] : [],
  );
  protected readonly labels = computed<LocalizedDateRangePickerLabels>(() => ({
    ...baseDateLabels(this.locale()),
    groupLabel: 'Availability date range',
    startDate: 'Start date',
    endDate: 'End date',
    selectStartDate: 'Choose the start date.',
    selectEndDate: 'Choose the end date.',
    invalidRange: 'Enter an available date range in chronological order.',
    requiredRange: 'Choose both dates.',
  }));
}

@Component({
  selector: 'demo-localized-datetime-picker-page',
  standalone: true,
  imports: [DemoPageComponent, FormsModule, LocalizedDateTimePickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <demo-page
      title="Localized datetime picker"
      description="Emits a minute-precision local wall-clock datetime with no timezone conversion while the consumer controls locale and availability."
    >
      <div demo-preview>
        <label class="form-label" for="demo-datetime">Appointment</label>
        <ds-localized-datetime-picker
          inputId="demo-datetime"
          [value]="selectedDateTime()"
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
          (valueChange)="selectedDateTime.set($event)"
          (validityChange)="valid.set($event)"
        />
        <p class="demo-output" data-demo-datetime-selection aria-live="polite">
          Selected: {{ selectedDateTime() || '(empty)' }}
        </p>
        <p class="demo-output">Emitted validity: {{ valid() }}</p>
      </div>
      <div demo-controls class="demo-form-stack">
        <div>
          <label class="form-label" for="datetime-locale">dateLocale</label>
          <select
            id="datetime-locale"
            class="form-select"
            data-demo-datetime-locale
            [ngModel]="locale()"
            (ngModelChange)="locale.set($event)"
          >
            <option value="en-US">en-US</option>
            <option value="de-DE">de-DE</option>
          </select>
        </div>
        <div>
          <label class="form-label" for="datetime-size">controlSize</label>
          <select
            id="datetime-size"
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
              [id]="'datetime-' + toggle.key"
              class="form-check-input"
              type="checkbox"
              [ngModel]="toggle.value()"
              (ngModelChange)="toggle.value.set($event)"
            />
            <label class="form-check-label" [for]="'datetime-' + toggle.key">
              {{ toggle.label }}
            </label>
          </div>
        }
      </div>
    </demo-page>
  `,
})
export class LocalizedDateTimePickerPageComponent {
  protected readonly selectedDateTime = signal('2026-08-28T09:30');
  protected readonly locale = signal<DemoLocale>('en-US');
  protected readonly controlSize = signal<LocalizedDatePickerControlSize>('default');
  protected readonly required = signal(false);
  protected readonly invalid = signal(false);
  protected readonly disabled = signal(false);
  protected readonly readonly = signal(false);
  protected readonly limitRange = signal(true);
  protected readonly disableAugust31 = signal(true);
  protected readonly valid = signal(true);

  protected readonly toggles = pickerToggles({
    required: this.required,
    invalid: this.invalid,
    disabled: this.disabled,
    readonly: this.readonly,
    limitRange: this.limitRange,
    disableAugust31: this.disableAugust31,
  });
  protected readonly min = computed(() => (this.limitRange() ? '2026-08-01T08:00' : undefined));
  protected readonly max = computed(() => (this.limitRange() ? '2026-09-30T18:00' : undefined));
  protected readonly disabledDates = computed<readonly string[]>(() =>
    this.disableAugust31() ? ['2026-08-31'] : [],
  );
  protected readonly labels = computed<LocalizedDateTimePickerLabels>(() => ({
    ...baseDateLabels(this.locale()),
    groupLabel: 'Appointment date and time',
    dateInput: 'Date',
    timeInput: 'Time',
    timeFormatHint: 'Enter a 24-hour time as HH:mm.',
    invalidTime: 'Enter an available date and time.',
    requiredTime: 'Choose a time.',
  }));
}

@Component({
  selector: 'demo-localized-datetime-range-picker-page',
  standalone: true,
  imports: [DemoPageComponent, FormsModule, LocalizedDateTimeRangePickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <demo-page
      title="Localized datetime range picker"
      description="Emits an inclusive local wall-clock interval with minute precision, partial-range progress, and consumer-owned availability rules."
    >
      <div demo-preview>
        <label class="form-label" for="demo-datetime-range">Scheduled window</label>
        <ds-localized-datetime-range-picker
          inputId="demo-datetime-range"
          [value]="selectedRange()"
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
          (valueChange)="selectedRange.set($event)"
          (validityChange)="valid.set($event)"
        />
        <p class="demo-output" data-demo-datetime-range-selection aria-live="polite">
          Selected: {{ selectedRange().start || '(empty)' }} →
          {{ selectedRange().end || '(empty)' }}
        </p>
        <p class="demo-output">Emitted validity: {{ valid() }}</p>
      </div>
      <div demo-controls class="demo-form-stack">
        <div>
          <label class="form-label" for="datetime-range-locale">dateLocale</label>
          <select
            id="datetime-range-locale"
            class="form-select"
            data-demo-datetime-range-locale
            [ngModel]="locale()"
            (ngModelChange)="locale.set($event)"
          >
            <option value="en-US">en-US</option>
            <option value="de-DE">de-DE</option>
          </select>
        </div>
        <div>
          <label class="form-label" for="datetime-range-size">controlSize</label>
          <select
            id="datetime-range-size"
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
              [id]="'datetime-range-' + toggle.key"
              class="form-check-input"
              type="checkbox"
              [ngModel]="toggle.value()"
              (ngModelChange)="toggle.value.set($event)"
            />
            <label class="form-check-label" [for]="'datetime-range-' + toggle.key">
              {{ toggle.label }}
            </label>
          </div>
        }
      </div>
    </demo-page>
  `,
})
export class LocalizedDateTimeRangePickerPageComponent {
  protected readonly selectedRange = signal<LocalizedDateTimeRange>({
    start: '2026-08-28T09:30',
    end: '2026-08-30T17:00',
  });
  protected readonly locale = signal<DemoLocale>('en-US');
  protected readonly controlSize = signal<LocalizedDatePickerControlSize>('default');
  protected readonly required = signal(false);
  protected readonly invalid = signal(false);
  protected readonly disabled = signal(false);
  protected readonly readonly = signal(false);
  protected readonly limitRange = signal(true);
  protected readonly disableAugust31 = signal(true);
  protected readonly valid = signal(true);

  protected readonly toggles = pickerToggles({
    required: this.required,
    invalid: this.invalid,
    disabled: this.disabled,
    readonly: this.readonly,
    limitRange: this.limitRange,
    disableAugust31: this.disableAugust31,
  });
  protected readonly min = computed(() => (this.limitRange() ? '2026-08-01T08:00' : undefined));
  protected readonly max = computed(() => (this.limitRange() ? '2026-09-30T18:00' : undefined));
  protected readonly disabledDates = computed<readonly string[]>(() =>
    this.disableAugust31() ? ['2026-08-31'] : [],
  );
  protected readonly labels = computed<LocalizedDateTimeRangePickerLabels>(() => ({
    ...baseDateLabels(this.locale()),
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
  }));
}

interface PickerState {
  readonly required: WritableSignal<boolean>;
  readonly invalid: WritableSignal<boolean>;
  readonly disabled: WritableSignal<boolean>;
  readonly readonly: WritableSignal<boolean>;
  readonly limitRange: WritableSignal<boolean>;
  readonly disableAugust31: WritableSignal<boolean>;
}

function pickerToggles(state: PickerState) {
  return [
    { key: 'required', label: 'required', value: state.required },
    { key: 'invalid', label: 'invalid', value: state.invalid },
    { key: 'disabled', label: 'controlDisabled', value: state.disabled },
    { key: 'readonly', label: 'readonly', value: state.readonly },
    { key: 'bounds', label: 'min/max: August–September 2026', value: state.limitRange },
    { key: 'disabled-date', label: 'Disable August 31', value: state.disableAugust31 },
  ] as const;
}

function baseDateLabels(locale: DemoLocale): LocalizedDatePickerLabels {
  return {
    placeholder: locale === 'de-DE' ? 'TT.MM.JJJJ' : 'MM/DD/YYYY',
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
    formatHint: locale === 'de-DE' ? 'Enter a date as TT.MM.JJJJ.' : 'Enter a date as MM/DD/YYYY.',
    invalidDate: 'Enter an available date.',
    requiredDate: 'Choose a date.',
    keyboardHelp: 'Use arrow keys to move through dates.',
  };
}
