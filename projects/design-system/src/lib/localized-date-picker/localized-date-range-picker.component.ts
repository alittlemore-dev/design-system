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
  compareIsoDates,
  formatDateForLocale,
  formatLongDate,
  intervalCrossesDisabledDate,
  isDateUnavailable,
  parseDateForLocale,
  parseIsoDate,
} from './localized-date-picker.utils';
import {
  LocalizedDatePickerControlSize,
  LocalizedDatePickerLabels,
} from './localized-date-picker.component';

export interface LocalizedDateRange {
  readonly start: string;
  readonly end: string;
}

export interface LocalizedDateRangePickerLabels extends LocalizedDatePickerLabels {
  readonly groupLabel: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly selectStartDate: string;
  readonly selectEndDate: string;
  readonly invalidRange: string;
  readonly requiredRange: string;
}

type RangeInvalidity = 'required' | 'invalid' | 'unavailable' | null;

const EMPTY_RANGE: LocalizedDateRange = { start: '', end: '' };
let nextCalendarId = 0;

@Component({
  selector: 'ds-localized-date-range-picker',
  standalone: true,
  imports: [CalendarDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './localized-date-range-picker.component.html',
  styleUrl: './localized-date-range-picker.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => LocalizedDateRangePickerComponent),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => LocalizedDateRangePickerComponent),
      multi: true,
    },
  ],
})
export class LocalizedDateRangePickerComponent
  implements ControlValueAccessor, OnChanges, Validator
{
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly startInputElement = viewChild<ElementRef<HTMLInputElement>>('startInput');
  private readonly endInputElement = viewChild<ElementRef<HTMLInputElement>>('endInput');
  private readonly calendarDialog = viewChild.required<CalendarDialogComponent>('calendarDialog');

  readonly inputId = input.required<string>();
  readonly value = input<LocalizedDateRange>();
  readonly controlSize = input.required<LocalizedDatePickerControlSize>();
  readonly dateLocale = input.required<string>();
  readonly labels = input.required<LocalizedDateRangePickerLabels>();
  readonly required = input.required<boolean>();
  readonly invalid = input.required<boolean>();
  readonly controlDisabled = input.required<boolean>();
  readonly readonly = input.required<boolean>();
  readonly min = input<string>();
  readonly max = input<string>();
  readonly disabledDates = input<readonly string[]>();

  readonly valueChange = output<LocalizedDateRange>();
  readonly validityChange = output<boolean>();

  /** @internal */
  protected readonly calendarOpen = signal(false);

  /** @internal */
  protected readonly displayStart = signal('');

  /** @internal */
  protected readonly displayEnd = signal('');

  /** @internal */
  protected readonly manualInvalidity = signal<RangeInvalidity>(null);

  /** @internal */
  protected readonly formValue = signal<LocalizedDateRange>(EMPTY_RANGE);

  /** @internal */
  protected readonly formDisabled = signal(false);

  /** @internal */
  protected readonly activeBoundary = signal<CalendarActiveBoundary>('start');

  /** @internal */
  protected readonly calendarRange = signal<LocalizedDateRange>(EMPTY_RANGE);

  /** @internal */
  protected readonly calendarId = `localizedDateRangePicker${nextCalendarId++}`;

  /** @internal */
  protected readonly formatHintId = `${this.calendarId}FormatHint`;

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
  protected readonly internalInvalidity = computed(
    () => this.manualInvalidity() ?? this.currentInvalidity(),
  );

  /** @internal */
  protected readonly effectiveInvalid = computed(
    () => this.invalid() || this.internalInvalidity() !== null,
  );

  /** @internal */
  protected readonly validationMessage = computed(() => {
    if (!this.effectiveInvalid()) return '';
    if (this.internalInvalidity() === 'required') return this.labels().requiredRange;
    return this.labels().invalidRange;
  });

  /** @internal */
  protected readonly inputDescribedBy = computed(() =>
    this.effectiveInvalid() ? `${this.formatHintId} ${this.errorId}` : this.formatHintId,
  );

  /** @internal */
  protected readonly startToggleAriaLabel = computed(() =>
    this.toggleAriaLabel(this.currentValue().start),
  );

  /** @internal */
  protected readonly endToggleAriaLabel = computed(() =>
    this.toggleAriaLabel(this.currentValue().end),
  );

  /** @internal */
  protected readonly activeBoundaryLabel = computed(() =>
    this.activeBoundary() === 'end' ? this.labels().selectEndDate : this.labels().selectStartDate,
  );

  /** @internal */
  protected readonly canClear = computed(
    () =>
      !this.required() &&
      !this.effectiveDisabled() &&
      !this.readonly() &&
      (this.displayStart().trim() !== '' || this.displayEnd().trim() !== ''),
  );

  private onFormChange: ((value: LocalizedDateRange) => void) | null = null;
  private onFormTouched: (() => void) | null = null;
  private onValidatorChange: (() => void) | null = null;
  private lastCommittedValue: LocalizedDateRange = EMPTY_RANGE;
  private lastEmittedValidity: boolean | undefined;

  private readonly valueSyncEffect = effect(() => {
    const value = normalizedRange(this.currentValue());
    this.displayStart.set(formatDateForLocale(value.start, this.dateLocale()));
    this.displayEnd.set(formatDateForLocale(value.end, this.dateLocale()));
    this.lastCommittedValue = value;
    this.manualInvalidity.set(null);
    untracked(() => this.onValidatorChange?.());
  });

  private readonly nativeValiditySyncEffect = effect(() => {
    if (!this.isBrowser) return;
    const message = this.internalInvalidity() === null ? '' : this.validationMessage();
    this.startInputElement()?.nativeElement.setCustomValidity(message);
    this.endInputElement()?.nativeElement.setCustomValidity(message);
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

  private readonly interactiveStateEffect = effect(() => {
    if ((this.effectiveDisabled() || this.readonly()) && this.calendarOpen()) this.closeCalendar();
  });

  private readonly internalValidityEffect = effect(() => {
    const valid = this.internalInvalidity() === null;
    if (valid === this.lastEmittedValidity) return;
    this.lastEmittedValidity = valid;
    this.validityChange.emit(valid);
  });

  writeValue(value: unknown): void {
    this.formValue.set(isLocalizedDateRange(value) ? value : EMPTY_RANGE);
  }

  ngOnChanges(): void {
    this.onValidatorChange?.();
  }

  registerOnChange(fn: (value: LocalizedDateRange) => void): void {
    this.onFormChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onFormTouched = fn;
  }

  validate(control: AbstractControl<unknown>): ValidationErrors | null {
    const invalidity =
      this.manualInvalidity() ??
      this.rangeInvalidity(isLocalizedDateRange(control.value) ? control.value : EMPTY_RANGE);
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
  protected toggleStartCalendar(trigger: HTMLElement): void {
    if (this.calendarOpen()) this.closeCalendar();
    else this.openCalendar('start', trigger);
  }

  /** @internal */
  protected toggleEndCalendar(trigger: HTMLElement): void {
    if (this.calendarOpen()) this.closeCalendar();
    else {
      const boundary: CalendarActiveBoundary = this.currentValue().start === '' ? 'start' : 'end';
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
    if (this.effectiveDisabled() || this.readonly() || this.isDateUnavailableForSelection(iso))
      return;
    if (this.activeBoundary() === 'start') {
      const selection = { start: iso, end: '' };
      this.calendarRange.set(selection);
      this.commitValue(selection);
      this.restoreControlledDisplay();
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
    const selection = start <= iso ? { start, end: iso } : { start: iso, end: start };
    if (this.rangeInvalidity(selection) !== null) return;
    this.calendarRange.set(selection);
    this.commitValue(selection);
    this.restoreControlledDisplay();
    this.closeCalendar();
  }

  /** @internal */
  protected clearRange(): void {
    if (this.effectiveDisabled() || this.readonly() || !this.canClear()) return;
    this.manualInvalidity.set(null);
    this.commitValue(EMPTY_RANGE);
    this.restoreControlledDisplay();
    this.closeCalendar();
  }

  /** @internal */
  protected onTextInput(boundary: 'start' | 'end', event: Event): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    const value = readInputValue(event);
    if (boundary === 'start') this.displayStart.set(value);
    else this.displayEnd.set(value);
    const draft = this.parseDisplayRange();
    const invalidity = this.rangeInvalidity(draft);
    this.manualInvalidity.set(invalidity);
    if (invalidity === null || invalidity === 'required') {
      this.commitValue(draft);
      this.restoreControlledDisplay();
    }
  }

  /** @internal */
  protected onTextBlur(): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    const draft = this.parseDisplayRange();
    const invalidity = this.rangeInvalidity(draft);
    this.manualInvalidity.set(invalidity);
    if (invalidity === null || invalidity === 'required') {
      if (!rangesEqual(draft, this.lastCommittedValue)) this.commitValue(draft);
      if (this.value() === undefined) {
        this.displayStart.set(formatDateForLocale(draft.start, this.dateLocale()));
        this.displayEnd.set(formatDateForLocale(draft.end, this.dateLocale()));
      }
    }
    this.markTouched();
  }

  private openCalendar(boundary: CalendarActiveBoundary, trigger: HTMLElement): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    const current = normalizedRange(this.currentValue());
    this.activeBoundary.set(boundary);
    this.calendarRange.set(boundary === 'start' ? EMPTY_RANGE : current);
    const preferred = boundary === 'end' ? current.end || current.start : current.start;
    const opened = this.calendarDialog().open(trigger, preferred);
    if (!opened) return;
    this.calendarOpen.set(true);
    this.changeDetectorRef.detectChanges();
  }

  private parseDisplayRange(): LocalizedDateRange {
    return {
      start: parseDateForLocale(this.displayStart(), this.dateLocale()) ?? this.displayStart(),
      end: parseDateForLocale(this.displayEnd(), this.dateLocale()) ?? this.displayEnd(),
    };
  }

  private rangeInvalidity(value: LocalizedDateRange): RangeInvalidity {
    const range = normalizedRange(value);
    if (range.start === '' && range.end === '') return this.required() ? 'required' : null;
    if (parseIsoDate(range.start) === null || parseIsoDate(range.end) === null) return 'invalid';
    if (compareIsoDates(range.start, range.end) === 1) return 'invalid';
    if (this.isDateUnavailable(range.start) || this.isDateUnavailable(range.end))
      return 'unavailable';
    return intervalCrossesDisabledDate(range.start, range.end, this.disabledDates())
      ? 'unavailable'
      : null;
  }

  private isDateUnavailable(iso: string): boolean {
    return isDateUnavailable(iso, {
      min: this.min(),
      max: this.max(),
      disabledDates: this.disabledDates(),
    });
  }

  private isDateUnavailableForSelection(iso: string): boolean {
    if (this.isDateUnavailable(iso)) return true;
    const rangeStart = this.calendarRange().start;
    return (
      this.activeBoundary() === 'end' &&
      parseIsoDate(rangeStart) !== null &&
      intervalCrossesDisabledDate(rangeStart, iso, this.disabledDates())
    );
  }

  private toggleAriaLabel(value: string): string {
    const parsed = parseIsoDate(value);
    return parsed === null
      ? this.labels().openCalendar
      : `${this.labels().changeCalendar}, ${formatLongDate(parsed, this.dateLocale())}`;
  }

  private commitValue(value: LocalizedDateRange): void {
    const committed = normalizedRange(value);
    if (this.value() === undefined) {
      this.formValue.set(committed);
      this.lastCommittedValue = committed;
    }
    this.valueChange.emit(committed);
    this.onFormChange?.(committed);
  }

  private restoreControlledDisplay(): void {
    const value = this.value();
    if (value === undefined) return;
    const range = normalizedRange(value);
    this.displayStart.set(formatDateForLocale(range.start, this.dateLocale()));
    this.displayEnd.set(formatDateForLocale(range.end, this.dateLocale()));
    this.lastCommittedValue = range;
    if (!this.isBrowser) return;
    const start = this.startInputElement()?.nativeElement;
    const end = this.endInputElement()?.nativeElement;
    if (start !== undefined) start.value = this.displayStart();
    if (end !== undefined) end.value = this.displayEnd();
  }

  private markTouched(): void {
    this.onFormTouched?.();
  }
}

function isLocalizedDateRange(value: unknown): value is LocalizedDateRange {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as LocalizedDateRange).start === 'string' &&
    typeof (value as LocalizedDateRange).end === 'string'
  );
}

function normalizedRange(value: LocalizedDateRange): LocalizedDateRange {
  return { start: value.start, end: value.end };
}

function rangesEqual(left: LocalizedDateRange, right: LocalizedDateRange): boolean {
  return left.start === right.start && left.end === right.end;
}

function validationError(invalidity: Exclude<RangeInvalidity, null>): ValidationErrors {
  if (invalidity === 'required') return { required: true };
  return invalidity === 'unavailable' ? { dateRangeUnavailable: true } : { dateRangeInvalid: true };
}

function readInputValue(event: Event): string {
  return (event.target as HTMLInputElement).value;
}
