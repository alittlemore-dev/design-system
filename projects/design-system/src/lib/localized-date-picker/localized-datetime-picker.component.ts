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
import { CalendarDialogComponent } from './calendar-dialog.component';
import {
  composeDateTime,
  formatDateForLocale,
  formatLongDate,
  isDateDisabled,
  parseDateForLocale,
  parseDateTime,
  parseIsoDate,
  parseTime,
} from './localized-date-picker.utils';
import {
  LocalizedDatePickerControlSize,
  LocalizedDatePickerLabels,
} from './localized-date-picker.component';

export interface LocalizedDateTimePickerLabels extends LocalizedDatePickerLabels {
  readonly groupLabel: string;
  readonly dateInput: string;
  readonly timeInput: string;
  readonly timeFormatHint: string;
  readonly invalidTime: string;
  readonly requiredTime: string;
}

type DateTimeInvalidity = 'required' | 'invalid' | 'unavailable' | null;

let nextCalendarId = 0;

@Component({
  selector: 'ds-localized-datetime-picker',
  standalone: true,
  imports: [CalendarDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './localized-datetime-picker.component.html',
  styleUrl: './localized-datetime-picker.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => LocalizedDateTimePickerComponent),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => LocalizedDateTimePickerComponent),
      multi: true,
    },
  ],
})
export class LocalizedDateTimePickerComponent
  implements ControlValueAccessor, OnChanges, Validator
{
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly dateInputElement = viewChild<ElementRef<HTMLInputElement>>('dateInput');
  private readonly timeInputElement = viewChild<ElementRef<HTMLInputElement>>('timeInput');
  private readonly calendarToggleElement =
    viewChild.required<ElementRef<HTMLButtonElement>>('calendarToggle');
  private readonly calendarDialog = viewChild.required<CalendarDialogComponent>('calendarDialog');

  readonly inputId = input.required<string>();
  readonly value = input<string>();
  readonly controlSize = input.required<LocalizedDatePickerControlSize>();
  readonly dateLocale = input.required<string>();
  readonly labels = input.required<LocalizedDateTimePickerLabels>();
  readonly required = input.required<boolean>();
  readonly invalid = input.required<boolean>();
  readonly controlDisabled = input.required<boolean>();
  readonly readonly = input.required<boolean>();
  readonly min = input<string>();
  readonly max = input<string>();
  readonly disabledDates = input<readonly string[]>();

  readonly valueChange = output<string>();
  readonly validityChange = output<boolean>();

  /** @internal */
  protected readonly displayDate = signal('');

  /** @internal */
  protected readonly displayTime = signal('');

  /** @internal */
  protected readonly formValue = signal('');

  /** @internal */
  protected readonly formDisabled = signal(false);

  /** @internal */
  protected readonly manualDraftActive = signal(false);

  /** @internal */
  protected readonly calendarOpen = signal(false);

  /** @internal */
  protected readonly calendarId = `localizedDateTimePicker${nextCalendarId++}`;

  /** @internal */
  protected readonly dateHintId = `${this.calendarId}DateHint`;

  /** @internal */
  protected readonly timeHintId = `${this.calendarId}TimeHint`;

  /** @internal */
  protected readonly currentValue = computed(() => this.value() ?? this.formValue());

  /** @internal */
  protected readonly effectiveDisabled = computed(
    () => this.controlDisabled() || this.formDisabled(),
  );

  /** @internal */
  protected readonly currentInvalidity = computed(() =>
    this.dateTimeInvalidity(this.currentValue()),
  );

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
  protected readonly errorId = `${this.calendarId}Error`;

  /** @internal */
  protected readonly dateDescribedBy = computed(() =>
    this.effectiveInvalid() ? `${this.dateHintId} ${this.errorId}` : this.dateHintId,
  );

  /** @internal */
  protected readonly timeDescribedBy = computed(() =>
    this.effectiveInvalid() ? `${this.timeHintId} ${this.errorId}` : this.timeHintId,
  );

  /** @internal */
  protected readonly validationMessage = computed(() => {
    const invalidity = this.internalInvalidity();
    if (!this.effectiveInvalid()) return '';
    if (invalidity === 'required') return this.labels().requiredDate;
    const missingField = this.missingDraftField();
    if (missingField === 'date') return this.labels().requiredDate;
    if (missingField === 'time') return this.labels().requiredTime;
    if (this.dateDraftIsInvalid()) return this.labels().invalidDate;
    return this.labels().invalidTime;
  });

  /** @internal */
  protected readonly canClear = computed(
    () =>
      !this.required() &&
      !this.effectiveDisabled() &&
      !this.readonly() &&
      (this.displayDate().trim() !== '' || this.displayTime().trim() !== ''),
  );

  /** @internal */
  protected readonly selectedDate = computed(() => {
    const draft = parseDateForLocale(this.displayDate(), this.dateLocale());
    if (draft !== null && draft !== '') return draft;
    return parseDateTime(this.currentValue())?.date ?? '';
  });

  /** @internal */
  protected readonly minimumDate = computed(() => parseDateTime(this.min() ?? '')?.date);

  /** @internal */
  protected readonly maximumDate = computed(() => parseDateTime(this.max() ?? '')?.date);

  /** @internal */
  protected readonly minimumTime = computed(() => {
    const minimum = parseDateTime(this.min() ?? '');
    return minimum?.date === this.selectedDate() ? minimum.time : undefined;
  });

  /** @internal */
  protected readonly maximumTime = computed(() => {
    const maximum = parseDateTime(this.max() ?? '');
    return maximum?.date === this.selectedDate() ? maximum.time : undefined;
  });

  /** @internal */
  protected readonly toggleAriaLabel = computed(() => {
    const parsed = parseIsoDate(this.selectedDate());
    return parsed === null
      ? this.labels().openCalendar
      : `${this.labels().changeCalendar}, ${formatLongDate(parsed, this.dateLocale())}`;
  });

  private onFormChange: ((value: string) => void) | null = null;
  private onFormTouched: (() => void) | null = null;
  private onValidatorChange: (() => void) | null = null;
  private lastCommittedValue = '';
  private lastEmittedValidity: boolean | undefined;

  private readonly valueSyncEffect = effect(() => {
    const value = this.currentValue();
    const parsed = parseDateTime(value);
    this.displayDate.set(
      parsed === null ? value : formatDateForLocale(parsed.date, this.dateLocale()),
    );
    this.displayTime.set(parsed?.time ?? '');
    this.lastCommittedValue = value;
    this.manualDraftActive.set(false);
    untracked(() => this.onValidatorChange?.());
  });

  private readonly nativeValiditySyncEffect = effect(() => {
    if (!this.isBrowser) return;
    const invalidity = this.internalInvalidity();
    const missingField = this.missingDraftField();
    const dateMessage =
      invalidity === null
        ? ''
        : invalidity === 'required'
          ? this.labels().requiredDate
          : missingField === 'date'
            ? this.labels().requiredDate
            : missingField === 'time'
              ? ''
              : this.dateDraftIsInvalid()
                ? this.labels().invalidDate
                : '';
    const timeMessage =
      invalidity === null
        ? ''
        : invalidity === 'required'
          ? this.labels().requiredTime
          : missingField === 'time'
            ? this.labels().requiredTime
            : missingField === 'date'
              ? ''
              : this.dateDraftIsInvalid()
                ? ''
                : this.labels().invalidTime;
    this.dateInputElement()?.nativeElement.setCustomValidity(dateMessage);
    this.timeInputElement()?.nativeElement.setCustomValidity(timeMessage);
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
    this.formValue.set(typeof value === 'string' ? value : '');
  }

  ngOnChanges(): void {
    this.onValidatorChange?.();
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onFormChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onFormTouched = fn;
  }

  validate(control: AbstractControl<unknown>): ValidationErrors | null {
    const invalidity =
      (this.manualDraftActive() ? this.draftInvalidity() : null) ??
      this.dateTimeInvalidity(typeof control.value === 'string' ? control.value : '');
    if (invalidity === null) return null;
    if (invalidity === 'required') return { required: true };
    return invalidity === 'unavailable' ? { dateTimeUnavailable: true } : { dateTimeInvalid: true };
  }

  registerOnValidatorChange(fn: () => void): void {
    this.onValidatorChange = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.formDisabled.set(disabled);
    if (disabled && this.calendarOpen()) this.closeCalendar();
  }

  /** @internal */
  protected toggleCalendar(): void {
    if (this.calendarOpen()) this.closeCalendar();
    else this.openCalendar();
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
    if (
      this.effectiveDisabled() ||
      this.readonly() ||
      isDateDisabled(iso, this.disabledDates()) ||
      (this.minimumDate() !== undefined && iso < this.minimumDate()!) ||
      (this.maximumDate() !== undefined && iso > this.maximumDate()!)
    ) {
      return;
    }
    this.displayDate.set(formatDateForLocale(iso, this.dateLocale()));
    this.setManualDraftActive(true);
    this.commitDraft();
    const shouldFocusTime = parseTime(this.displayTime()) === null;
    this.closeCalendar();
    if (shouldFocusTime && this.isBrowser) this.timeInputElement()?.nativeElement.focus();
  }

  /** @internal */
  protected clearDateTime(): void {
    if (this.effectiveDisabled() || this.readonly() || !this.canClear()) return;
    this.displayDate.set('');
    this.displayTime.set('');
    this.setManualDraftActive(false);
    this.commitValue('');
    this.restoreControlledDisplay();
    this.closeCalendar();
  }

  /** @internal */
  protected onDateInput(event: Event): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    this.displayDate.set(readInputValue(event));
    this.setManualDraftActive(true);
    this.commitDraft();
  }

  /** @internal */
  protected onTimeInput(event: Event): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    this.displayTime.set(readInputValue(event));
    this.setManualDraftActive(true);
    this.commitDraft();
  }

  /** @internal */
  protected onInputBlur(): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    const date = parseDateForLocale(this.displayDate(), this.dateLocale());
    if (date !== null && this.value() === undefined) {
      this.displayDate.set(formatDateForLocale(date, this.dateLocale()));
    }
    this.markTouched();
  }

  private openCalendar(): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    const opened = this.calendarDialog().open(
      this.calendarToggleElement().nativeElement,
      this.selectedDate(),
    );
    if (!opened) return;
    this.calendarOpen.set(true);
    this.changeDetectorRef.detectChanges();
  }

  private commitDraft(): void {
    if (this.displayDate().trim() === '' && this.displayTime().trim() === '') {
      this.commitValue('');
      this.setManualDraftActive(false);
      this.restoreControlledDisplay();
      return;
    }
    const date = parseDateForLocale(this.displayDate(), this.dateLocale());
    const value = date === null ? null : composeDateTime(date, this.displayTime());
    if (value === null) return;
    if (this.dateTimeInvalidity(value) !== null) return;
    if (value !== this.lastCommittedValue) this.commitValue(value);
    this.setManualDraftActive(false);
    this.restoreControlledDisplay();
  }

  private displayInvalidity(): DateTimeInvalidity {
    const rawDate = this.displayDate().trim();
    const rawTime = this.displayTime().trim();
    if (rawDate === '' && rawTime === '') return this.required() ? 'required' : null;
    const date = parseDateForLocale(rawDate, this.dateLocale());
    if (date === null || date === '' || parseTime(rawTime) === null) return 'invalid';
    return this.dateTimeInvalidity(`${date}T${rawTime}`);
  }

  private dateTimeInvalidity(value: string): DateTimeInvalidity {
    if (value.trim() === '') return this.required() ? 'required' : null;
    const parsed = parseDateTime(value);
    if (parsed === null) return 'invalid';
    if (isDateDisabled(parsed.date, this.disabledDates())) return 'unavailable';
    const min = parseDateTime(this.min() ?? '');
    const max = parseDateTime(this.max() ?? '');
    if (
      (min !== null && value < `${min.date}T${min.time}`) ||
      (max !== null && value > `${max.date}T${max.time}`)
    ) {
      return 'unavailable';
    }
    return null;
  }

  private dateDraftIsInvalid(): boolean {
    if (this.manualDraftActive()) {
      const date = parseDateForLocale(this.displayDate(), this.dateLocale());
      return (
        date === null ||
        (date === '' && this.displayTime().trim() !== '') ||
        (date !== '' &&
          (isDateDisabled(date, this.disabledDates()) || this.dateIsOutsideBounds(date)))
      );
    }
    const value = this.currentValue();
    if (value === '') return false;
    const [date] = value.split('T');
    return (
      parseIsoDate(date) === null ||
      isDateDisabled(date, this.disabledDates()) ||
      this.dateIsOutsideBounds(date)
    );
  }

  private missingDraftField(): 'date' | 'time' | null {
    if (!this.manualDraftActive()) return null;
    const rawDate = this.displayDate().trim();
    const rawTime = this.displayTime().trim();
    if (rawDate === '' && rawTime !== '') return 'date';
    const date = parseDateForLocale(rawDate, this.dateLocale());
    if (
      rawTime === '' &&
      date !== null &&
      date !== '' &&
      !isDateDisabled(date, this.disabledDates()) &&
      !this.dateIsOutsideBounds(date)
    ) {
      return 'time';
    }
    return null;
  }

  private dateIsOutsideBounds(date: string): boolean {
    const minimumDate = parseDateTime(this.min() ?? '')?.date;
    const maximumDate = parseDateTime(this.max() ?? '')?.date;
    return (
      (minimumDate !== undefined && date < minimumDate) ||
      (maximumDate !== undefined && date > maximumDate)
    );
  }

  private commitValue(value: string): void {
    if (this.value() === undefined) {
      this.formValue.set(value);
      this.lastCommittedValue = value;
    }
    this.valueChange.emit(value);
    this.onFormChange?.(value);
  }

  private restoreControlledDisplay(): void {
    const value = this.value();
    if (value === undefined) return;
    const parsed = parseDateTime(value);
    const date = parsed === null ? value : formatDateForLocale(parsed.date, this.dateLocale());
    const time = parsed?.time ?? '';
    this.displayDate.set(date);
    this.displayTime.set(time);
    this.manualDraftActive.set(false);
    this.lastCommittedValue = value;
    if (!this.isBrowser) return;
    const dateInput = this.dateInputElement()?.nativeElement;
    const timeInput = this.timeInputElement()?.nativeElement;
    if (dateInput !== undefined) dateInput.value = date;
    if (timeInput !== undefined) timeInput.value = time;
  }

  private markTouched(): void {
    this.onFormTouched?.();
  }

  private setManualDraftActive(active: boolean): void {
    if (active === this.manualDraftActive()) return;
    this.manualDraftActive.set(active);
    this.onValidatorChange?.();
  }
}

function readInputValue(event: Event): string {
  return (event.target as HTMLInputElement).value;
}
