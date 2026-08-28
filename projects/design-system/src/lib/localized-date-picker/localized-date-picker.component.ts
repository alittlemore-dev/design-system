import { DOCUMENT, isPlatformBrowser } from '@angular/common';
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
  viewChildren,
} from '@angular/core';
import {
  AbstractControl,
  ControlValueAccessor,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
  Validator,
} from '@angular/forms';

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

interface CalendarCell {
  iso: string;
  label: string;
  ariaLabel: string;
  selected: boolean;
  today: boolean;
  disabled: boolean;
}

interface MonthOption {
  index: number;
  label: string;
  ariaLabel: string;
  selected: boolean;
}

interface WeekdayLabel {
  short: string;
  long: string;
}

type CalendarMode = 'days' | 'monthYear';
type DatePart = 'day' | 'month' | 'year';

const DATE_SEPARATOR_PATTERN = /[./-]/;
const CANONICAL_ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAYS_IN_WEEK = 7;
const MONTHS_IN_YEAR = 12;
const MONTH_GRID_COLUMNS = 3;
let nextCalendarId = 0;

@Component({
  selector: 'ds-localized-date-picker',
  standalone: true,
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
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly textInputElement = viewChild<ElementRef<HTMLInputElement>>('textInput');
  private readonly calendarToggleElement =
    viewChild.required<ElementRef<HTMLButtonElement>>('calendarToggle');
  private readonly calendarDialogElement =
    viewChild.required<ElementRef<HTMLDialogElement>>('calendarDialog');
  private readonly closeButtonElement =
    viewChild.required<ElementRef<HTMLButtonElement>>('closeButton');
  private readonly dayButtonElements = viewChildren<ElementRef<HTMLButtonElement>>('dayButton');
  private readonly monthButtonElements = viewChildren<ElementRef<HTMLButtonElement>>('monthButton');

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
  protected readonly calendarMode = signal<CalendarMode>('days');

  /** @internal */
  protected readonly displayValue = signal('');

  /** @internal */
  protected readonly manualInputInvalid = signal(false);

  /** @internal */
  protected readonly manualValueInvalid = signal(false);

  /** @internal */
  protected readonly visibleMonth = signal(startOfMonth(new Date()));

  /** @internal */
  protected readonly focusedIso = signal('');

  /** @internal */
  protected readonly focusedMonthIndex = signal(0);

  /** @internal */
  protected readonly formValue = signal('');

  /** @internal */
  protected readonly formDisabled = signal(false);

  /** @internal */
  protected readonly calendarId = `localizedDatePicker${nextCalendarId++}`;

  /** @internal */
  protected readonly monthYearPanelId = `${this.calendarId}MonthYear`;

  /** @internal */
  protected readonly monthHeadingId = `${this.calendarId}MonthHeading`;

  /** @internal */
  protected readonly keyboardHelpId = `${this.calendarId}KeyboardHelp`;

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
  protected readonly monthLabel = computed(() =>
    new Intl.DateTimeFormat(this.dateLocale(), { month: 'long', year: 'numeric' }).format(
      this.visibleMonth(),
    ),
  );
  /** @internal */
  protected readonly visibleYearLabel = computed(() => String(this.visibleMonth().getFullYear()));

  /** @internal */
  protected readonly monthOptions = computed(() =>
    buildMonthOptions({ month: this.visibleMonth(), dateLocale: this.dateLocale() }),
  );
  /** @internal */
  protected readonly monthRows = computed(() => chunkRows(this.monthOptions(), MONTH_GRID_COLUMNS));

  /** @internal */
  protected readonly weekdayLabels = computed(() => buildWeekdayLabels(this.dateLocale()));

  /** @internal */
  protected readonly calendarRows = computed(() =>
    chunkRows(
      buildCalendarCells({
        month: this.visibleMonth(),
        selectedIso: this.currentValue(),
        dateLocale: this.dateLocale(),
        isDisabled: (iso) => this.isDateUnavailable(iso),
      }),
      DAYS_IN_WEEK,
    ),
  );
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
    const parsed = parseIsoDate(value);
    if (parsed !== null) {
      this.visibleMonth.set(startOfMonth(parsed));
      this.focusedIso.set(value);
      this.focusedMonthIndex.set(parsed.getMonth());
    }
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
    if ((this.effectiveDisabled() || this.readonly()) && this.calendarOpen()) this.closeCalendar();
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
    if (value !== '' && this.isDateUnavailable(value)) {
      return { dateUnavailable: true };
    }
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
    const focusIso = this.initialFocusableIso();
    const focusDate = parseIsoDate(focusIso);
    if (focusDate !== null) {
      this.visibleMonth.set(startOfMonth(focusDate));
      this.focusedMonthIndex.set(focusDate.getMonth());
    }
    this.focusedIso.set(focusIso);
    this.calendarMode.set('days');
    this.calendarOpen.set(true);
    const dialog = this.calendarDialogElement().nativeElement;
    if (!dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
    this.changeDetectorRef.detectChanges();
    this.focusCurrentDayOrClose();
  }

  /** @internal */
  protected closeCalendar(): void {
    const dialog = this.calendarDialogElement().nativeElement;
    this.calendarOpen.set(false);
    this.calendarMode.set('days');
    if (dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
    this.markTouched();
    this.changeDetectorRef.detectChanges();
    this.calendarToggleElement().nativeElement.focus();
  }

  /** @internal */
  protected onDialogClosed(): void {
    if (!this.calendarOpen()) return;
    this.calendarOpen.set(false);
    this.calendarMode.set('days');
    this.markTouched();
    this.calendarToggleElement().nativeElement.focus();
  }

  /** @internal */
  protected onDialogCancel(event: Event): void {
    event.preventDefault();
    this.closeCalendar();
  }

  /** @internal */
  protected onDialogClick(event: MouseEvent): void {
    if (event.target === this.calendarDialogElement().nativeElement) this.closeCalendar();
  }

  /** @internal */
  protected onDialogKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeCalendar();
    } else if (event.key === 'Tab') this.keepTabFocusInsideDialog(event);
  }

  /** @internal */
  protected showPreviousMonth(): void {
    this.changeVisibleMonth(-1);
  }
  /** @internal */
  protected showNextMonth(): void {
    this.changeVisibleMonth(1);
  }
  /** @internal */
  protected showPreviousYear(): void {
    this.changeVisibleYear(-1);
  }
  /** @internal */
  protected showNextYear(): void {
    this.changeVisibleYear(1);
  }

  /** @internal */
  protected toggleMonthYearPicker(): void {
    if (this.calendarMode() === 'days') {
      this.calendarMode.set('monthYear');
      this.focusedMonthIndex.set(this.visibleMonth().getMonth());
      this.changeDetectorRef.detectChanges();
      this.focusMonth(this.focusedMonthIndex());
    } else {
      this.calendarMode.set('days');
      this.changeDetectorRef.detectChanges();
      this.focusCurrentDayOrClose();
    }
  }

  /** @internal */
  protected selectMonth(monthIndex: number): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    const currentFocus = parseIsoDate(this.focusedIso()) ?? this.visibleMonth();
    const target = dateInMonth(
      this.visibleMonth().getFullYear(),
      monthIndex,
      currentFocus.getDate(),
    );
    const resolved = this.resolveAvailableIso(dateToIso(target), 1);
    if (resolved === null) {
      this.focusedMonthIndex.set(monthIndex);
      this.changeDetectorRef.detectChanges();
      this.focusMonth(monthIndex);
      return;
    }
    const resolvedDate = parseIsoDate(resolved);
    if (resolvedDate !== null) this.visibleMonth.set(startOfMonth(resolvedDate));
    this.focusedIso.set(resolved);
    this.focusedMonthIndex.set(monthIndex);
    this.calendarMode.set('days');
    this.changeDetectorRef.detectChanges();
    this.focusCurrentDayOrClose();
  }

  /** @internal */
  protected onMonthKeydown(event: KeyboardEvent, monthIndex: number): void {
    let targetIndex: number | null = null;
    if (event.key === 'ArrowLeft') targetIndex = monthIndex - 1;
    else if (event.key === 'ArrowRight') targetIndex = monthIndex + 1;
    else if (event.key === 'ArrowUp') targetIndex = monthIndex - MONTH_GRID_COLUMNS;
    else if (event.key === 'ArrowDown') targetIndex = monthIndex + MONTH_GRID_COLUMNS;
    else if (event.key === 'Home') targetIndex = 0;
    else if (event.key === 'End') targetIndex = MONTHS_IN_YEAR - 1;
    else if (event.key === 'PageUp') {
      event.preventDefault();
      this.showPreviousYear();
      return;
    } else if (event.key === 'PageDown') {
      event.preventDefault();
      this.showNextYear();
      return;
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.selectMonth(monthIndex);
      return;
    }
    if (targetIndex === null) return;
    event.preventDefault();
    const normalizedIndex = Math.min(Math.max(targetIndex, 0), MONTHS_IN_YEAR - 1);
    this.focusedMonthIndex.set(normalizedIndex);
    this.changeDetectorRef.detectChanges();
    this.focusMonth(normalizedIndex);
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
  protected onDayKeydown(event: KeyboardEvent, iso: string): void {
    const date = parseIsoDate(iso);
    if (date === null) return;
    let target: Date | null = null;
    let direction: 1 | -1 = 1;
    if (event.key === 'ArrowLeft') {
      target = addDays(date, -1);
      direction = -1;
    } else if (event.key === 'ArrowRight') target = addDays(date, 1);
    else if (event.key === 'ArrowUp') {
      target = addDays(date, -DAYS_IN_WEEK);
      direction = -1;
    } else if (event.key === 'ArrowDown') target = addDays(date, DAYS_IN_WEEK);
    else if (event.key === 'Home') {
      target = addDays(date, -dayOffsetFromWeekStart(date, this.dateLocale()));
      direction = -1;
    } else if (event.key === 'End')
      target = addDays(date, DAYS_IN_WEEK - 1 - dayOffsetFromWeekStart(date, this.dateLocale()));
    else if (event.key === 'PageUp') {
      target = event.shiftKey ? changeYear(date, -1) : changeMonth(date, -1);
      direction = -1;
    } else if (event.key === 'PageDown')
      target = event.shiftKey ? changeYear(date, 1) : changeMonth(date, 1);
    else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.selectDate(iso);
      return;
    }
    if (target === null) return;
    event.preventDefault();
    const resolved = this.resolveAvailableIso(dateToIso(target), direction);
    const resolvedDate = resolved === null ? null : parseIsoDate(resolved);
    if (resolvedDate === null || resolved === null) return;
    this.focusedIso.set(resolved);
    this.visibleMonth.set(startOfMonth(resolvedDate));
    this.focusedMonthIndex.set(resolvedDate.getMonth());
    this.changeDetectorRef.detectChanges();
    this.focusDay(resolved);
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
    const min = validIsoOrNull(this.min());
    const max = validIsoOrNull(this.max());
    if (min !== null && iso < min) return true;
    if (max !== null && iso > max) return true;
    return this.disabledDates()?.includes(iso) ?? false;
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

  private initialFocusableIso(): string {
    const current = this.currentValue();
    if (parseIsoDate(current) !== null && !this.isDateUnavailable(current)) return current;
    const today = dateToIso(new Date());
    return this.resolveAvailableIso(today, 1) ?? this.resolveAvailableIso(today, -1) ?? '';
  }

  private resolveAvailableIso(candidate: string, direction: 1 | -1): string | null {
    let date = parseIsoDate(candidate);
    if (date === null) return null;
    const min = validIsoOrNull(this.min());
    const max = validIsoOrNull(this.max());
    let iso = dateToIso(date);
    if (min !== null && iso < min) {
      date = parseIsoDate(min);
      if (date === null) return null;
      iso = min;
    }
    if (max !== null && iso > max) {
      date = parseIsoDate(max);
      if (date === null) return null;
      iso = max;
    }
    while (this.isDateUnavailable(iso)) {
      date = addDays(date, direction);
      iso = dateToIso(date);
      if ((min !== null && iso < min) || (max !== null && iso > max)) return null;
    }
    return iso;
  }

  private changeVisibleMonth(offset: number): void {
    const focusDate = parseIsoDate(this.focusedIso()) ?? this.visibleMonth();
    const resolved = this.resolveAvailableIso(
      dateToIso(changeMonth(focusDate, offset)),
      offset < 0 ? -1 : 1,
    );
    const resolvedDate = resolved === null ? null : parseIsoDate(resolved);
    if (resolvedDate === null || resolved === null) return;
    this.focusedIso.set(resolved);
    this.visibleMonth.set(startOfMonth(resolvedDate));
    this.focusedMonthIndex.set(resolvedDate.getMonth());
  }

  private changeVisibleYear(offset: number): void {
    const focusDate = parseIsoDate(this.focusedIso()) ?? this.visibleMonth();
    const resolved = this.resolveAvailableIso(
      dateToIso(changeYear(focusDate, offset)),
      offset < 0 ? -1 : 1,
    );
    const resolvedDate = resolved === null ? null : parseIsoDate(resolved);
    if (resolvedDate === null || resolved === null) return;
    this.focusedIso.set(resolved);
    this.visibleMonth.set(startOfMonth(resolvedDate));
    this.focusedMonthIndex.set(resolvedDate.getMonth());
  }

  private focusCurrentDayOrClose(): void {
    if (this.focusedIso() !== '' && this.focusDay(this.focusedIso())) return;
    this.closeButtonElement().nativeElement.focus();
  }

  private focusDay(iso: string): boolean {
    const target = this.dayButtonElements().find(
      (button) => button.nativeElement.dataset['date'] === iso,
    );
    target?.nativeElement.focus();
    return target !== undefined;
  }

  private focusMonth(monthIndex: number): void {
    this.monthButtonElements()
      .find((button) => Number(button.nativeElement.dataset['monthIndex']) === monthIndex)
      ?.nativeElement.focus();
  }

  private keepTabFocusInsideDialog(event: KeyboardEvent): void {
    const dialog = this.calendarDialogElement().nativeElement;
    const focusable = [...dialog.querySelectorAll<HTMLElement>('button, input, [tabindex]')].filter(
      (element) => !element.hasAttribute('disabled') && element.tabIndex >= 0,
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!event.shiftKey && this.document.activeElement === last) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && this.document.activeElement === first) {
      event.preventDefault();
      last.focus();
    }
  }
}

function readInputValue(event: Event): string {
  return (event.target as HTMLInputElement).value;
}

function buildWeekdayLabels(dateLocale: string): WeekdayLabel[] {
  const firstDay = firstDayOfWeek(dateLocale);
  const sunday = new Date(2026, 1, 1);
  const shortFormatter = new Intl.DateTimeFormat(dateLocale, { weekday: 'short' });
  const longFormatter = new Intl.DateTimeFormat(dateLocale, { weekday: 'long' });
  return Array.from({ length: DAYS_IN_WEEK }, (_, index) => {
    const date = addDays(sunday, (firstDay + index) % DAYS_IN_WEEK);
    return { short: shortFormatter.format(date), long: longFormatter.format(date) };
  });
}

function buildCalendarCells(params: {
  month: Date;
  selectedIso: string;
  dateLocale: string;
  isDisabled: (iso: string) => boolean;
}): (CalendarCell | null)[] {
  const year = params.month.getFullYear();
  const month = params.month.getMonth();
  const startOffset = dayOffsetFromWeekStart(new Date(year, month, 1), params.dateLocale);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (CalendarCell | null)[] = Array.from({ length: startOffset }, () => null);
  const todayIso = dateToIso(new Date());
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = createDate(year, month, day);
    const iso = dateToIso(date);
    cells.push({
      iso,
      label: String(day),
      ariaLabel: formatLongDate(date, params.dateLocale),
      selected: iso === params.selectedIso,
      today: iso === todayIso,
      disabled: params.isDisabled(iso),
    });
  }
  while (cells.length % DAYS_IN_WEEK !== 0) cells.push(null);
  return cells;
}

function buildMonthOptions(params: { month: Date; dateLocale: string }): MonthOption[] {
  const year = params.month.getFullYear();
  const selectedMonth = params.month.getMonth();
  const shortMonthFormatter = new Intl.DateTimeFormat(params.dateLocale, { month: 'short' });
  const longMonthFormatter = new Intl.DateTimeFormat(params.dateLocale, { month: 'long' });
  return Array.from({ length: MONTHS_IN_YEAR }, (_, monthIndex) => {
    const date = createDate(year, monthIndex, 1);
    return {
      index: monthIndex,
      label: shortMonthFormatter.format(date),
      ariaLabel: longMonthFormatter.format(date),
      selected: monthIndex === selectedMonth,
    };
  });
}

function firstDayOfWeek(dateLocale: string): number {
  const locale = new Intl.Locale(dateLocale) as Intl.Locale & {
    getWeekInfo?: () => { firstDay: number };
  };
  const firstDay = locale.getWeekInfo?.().firstDay;
  if (firstDay !== undefined) return firstDay % DAYS_IN_WEEK;
  return (locale.region ?? locale.maximize().region) === 'US' ? 0 : 1;
}

function dayOffsetFromWeekStart(date: Date, dateLocale: string): number {
  return (date.getDay() - firstDayOfWeek(dateLocale) + DAYS_IN_WEEK) % DAYS_IN_WEEK;
}
function formatDateForLocale(value: string, dateLocale: string): string {
  if (value === '') return '';
  const date = parseIsoDate(value);
  return date === null
    ? value
    : new Intl.DateTimeFormat(dateLocale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(date);
}
function formatLongDate(date: Date, dateLocale: string): string {
  return new Intl.DateTimeFormat(dateLocale, { dateStyle: 'long' }).format(date);
}
function parseDateForLocale(value: string, dateLocale: string): string | null {
  const normalized = value.trim();
  if (normalized === '') return '';
  const rawParts = normalized.split(DATE_SEPARATOR_PATTERN);
  if (rawParts.length !== 3) return null;
  const numericParts = rawParts.map(Number);
  if (numericParts.some((part) => !Number.isInteger(part))) return null;
  const order = datePartOrder(dateLocale);
  const day = numericParts[order.indexOf('day')];
  const month = numericParts[order.indexOf('month')];
  const year = numericParts[order.indexOf('year')];
  return isValidDateParts(year, month, day) ? datePartsToIso(year, month - 1, day) : null;
}
function datePartOrder(dateLocale: string): DatePart[] {
  return new Intl.DateTimeFormat(dateLocale, { day: 'numeric', month: 'numeric', year: 'numeric' })
    .formatToParts(new Date(2006, 10, 22))
    .filter((part): part is Intl.DateTimeFormatPart & { type: DatePart } =>
      ['day', 'month', 'year'].includes(part.type),
    )
    .map((part) => part.type);
}
function validIsoOrNull(value: string | undefined): string | null {
  return value === undefined || parseIsoDate(value) === null ? null : value;
}
function parseIsoDate(value: string): Date | null {
  if (!CANONICAL_ISO_DATE_PATTERN.test(value)) return null;
  const parts = value.split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!isValidDateParts(year, month, day)) return null;
  const date = createDate(year, month - 1, day);
  return dateToIso(date) === value ? date : null;
}
function isValidDateParts(year: number, month: number, day: number): boolean {
  const date = createDate(year, month - 1, day);
  return (
    Number.isInteger(year) &&
    year >= 0 &&
    year <= 9999 &&
    Number.isInteger(month) &&
    Number.isInteger(day) &&
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}
function startOfMonth(date: Date): Date {
  return createDate(date.getFullYear(), date.getMonth(), 1);
}
function dateInMonth(year: number, monthIndex: number, day: number): Date {
  return createDate(year, monthIndex, Math.min(day, daysInMonth(year, monthIndex)));
}
function changeMonth(date: Date, offset: number): Date {
  const target = createDate(date.getFullYear(), date.getMonth() + offset, 1);
  return dateInMonth(target.getFullYear(), target.getMonth(), date.getDate());
}
function changeYear(date: Date, offset: number): Date {
  return dateInMonth(date.getFullYear() + offset, date.getMonth(), date.getDate());
}
function addDays(date: Date, offset: number): Date {
  return createDate(date.getFullYear(), date.getMonth(), date.getDate() + offset);
}
function dateToIso(date: Date): string {
  return datePartsToIso(date.getFullYear(), date.getMonth(), date.getDate());
}
function datePartsToIso(year: number, monthIndex: number, day: number): string {
  return `${padYear(year)}-${padDatePart(monthIndex + 1)}-${padDatePart(day)}`;
}
function createDate(year: number, monthIndex: number, day: number): Date {
  const date = new Date(0);
  date.setHours(0, 0, 0, 0);
  date.setFullYear(year, monthIndex, day);
  return date;
}
function daysInMonth(year: number, monthIndex: number): number {
  return createDate(year, monthIndex + 1, 0).getDate();
}
function padYear(value: number): string {
  return String(value).padStart(4, '0');
}
function padDatePart(value: number): string {
  return String(value).padStart(2, '0');
}
function chunkRows<T>(items: readonly T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += size)
    rows.push(items.slice(index, index + size));
  return rows;
}
