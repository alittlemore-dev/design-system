import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LocalizedDateRangePickerComponent,
  LocalizedDateTimePickerComponent,
  LocalizedDateTimeRangePickerComponent,
  LocalizedTimePickerComponent,
  LocalizedTimeRangePickerComponent,
  type LocalizedDatePickerControlSize,
  type LocalizedDateRange,
  type LocalizedDateRangePickerLabels,
  type LocalizedDateTimePickerLabels,
  type LocalizedDateTimeRange,
  type LocalizedDateTimeRangePickerLabels,
  type LocalizedRangeRequirements,
  type LocalizedTimePickerLabels,
  type LocalizedTimePickerMode,
  type LocalizedTimeRange,
  type LocalizedTimeRangePickerLabels,
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
      description="Keeps nullable canonical endpoints committed separately from calendar drafts while requirements and availability remain consumer-controlled."
    >
      <div demo-preview>
        <label class="form-label" for="demo-date-range">Availability window</label>
        <ds-localized-date-range-picker
          inputId="demo-date-range"
          [value]="selectedRange()"
          [controlSize]="controlSize()"
          [dateLocale]="locale()"
          [labels]="labels()"
          [requirements]="requirements()"
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
          Committed: {{ selectedRange().start ?? '(null)' }} →
          {{ selectedRange().end ?? '(null)' }}
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
        @for (toggle of requirementToggles; track toggle.key) {
          <div class="form-check">
            <input
              [id]="'date-range-require-' + toggle.key"
              [attr.data-demo-date-range-require-paired]="toggle.key === 'paired' ? '' : null"
              class="form-check-input"
              type="checkbox"
              [ngModel]="toggle.value()"
              (ngModelChange)="toggle.value.set($event)"
            />
            <label class="form-check-label" [for]="'date-range-require-' + toggle.key">
              requirements.{{ toggle.key }}
            </label>
          </div>
        }
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
  protected readonly requireStart = signal(false);
  protected readonly requireEnd = signal(false);
  protected readonly requirePaired = signal(false);
  protected readonly invalid = signal(false);
  protected readonly disabled = signal(false);
  protected readonly readonly = signal(false);
  protected readonly limitRange = signal(true);
  protected readonly disableAugust31 = signal(true);
  protected readonly valid = signal(true);

  protected readonly requirements = computed<LocalizedRangeRequirements>(() => ({
    start: this.requireStart(),
    end: this.requireEnd(),
    paired: this.requirePaired(),
  }));
  protected readonly requirementToggles = [
    { key: 'start', value: this.requireStart },
    { key: 'end', value: this.requireEnd },
    { key: 'paired', value: this.requirePaired },
  ] as const;
  protected readonly toggles = [
    { key: 'invalid', label: 'invalid', value: this.invalid },
    { key: 'disabled', label: 'controlDisabled', value: this.disabled },
    { key: 'readonly', label: 'readonly', value: this.readonly },
    { key: 'bounds', label: 'min/max: August–September 2026', value: this.limitRange },
    { key: 'disabled-date', label: 'Disable August 31', value: this.disableAugust31 },
  ] as const;
  protected readonly min = computed(() => (this.limitRange() ? '2026-08-01' : undefined));
  protected readonly max = computed(() => (this.limitRange() ? '2026-09-30' : undefined));
  protected readonly disabledDates = computed<readonly string[]>(() =>
    this.disableAugust31() ? ['2026-08-31'] : [],
  );
  protected readonly labels = computed<LocalizedDateRangePickerLabels>(() => ({
    ...calendarLabels(this.locale()),
    placeholder: this.locale() === 'de-DE' ? 'TT.MM.JJJJ' : 'MM/DD/YYYY',
    openPicker: 'Open date range picker',
    changeValue: 'Change date range',
    dialog: 'Choose a date range',
    groupLabel: 'Availability date range',
    startDate: 'Start date',
    endDate: 'End date',
    selectStartDate: 'Choose the start date.',
    selectEndDate: 'Choose the end date.',
    accessibleRangeSeparator: 'to',
    announceRangePreview: (start, end) => `Preview from ${start} to ${end}.`,
    dateFormatHint:
      this.locale() === 'de-DE' ? 'Enter dates as TT.MM.JJJJ.' : 'Enter dates as MM/DD/YYYY.',
    invalidRange: 'Enter a valid date range in chronological order.',
    unavailableRange: 'That date range is unavailable.',
    requiredRange: 'Choose both dates required by the current settings.',
  }));
}

@Component({
  selector: 'demo-localized-time-picker-page',
  standalone: true,
  imports: [DemoPageComponent, FormsModule, LocalizedTimePickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <demo-page
      title="Localized time picker"
      description="Commits nullable minute-precision local times only after Done; custom mode supports direct typing, arrow keys, and visible step buttons."
    >
      <div demo-preview>
        <label class="form-label" for="demo-time">Reminder time</label>
        <ds-localized-time-picker
          inputId="demo-time"
          [value]="selectedTime()"
          [controlSize]="controlSize()"
          [labels]="labels"
          [required]="required()"
          [invalid]="invalid()"
          [controlDisabled]="disabled()"
          [readonly]="readonly()"
          [min]="min()"
          [max]="max()"
          [timePickerMode]="timePickerMode()"
          (valueChange)="selectedTime.set($event)"
          (validityChange)="valid.set($event)"
        />
        <p class="demo-output" data-demo-time-selection aria-live="polite">
          Committed: {{ selectedTime() ?? '(null)' }}
        </p>
        <p class="demo-output">Emitted validity: {{ valid() }}</p>
      </div>
      <div demo-controls class="demo-form-stack">
        <div>
          <label class="form-label" for="time-mode">timePickerMode</label>
          <select
            id="time-mode"
            class="form-select"
            data-demo-time-mode
            [ngModel]="timePickerMode()"
            (ngModelChange)="timePickerMode.set($event)"
          >
            <option value="custom">custom</option>
            <option value="native">native</option>
            <option value="auto">auto</option>
          </select>
        </div>
        <div>
          <label class="form-label" for="time-size">controlSize</label>
          <select
            id="time-size"
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
              [id]="'time-' + toggle.key"
              class="form-check-input"
              type="checkbox"
              [ngModel]="toggle.value()"
              (ngModelChange)="toggle.value.set($event)"
            />
            <label class="form-check-label" [for]="'time-' + toggle.key">
              {{ toggle.label }}
            </label>
          </div>
        }
      </div>
    </demo-page>
  `,
})
export class LocalizedTimePickerPageComponent {
  protected readonly selectedTime = signal<string | null>('09:30');
  protected readonly controlSize = signal<LocalizedDatePickerControlSize>('default');
  protected readonly timePickerMode = signal<LocalizedTimePickerMode>('custom');
  protected readonly required = signal(false);
  protected readonly invalid = signal(false);
  protected readonly disabled = signal(false);
  protected readonly readonly = signal(false);
  protected readonly limitRange = signal(true);
  protected readonly valid = signal(true);

  protected readonly toggles = [
    { key: 'required', label: 'required', value: this.required },
    { key: 'invalid', label: 'invalid', value: this.invalid },
    { key: 'disabled', label: 'controlDisabled', value: this.disabled },
    { key: 'readonly', label: 'readonly', value: this.readonly },
    { key: 'bounds', label: 'min/max: 08:00–18:00', value: this.limitRange },
  ] as const;
  protected readonly min = computed(() => (this.limitRange() ? '08:00' : undefined));
  protected readonly max = computed(() => (this.limitRange() ? '18:00' : undefined));
  protected readonly labels: LocalizedTimePickerLabels = {
    placeholder: 'HH:mm',
    openTimePicker: 'Open time picker',
    changeTime: 'Change time',
    dialog: 'Choose a time',
    timeInput: 'Time',
    hour: 'Hour',
    minute: 'Minute',
    formatHint: 'Enter a 24-hour time as HH:mm.',
    invalidTime: 'Enter a valid time.',
    unavailableTime: 'That time is unavailable.',
    requiredTime: 'Choose a time.',
    clear: 'Clear',
    cancel: 'Cancel',
    done: 'Done',
    now: 'Now',
    keyboardHelp: 'Use number keys, arrow keys, or the visible buttons to change hour and minute.',
  };
}

@Component({
  selector: 'demo-localized-time-range-picker-page',
  standalone: true,
  imports: [DemoPageComponent, FormsModule, LocalizedTimeRangePickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <demo-page
      title="Localized time range picker"
      description="Shows start and end time editors together and commits the transactional range only after Done."
    >
      <div demo-preview>
        <label class="form-label" for="demo-time-range">Working hours</label>
        <ds-localized-time-range-picker
          inputId="demo-time-range"
          [value]="selectedRange()"
          [controlSize]="controlSize()"
          [labels]="labels"
          [requirements]="requirements()"
          [invalid]="invalid()"
          [controlDisabled]="disabled()"
          [readonly]="readonly()"
          [min]="min()"
          [max]="max()"
          [timePickerMode]="timePickerMode()"
          (valueChange)="selectedRange.set($event)"
          (validityChange)="valid.set($event)"
        />
        <p class="demo-output" data-demo-time-range-selection aria-live="polite">
          Committed: {{ selectedRange().start ?? '(null)' }} →
          {{ selectedRange().end ?? '(null)' }}
        </p>
        <p class="demo-output">Emitted validity: {{ valid() }}</p>
      </div>
      <div demo-controls class="demo-form-stack">
        <div>
          <label class="form-label" for="time-range-mode">timePickerMode</label>
          <select
            id="time-range-mode"
            class="form-select"
            data-demo-time-range-mode
            [ngModel]="timePickerMode()"
            (ngModelChange)="timePickerMode.set($event)"
          >
            <option value="custom">custom</option>
            <option value="native">native</option>
            <option value="auto">auto</option>
          </select>
        </div>
        <div>
          <label class="form-label" for="time-range-size">controlSize</label>
          <select
            id="time-range-size"
            class="form-select"
            [ngModel]="controlSize()"
            (ngModelChange)="controlSize.set($event)"
          >
            <option value="default">default</option>
            <option value="small">small</option>
          </select>
        </div>
        @for (toggle of requirementToggles; track toggle.key) {
          <div class="form-check">
            <input
              [id]="'time-range-require-' + toggle.key"
              class="form-check-input"
              type="checkbox"
              [ngModel]="toggle.value()"
              (ngModelChange)="toggle.value.set($event)"
            />
            <label class="form-check-label" [for]="'time-range-require-' + toggle.key">
              requirements.{{ toggle.key }}
            </label>
          </div>
        }
        @for (toggle of toggles; track toggle.key) {
          <div class="form-check">
            <input
              [id]="'time-range-' + toggle.key"
              class="form-check-input"
              type="checkbox"
              [ngModel]="toggle.value()"
              (ngModelChange)="toggle.value.set($event)"
            />
            <label class="form-check-label" [for]="'time-range-' + toggle.key">
              {{ toggle.label }}
            </label>
          </div>
        }
      </div>
    </demo-page>
  `,
})
export class LocalizedTimeRangePickerPageComponent {
  protected readonly selectedRange = signal<LocalizedTimeRange>({ start: '09:30', end: '17:00' });
  protected readonly controlSize = signal<LocalizedDatePickerControlSize>('default');
  protected readonly timePickerMode = signal<LocalizedTimePickerMode>('custom');
  protected readonly requireStart = signal(false);
  protected readonly requireEnd = signal(false);
  protected readonly requirePaired = signal(false);
  protected readonly invalid = signal(false);
  protected readonly disabled = signal(false);
  protected readonly readonly = signal(false);
  protected readonly limitRange = signal(true);
  protected readonly valid = signal(true);

  protected readonly requirements = computed<LocalizedRangeRequirements>(() => ({
    start: this.requireStart(),
    end: this.requireEnd(),
    paired: this.requirePaired(),
  }));
  protected readonly requirementToggles = [
    { key: 'start', value: this.requireStart },
    { key: 'end', value: this.requireEnd },
    { key: 'paired', value: this.requirePaired },
  ] as const;
  protected readonly toggles = [
    { key: 'invalid', label: 'invalid', value: this.invalid },
    { key: 'disabled', label: 'controlDisabled', value: this.disabled },
    { key: 'readonly', label: 'readonly', value: this.readonly },
    { key: 'bounds', label: 'min/max: 08:00–18:00', value: this.limitRange },
  ] as const;
  protected readonly min = computed(() => (this.limitRange() ? '08:00' : undefined));
  protected readonly max = computed(() => (this.limitRange() ? '18:00' : undefined));
  protected readonly labels: LocalizedTimeRangePickerLabels = {
    placeholder: 'HH:mm',
    openPicker: 'Open time range picker',
    changeValue: 'Change time range',
    dialog: 'Choose a time range',
    groupLabel: 'Working-hours time range',
    startTime: 'Start time',
    endTime: 'End time',
    selectStartTime: 'Choose the start time.',
    selectEndTime: 'Choose the end time.',
    accessibleRangeSeparator: 'to',
    hour: 'Hour',
    minute: 'Minute',
    formatHint: 'Enter 24-hour times as HH:mm.',
    clear: 'Clear',
    cancel: 'Cancel',
    done: 'Done',
    now: 'Now',
    keyboardHelp: 'Use number keys, arrow keys, or the visible buttons to edit either time.',
    invalidRange: 'Enter a valid time range in chronological order.',
    unavailableRange: 'That time range is unavailable.',
    requiredRange: 'Choose both times required by the current settings.',
  };
}

@Component({
  selector: 'demo-localized-datetime-picker-page',
  standalone: true,
  imports: [DemoPageComponent, FormsModule, LocalizedDateTimePickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <demo-page
      title="Localized datetime picker"
      description="Commits a nullable minute-precision local wall-clock datetime with no timezone conversion."
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
          [timePickerMode]="timePickerMode()"
          (valueChange)="selectedDateTime.set($event)"
          (validityChange)="valid.set($event)"
        />
        <p class="demo-output" data-demo-datetime-selection aria-live="polite">
          Committed: {{ selectedDateTime() ?? '(null)' }}
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
          <label class="form-label" for="datetime-mode">timePickerMode</label>
          <select
            id="datetime-mode"
            class="form-select"
            data-demo-datetime-mode
            [ngModel]="timePickerMode()"
            (ngModelChange)="timePickerMode.set($event)"
          >
            <option value="custom">custom</option>
            <option value="native">native</option>
            <option value="auto">auto</option>
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
  protected readonly selectedDateTime = signal<string | null>('2026-08-28T09:30');
  protected readonly locale = signal<DemoLocale>('en-US');
  protected readonly controlSize = signal<LocalizedDatePickerControlSize>('default');
  protected readonly timePickerMode = signal<LocalizedTimePickerMode>('custom');
  protected readonly required = signal(false);
  protected readonly invalid = signal(false);
  protected readonly disabled = signal(false);
  protected readonly readonly = signal(false);
  protected readonly limitRange = signal(true);
  protected readonly disableAugust31 = signal(true);
  protected readonly valid = signal(true);

  protected readonly toggles = [
    { key: 'required', label: 'required', value: this.required },
    { key: 'invalid', label: 'invalid', value: this.invalid },
    { key: 'disabled', label: 'controlDisabled', value: this.disabled },
    { key: 'readonly', label: 'readonly', value: this.readonly },
    { key: 'bounds', label: 'min/max: August–September 2026', value: this.limitRange },
    { key: 'disabled-date', label: 'Disable August 31', value: this.disableAugust31 },
  ] as const;
  protected readonly min = computed(() => (this.limitRange() ? '2026-08-01T08:00' : undefined));
  protected readonly max = computed(() => (this.limitRange() ? '2026-09-30T18:00' : undefined));
  protected readonly disabledDates = computed<readonly string[]>(() =>
    this.disableAugust31() ? ['2026-08-31'] : [],
  );
  protected readonly labels = computed<LocalizedDateTimePickerLabels>(() => ({
    ...calendarLabels(this.locale()),
    placeholder: this.locale() === 'de-DE' ? 'TT.MM.JJJJ HH:mm' : 'MM/DD/YYYY HH:mm',
    openPicker: 'Open date and time picker',
    changeValue: 'Change date and time',
    dialog: 'Choose a date and time',
    dateTimeInput: 'Date and time',
    hour: 'Hour',
    minute: 'Minute',
    dateFormatHint:
      this.locale() === 'de-DE' ? 'Enter a date as TT.MM.JJJJ.' : 'Enter a date as MM/DD/YYYY.',
    timeFormatHint: 'Enter a 24-hour time as HH:mm.',
    selectDate: 'Choose the appointment date.',
    now: 'Now',
    invalidDateTime: 'Enter a valid date and time.',
    unavailableDateTime: 'That date and time is unavailable.',
    requiredDateTime: 'Choose a date and time.',
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
      description="Combines an alternating range calendar with both time editors visible and commits the local wall-clock interval after Done."
    >
      <div demo-preview>
        <label class="form-label" for="demo-datetime-range">Scheduled window</label>
        <ds-localized-datetime-range-picker
          inputId="demo-datetime-range"
          [value]="selectedRange()"
          [controlSize]="controlSize()"
          [dateLocale]="locale()"
          [labels]="labels()"
          [requirements]="requirements()"
          [invalid]="invalid()"
          [controlDisabled]="disabled()"
          [readonly]="readonly()"
          [min]="min()"
          [max]="max()"
          [disabledDates]="disabledDates()"
          [timePickerMode]="timePickerMode()"
          (valueChange)="selectedRange.set($event)"
          (validityChange)="valid.set($event)"
        />
        <p class="demo-output" data-demo-datetime-range-selection aria-live="polite">
          Committed: {{ selectedRange().start ?? '(null)' }} →
          {{ selectedRange().end ?? '(null)' }}
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
          <label class="form-label" for="datetime-range-mode">timePickerMode</label>
          <select
            id="datetime-range-mode"
            class="form-select"
            data-demo-datetime-range-mode
            [ngModel]="timePickerMode()"
            (ngModelChange)="timePickerMode.set($event)"
          >
            <option value="custom">custom</option>
            <option value="native">native</option>
            <option value="auto">auto</option>
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
        @for (toggle of requirementToggles; track toggle.key) {
          <div class="form-check">
            <input
              [id]="'datetime-range-require-' + toggle.key"
              class="form-check-input"
              type="checkbox"
              [ngModel]="toggle.value()"
              (ngModelChange)="toggle.value.set($event)"
            />
            <label class="form-check-label" [for]="'datetime-range-require-' + toggle.key">
              requirements.{{ toggle.key }}
            </label>
          </div>
        }
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
  protected readonly timePickerMode = signal<LocalizedTimePickerMode>('custom');
  protected readonly requireStart = signal(false);
  protected readonly requireEnd = signal(false);
  protected readonly requirePaired = signal(false);
  protected readonly invalid = signal(false);
  protected readonly disabled = signal(false);
  protected readonly readonly = signal(false);
  protected readonly limitRange = signal(true);
  protected readonly disableAugust31 = signal(true);
  protected readonly valid = signal(true);

  protected readonly requirements = computed<LocalizedRangeRequirements>(() => ({
    start: this.requireStart(),
    end: this.requireEnd(),
    paired: this.requirePaired(),
  }));
  protected readonly requirementToggles = [
    { key: 'start', value: this.requireStart },
    { key: 'end', value: this.requireEnd },
    { key: 'paired', value: this.requirePaired },
  ] as const;
  protected readonly toggles = [
    { key: 'invalid', label: 'invalid', value: this.invalid },
    { key: 'disabled', label: 'controlDisabled', value: this.disabled },
    { key: 'readonly', label: 'readonly', value: this.readonly },
    { key: 'bounds', label: 'min/max: August–September 2026', value: this.limitRange },
    { key: 'disabled-date', label: 'Disable August 31', value: this.disableAugust31 },
  ] as const;
  protected readonly min = computed(() => (this.limitRange() ? '2026-08-01T08:00' : undefined));
  protected readonly max = computed(() => (this.limitRange() ? '2026-09-30T18:00' : undefined));
  protected readonly disabledDates = computed<readonly string[]>(() =>
    this.disableAugust31() ? ['2026-08-31'] : [],
  );
  protected readonly labels = computed<LocalizedDateTimeRangePickerLabels>(() => ({
    ...calendarLabels(this.locale()),
    placeholder: this.locale() === 'de-DE' ? 'TT.MM.JJJJ HH:mm' : 'MM/DD/YYYY HH:mm',
    openPicker: 'Open date and time range picker',
    changeValue: 'Change date and time range',
    dialog: 'Choose a date and time range',
    groupLabel: 'Scheduled date and time range',
    startDateTime: 'Start date and time',
    endDateTime: 'End date and time',
    selectStartDateTime: 'Choose the start date and time.',
    selectEndDateTime: 'Choose the end date and time.',
    accessibleRangeSeparator: 'to',
    announceRangePreview: (start, end) => `Preview from ${start} to ${end}.`,
    hour: 'Hour',
    minute: 'Minute',
    dateFormatHint:
      this.locale() === 'de-DE' ? 'Enter dates as TT.MM.JJJJ.' : 'Enter dates as MM/DD/YYYY.',
    timeFormatHint: 'Enter 24-hour times as HH:mm.',
    now: 'Now',
    invalidRange: 'Enter a valid date and time range in chronological order.',
    unavailableRange: 'That date and time range is unavailable.',
    requiredRange: 'Choose both endpoints required by the current settings.',
  }));
}

function calendarLabels(locale: DemoLocale) {
  return {
    previousMonth: 'Previous month',
    nextMonth: 'Next month',
    openMonthYearPicker: 'Choose month and year',
    previousYear: 'Previous year',
    nextYear: 'Next year',
    clear: 'Clear',
    cancel: 'Cancel',
    done: 'Done',
    today: 'Today',
    keyboardHelp:
      locale === 'de-DE'
        ? 'Use arrow keys to move through dates; displayed dates use German ordering.'
        : 'Use arrow keys to move through dates.',
  };
}
