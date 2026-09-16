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
  CalendarDialogLabels,
  TemporalRangeDraft,
} from './calendar-dialog.component';
import {
  dateRangeAvailability,
  formatDateForLocale,
  inspectRange,
  isNullableDateRangeOrdered,
  missingRequiredEndpoints,
  parseDateForLocale,
  parseIsoDate,
  requiredEndpointsForInspection,
} from './localized-date-picker.utils';
import {
  DEFAULT_RANGE_REQUIREMENTS,
  EMPTY_DATE_RANGE,
  LocalizedDatePickerControlSize,
  LocalizedDateRange,
  LocalizedRangeRequirements,
  TemporalBoundary,
} from './localized-temporal-picker.types';
import {
  TemporalFieldEndpointEvent,
  TemporalPickerFieldComponent,
} from './temporal-picker-field.component';

export { DEFAULT_RANGE_REQUIREMENTS, EMPTY_DATE_RANGE } from './localized-temporal-picker.types';
export type {
  LocalizedDatePickerControlSize,
  LocalizedDateRange,
  LocalizedRangeRequirements,
} from './localized-temporal-picker.types';

export interface LocalizedDateRangePickerLabels {
  readonly placeholder: string;
  readonly openPicker: string;
  readonly changeValue: string;
  readonly dialog: string;
  readonly groupLabel: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly selectStartDate: string;
  readonly selectEndDate: string;
  readonly accessibleRangeSeparator: string;
  readonly announceRangePreview: (start: string, end: string) => string;
  readonly previousMonth: string;
  readonly nextMonth: string;
  readonly openMonthYearPicker: string;
  readonly previousYear: string;
  readonly nextYear: string;
  readonly clear: string;
  readonly cancel: string;
  readonly done: string;
  readonly today: string;
  readonly dateFormatHint: string;
  readonly keyboardHelp: string;
  readonly invalidRange: string;
  readonly unavailableRange: string;
  readonly requiredRange: string;
}

interface RangeErrors extends ValidationErrors {
  required?: { readonly start: boolean; readonly end: boolean };
  dateRangeInvalid?: {
    readonly start?: boolean;
    readonly end?: boolean;
    readonly order?: boolean;
  };
  dateRangeUnavailable?: {
    readonly start?: boolean;
    readonly end?: boolean;
    readonly interval?: boolean;
  };
}

let nextCalendarId = 0;

@Component({
  selector: 'ds-localized-date-range-picker',
  standalone: true,
  imports: [CalendarDialogComponent, TemporalPickerFieldComponent],
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
  private readonly hostElement = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly calendarDialog = viewChild.required<CalendarDialogComponent>('calendarDialog');

  readonly inputId = input.required<string>();
  readonly value = input<LocalizedDateRange>();
  readonly controlSize = input.required<LocalizedDatePickerControlSize>();
  readonly dateLocale = input.required<string>();
  readonly labels = input.required<LocalizedDateRangePickerLabels>();
  readonly requirements = input<LocalizedRangeRequirements>(DEFAULT_RANGE_REQUIREMENTS);
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
  protected readonly startText = signal('');
  /** @internal */
  protected readonly endText = signal('');
  /** @internal */
  protected readonly activeBoundary = signal<'start' | 'end'>('start');
  /** @internal */
  protected readonly dialogDraft = signal<TemporalRangeDraft>(dateRangeDraft(EMPTY_DATE_RANGE));
  /** @internal */
  protected readonly formDisabled = signal(false);
  /** @internal */
  protected readonly calendarId = `localizedDateRangePicker${nextCalendarId++}`;
  /** @internal */
  protected readonly formatHintId = `${this.calendarId}FormatHint`;
  /** @internal */
  protected readonly errorId = `${this.calendarId}Error`;

  private readonly formRawValue = signal<unknown>(EMPTY_DATE_RANGE);
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
    inspectRange(this.currentRawValue(), parseIsoDate),
  );
  /** @internal */
  protected readonly currentValue = computed<LocalizedDateRange>(
    () => this.currentInspection().value,
  );
  private readonly manualInspection = computed(() =>
    inspectRange(
      {
        start: parseManualDate(this.startText(), this.dateLocale()),
        end: parseManualDate(this.endText(), this.dateLocale()),
      },
      parseIsoDate,
    ),
  );
  private readonly committedErrors = computed(() => this.rangeErrors(this.currentInspection()));
  private readonly manualErrors = computed(() => this.rangeErrors(this.manualInspection()));
  /** @internal */
  protected readonly internalErrors = computed<RangeErrors | null>(() =>
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
    if (errors?.dateRangeInvalid !== undefined) return this.labels().invalidRange;
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
    this.activeBoundary() === 'end' ? this.labels().selectEndDate : this.labels().selectStartDate,
  );
  /** @internal */
  protected readonly canClear = computed(
    () =>
      !this.effectiveDisabled() &&
      !this.readonly() &&
      (this.dialogDraft().start.date !== null ||
        this.dialogDraft().end.date !== null ||
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
    previousMonth: this.labels().previousMonth,
    nextMonth: this.labels().nextMonth,
    openMonthYearPicker: this.labels().openMonthYearPicker,
    previousYear: this.labels().previousYear,
    nextYear: this.labels().nextYear,
    clear: this.labels().clear,
    cancel: this.labels().cancel,
    done: this.labels().done,
    today: this.labels().today,
    now: '',
    timeInput: '',
    hour: '',
    minute: '',
    keyboardHelp: this.labels().keyboardHelp,
    announceRangePreview: this.labels().announceRangePreview,
  }));

  private onFormChange: ((value: LocalizedDateRange) => void) | null = null;
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
    this.formRawValue.set(value === null ? EMPTY_DATE_RANGE : value);
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
    return this.manualEditing()
      ? this.manualErrors()
      : this.rangeErrors(inspectRange(control.value, parseIsoDate));
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
    this.dialogDraft.set(dateRangeDraft(value, this.currentInspection()));
    const trigger = this.hostElement.nativeElement.querySelector<HTMLElement>(
      'button[aria-haspopup="dialog"]',
    );
    if (trigger === null) return;
    const preferred = this.activeBoundary() === 'end' ? (value.end ?? value.start) : value.start;
    if (!this.calendarDialog().open(trigger, preferred ?? '')) return;
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
    this.dialogDraft.set(dateRangeDraft(EMPTY_DATE_RANGE));
  }

  /** @internal */
  protected cancelDialog(): void {
    if (!this.calendarOpen()) return;
    this.dialogDraft.set(dateRangeDraft(this.currentValue(), this.currentInspection()));
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

  private rangeErrors(inspection: ReturnType<typeof inspectRange>): RangeErrors | null {
    const value = inspection.value;
    const requiredError = missingRequiredEndpoints(this.requirements(), inspection);
    const invalidStart =
      inspection.malformed.start || (inspection.shapeInvalid && value.start === null);
    const invalidEnd = inspection.malformed.end || (inspection.shapeInvalid && value.end === null);
    const orderInvalid = !invalidStart && !invalidEnd && !isNullableDateRangeOrdered(value);
    const availability = dateRangeAvailability(value, {
      min: this.min(),
      max: this.max(),
      disabledDates: this.disabledDates(),
    });
    const errors: RangeErrors = {};
    if (requiredError.start || requiredError.end) errors.required = requiredError;
    if (invalidStart || invalidEnd || orderInvalid) {
      errors.dateRangeInvalid = {
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
      errors.dateRangeUnavailable = {
        ...(availability.startUnavailable ? { start: true } : {}),
        ...(availability.endUnavailable ? { end: true } : {}),
        ...(availability.rangeUnavailable ? { interval: true } : {}),
      };
    }
    return Object.keys(errors).length === 0 ? null : errors;
  }

  private errorsForValue(value: LocalizedDateRange): RangeErrors | null {
    return this.rangeErrors(inspectRange(value, parseIsoDate));
  }

  private setEndpointText(event: TemporalFieldEndpointEvent): void {
    if (event.boundary === 'end') this.endText.set(event.text);
    else this.startText.set(event.text);
  }

  private commitValue(value: LocalizedDateRange): void {
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
    this.dialogDraft.set(dateRangeDraft(this.currentValue(), this.currentInspection()));
    this.calendarOpen.set(false);
    this.calendarDialog().close();
    this.markTouched();
  }

  private markTouched(): void {
    this.onFormTouched?.();
  }
}

function parseManualDate(text: string, dateLocale: string): string | null {
  if (text.trim() === '') return null;
  return parseDateForLocale(text, dateLocale) ?? text;
}

function renderEndpoint(raw: unknown, boundary: 'start' | 'end', dateLocale: string): string {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return '';
  const endpoint = (raw as Record<string, unknown>)[boundary];
  if (endpoint === null || endpoint === undefined) return '';
  return typeof endpoint === 'string' ? formatDateForLocale(endpoint, dateLocale) : '';
}

function canonicalRange(value: LocalizedDateRange): LocalizedDateRange {
  return { start: value.start, end: value.end };
}

function dateRangeDraft(
  value: LocalizedDateRange,
  inspection?: ReturnType<typeof inspectRange>,
): TemporalRangeDraft {
  return {
    start: {
      date: value.start,
      time: null,
      ...(endpointSourceInvalid(inspection, 'start') ? { sourceInvalid: true } : {}),
    },
    end: {
      date: value.end,
      time: null,
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

function dialogRange(draft: TemporalRangeDraft): LocalizedDateRange {
  return { start: draft.start.date, end: draft.end.date };
}

function endpointIsInvalid(errors: RangeErrors | null, boundary: 'start' | 'end'): boolean {
  if (errors === null) return false;
  return (
    errors.required?.[boundary] === true ||
    errors.dateRangeInvalid?.[boundary] === true ||
    errors.dateRangeInvalid?.order === true ||
    errors.dateRangeUnavailable?.[boundary] === true ||
    errors.dateRangeUnavailable?.interval === true
  );
}
