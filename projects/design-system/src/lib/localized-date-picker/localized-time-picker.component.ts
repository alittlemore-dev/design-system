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
import { isTimeWithinBounds, parseTime } from './localized-date-picker.utils';
import {
  type LocalizedDatePickerControlSize,
  type LocalizedTimePickerMode,
} from './localized-temporal-picker.types';
import {
  TemporalPickerFieldComponent,
  type TemporalFieldEndpointEvent,
} from './temporal-picker-field.component';

export interface LocalizedTimePickerLabels {
  readonly placeholder: string;
  readonly openTimePicker: string;
  readonly changeTime: string;
  readonly dialog: string;
  readonly timeInput: string;
  readonly hour: string;
  readonly minute: string;
  readonly formatHint: string;
  readonly invalidTime: string;
  readonly unavailableTime: string;
  readonly requiredTime: string;
  readonly clear: string;
  readonly cancel: string;
  readonly done: string;
  readonly now: string;
  readonly keyboardHelp: string;
}

type TimeInvalidity = 'invalid' | 'unavailable' | null;

let nextTimePickerId = 0;

@Component({
  selector: 'ds-localized-time-picker',
  standalone: true,
  imports: [CalendarDialogComponent, TemporalPickerFieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './localized-time-picker.component.html',
  styleUrl: './localized-time-picker.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => LocalizedTimePickerComponent),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => LocalizedTimePickerComponent),
      multi: true,
    },
  ],
})
export class LocalizedTimePickerComponent implements ControlValueAccessor, OnChanges, Validator {
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly hostElement = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly calendarDialog = viewChild.required<CalendarDialogComponent>('calendarDialog');

  readonly inputId = input.required<string>();
  readonly value = input<string | null>();
  readonly controlSize = input.required<LocalizedDatePickerControlSize>();
  readonly labels = input.required<LocalizedTimePickerLabels>();
  readonly required = input(false);
  readonly invalid = input.required<boolean>();
  readonly controlDisabled = input.required<boolean>();
  readonly readonly = input.required<boolean>();
  readonly min = input<string>();
  readonly max = input<string>();
  readonly timePickerMode = input<LocalizedTimePickerMode>('auto');

  readonly valueChange = output<string | null>();
  readonly validityChange = output<boolean>();

  /** @internal */
  protected readonly calendarOpen = signal(false);

  /** @internal */
  protected readonly manualText = signal('');

  /** @internal */
  protected readonly manualInvalidity = signal<TimeInvalidity>(null);

  /** @internal */
  protected readonly formValue = signal<unknown>(null);

  /** @internal */
  protected readonly dialogDraft = signal<TemporalRangeDraft>(emptyTimeDraft());

  /** @internal */
  protected readonly formDisabled = signal(false);

  /** @internal */
  protected readonly calendarId = `localizedTimePicker${nextTimePickerId++}`;

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
    return typeof value === 'string' && parseTime(value) !== null ? value : null;
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
  protected readonly internalValueInvalid = computed(
    () =>
      this.manualInvalidity() !== null ||
      this.committedInvalidity() !== null ||
      (this.required() && this.currentValue() === null),
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
    const invalidity = this.manualInvalidity() ?? this.committedInvalidity();
    if (invalidity !== null) {
      return invalidity === 'unavailable'
        ? this.labels().unavailableTime
        : this.labels().invalidTime;
    }
    return this.labels().requiredTime;
  });

  /** @internal */
  protected readonly triggerLabel = computed(() =>
    this.currentValue() === null || parseTime(this.currentValue() ?? '') === null
      ? this.labels().openTimePicker
      : `${this.labels().changeTime}, ${this.currentValue()}`,
  );

  /** @internal */
  protected readonly canClear = computed(
    () =>
      !this.required() &&
      !this.effectiveDisabled() &&
      !this.readonly() &&
      (this.dialogDraft().start.time !== null || this.dialogDraft().start.sourceInvalid === true),
  );

  /** @internal */
  protected readonly canConfirmDialog = computed(() => {
    const time = this.dialogDraft().start.time;
    if (this.dialogDraft().start.sourceInvalid === true) return false;
    return time === null ? !this.required() : this.timeInvalidity(time) === null;
  });

  /** @internal */
  protected readonly dialogLabels = computed<CalendarDialogLabels>(() => ({
    dialog: this.labels().dialog,
    previousMonth: '',
    nextMonth: '',
    openMonthYearPicker: '',
    previousYear: '',
    nextYear: '',
    clear: this.labels().clear,
    cancel: this.labels().cancel,
    done: this.labels().done,
    today: '',
    now: this.labels().now,
    timeInput: this.labels().timeInput,
    hour: this.labels().hour,
    minute: this.labels().minute,
    keyboardHelp: this.labels().keyboardHelp,
    announceRangePreview: () => '',
  }));

  private onFormChange: ((value: string | null) => void) | null = null;
  private onFormTouched: (() => void) | null = null;
  private onValidatorChange: (() => void) | null = null;
  private manualDirty = false;
  private lastEmittedValidity: boolean | undefined;

  private readonly valueSyncEffect = effect(() => {
    const value = this.currentValue();
    untracked(() => {
      this.manualText.set(value ?? '');
      this.manualInvalidity.set(null);
      this.manualDirty = false;
    });
  });

  private readonly nativeValiditySyncEffect = afterRenderEffect(() => {
    if (!this.isBrowser) return;
    const input = this.hostElement.nativeElement.querySelector<HTMLInputElement>(
      'ds-temporal-picker-field input',
    );
    input?.setCustomValidity(this.internalValueInvalid() ? this.validationMessage() : '');
  });

  private readonly validatorInputsEffect = effect(() => {
    this.required();
    this.min();
    this.max();
    this.currentValue();
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
    if (this.manualInvalidity() === 'invalid') return { timeInvalid: true };
    if (this.manualInvalidity() === 'unavailable') return { timeUnavailable: true };
    const value = control.value;
    if (value === null || value === undefined) return this.required() ? { required: true } : null;
    if (typeof value !== 'string' || value === '' || parseTime(value) === null) {
      return { timeInvalid: true };
    }
    return this.timeInvalidity(value) === 'unavailable' ? { timeUnavailable: true } : null;
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
    this.dialogDraft.set(emptyTimeDraft());
  }

  /** @internal */
  protected cancelDialog(): void {
    if (!this.calendarOpen()) return;
    this.dialogDraft.set(timeDraft(this.currentValue(), this.committedInvalidity() === 'invalid'));
    this.calendarOpen.set(false);
    this.markTouched();
  }

  /** @internal */
  protected confirmDialog(): void {
    if (!this.calendarOpen() || !this.canConfirmDialog()) return;
    this.commitValue(this.dialogDraft().start.time);
    this.syncManualTextToCommitted();
    this.calendarOpen.set(false);
    this.markTouched();
  }

  /** @internal */
  protected onTextInput(event: TemporalFieldEndpointEvent): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    this.manualText.set(event.text);
    this.manualDirty = true;
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
    this.dialogDraft.set(timeDraft(this.currentValue(), this.committedInvalidity() === 'invalid'));
    const opened = this.calendarDialog().open(trigger);
    if (!opened) return;
    this.calendarOpen.set(true);
    this.changeDetectorRef.detectChanges();
  }

  private completeManualInteraction(): void {
    const text = this.manualText();
    const invalidity = this.textInvalidity(text);
    this.setManualInvalidity(invalidity);
    if (invalidity === null) {
      const value = text.trim() === '' ? null : text;
      if (this.manualDirty) this.commitValue(value);
      this.syncManualTextToCommitted();
    }
    this.markTouched();
  }

  private commitValue(value: string | null): void {
    if (this.value() === undefined) this.formValue.set(value);
    this.manualDirty = false;
    this.valueChange.emit(value);
    this.onFormChange?.(value);
  }

  private syncManualTextToCommitted(): void {
    this.manualText.set(this.currentValue() ?? '');
    this.setManualInvalidity(null);
    this.manualDirty = false;
  }

  private rollbackAndCloseCalendar(): void {
    this.dialogDraft.set(timeDraft(this.currentValue()));
    this.calendarOpen.set(false);
    this.calendarDialog().close();
    this.markTouched();
  }

  private markTouched(): void {
    this.onFormTouched?.();
  }

  private textInvalidity(text: string): TimeInvalidity {
    if (text.trim() === '') return null;
    return this.timeInvalidity(text);
  }

  private valueInvalidity(value: unknown): TimeInvalidity {
    if (value === null) return null;
    if (typeof value !== 'string') return 'invalid';
    return this.timeInvalidity(value);
  }

  private timeInvalidity(value: string): TimeInvalidity {
    if (parseTime(value) === null) return 'invalid';
    return isTimeWithinBounds(value, this.min(), this.max()) ? null : 'unavailable';
  }

  private setManualInvalidity(invalidity: TimeInvalidity): void {
    if (invalidity === this.manualInvalidity()) return;
    this.manualInvalidity.set(invalidity);
    this.onValidatorChange?.();
  }
}

function emptyTimeDraft(): TemporalRangeDraft {
  return {
    start: { date: null, time: null },
    end: { date: null, time: null },
  };
}

function timeDraft(value: string | null, sourceInvalid = false): TemporalRangeDraft {
  return {
    start: {
      date: null,
      time: value !== null && parseTime(value) !== null ? value : null,
      ...(sourceInvalid ? { sourceInvalid: true } : {}),
    },
    end: { date: null, time: null },
  };
}
