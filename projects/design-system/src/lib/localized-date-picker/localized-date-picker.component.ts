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
  formatDateForLocale,
  formatLongDate,
  isDateUnavailable as dateIsUnavailable,
  parseDateForLocale,
  parseIsoDate,
} from './localized-date-picker.utils';

export interface LocalizedDatePickerLabels {
  readonly placeholder: string;
  readonly openCalendar: string;
  readonly changeCalendar: string;
  readonly dialog: string;
  readonly previousMonth: string;
  readonly nextMonth: string;
  readonly openMonthYearPicker: string;
  readonly previousYear: string;
  readonly nextYear: string;
  readonly clear: string;
  readonly close: string;
  readonly formatHint: string;
  readonly invalidDate: string;
  readonly requiredDate: string;
  readonly keyboardHelp: string;
}

export type LocalizedDatePickerControlSize = 'default' | 'small';

let nextCalendarId = 0;

@Component({
  selector: 'ds-localized-date-picker',
  standalone: true,
  imports: [CalendarDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './localized-date-picker.component.html',
  styleUrl: './localized-date-picker.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => LocalizedDatePickerComponent),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => LocalizedDatePickerComponent),
      multi: true,
    },
  ],
})
export class LocalizedDatePickerComponent implements ControlValueAccessor, OnChanges, Validator {
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly textInputElement = viewChild<ElementRef<HTMLInputElement>>('textInput');
  private readonly calendarToggleElement =
    viewChild.required<ElementRef<HTMLButtonElement>>('calendarToggle');
  private readonly calendarDialog = viewChild.required<CalendarDialogComponent>('calendarDialog');

  readonly inputId = input.required<string>();
  readonly value = input<string>();
  readonly controlSize = input.required<LocalizedDatePickerControlSize>();
  readonly dateLocale = input.required<string>();
  readonly labels = input.required<LocalizedDatePickerLabels>();
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
  protected readonly calendarOpen = signal(false);

  /** @internal */
  protected readonly displayValue = signal('');

  /** @internal */
  protected readonly manualInputInvalid = signal(false);

  /** @internal */
  protected readonly manualValueInvalid = signal(false);

  /** @internal */
  protected readonly formValue = signal('');

  /** @internal */
  protected readonly formDisabled = signal(false);

  /** @internal */
  protected readonly calendarId = `localizedDatePicker${nextCalendarId++}`;

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
  protected readonly internalValueInvalid = computed(() => {
    const value = this.currentValue();
    return (
      this.manualValueInvalid() ||
      (value !== '' && (parseIsoDate(value) === null || this.isDateUnavailable(value)))
    );
  });

  /** @internal */
  protected readonly effectiveInvalid = computed(
    () => this.invalid() || this.manualInputInvalid() || this.internalValueInvalid(),
  );

  /** @internal */
  protected readonly inputDescribedBy = computed(() =>
    this.effectiveInvalid() ? `${this.formatHintId} ${this.errorId}` : this.formatHintId,
  );

  /** @internal */
  protected readonly validationMessage = computed(() => {
    if (!this.effectiveInvalid()) return '';
    if (this.required() && this.displayValue().trim() === '') return this.labels().requiredDate;
    return this.labels().invalidDate;
  });

  /** @internal */
  protected readonly toggleAriaLabel = computed(() => {
    const parsed = parseIsoDate(this.currentValue());
    if (parsed === null) return this.labels().openCalendar;
    return `${this.labels().changeCalendar}, ${formatLongDate(parsed, this.dateLocale())}`;
  });

  /** @internal */
  protected readonly canClear = computed(
    () =>
      !this.required() &&
      !this.effectiveDisabled() &&
      !this.readonly() &&
      this.displayValue().trim() !== '',
  );

  private onFormChange: ((value: string) => void) | null = null;
  private onFormTouched: (() => void) | null = null;
  private onValidatorChange: (() => void) | null = null;
  private lastCommittedValue = '';
  private lastEmittedValidity: boolean | undefined;

  private readonly valueSyncEffect = effect(() => {
    const value = this.currentValue();
    this.displayValue.set(formatDateForLocale(value, this.dateLocale()));
    this.lastCommittedValue = value;
    this.manualInputInvalid.set(false);
    untracked(() => this.setManualValueInvalid(false));
    this.onValidatorChange?.();
  });

  private readonly nativeValiditySyncEffect = effect(() => {
    if (!this.isBrowser) return;
    const input = this.textInputElement()?.nativeElement;
    if (input === undefined) return;
    const invalid = this.internalValueInvalid();
    input.setCustomValidity(invalid ? this.labels().invalidDate : '');
  });

  private readonly validatorInputsEffect = effect(() => {
    this.required();
    this.min();
    this.max();
    this.disabledDates();
    this.currentValue();
    this.internalValueInvalid();
    this.onValidatorChange?.();
  });

  private readonly interactiveStateEffect = effect(() => {
    if ((this.effectiveDisabled() || this.readonly()) && this.calendarOpen()) {
      this.closeCalendar();
    }
  });

  private readonly internalValidityEffect = effect(() => {
    const valid = !this.internalValueInvalid();
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
    const value = typeof control.value === 'string' ? control.value : '';
    if (this.manualValueInvalid()) return { dateInvalid: true };
    if (value !== '' && parseIsoDate(value) === null) return { dateInvalid: true };
    if (value !== '' && this.isDateUnavailable(value)) return { dateUnavailable: true };
    if (this.required() && value.trim() === '') return { required: true };
    return null;
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
  protected openCalendar(): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    const opened = this.calendarDialog().open(
      this.calendarToggleElement().nativeElement,
      this.currentValue(),
    );
    if (!opened) return;
    this.calendarOpen.set(true);
    this.changeDetectorRef.detectChanges();
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
    if (this.effectiveDisabled() || this.readonly() || this.isDateUnavailable(iso)) return;
    this.commitValue(iso);
    if (!this.restoreControlledDisplay()) {
      this.displayValue.set(formatDateForLocale(iso, this.dateLocale()));
    }
    this.manualInputInvalid.set(false);
    this.setManualValueInvalid(false);
    this.closeCalendar();
  }

  /** @internal */
  protected clearDate(): void {
    if (this.effectiveDisabled() || this.readonly() || !this.canClear()) return;
    this.manualInputInvalid.set(false);
    this.setManualValueInvalid(false);
    this.commitValue('');
    if (!this.restoreControlledDisplay()) this.displayValue.set('');
    this.closeCalendar();
  }

  /** @internal */
  protected onTextInput(event: Event): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    const value = readInputValue(event);
    this.displayValue.set(value);
    this.manualInputInvalid.set(false);
    const parsed = parseDateForLocale(value, this.dateLocale());
    const invalid = parsed === null || (parsed !== '' && this.isDateUnavailable(parsed));
    this.setManualValueInvalid(invalid);
    if (!invalid) {
      this.commitValue(parsed);
      this.restoreControlledDisplay();
    }
  }

  /** @internal */
  protected onTextBlur(): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    const parsed = parseDateForLocale(this.displayValue(), this.dateLocale());
    const invalid = parsed === null || (parsed !== '' && this.isDateUnavailable(parsed));
    this.manualInputInvalid.set(invalid);
    this.setManualValueInvalid(invalid);
    if (!invalid && parsed !== null) {
      if (parsed !== this.lastCommittedValue) this.commitValue(parsed);
      this.displayValue.set(formatDateForLocale(parsed, this.dateLocale()));
    }
    this.markTouched();
  }

  /** @internal */
  protected isDateUnavailable(iso: string): boolean {
    return dateIsUnavailable(iso, {
      min: this.min(),
      max: this.max(),
      disabledDates: this.disabledDates(),
    });
  }

  private commitValue(value: string): void {
    if (this.value() === undefined) {
      this.formValue.set(value);
      this.lastCommittedValue = value;
    }
    this.valueChange.emit(value);
    this.onFormChange?.(value);
  }

  private restoreControlledDisplay(): boolean {
    const value = this.value();
    if (value === undefined) return false;
    const renderedValue = formatDateForLocale(value, this.dateLocale());
    this.displayValue.set(renderedValue);
    if (this.isBrowser) {
      const input = this.textInputElement()?.nativeElement;
      if (input !== undefined) input.value = renderedValue;
    }
    this.lastCommittedValue = value;
    return true;
  }

  private markTouched(): void {
    this.onFormTouched?.();
  }

  private setManualValueInvalid(invalid: boolean): void {
    if (invalid === this.manualValueInvalid()) return;
    this.manualValueInvalid.set(invalid);
    this.onValidatorChange?.();
  }
}

function readInputValue(event: Event): string {
  return (event.target as HTMLInputElement).value;
}
