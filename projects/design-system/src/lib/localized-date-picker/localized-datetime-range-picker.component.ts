import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnChanges,
  PLATFORM_ID,
  computed,
  effect,
  forwardRef,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  AbstractControl,
  ControlValueAccessor,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
  Validator,
} from '@angular/forms';
import { CalendarActiveBoundary, CalendarDialogComponent } from './calendar-dialog.component';
import {
  formatDateForLocale,
  formatLongDate,
  intervalCrossesDisabledDate,
  isDateDisabled,
  isDateTimeRangeOrdered,
  parseDateForLocale,
  parseDateTime,
  parseIsoDate,
  parseTime,
} from './localized-date-picker.utils';
import {
  LocalizedDatePickerControlSize,
  LocalizedDatePickerLabels,
} from './localized-date-picker.component';

export interface LocalizedDateTimeRange {
  readonly start: string;
  readonly end: string;
}

export interface LocalizedDateTimeRangePickerLabels extends LocalizedDatePickerLabels {
  readonly groupLabel: string;
  readonly startDate: string;
  readonly startTime: string;
  readonly endDate: string;
  readonly endTime: string;
  readonly selectStartDate: string;
  readonly selectEndDate: string;
  readonly timeFormatHint: string;
  readonly invalidTime: string;
  readonly requiredTime: string;
  readonly invalidRange: string;
  readonly requiredRange: string;
}

interface DraftEndpoint {
  readonly kind: 'empty' | 'complete' | 'invalid';
  readonly value: string;
}

interface CalendarDateRange {
  readonly start: string;
  readonly end: string;
}

type RangeInvalidity = 'required' | 'invalid' | 'unavailable' | null;

interface FieldValidityMessages {
  readonly startDate: string;
  readonly startTime: string;
  readonly endDate: string;
  readonly endTime: string;
}

const EMPTY_RANGE: LocalizedDateTimeRange = { start: '', end: '' };
const EMPTY_DATE_RANGE: CalendarDateRange = { start: '', end: '' };
let nextCalendarId = 0;

@Component({
  selector: 'ds-localized-datetime-range-picker',
  standalone: true,
  imports: [CalendarDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './localized-datetime-range-picker.component.html',
  styleUrl: './localized-datetime-range-picker.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => LocalizedDateTimeRangePickerComponent),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => LocalizedDateTimeRangePickerComponent),
      multi: true,
    },
  ],
})
export class LocalizedDateTimeRangePickerComponent
  implements ControlValueAccessor, OnChanges, Validator
{
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly startDateElement = viewChild<ElementRef<HTMLInputElement>>('startDateInput');
  private readonly startTimeElement = viewChild<ElementRef<HTMLInputElement>>('startTimeInput');
  private readonly endDateElement = viewChild<ElementRef<HTMLInputElement>>('endDateInput');
  private readonly endTimeElement = viewChild<ElementRef<HTMLInputElement>>('endTimeInput');
  private readonly calendarDialog = viewChild.required<CalendarDialogComponent>('calendarDialog');

  readonly inputId = input.required<string>();
  readonly value = input<LocalizedDateTimeRange>();
  readonly controlSize = input.required<LocalizedDatePickerControlSize>();
  readonly dateLocale = input.required<string>();
  readonly labels = input.required<LocalizedDateTimeRangePickerLabels>();
  readonly required = input.required<boolean>();
  readonly invalid = input.required<boolean>();
  readonly controlDisabled = input.required<boolean>();
  readonly readonly = input.required<boolean>();
  readonly min = input<string>();
  readonly max = input<string>();
  readonly disabledDates = input<readonly string[]>();

  readonly valueChange = output<LocalizedDateTimeRange>();
  readonly validityChange = output<boolean>();

  /** @internal */
  protected readonly displayStartDate = signal('');

  /** @internal */
  protected readonly displayStartTime = signal('');

  /** @internal */
  protected readonly displayEndDate = signal('');

  /** @internal */
  protected readonly displayEndTime = signal('');

  /** @internal */
  protected readonly calendarOpen = signal(false);

  /** @internal */
  protected readonly activeBoundary = signal<CalendarActiveBoundary>('start');

  /** @internal */
  protected readonly calendarRange = signal<CalendarDateRange>(EMPTY_DATE_RANGE);

  /** @internal */
  protected readonly formValue = signal<LocalizedDateTimeRange>(EMPTY_RANGE);

  /** @internal */
  protected readonly formDisabled = signal(false);

  /** @internal */
  protected readonly manualDraftActive = signal(false);

  /** @internal */
  protected readonly calendarId = `localizedDateTimeRangePicker${nextCalendarId++}`;

  /** @internal */
  protected readonly dateHintId = `${this.calendarId}DateHint`;

  /** @internal */
  protected readonly timeHintId = `${this.calendarId}TimeHint`;

  /** @internal */
  protected readonly errorId = `${this.calendarId}Error`;

  /** @internal */
  protected readonly currentValue = computed(() => this.value() ?? this.formValue());

  /** @internal */
  protected readonly effectiveDisabled = computed(
    () => this.controlDisabled() || this.formDisabled(),
  );

  /** @internal */
  protected readonly currentInvalidity = computed(() => this.rangeInvalidity(this.currentValue()));

  /** @internal */
  protected readonly draftInvalidity = computed(() => this.displayInvalidity());

  /** @internal */
  protected readonly internalInvalidity = computed(() =>
    this.manualDraftActive() ? this.draftInvalidity() : this.currentInvalidity(),
  );

  /** @internal */
  protected readonly effectiveInvalid = computed(
    () => this.invalid() || this.internalInvalidity() !== null,
  );

  /** @internal */
  protected readonly validationMessage = computed(() => {
    if (!this.effectiveInvalid()) return '';
    return this.internalInvalidity() === 'required'
      ? this.labels().requiredRange
      : this.labels().invalidRange;
  });

  /** @internal */
  protected readonly dateDescribedBy = computed(() =>
    this.effectiveInvalid() ? `${this.dateHintId} ${this.errorId}` : this.dateHintId,
  );

  /** @internal */
  protected readonly timeDescribedBy = computed(() =>
    this.effectiveInvalid() ? `${this.timeHintId} ${this.errorId}` : this.timeHintId,
  );

  /** @internal */
  protected readonly activeBoundaryLabel = computed(() =>
    this.activeBoundary() === 'end' ? this.labels().selectEndDate : this.labels().selectStartDate,
  );

  /** @internal */
  protected readonly minimumDate = computed(() => parseDateTime(this.min() ?? '')?.date);

  /** @internal */
  protected readonly maximumDate = computed(() => parseDateTime(this.max() ?? '')?.date);

  /** @internal */
  protected readonly startMinimumTime = computed(() => this.boundaryTime('start', 'min'));

  /** @internal */
  protected readonly startMaximumTime = computed(() => this.boundaryTime('start', 'max'));

  /** @internal */
  protected readonly endMinimumTime = computed(() => this.boundaryTime('end', 'min'));

  /** @internal */
  protected readonly endMaximumTime = computed(() => this.boundaryTime('end', 'max'));

  /** @internal */
  protected readonly canClear = computed(
    () =>
      !this.required() &&
      !this.effectiveDisabled() &&
      !this.readonly() &&
      (this.displayStartDate().trim() !== '' ||
        this.displayStartTime().trim() !== '' ||
        this.displayEndDate().trim() !== '' ||
        this.displayEndTime().trim() !== ''),
  );

  /** @internal */
  protected readonly startToggleAriaLabel = computed(() =>
    this.toggleAriaLabel(this.displayStartDate()),
  );

  /** @internal */
  protected readonly endToggleAriaLabel = computed(() =>
    this.toggleAriaLabel(this.displayEndDate()),
  );

  private onFormChange: ((value: LocalizedDateTimeRange) => void) | null = null;
  private onFormTouched: (() => void) | null = null;
  private onValidatorChange: (() => void) | null = null;
  private lastCommittedValue: LocalizedDateTimeRange = EMPTY_RANGE;
  private pendingStartTime = '';
  private pendingEndTime = '';
  private lastEmittedValidity: boolean | undefined;

  private readonly valueSyncEffect = effect(() => {
    const controlledValue = this.value();
    const value = normalizedRange(controlledValue ?? this.formValue());
    this.dateLocale();
    if (controlledValue === undefined && this.manualDraftActive()) {
      this.lastCommittedValue = value;
      return;
    }
    this.syncDisplay(value);
    this.lastCommittedValue = value;
    this.manualDraftActive.set(false);
    untracked(() => this.onValidatorChange?.());
  });

  private readonly interactiveStateEffect = effect(() => {
    if ((this.effectiveDisabled() || this.readonly()) && this.calendarOpen()) this.closeCalendar();
  });

  private readonly nativeValiditySyncEffect = effect(() => {
    if (!this.isBrowser) return;
    const messages = this.fieldValidityMessages();
    this.startDateElement()?.nativeElement.setCustomValidity(messages.startDate);
    this.startTimeElement()?.nativeElement.setCustomValidity(messages.startTime);
    this.endDateElement()?.nativeElement.setCustomValidity(messages.endDate);
    this.endTimeElement()?.nativeElement.setCustomValidity(messages.endTime);
  });

  private readonly validatorInputsEffect = effect(() => {
    this.required();
    this.min();
    this.max();
    this.disabledDates();
    this.currentValue();
    this.internalInvalidity();
    this.onValidatorChange?.();
  });

  private readonly internalValidityEffect = effect(() => {
    const valid = this.internalInvalidity() === null;
    if (valid === this.lastEmittedValidity) return;
    this.lastEmittedValidity = valid;
    this.validityChange.emit(valid);
  });

  writeValue(value: unknown): void {
    this.manualDraftActive.set(false);
    this.formValue.set(isLocalizedDateTimeRange(value) ? normalizedRange(value) : EMPTY_RANGE);
  }

  ngOnChanges(): void {
    this.onValidatorChange?.();
  }

  registerOnChange(fn: (value: LocalizedDateTimeRange) => void): void {
    this.onFormChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onFormTouched = fn;
  }

  validate(control: AbstractControl<unknown>): ValidationErrors | null {
    const invalidity = this.manualDraftActive()
      ? this.draftInvalidity()
      : this.rangeInvalidity(isLocalizedDateTimeRange(control.value) ? control.value : EMPTY_RANGE);
    return invalidity === null ? null : validationError(invalidity);
  }

  registerOnValidatorChange(fn: () => void): void {
    this.onValidatorChange = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.formDisabled.set(disabled);
    if (disabled && this.calendarOpen()) this.closeCalendar();
  }

  /** @internal */
  protected onFieldInput(
    field: 'startDate' | 'startTime' | 'endDate' | 'endTime',
    event: Event,
  ): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    const value = readInputValue(event);
    if (field === 'startDate') this.displayStartDate.set(value);
    else if (field === 'startTime') this.displayStartTime.set(value);
    else if (field === 'endDate') this.displayEndDate.set(value);
    else this.displayEndTime.set(value);
    this.manualDraftActive.set(true);
    this.commitDraft(field.startsWith('start') ? 'start' : 'end');
  }

  /** @internal */
  protected onFieldBlur(): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    this.markTouched();
  }

  /** @internal */
  protected toggleStartCalendar(trigger: HTMLElement): void {
    if (this.calendarOpen()) this.closeCalendar();
    else this.openCalendar('start', trigger);
  }

  /** @internal */
  protected toggleEndCalendar(trigger: HTMLElement): void {
    if (this.calendarOpen()) this.closeCalendar();
    else {
      const boundary: CalendarActiveBoundary = this.displayDate('start') === '' ? 'start' : 'end';
      this.openCalendar(boundary, trigger);
    }
  }

  /** @internal */
  protected closeCalendar(): void {
    this.calendarDialog().close();
  }

  /** @internal */
  protected onCalendarClosed(): void {
    this.calendarOpen.set(false);
    this.markTouched();
    this.changeDetectorRef.detectChanges();
  }

  /** @internal */
  protected selectDate(iso: string): void {
    if (this.effectiveDisabled() || this.readonly() || parseIsoDate(iso) === null) return;
    if (this.activeBoundary() === 'start') {
      this.pendingStartTime = this.displayStartTime();
      this.pendingEndTime = '';
      this.displayStartDate.set(formatDateForLocale(iso, this.dateLocale()));
      this.displayStartTime.set(this.pendingStartTime);
      this.displayEndDate.set('');
      this.displayEndTime.set('');
      this.calendarRange.set({ start: iso, end: '' });
      this.manualDraftActive.set(true);
      this.commitDraft('start');
      this.activeBoundary.set('end');
      this.changeDetectorRef.detectChanges();
      return;
    }

    const start = this.calendarRange().start;
    if (parseIsoDate(start) === null) {
      this.activeBoundary.set('start');
      this.selectDate(iso);
      return;
    }
    const dates = start <= iso ? { start, end: iso } : { start: iso, end: start };
    this.displayStartDate.set(formatDateForLocale(dates.start, this.dateLocale()));
    this.displayStartTime.set(this.pendingStartTime);
    this.displayEndDate.set(formatDateForLocale(dates.end, this.dateLocale()));
    this.displayEndTime.set(this.pendingEndTime);
    this.calendarRange.set(dates);
    this.manualDraftActive.set(true);
    this.commitDraft('end');
    this.closeCalendar();
    this.focusFirstMissingTime();
  }

  /** @internal */
  protected clearRange(): void {
    if (this.effectiveDisabled() || this.readonly() || !this.canClear()) return;
    this.displayStartDate.set('');
    this.displayStartTime.set('');
    this.displayEndDate.set('');
    this.displayEndTime.set('');
    this.manualDraftActive.set(false);
    this.commitValue(EMPTY_RANGE, false);
    this.closeCalendar();
  }

  private openCalendar(boundary: CalendarActiveBoundary, trigger: HTMLElement): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    const dates = this.displayDateRange();
    this.pendingStartTime = this.displayStartTime();
    this.pendingEndTime = this.displayEndTime();
    this.activeBoundary.set(boundary);
    this.calendarRange.set(dates);
    const preferred = boundary === 'end' ? dates.end || dates.start : dates.start;
    const opened = this.calendarDialog().open(trigger, preferred);
    if (!opened) return;
    this.calendarOpen.set(true);
    this.changeDetectorRef.detectChanges();
  }

  private commitDraft(changedBoundary: 'start' | 'end'): void {
    const start = this.parseDisplayEndpoint('start');
    const end = this.parseDisplayEndpoint('end');
    const changed = changedBoundary === 'start' ? start : end;
    if (changed.kind === 'invalid') {
      this.onValidatorChange?.();
      return;
    }
    if (start.kind === 'complete' && end.kind === 'complete') {
      if (this.rangeInvalidity({ start: start.value, end: end.value }) !== null) {
        this.onValidatorChange?.();
        return;
      }
      this.commitValue({ start: start.value, end: end.value }, false);
      return;
    }
    if (changed.kind === 'complete') {
      if (this.endpointIsUnavailable(changed.value)) {
        this.onValidatorChange?.();
        return;
      }
      const candidate =
        changedBoundary === 'start'
          ? { start: changed.value, end: '' }
          : { start: '', end: changed.value };
      const preserveDrafts = start.kind === 'invalid' || end.kind === 'invalid';
      this.commitValue(candidate, preserveDrafts);
      return;
    }
    if (start.kind === 'empty' && end.kind === 'empty') {
      this.commitValue(EMPTY_RANGE, false);
    } else if (changed.kind === 'empty') {
      const other = changedBoundary === 'start' ? end : start;
      if (other.kind === 'complete' && !this.endpointIsUnavailable(other.value)) {
        const candidate =
          changedBoundary === 'start'
            ? { start: '', end: other.value }
            : { start: other.value, end: '' };
        this.commitValue(candidate, false);
      }
    }
  }

  private commitValue(value: LocalizedDateTimeRange, preserveDrafts: boolean): void {
    const committed = normalizedRange(value);
    if (rangesEqual(committed, this.lastCommittedValue)) return;
    this.manualDraftActive.set(preserveDrafts);
    if (this.value() === undefined) {
      this.lastCommittedValue = committed;
      this.formValue.set(committed);
    }
    this.valueChange.emit(committed);
    this.onFormChange?.(committed);
    if (this.value() !== undefined && !preserveDrafts) this.restoreControlledDisplay();
  }

  private parseDisplayEndpoint(boundary: 'start' | 'end'): DraftEndpoint {
    const rawDate =
      boundary === 'start' ? this.displayStartDate().trim() : this.displayEndDate().trim();
    const rawTime =
      boundary === 'start' ? this.displayStartTime().trim() : this.displayEndTime().trim();
    if (rawDate === '' && rawTime === '') return { kind: 'empty', value: '' };
    const date = parseDateForLocale(rawDate, this.dateLocale());
    if (date === null || date === '' || parseTime(rawTime) === null) {
      return { kind: 'invalid', value: '' };
    }
    return { kind: 'complete', value: `${date}T${rawTime}` };
  }

  private displayInvalidity(): RangeInvalidity {
    const start = this.parseDisplayEndpoint('start');
    const end = this.parseDisplayEndpoint('end');
    if (start.kind === 'empty' && end.kind === 'empty') return this.required() ? 'required' : null;
    if (start.kind === 'invalid' || end.kind === 'invalid') return 'invalid';
    return this.rangeInvalidity({ start: start.value, end: end.value });
  }

  private rangeInvalidity(value: LocalizedDateTimeRange): RangeInvalidity {
    const range = normalizedRange(value);
    if (range.start === '' && range.end === '') return this.required() ? 'required' : null;
    const start = parseDateTime(range.start);
    const end = parseDateTime(range.end);
    if (start === null || end === null) return 'invalid';
    if (!isDateTimeRangeOrdered(range.start, range.end)) return 'invalid';
    if (this.endpointIsUnavailable(range.start) || this.endpointIsUnavailable(range.end)) {
      return 'unavailable';
    }
    return intervalCrossesDisabledDate(start.date, end.date, this.disabledDates())
      ? 'unavailable'
      : null;
  }

  private endpointIsUnavailable(value: string): boolean {
    const parsed = parseDateTime(value);
    if (parsed === null) return false;
    if (isDateDisabled(parsed.date, this.disabledDates())) return true;
    const minimum = parseDateTime(this.min() ?? '');
    const maximum = parseDateTime(this.max() ?? '');
    return (
      (minimum !== null && value < `${minimum.date}T${minimum.time}`) ||
      (maximum !== null && value > `${maximum.date}T${maximum.time}`)
    );
  }

  private displayDateRange(): CalendarDateRange {
    return { start: this.displayDate('start'), end: this.displayDate('end') };
  }

  private displayDate(boundary: 'start' | 'end'): string {
    const raw = boundary === 'start' ? this.displayStartDate() : this.displayEndDate();
    return parseDateForLocale(raw, this.dateLocale()) ?? '';
  }

  private boundaryTime(boundary: 'start' | 'end', constraint: 'min' | 'max'): string | undefined {
    const parsedConstraint = parseDateTime(
      constraint === 'min' ? (this.min() ?? '') : (this.max() ?? ''),
    );
    if (parsedConstraint === null || parsedConstraint.date !== this.displayDate(boundary)) {
      return undefined;
    }
    return parsedConstraint.time;
  }

  private fieldValidityMessages(): FieldValidityMessages {
    const empty: FieldValidityMessages = {
      startDate: '',
      startTime: '',
      endDate: '',
      endTime: '',
    };
    const invalidity = this.internalInvalidity();
    if (invalidity === null) return empty;
    if (invalidity === 'required') {
      return {
        startDate: this.labels().requiredDate,
        startTime: this.labels().requiredTime,
        endDate: this.labels().requiredDate,
        endTime: this.labels().requiredTime,
      };
    }
    const start = this.endpointFieldMessages('start');
    const end = this.endpointFieldMessages('end');
    if (start.date !== '' || start.time !== '' || end.date !== '' || end.time !== '') {
      return {
        startDate: start.date,
        startTime: start.time,
        endDate: end.date,
        endTime: end.time,
      };
    }
    return {
      startDate: this.labels().invalidRange,
      startTime: this.labels().invalidRange,
      endDate: this.labels().invalidRange,
      endTime: this.labels().invalidRange,
    };
  }

  private endpointFieldMessages(boundary: 'start' | 'end'): { date: string; time: string } {
    const rawDate =
      boundary === 'start' ? this.displayStartDate().trim() : this.displayEndDate().trim();
    const rawTime =
      boundary === 'start' ? this.displayStartTime().trim() : this.displayEndTime().trim();
    if (rawDate === '' && rawTime === '') {
      return { date: this.labels().requiredDate, time: this.labels().requiredTime };
    }
    const date = parseDateForLocale(rawDate, this.dateLocale());
    if (date === null || date === '') {
      return {
        date: date === '' ? this.labels().requiredDate : this.labels().invalidDate,
        time: '',
      };
    }
    if (isDateDisabled(date, this.disabledDates()) || this.dateOutsideBounds(date)) {
      return { date: this.labels().invalidDate, time: '' };
    }
    if (rawTime === '' || parseTime(rawTime) === null) {
      return {
        date: '',
        time: rawTime === '' ? this.labels().requiredTime : this.labels().invalidTime,
      };
    }
    return this.endpointIsUnavailable(`${date}T${rawTime}`)
      ? { date: '', time: this.labels().invalidTime }
      : { date: '', time: '' };
  }

  private dateOutsideBounds(date: string): boolean {
    const minimumDate = this.minimumDate();
    const maximumDate = this.maximumDate();
    return (
      (minimumDate !== undefined && date < minimumDate) ||
      (maximumDate !== undefined && date > maximumDate)
    );
  }

  private syncDisplay(value: LocalizedDateTimeRange): void {
    const start = parseDateTime(value.start);
    const end = parseDateTime(value.end);
    this.displayStartDate.set(
      start === null ? value.start : formatDateForLocale(start.date, this.dateLocale()),
    );
    this.displayStartTime.set(start?.time ?? '');
    this.displayEndDate.set(
      end === null ? value.end : formatDateForLocale(end.date, this.dateLocale()),
    );
    this.displayEndTime.set(end?.time ?? '');
  }

  private restoreControlledDisplay(): void {
    this.syncDisplay(this.currentValue());
    this.manualDraftActive.set(false);
    if (!this.isBrowser) return;
    const startDate = this.startDateElement()?.nativeElement;
    const startTime = this.startTimeElement()?.nativeElement;
    const endDate = this.endDateElement()?.nativeElement;
    const endTime = this.endTimeElement()?.nativeElement;
    if (startDate !== undefined) startDate.value = this.displayStartDate();
    if (startTime !== undefined) startTime.value = this.displayStartTime();
    if (endDate !== undefined) endDate.value = this.displayEndDate();
    if (endTime !== undefined) endTime.value = this.displayEndTime();
  }

  private toggleAriaLabel(displayDate: string): string {
    const iso = parseDateForLocale(displayDate, this.dateLocale());
    const parsed = iso === null ? null : parseIsoDate(iso);
    return parsed === null
      ? this.labels().openCalendar
      : `${this.labels().changeCalendar}, ${formatLongDate(parsed, this.dateLocale())}`;
  }

  private focusFirstMissingTime(): void {
    if (!this.isBrowser) return;
    if (parseTime(this.displayStartTime()) === null) this.startTimeElement()?.nativeElement.focus();
    else if (parseTime(this.displayEndTime()) === null)
      this.endTimeElement()?.nativeElement.focus();
  }

  private markTouched(): void {
    this.onFormTouched?.();
  }
}

function isLocalizedDateTimeRange(value: unknown): value is LocalizedDateTimeRange {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as LocalizedDateTimeRange).start === 'string' &&
    typeof (value as LocalizedDateTimeRange).end === 'string'
  );
}

function normalizedRange(value: LocalizedDateTimeRange): LocalizedDateTimeRange {
  return { start: value.start, end: value.end };
}

function rangesEqual(left: LocalizedDateTimeRange, right: LocalizedDateTimeRange): boolean {
  return left.start === right.start && left.end === right.end;
}

function validationError(invalidity: Exclude<RangeInvalidity, null>): ValidationErrors {
  if (invalidity === 'required') return { required: true };
  return invalidity === 'unavailable'
    ? { dateTimeRangeUnavailable: true }
    : { dateTimeRangeInvalid: true };
}

function readInputValue(event: Event): string {
  return (event.target as HTMLInputElement).value;
}
