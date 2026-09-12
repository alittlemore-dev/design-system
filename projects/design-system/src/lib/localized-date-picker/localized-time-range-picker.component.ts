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
  inspectRange,
  isNullableTimeRangeOrdered,
  missingRequiredEndpoints,
  parseTime,
  requiredEndpointsForInspection,
  timeRangeAvailability,
} from './localized-date-picker.utils';
import {
  DEFAULT_RANGE_REQUIREMENTS,
  EMPTY_TIME_RANGE,
  type LocalizedDatePickerControlSize,
  type LocalizedRangeRequirements,
  type LocalizedTimePickerMode,
  type LocalizedTimeRange,
  type TemporalBoundary,
} from './localized-temporal-picker.types';
import {
  TemporalPickerFieldComponent,
  type TemporalFieldEndpointEvent,
} from './temporal-picker-field.component';

export interface LocalizedTimeRangePickerLabels {
  readonly placeholder: string;
  readonly openPicker: string;
  readonly changeValue: string;
  readonly dialog: string;
  readonly groupLabel: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly selectStartTime: string;
  readonly selectEndTime: string;
  readonly accessibleRangeSeparator: string;
  readonly hour: string;
  readonly minute: string;
  readonly formatHint: string;
  readonly clear: string;
  readonly cancel: string;
  readonly done: string;
  readonly now: string;
  readonly keyboardHelp: string;
  readonly invalidRange: string;
  readonly unavailableRange: string;
  readonly requiredRange: string;
}

interface TimeRangeErrors extends ValidationErrors {
  required?: { readonly start: boolean; readonly end: boolean };
  timeRangeInvalid?: {
    readonly start?: boolean;
    readonly end?: boolean;
    readonly order?: boolean;
  };
  timeRangeUnavailable?: {
    readonly start?: boolean;
    readonly end?: boolean;
    readonly interval?: boolean;
  };
}

let nextTimeRangePickerId = 0;

@Component({
  selector: 'ds-localized-time-range-picker',
  standalone: true,
  imports: [CalendarDialogComponent, TemporalPickerFieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './localized-time-range-picker.component.html',
  styleUrl: './localized-time-range-picker.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => LocalizedTimeRangePickerComponent),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => LocalizedTimeRangePickerComponent),
      multi: true,
    },
  ],
})
export class LocalizedTimeRangePickerComponent
  implements ControlValueAccessor, OnChanges, Validator
{
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly hostElement = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly calendarDialog = viewChild.required<CalendarDialogComponent>('calendarDialog');

  readonly inputId = input.required<string>();
  readonly value = input<LocalizedTimeRange>();
  readonly controlSize = input.required<LocalizedDatePickerControlSize>();
  readonly labels = input.required<LocalizedTimeRangePickerLabels>();
  readonly requirements = input<LocalizedRangeRequirements>(DEFAULT_RANGE_REQUIREMENTS);
  readonly invalid = input.required<boolean>();
  readonly controlDisabled = input.required<boolean>();
  readonly readonly = input.required<boolean>();
  readonly min = input<string>();
  readonly max = input<string>();
  readonly timePickerMode = input<LocalizedTimePickerMode>('auto');

  readonly valueChange = output<LocalizedTimeRange>();
  readonly validityChange = output<boolean>();

  /** @internal */
  protected readonly calendarOpen = signal(false);
  /** @internal */
  protected readonly startText = signal('');
  /** @internal */
  protected readonly endText = signal('');
  /** @internal */
  protected readonly activeBoundary = signal<'start' | 'end'>('start');
  /** @internal */
  protected readonly dialogDraft = signal<TemporalRangeDraft>(timeRangeDraft(EMPTY_TIME_RANGE));
  /** @internal */
  protected readonly formDisabled = signal(false);
  /** @internal */
  protected readonly calendarId = `localizedTimeRangePicker${nextTimeRangePickerId++}`;
  /** @internal */
  protected readonly formatHintId = `${this.calendarId}FormatHint`;
  /** @internal */
  protected readonly errorId = `${this.calendarId}Error`;

  private readonly formRawValue = signal<unknown>(EMPTY_TIME_RANGE);
  private readonly manualEditing = signal(false);
  private manualDirty = false;

  /** @internal */
  protected readonly effectiveDisabled = computed(
    () => this.controlDisabled() || this.formDisabled(),
  );
  private readonly currentRawValue = computed<unknown>(() => {
    const boundValue = this.value();
    return boundValue === undefined ? this.formRawValue() : boundValue;
  });
  private readonly currentInspection = computed(() =>
    inspectRange(this.currentRawValue(), parseTime),
  );
  /** @internal */
  protected readonly currentValue = computed<LocalizedTimeRange>(
    () => this.currentInspection().value,
  );
  private readonly manualInspection = computed(() =>
    inspectRange(
      {
        start: parseManualTime(this.startText()),
        end: parseManualTime(this.endText()),
      },
      parseTime,
    ),
  );
  private readonly committedErrors = computed(() => this.rangeErrors(this.currentInspection()));
  private readonly manualErrors = computed(() => this.rangeErrors(this.manualInspection()));
  /** @internal */
  protected readonly internalErrors = computed<TimeRangeErrors | null>(() =>
    this.manualEditing() ? this.manualErrors() : this.committedErrors(),
  );
  /** @internal */
  protected readonly effectiveInvalid = computed(
    () => this.invalid() || this.internalErrors() !== null,
  );
  /** @internal */
  protected readonly startInvalid = computed(
    () => this.invalid() || endpointIsInvalid(this.internalErrors(), 'start'),
  );
  /** @internal */
  protected readonly endInvalid = computed(
    () => this.invalid() || endpointIsInvalid(this.internalErrors(), 'end'),
  );
  private readonly displayedInspection = computed(() =>
    this.manualEditing() ? this.manualInspection() : this.currentInspection(),
  );
  private readonly displayedRequiredEndpoints = computed(() =>
    requiredEndpointsForInspection(this.requirements(), this.displayedInspection()),
  );
  /** @internal */
  protected readonly startRequired = computed(() => this.displayedRequiredEndpoints().start);
  /** @internal */
  protected readonly endRequired = computed(() => this.displayedRequiredEndpoints().end);
  /** @internal */
  protected readonly inputDescribedBy = computed(() =>
    this.effectiveInvalid() ? `${this.formatHintId} ${this.errorId}` : this.formatHintId,
  );
  /** @internal */
  protected readonly validationMessage = computed(() => {
    if (!this.effectiveInvalid()) return '';
    const errors = this.internalErrors();
    if (errors?.required !== undefined) return this.labels().requiredRange;
    if (errors?.timeRangeInvalid !== undefined) return this.labels().invalidRange;
    return this.labels().unavailableRange;
  });
  /** @internal */
  protected readonly triggerLabel = computed(() => {
    const value = this.currentValue();
    return value.start === null && value.end === null
      ? this.labels().openPicker
      : this.labels().changeValue;
  });
  /** @internal */
  protected readonly activeBoundaryLabel = computed(() =>
    this.activeBoundary() === 'end' ? this.labels().selectEndTime : this.labels().selectStartTime,
  );
  /** @internal */
  protected readonly canClear = computed(
    () =>
      !this.effectiveDisabled() &&
      !this.readonly() &&
      (this.dialogDraft().start.time !== null ||
        this.dialogDraft().end.time !== null ||
        this.dialogDraft().start.sourceInvalid === true ||
        this.dialogDraft().end.sourceInvalid === true),
  );
  /** @internal */
  protected readonly canConfirmDialog = computed(
    () =>
      !draftHasSourceInvalid(this.dialogDraft()) &&
      this.errorsForValue(dialogRange(this.dialogDraft())) === null,
  );
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
    timeInput: this.activeBoundary() === 'end' ? this.labels().endTime : this.labels().startTime,
    hour: this.labels().hour,
    minute: this.labels().minute,
    keyboardHelp: this.labels().keyboardHelp,
    announceRangePreview: () => '',
  }));

  private onFormChange: ((value: LocalizedTimeRange) => void) | null = null;
  private onFormTouched: (() => void) | null = null;
  private onValidatorChange: (() => void) | null = null;
  private lastEmittedValidity: boolean | undefined;

  private readonly valueSyncEffect = effect(() => {
    const raw = this.currentRawValue();
    untracked(() => this.syncManualTextToRaw(raw));
  });
  private readonly nativeValiditySyncEffect = afterRenderEffect(() => {
    if (!this.isBrowser) return;
    const inputs = this.hostElement.nativeElement.querySelectorAll<HTMLInputElement>(
      'ds-temporal-picker-field input',
    );
    inputs[0]?.setCustomValidity(this.startInvalid() ? this.validationMessage() : '');
    inputs[1]?.setCustomValidity(this.endInvalid() ? this.validationMessage() : '');
  });
  private readonly validatorInputsEffect = effect(() => {
    this.requirements();
    this.min();
    this.max();
    this.currentRawValue();
    this.manualErrors();
    this.onValidatorChange?.();
  });
  private readonly interactiveStateEffect = effect(() => {
    if ((this.effectiveDisabled() || this.readonly()) && this.calendarOpen()) {
      this.rollbackAndCloseCalendar();
    }
  });
  private readonly internalValidityEffect = effect(() => {
    const valid = this.internalErrors() === null;
    if (valid === this.lastEmittedValidity) return;
    this.lastEmittedValidity = valid;
    this.validityChange.emit(valid);
  });

  writeValue(value: unknown): void {
    this.formRawValue.set(value === null ? EMPTY_TIME_RANGE : value);
  }

  ngOnChanges(): void {
    this.onValidatorChange?.();
  }

  registerOnChange(fn: (value: LocalizedTimeRange) => void): void {
    this.onFormChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onFormTouched = fn;
  }

  validate(control: AbstractControl<unknown>): ValidationErrors | null {
    return this.manualEditing()
      ? this.manualErrors()
      : this.rangeErrors(inspectRange(control.value, parseTime));
  }

  registerOnValidatorChange(fn: () => void): void {
    this.onValidatorChange = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.formDisabled.set(disabled);
  }

  /** @internal */
  protected setActiveBoundary(boundary: TemporalBoundary): void {
    if (boundary === 'start' || boundary === 'end') this.activeBoundary.set(boundary);
  }

  /** @internal */
  protected toggleCalendar(): void {
    if (this.calendarOpen()) this.rollbackAndCloseCalendar();
    else this.openCalendar();
  }

  /** @internal */
  protected openCalendar(): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    this.dialogDraft.set(timeRangeDraft(this.currentValue(), this.currentInspection()));
    const trigger = this.hostElement.nativeElement.querySelector<HTMLElement>(
      'button[aria-haspopup="dialog"]',
    );
    if (trigger === null || !this.calendarDialog().open(trigger)) return;
    this.calendarOpen.set(true);
    this.changeDetectorRef.detectChanges();
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
    this.dialogDraft.set(timeRangeDraft(EMPTY_TIME_RANGE));
  }

  /** @internal */
  protected cancelDialog(): void {
    if (!this.calendarOpen()) return;
    this.dialogDraft.set(timeRangeDraft(this.currentValue(), this.currentInspection()));
    this.calendarOpen.set(false);
    this.markTouched();
  }

  /** @internal */
  protected confirmDialog(): void {
    if (!this.calendarOpen() || !this.canConfirmDialog()) return;
    this.commitValue(dialogRange(this.dialogDraft()));
    this.calendarOpen.set(false);
    this.markTouched();
  }

  /** @internal */
  protected onTextInput(event: TemporalFieldEndpointEvent): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    this.setEndpointText(event);
    this.manualDirty = true;
    this.manualEditing.set(true);
    this.onValidatorChange?.();
  }

  /** @internal */
  protected onTextComplete(event: TemporalFieldEndpointEvent): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    this.setEndpointText(event);
    this.manualEditing.set(true);
    const inspection = this.manualInspection();
    if (this.rangeErrors(inspection) === null) {
      if (this.manualDirty) this.commitValue(inspection.value);
      else this.syncManualTextToRaw(this.currentRawValue());
    }
    this.markTouched();
  }

  /** @internal */
  protected restoreManualText(): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    this.syncManualTextToRaw(this.currentRawValue());
    this.markTouched();
  }

  private rangeErrors(inspection: ReturnType<typeof inspectRange>): TimeRangeErrors | null {
    const value = inspection.value;
    const requiredError = missingRequiredEndpoints(this.requirements(), inspection);
    const invalidStart =
      inspection.malformed.start || (inspection.shapeInvalid && value.start === null);
    const invalidEnd = inspection.malformed.end || (inspection.shapeInvalid && value.end === null);
    const orderInvalid = !invalidStart && !invalidEnd && !isNullableTimeRangeOrdered(value);
    const availability = timeRangeAvailability(value, { min: this.min(), max: this.max() });
    const errors: TimeRangeErrors = {};
    if (requiredError.start || requiredError.end) errors.required = requiredError;
    if (invalidStart || invalidEnd || orderInvalid) {
      errors.timeRangeInvalid = {
        ...(invalidStart ? { start: true } : {}),
        ...(invalidEnd ? { end: true } : {}),
        ...(orderInvalid ? { order: true } : {}),
      };
    }
    if (
      availability.startUnavailable ||
      availability.endUnavailable ||
      availability.rangeUnavailable
    ) {
      errors.timeRangeUnavailable = {
        ...(availability.startUnavailable ? { start: true } : {}),
        ...(availability.endUnavailable ? { end: true } : {}),
        ...(availability.rangeUnavailable ? { interval: true } : {}),
      };
    }
    return Object.keys(errors).length === 0 ? null : errors;
  }

  private errorsForValue(value: LocalizedTimeRange): TimeRangeErrors | null {
    return this.rangeErrors(inspectRange(value, parseTime));
  }

  private setEndpointText(event: TemporalFieldEndpointEvent): void {
    if (event.boundary === 'end') this.endText.set(event.text);
    else this.startText.set(event.text);
  }

  private commitValue(value: LocalizedTimeRange): void {
    const committed = canonicalRange(value);
    if (this.value() === undefined) this.formRawValue.set(committed);
    this.valueChange.emit(committed);
    this.onFormChange?.(committed);
    this.manualDirty = false;
    this.manualEditing.set(false);
    this.syncManualTextToRaw(this.currentRawValue());
  }

  private syncManualTextToRaw(raw: unknown): void {
    this.startText.set(renderEndpoint(raw, 'start'));
    this.endText.set(renderEndpoint(raw, 'end'));
    this.manualDirty = false;
    this.manualEditing.set(false);
  }

  private rollbackAndCloseCalendar(): void {
    this.dialogDraft.set(timeRangeDraft(this.currentValue(), this.currentInspection()));
    this.calendarOpen.set(false);
    this.calendarDialog().close();
    this.markTouched();
  }

  private markTouched(): void {
    this.onFormTouched?.();
  }
}

function parseManualTime(text: string): string | null {
  return text.trim() === '' ? null : text;
}

function renderEndpoint(raw: unknown, boundary: 'start' | 'end'): string {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return '';
  const endpoint = (raw as Record<string, unknown>)[boundary];
  return typeof endpoint === 'string' && parseTime(endpoint) !== null ? endpoint : '';
}

function canonicalRange(value: LocalizedTimeRange): LocalizedTimeRange {
  return { start: value.start, end: value.end };
}

function timeRangeDraft(
  value: LocalizedTimeRange,
  inspection?: ReturnType<typeof inspectRange>,
): TemporalRangeDraft {
  return {
    start: {
      date: null,
      time: value.start,
      ...(endpointSourceInvalid(inspection, 'start') ? { sourceInvalid: true } : {}),
    },
    end: {
      date: null,
      time: value.end,
      ...(endpointSourceInvalid(inspection, 'end') ? { sourceInvalid: true } : {}),
    },
  };
}

function endpointSourceInvalid(
  inspection: ReturnType<typeof inspectRange> | undefined,
  boundary: 'start' | 'end',
): boolean {
  return (
    inspection?.malformed[boundary] === true ||
    (inspection?.shapeInvalid === true && inspection.value[boundary] === null)
  );
}

function draftHasSourceInvalid(draft: TemporalRangeDraft): boolean {
  return draft.start.sourceInvalid === true || draft.end.sourceInvalid === true;
}

function dialogRange(draft: TemporalRangeDraft): LocalizedTimeRange {
  return { start: draft.start.time, end: draft.end.time };
}

function endpointIsInvalid(errors: TimeRangeErrors | null, boundary: 'start' | 'end'): boolean {
  if (errors === null) return false;
  return (
    errors.required?.[boundary] === true ||
    errors.timeRangeInvalid?.[boundary] === true ||
    errors.timeRangeInvalid?.order === true ||
    errors.timeRangeUnavailable?.[boundary] === true ||
    errors.timeRangeUnavailable?.interval === true
  );
}
