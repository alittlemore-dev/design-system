import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnChanges,
  PLATFORM_ID,
  afterRenderEffect,
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
import {
  CalendarDialogComponent,
  type CalendarDialogLabels,
  type TemporalRangeDraft,
} from './calendar-dialog.component';
import {
  composeDateTime,
  formatDateTimeForLocale,
  isDateDisabled,
  parseDateTime,
  parseDateTimeForLocale,
} from './localized-date-picker.utils';
import {
  type LocalizedDatePickerControlSize,
  type LocalizedTimePickerMode,
} from './localized-temporal-picker.types';
import {
  TemporalPickerFieldComponent,
  type TemporalFieldEndpointEvent,
} from './temporal-picker-field.component';

export interface LocalizedDateTimePickerLabels {
  readonly placeholder: string;
  readonly openPicker: string;
  readonly changeValue: string;
  readonly dialog: string;
  readonly dateTimeInput: string;
  readonly previousMonth: string;
  readonly nextMonth: string;
  readonly openMonthYearPicker: string;
  readonly previousYear: string;
  readonly nextYear: string;
  readonly hour: string;
  readonly minute: string;
  readonly dateFormatHint: string;
  readonly timeFormatHint: string;
  readonly selectDate: string;
  readonly clear: string;
  readonly cancel: string;
  readonly done: string;
  readonly today: string;
  readonly now: string;
  readonly keyboardHelp: string;
  readonly invalidDateTime: string;
  readonly unavailableDateTime: string;
  readonly requiredDateTime: string;
}

type DateTimeInvalidity = 'invalid' | 'unavailable' | null;

let nextDateTimePickerId = 0;

@Component({
  selector: 'ds-localized-datetime-picker',
  standalone: true,
  imports: [CalendarDialogComponent, TemporalPickerFieldComponent],
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
  private readonly hostElement = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly calendarDialog = viewChild.required<CalendarDialogComponent>('calendarDialog');

  readonly inputId = input.required<string>();
  readonly value = input<string | null>();
  readonly controlSize = input.required<LocalizedDatePickerControlSize>();
  readonly dateLocale = input.required<string>();
  readonly labels = input.required<LocalizedDateTimePickerLabels>();
  readonly required = input(false);
  readonly invalid = input.required<boolean>();
  readonly controlDisabled = input.required<boolean>();
  readonly readonly = input.required<boolean>();
  readonly min = input<string>();
  readonly max = input<string>();
  readonly disabledDates = input<readonly string[]>();
  readonly timePickerMode = input<LocalizedTimePickerMode>('auto');

  readonly valueChange = output<string | null>();
  readonly validityChange = output<boolean>();

  /** @internal */
  protected readonly calendarOpen = signal(false);

  /** @internal */
  protected readonly manualText = signal('');

  /** @internal */
  protected readonly manualInvalidity = signal<DateTimeInvalidity>(null);

  /** @internal */
  protected readonly formValue = signal<unknown>(null);

  /** @internal */
  protected readonly dialogDraft = signal<TemporalRangeDraft>(emptyDateTimeDraft());

  /** @internal */
  protected readonly formDisabled = signal(false);

  /** @internal */
  protected readonly calendarId = `localizedDateTimePicker${nextDateTimePickerId++}`;

  /** @internal */
  protected readonly formatHintId = `${this.calendarId}FormatHint`;

  /** @internal */
  protected readonly errorId = `${this.calendarId}Error`;

  /** @internal */
  protected readonly rawCurrentValue = computed<unknown>(() => {
    const boundValue: unknown = this.value();
    return boundValue === undefined ? this.formValue() : boundValue;
  });

  /** @internal */
  protected readonly currentValue = computed<string | null>(() => {
    const value = this.rawCurrentValue();
    return typeof value === 'string' && parseDateTime(value) !== null ? value : null;
  });

  /** @internal */
  protected readonly effectiveDisabled = computed(
    () => this.controlDisabled() || this.formDisabled(),
  );

  /** @internal */
  protected readonly committedInvalidity = computed(() =>
    this.valueInvalidity(this.rawCurrentValue()),
  );

  /** @internal */
  protected readonly manualRequiredMissing = computed(
    () => this.manualDirty() && this.required() && this.manualText().trim() === '',
  );

  /** @internal */
  protected readonly committedRequiredMissing = computed(
    () =>
      this.required() &&
      !this.manualDirty() &&
      (this.rawCurrentValue() === null || this.rawCurrentValue() === undefined),
  );

  /** @internal */
  protected readonly internalValueInvalid = computed(
    () =>
      this.manualRequiredMissing() ||
      this.manualInvalidity() !== null ||
      this.committedRequiredMissing() ||
      this.committedInvalidity() !== null,
  );

  /** @internal */
  protected readonly effectiveInvalid = computed(
    () => this.invalid() || this.internalValueInvalid(),
  );

  /** @internal */
  protected readonly inputDescribedBy = computed(() =>
    this.effectiveInvalid() ? `${this.formatHintId} ${this.errorId}` : this.formatHintId,
  );

  /** @internal */
  protected readonly validationMessage = computed(() => {
    if (!this.effectiveInvalid()) return '';
    if (this.manualRequiredMissing() || this.committedRequiredMissing()) {
      return this.labels().requiredDateTime;
    }
    const invalidity = this.manualInvalidity() ?? this.committedInvalidity();
    return invalidity === 'unavailable'
      ? this.labels().unavailableDateTime
      : this.labels().invalidDateTime;
  });

  /** @internal */
  protected readonly triggerLabel = computed(() => {
    const value = this.currentValue();
    return value === null
      ? this.labels().openPicker
      : `${this.labels().changeValue}, ${formatDateTimeForLocale(value, this.dateLocale())}`;
  });

  /** @internal */
  protected readonly canClear = computed(
    () =>
      !this.required() &&
      !this.effectiveDisabled() &&
      !this.readonly() &&
      (this.dialogDraft().start.date !== null ||
        this.dialogDraft().start.time !== null ||
        this.dialogDraft().start.sourceInvalid === true),
  );

  /** @internal */
  protected readonly canConfirmDialog = computed(() => {
    const { date, time } = this.dialogDraft().start;
    if (this.dialogDraft().start.sourceInvalid === true) return false;
    if (date === null && time === null) return !this.required();
    if (date === null || time === null) return false;
    const value = composeDateTime(date, time);
    return value !== null && !this.isDateTimeUnavailable(value);
  });

  /** @internal */
  protected readonly dialogLabels = computed<CalendarDialogLabels>(() => ({
    dialog: this.labels().dialog,
    previousMonth: this.labels().previousMonth,
    nextMonth: this.labels().nextMonth,
    openMonthYearPicker: this.labels().openMonthYearPicker,
    previousYear: this.labels().previousYear,
    nextYear: this.labels().nextYear,
    clear: this.labels().clear,
    cancel: this.labels().cancel,
    done: this.labels().done,
    today: this.labels().today,
    now: this.labels().now,
    timeInput: this.labels().dateTimeInput,
    hour: this.labels().hour,
    minute: this.labels().minute,
    keyboardHelp: this.labels().keyboardHelp,
    announceRangePreview: () => '',
  }));

  private onFormChange: ((value: string | null) => void) | null = null;
  private onFormTouched: (() => void) | null = null;
  private onValidatorChange: (() => void) | null = null;
  private readonly manualDirty = signal(false);
  private lastEmittedValidity: boolean | undefined;

  private readonly valueSyncEffect = effect(() => {
    const value = this.currentValue();
    const renderedValue = formatDateTimeForLocale(value, this.dateLocale());
    untracked(() => {
      this.manualText.set(renderedValue);
      this.manualInvalidity.set(null);
      this.manualDirty.set(false);
    });
  });

  private readonly nativeValiditySyncEffect = afterRenderEffect(() => {
    if (!this.isBrowser) return;
    const inputElement = this.hostElement.nativeElement.querySelector<HTMLInputElement>(
      'ds-temporal-picker-field input',
    );
    inputElement?.setCustomValidity(this.internalValueInvalid() ? this.validationMessage() : '');
  });

  private readonly validatorInputsEffect = effect(() => {
    this.required();
    this.min();
    this.max();
    this.disabledDates();
    this.rawCurrentValue();
    this.manualDirty();
    this.manualInvalidity();
    this.onValidatorChange?.();
  });

  private readonly interactiveStateEffect = effect(() => {
    if ((this.effectiveDisabled() || this.readonly()) && this.calendarOpen()) {
      this.rollbackAndCloseCalendar();
    }
  });

  private readonly internalValidityEffect = effect(() => {
    const valid = !this.internalValueInvalid();
    if (valid === this.lastEmittedValidity) return;
    this.lastEmittedValidity = valid;
    this.validityChange.emit(valid);
  });

  writeValue(value: unknown): void {
    this.formValue.set(value);
  }

  ngOnChanges(): void {
    this.onValidatorChange?.();
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onFormChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onFormTouched = fn;
  }

  validate(control: AbstractControl<unknown>): ValidationErrors | null {
    if (this.manualDirty()) {
      if (this.manualText().trim() === '') return this.required() ? { required: true } : null;
      if (this.manualInvalidity() === 'invalid') return { dateTimeInvalid: true };
      if (this.manualInvalidity() === 'unavailable') return { dateTimeUnavailable: true };
    }
    const value = control.value;
    if (value === null || value === undefined) return this.required() ? { required: true } : null;
    if (typeof value !== 'string' || value === '' || parseDateTime(value) === null) {
      return { dateTimeInvalid: true };
    }
    return this.isDateTimeUnavailable(value) ? { dateTimeUnavailable: true } : null;
  }

  registerOnValidatorChange(fn: () => void): void {
    this.onValidatorChange = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.formDisabled.set(disabled);
  }

  /** @internal */
  protected toggleCalendar(): void {
    if (this.calendarOpen()) this.rollbackAndCloseCalendar();
    else this.openCalendar();
  }

  /** @internal */
  protected onDialogDraftChange(draft: TemporalRangeDraft): void {
    if (!this.calendarOpen() || this.effectiveDisabled() || this.readonly()) return;
    this.dialogDraft.set(draft);
  }

  /** @internal */
  protected clearDialogDraft(): void {
    if (!this.calendarOpen() || this.effectiveDisabled() || this.readonly() || !this.canClear()) {
      return;
    }
    this.dialogDraft.set(emptyDateTimeDraft());
  }

  /** @internal */
  protected cancelDialog(): void {
    if (!this.calendarOpen()) return;
    this.dialogDraft.set(
      dateTimeDraft(this.currentValue(), this.committedInvalidity() === 'invalid'),
    );
    this.calendarOpen.set(false);
    this.markTouched();
  }

  /** @internal */
  protected confirmDialog(): void {
    if (!this.calendarOpen() || !this.canConfirmDialog()) return;
    const { date, time } = this.dialogDraft().start;
    const value = date === null || time === null ? null : composeDateTime(date, time);
    this.commitValue(value);
    this.syncManualTextToCommitted();
    this.calendarOpen.set(false);
    this.markTouched();
  }

  /** @internal */
  protected onTextInput(event: TemporalFieldEndpointEvent): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    this.manualText.set(event.text);
    this.manualDirty.set(true);
    this.setManualInvalidity(this.textInvalidity(event.text));
  }

  /** @internal */
  protected onTextComplete(event: TemporalFieldEndpointEvent): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    this.manualText.set(event.text);
    this.completeManualInteraction();
  }

  /** @internal */
  protected restoreManualText(): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    this.syncManualTextToCommitted();
    this.markTouched();
  }

  private openCalendar(): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    const trigger = this.hostElement.nativeElement.querySelector<HTMLElement>(
      'button[aria-haspopup="dialog"]',
    );
    if (trigger === null) return;
    const value = this.currentValue();
    const draft = dateTimeDraft(value, this.committedInvalidity() === 'invalid');
    this.dialogDraft.set(draft);
    const opened = this.calendarDialog().open(trigger, draft.start.date ?? '');
    if (!opened) return;
    this.calendarOpen.set(true);
    this.changeDetectorRef.detectChanges();
  }

  private completeManualInteraction(): void {
    const text = this.manualText();
    const invalidity = this.textInvalidity(text);
    this.setManualInvalidity(invalidity);
    if (invalidity === null) {
      const value = text.trim() === '' ? null : parseDateTimeForLocale(text, this.dateLocale());
      if (this.manualDirty()) this.commitValue(value);
      this.syncManualTextToCommitted();
    }
    this.markTouched();
  }

  private commitValue(value: string | null): void {
    if (this.value() === undefined) this.formValue.set(value);
    this.manualDirty.set(false);
    this.valueChange.emit(value);
    this.onFormChange?.(value);
  }

  private syncManualTextToCommitted(): void {
    this.manualText.set(formatDateTimeForLocale(this.currentValue(), this.dateLocale()));
    this.setManualInvalidity(null);
    this.manualDirty.set(false);
  }

  private rollbackAndCloseCalendar(): void {
    this.dialogDraft.set(
      dateTimeDraft(this.currentValue(), this.committedInvalidity() === 'invalid'),
    );
    this.calendarOpen.set(false);
    this.calendarDialog().close();
    this.markTouched();
  }

  private markTouched(): void {
    this.onFormTouched?.();
  }

  private textInvalidity(text: string): DateTimeInvalidity {
    if (text.trim() === '') return null;
    const value = parseDateTimeForLocale(text, this.dateLocale());
    if (value === null) return 'invalid';
    return this.isDateTimeUnavailable(value) ? 'unavailable' : null;
  }

  private valueInvalidity(value: unknown): DateTimeInvalidity {
    if (value === null || value === undefined) return null;
    if (typeof value !== 'string' || parseDateTime(value) === null) return 'invalid';
    return this.isDateTimeUnavailable(value) ? 'unavailable' : null;
  }

  private isDateTimeUnavailable(value: string): boolean {
    const parsed = parseDateTime(value);
    if (parsed === null || isDateDisabled(parsed.date, this.disabledDates())) return true;
    const min = this.validDateTime(this.min());
    const max = this.validDateTime(this.max());
    return (min !== null && value < min) || (max !== null && value > max);
  }

  private validDateTime(value: string | undefined): string | null {
    return value !== undefined && parseDateTime(value) !== null ? value : null;
  }

  private setManualInvalidity(invalidity: DateTimeInvalidity): void {
    if (invalidity === this.manualInvalidity()) return;
    this.manualInvalidity.set(invalidity);
    this.onValidatorChange?.();
  }
}

function emptyDateTimeDraft(): TemporalRangeDraft {
  return {
    start: { date: null, time: null },
    end: { date: null, time: null },
  };
}

function dateTimeDraft(value: string | null, sourceInvalid = false): TemporalRangeDraft {
  const parsed = value === null ? null : parseDateTime(value);
  return {
    start: {
      date: parsed?.date ?? null,
      time: parsed?.time ?? null,
      ...(sourceInvalid ? { sourceInvalid: true } : {}),
    },
    end: { date: null, time: null },
  };
}
