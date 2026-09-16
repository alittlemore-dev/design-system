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
  dateTimeRangeAvailability,
  formatDateTimeForLocale,
  inspectRange,
  intervalCrossesDisabledDate,
  isDateDisabled,
  isNullableDateTimeRangeOrdered,
  missingRequiredEndpoints,
  parseDateTime,
  parseDateTimeForLocale,
  requiredEndpointsForInspection,
} from './localized-date-picker.utils';
import {
  DEFAULT_RANGE_REQUIREMENTS,
  EMPTY_DATETIME_RANGE,
  type LocalizedDatePickerControlSize,
  type LocalizedDateTimeRange,
  type LocalizedRangeRequirements,
  type LocalizedTimePickerMode,
  type TemporalBoundary,
} from './localized-temporal-picker.types';
import {
  TemporalPickerFieldComponent,
  type TemporalFieldEndpointEvent,
} from './temporal-picker-field.component';

export {
  DEFAULT_RANGE_REQUIREMENTS,
  EMPTY_DATETIME_RANGE,
} from './localized-temporal-picker.types';
export type {
  LocalizedDatePickerControlSize,
  LocalizedDateTimeRange,
  LocalizedRangeRequirements,
  LocalizedTimePickerMode,
} from './localized-temporal-picker.types';

export interface LocalizedDateTimeRangePickerLabels {
  readonly placeholder: string;
  readonly openPicker: string;
  readonly changeValue: string;
  readonly dialog: string;
  readonly groupLabel: string;
  readonly startDateTime: string;
  readonly endDateTime: string;
  readonly selectStartDateTime: string;
  readonly selectEndDateTime: string;
  readonly accessibleRangeSeparator: string;
  readonly announceRangePreview: (start: string, end: string) => string;
  readonly previousMonth: string;
  readonly nextMonth: string;
  readonly openMonthYearPicker: string;
  readonly previousYear: string;
  readonly nextYear: string;
  readonly hour: string;
  readonly minute: string;
  readonly dateFormatHint: string;
  readonly timeFormatHint: string;
  readonly clear: string;
  readonly cancel: string;
  readonly done: string;
  readonly today: string;
  readonly now: string;
  readonly keyboardHelp: string;
  readonly invalidRange: string;
  readonly unavailableRange: string;
  readonly requiredRange: string;
}

interface DateTimeRangeErrors extends ValidationErrors {
  required?: { readonly start: boolean; readonly end: boolean };
  dateTimeRangeInvalid?: {
    readonly start?: boolean;
    readonly end?: boolean;
    readonly order?: boolean;
  };
  dateTimeRangeUnavailable?: {
    readonly start?: boolean;
    readonly end?: boolean;
    readonly interval?: boolean;
  };
}

let nextDateTimeRangePickerId = 0;

@Component({
  selector: 'ds-localized-datetime-range-picker',
  standalone: true,
  imports: [CalendarDialogComponent, TemporalPickerFieldComponent],
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
  private readonly hostElement = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly calendarDialog = viewChild.required<CalendarDialogComponent>('calendarDialog');

  readonly inputId = input.required<string>();
  readonly value = input<LocalizedDateTimeRange>();
  readonly controlSize = input.required<LocalizedDatePickerControlSize>();
  readonly dateLocale = input.required<string>();
  readonly labels = input.required<LocalizedDateTimeRangePickerLabels>();
  readonly requirements = input<LocalizedRangeRequirements>(DEFAULT_RANGE_REQUIREMENTS);
  readonly invalid = input.required<boolean>();
  readonly controlDisabled = input.required<boolean>();
  readonly readonly = input.required<boolean>();
  readonly min = input<string>();
  readonly max = input<string>();
  readonly disabledDates = input<readonly string[]>();
  readonly timePickerMode = input<LocalizedTimePickerMode>('auto');

  readonly valueChange = output<LocalizedDateTimeRange>();
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
  protected readonly dialogDraft = signal<TemporalRangeDraft>(
    dateTimeRangeDraft(EMPTY_DATETIME_RANGE),
  );
  /** @internal */
  protected readonly formDisabled = signal(false);
  /** @internal */
  protected readonly calendarId = `localizedDateTimeRangePicker${nextDateTimeRangePickerId++}`;
  /** @internal */
  protected readonly formatHintId = `${this.calendarId}FormatHint`;
  /** @internal */
  protected readonly errorId = `${this.calendarId}Error`;

  private readonly formRawValue = signal<unknown>(EMPTY_DATETIME_RANGE);
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
    inspectRange(this.currentRawValue(), parseDateTime),
  );
  /** @internal */
  protected readonly currentValue = computed<LocalizedDateTimeRange>(
    () => this.currentInspection().value,
  );
  private readonly manualInspection = computed(() =>
    inspectRange(
      {
        start: parseManualDateTime(this.startText(), this.dateLocale()),
        end: parseManualDateTime(this.endText(), this.dateLocale()),
      },
      parseDateTime,
    ),
  );
  private readonly committedErrors = computed(() => this.rangeErrors(this.currentInspection()));
  private readonly manualErrors = computed(() => this.rangeErrors(this.manualInspection()));
  /** @internal */
  protected readonly internalErrors = computed<DateTimeRangeErrors | null>(() =>
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
    if (errors?.dateTimeRangeInvalid !== undefined) return this.labels().invalidRange;
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
    this.activeBoundary() === 'end'
      ? this.labels().selectEndDateTime
      : this.labels().selectStartDateTime,
  );
  /** @internal */
  protected readonly canClear = computed(() => {
    const draft = this.dialogDraft();
    return (
      !this.effectiveDisabled() &&
      !this.readonly() &&
      (draft.start.date !== null ||
        draft.start.time !== null ||
        draft.end.date !== null ||
        draft.end.time !== null ||
        draft.start.sourceInvalid === true ||
        draft.end.sourceInvalid === true)
    );
  });
  /** @internal */
  protected readonly canConfirmDialog = computed(() => {
    const draft = this.dialogDraft();
    return (
      !draftHasSourceInvalid(draft) &&
      !draftIsIncomplete(draft) &&
      this.errorsForValue(dialogRange(draft)) === null
    );
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
    timeInput:
      this.activeBoundary() === 'end' ? this.labels().endDateTime : this.labels().startDateTime,
    hour: this.labels().hour,
    minute: this.labels().minute,
    keyboardHelp: this.labels().keyboardHelp,
    announceRangePreview: this.labels().announceRangePreview,
  }));

  private onFormChange: ((value: LocalizedDateTimeRange) => void) | null = null;
  private onFormTouched: (() => void) | null = null;
  private onValidatorChange: (() => void) | null = null;
  private lastEmittedValidity: boolean | undefined;

  private readonly valueSyncEffect = effect(() => {
    const raw = this.currentRawValue();
    this.dateLocale();
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
    this.disabledDates();
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
    this.formRawValue.set(value === null ? EMPTY_DATETIME_RANGE : value);
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
    return this.manualEditing()
      ? this.manualErrors()
      : this.rangeErrors(inspectRange(control.value, parseDateTime));
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
    const value = this.currentValue();
    this.dialogDraft.set(dateTimeRangeDraft(value, this.currentInspection()));
    const trigger = this.hostElement.nativeElement.querySelector<HTMLElement>(
      'button[aria-haspopup="dialog"]',
    );
    if (trigger === null) return;
    const preferredValue =
      this.activeBoundary() === 'end' ? (value.end ?? value.start) : value.start;
    const preferred = preferredValue === null ? '' : (parseDateTime(preferredValue)?.date ?? '');
    if (!this.calendarDialog().open(trigger, preferred)) return;
    this.calendarOpen.set(true);
    this.changeDetectorRef.detectChanges();
  }

  /** @internal */
  protected onDialogDraftChange(draft: TemporalRangeDraft): void {
    if (!this.calendarOpen() || this.effectiveDisabled() || this.readonly()) return;
    this.dialogDraft.set(draft);
  }

  /** @internal */
  protected onDialogActiveBoundaryChange(boundary: TemporalBoundary): void {
    this.setActiveBoundary(boundary);
  }

  /** @internal */
  protected clearDialogDraft(): void {
    if (!this.calendarOpen() || this.effectiveDisabled() || this.readonly() || !this.canClear()) {
      return;
    }
    this.dialogDraft.set(dateTimeRangeDraft(EMPTY_DATETIME_RANGE));
  }

  /** @internal */
  protected cancelDialog(): void {
    if (!this.calendarOpen()) return;
    this.dialogDraft.set(dateTimeRangeDraft(this.currentValue(), this.currentInspection()));
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

  private rangeErrors(inspection: ReturnType<typeof inspectRange>): DateTimeRangeErrors | null {
    const value = inspection.value;
    const requiredError = missingRequiredEndpoints(this.requirements(), inspection);
    const invalidStart =
      inspection.malformed.start || (inspection.shapeInvalid && value.start === null);
    const invalidEnd = inspection.malformed.end || (inspection.shapeInvalid && value.end === null);
    const orderInvalid = !invalidStart && !invalidEnd && !isNullableDateTimeRangeOrdered(value);
    const availability = dateTimeRangeAvailability(value, {
      min: this.min(),
      max: this.max(),
    });
    const parsedStart = value.start === null ? null : parseDateTime(value.start);
    const parsedEnd = value.end === null ? null : parseDateTime(value.end);
    const startUnavailable =
      availability.startUnavailable ||
      (parsedStart !== null && isDateDisabled(parsedStart.date, this.disabledDates()));
    const endUnavailable =
      availability.endUnavailable ||
      (parsedEnd !== null && isDateDisabled(parsedEnd.date, this.disabledDates()));
    const intervalUnavailable =
      parsedStart !== null &&
      parsedEnd !== null &&
      intervalCrossesDisabledDate(parsedStart.date, parsedEnd.date, this.disabledDates());
    const errors: DateTimeRangeErrors = {};
    if (requiredError.start || requiredError.end) errors.required = requiredError;
    if (invalidStart || invalidEnd || orderInvalid) {
      errors.dateTimeRangeInvalid = {
        ...(invalidStart ? { start: true } : {}),
        ...(invalidEnd ? { end: true } : {}),
        ...(orderInvalid ? { order: true } : {}),
      };
    }
    if (startUnavailable || endUnavailable || intervalUnavailable) {
      errors.dateTimeRangeUnavailable = {
        ...(startUnavailable ? { start: true } : {}),
        ...(endUnavailable ? { end: true } : {}),
        ...(intervalUnavailable ? { interval: true } : {}),
      };
    }
    return Object.keys(errors).length === 0 ? null : errors;
  }

  private errorsForValue(value: LocalizedDateTimeRange): DateTimeRangeErrors | null {
    return this.rangeErrors(inspectRange(value, parseDateTime));
  }

  private setEndpointText(event: TemporalFieldEndpointEvent): void {
    if (event.boundary === 'end') this.endText.set(event.text);
    else this.startText.set(event.text);
  }

  private commitValue(value: LocalizedDateTimeRange): void {
    const committed = canonicalRange(value);
    if (this.value() === undefined) this.formRawValue.set(committed);
    this.valueChange.emit(committed);
    this.onFormChange?.(committed);
    this.manualDirty = false;
    this.manualEditing.set(false);
    this.syncManualTextToRaw(this.currentRawValue());
  }

  private syncManualTextToRaw(raw: unknown): void {
    this.startText.set(renderEndpoint(raw, 'start', this.dateLocale()));
    this.endText.set(renderEndpoint(raw, 'end', this.dateLocale()));
    this.manualDirty = false;
    this.manualEditing.set(false);
  }

  private rollbackAndCloseCalendar(): void {
    this.dialogDraft.set(dateTimeRangeDraft(this.currentValue(), this.currentInspection()));
    this.calendarOpen.set(false);
    this.calendarDialog().close();
    this.markTouched();
  }

  private markTouched(): void {
    this.onFormTouched?.();
  }
}

function parseManualDateTime(text: string, dateLocale: string): string | null {
  if (text.trim() === '') return null;
  return parseDateTimeForLocale(text, dateLocale) ?? text;
}

function renderEndpoint(raw: unknown, boundary: 'start' | 'end', dateLocale: string): string {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return '';
  const endpoint = (raw as Record<string, unknown>)[boundary];
  if (endpoint === null || endpoint === undefined) return '';
  return typeof endpoint === 'string' ? formatDateTimeForLocale(endpoint, dateLocale) : '';
}

function canonicalRange(value: LocalizedDateTimeRange): LocalizedDateTimeRange {
  return { start: value.start, end: value.end };
}

function dateTimeRangeDraft(
  value: LocalizedDateTimeRange,
  inspection?: ReturnType<typeof inspectRange>,
): TemporalRangeDraft {
  return {
    start: dateTimeEndpointDraft(value.start, endpointSourceInvalid(inspection, 'start')),
    end: dateTimeEndpointDraft(value.end, endpointSourceInvalid(inspection, 'end')),
  };
}

function dateTimeEndpointDraft(
  value: string | null,
  sourceInvalid = false,
): TemporalRangeDraft['start'] {
  const parsed = value === null ? null : parseDateTime(value);
  if (parsed !== null) return { date: parsed.date, time: parsed.time };
  return { date: null, time: null, ...(sourceInvalid ? { sourceInvalid: true } : {}) };
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

function dialogRange(draft: TemporalRangeDraft): LocalizedDateTimeRange {
  return {
    start: composeEndpoint(draft.start.date, draft.start.time),
    end: composeEndpoint(draft.end.date, draft.end.time),
  };
}

function composeEndpoint(date: string | null, time: string | null): string | null {
  return date === null || time === null ? null : composeDateTime(date, time);
}

function draftIsIncomplete(draft: TemporalRangeDraft): boolean {
  return endpointDraftIsIncomplete(draft.start) || endpointDraftIsIncomplete(draft.end);
}

function endpointDraftIsIncomplete(endpoint: TemporalRangeDraft['start']): boolean {
  return (endpoint.date === null) !== (endpoint.time === null);
}

function endpointIsInvalid(errors: DateTimeRangeErrors | null, boundary: 'start' | 'end'): boolean {
  if (errors === null) return false;
  return (
    errors.required?.[boundary] === true ||
    errors.dateTimeRangeInvalid?.[boundary] === true ||
    errors.dateTimeRangeInvalid?.order === true ||
    errors.dateTimeRangeUnavailable?.[boundary] === true ||
    errors.dateTimeRangeUnavailable?.interval === true
  );
}
