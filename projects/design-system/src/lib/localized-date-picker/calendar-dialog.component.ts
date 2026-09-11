import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import {
  addDays,
  changeMonth,
  changeYear,
  createLocalDate,
  dateInMonth,
  dayOffsetFromWeekStart,
  daysInMonth,
  firstDayOfWeek,
  formatIsoDate,
  formatLongDate,
  intervalCrossesDisabledDate,
  isDateUnavailable,
  parseIsoDate,
  startOfMonth,
} from './localized-date-picker.utils';

export interface CalendarDialogLabels {
  readonly dialog: string;
  readonly previousMonth: string;
  readonly nextMonth: string;
  readonly openMonthYearPicker: string;
  readonly previousYear: string;
  readonly nextYear: string;
  readonly clear: string;
  readonly close: string;
  readonly keyboardHelp: string;
}

export type CalendarActiveBoundary = 'single' | 'start' | 'end';

interface CalendarCell {
  readonly iso: string;
  readonly label: string;
  readonly ariaLabel: string;
  readonly selected: boolean;
  readonly rangeStart: boolean;
  readonly rangeEnd: boolean;
  readonly inRange: boolean;
  readonly today: boolean;
  readonly disabled: boolean;
}

interface MonthOption {
  readonly index: number;
  readonly label: string;
  readonly ariaLabel: string;
  readonly selected: boolean;
}

interface WeekdayLabel {
  readonly short: string;
  readonly long: string;
}

type CalendarMode = 'days' | 'monthYear';

const DAYS_IN_WEEK = 7;
const MONTHS_IN_YEAR = 12;
const MONTH_GRID_COLUMNS = 3;

@Component({
  selector: 'ds-calendar-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './calendar-dialog.component.html',
  styleUrl: './calendar-dialog.component.scss',
})
export class CalendarDialogComponent {
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly dialogElement = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly closeButtonElement =
    viewChild.required<ElementRef<HTMLButtonElement>>('closeButton');
  private readonly dayButtonElements = viewChildren<ElementRef<HTMLButtonElement>>('dayButton');
  private readonly monthButtonElements = viewChildren<ElementRef<HTMLButtonElement>>('monthButton');

  readonly dialogId = input.required<string>();
  readonly dateLocale = input.required<string>();
  readonly labels = input.required<CalendarDialogLabels>();
  readonly required = input.required<boolean>();
  readonly canClear = input.required<boolean>();
  readonly disabled = input.required<boolean>();
  readonly readonly = input.required<boolean>();
  readonly selectedDate = input('');
  readonly rangeStart = input('');
  readonly rangeEnd = input('');
  readonly activeBoundary = input<CalendarActiveBoundary>('single');
  readonly activeBoundaryLabel = input('');
  readonly min = input<string>();
  readonly max = input<string>();
  readonly disabledDates = input<readonly string[]>();

  readonly dateSelected = output<string>();
  readonly cleared = output<void>();
  readonly closed = output<void>();

  /** @internal */
  protected readonly calendarMode = signal<CalendarMode>('days');

  /** @internal */
  protected readonly visibleMonth = signal(startOfMonth(new Date()));

  /** @internal */
  protected readonly focusedIso = signal('');

  /** @internal */
  protected readonly focusedMonthIndex = signal(0);

  /** @internal */
  protected readonly monthYearPanelId = computed(() => `${this.dialogId()}MonthYear`);

  /** @internal */
  protected readonly monthHeadingId = computed(() => `${this.dialogId()}MonthHeading`);

  /** @internal */
  protected readonly keyboardHelpId = computed(() => `${this.dialogId()}KeyboardHelp`);

  /** @internal */
  protected readonly activeBoundaryId = computed(() => `${this.dialogId()}ActiveBoundary`);

  /** @internal */
  protected readonly monthLabel = computed(() =>
    new Intl.DateTimeFormat(this.dateLocale(), { month: 'long', year: 'numeric' }).format(
      this.visibleMonth(),
    ),
  );

  /** @internal */
  protected readonly visibleYearLabel = computed(() => String(this.visibleMonth().getFullYear()));

  /** @internal */
  protected readonly monthOptions = computed(() => this.buildMonthOptions());

  /** @internal */
  protected readonly monthRows = computed(() => chunkRows(this.monthOptions(), MONTH_GRID_COLUMNS));

  /** @internal */
  protected readonly weekdayLabels = computed(() => this.buildWeekdayLabels());

  /** @internal */
  protected readonly calendarRows = computed(() =>
    chunkRows(this.buildCalendarCells(), DAYS_IN_WEEK),
  );

  private readonly openState = signal(false);
  private returnFocusElement: HTMLElement | null = null;
  private closeCompleted = true;

  private readonly selectionSyncEffect = effect(() => {
    const preferred = this.preferredSelectedIso();
    const parsed = parseIsoDate(preferred);
    if (parsed === null) return;
    this.visibleMonth.set(startOfMonth(parsed));
    this.focusedIso.set(preferred);
    this.focusedMonthIndex.set(parsed.getMonth());
  });

  private readonly interactiveStateEffect = effect(() => {
    if ((this.disabled() || this.readonly()) && this.openState()) this.close();
  });

  open(trigger: HTMLElement, preferredIso = ''): boolean {
    if (!this.isBrowser || this.disabled() || this.readonly()) return false;
    const focusIso = this.initialFocusableIso(preferredIso);
    const focusDate = parseIsoDate(focusIso);
    if (focusDate !== null) {
      this.visibleMonth.set(startOfMonth(focusDate));
      this.focusedMonthIndex.set(focusDate.getMonth());
    }
    this.focusedIso.set(focusIso);
    this.calendarMode.set('days');
    this.returnFocusElement = trigger;
    this.closeCompleted = false;
    this.openState.set(true);
    const dialog = this.dialogElement().nativeElement;
    if (!dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
    this.changeDetectorRef.detectChanges();
    this.focusCurrentDayOrClose();
    return true;
  }

  close(): void {
    if (!this.openState() && this.closeCompleted) return;
    this.openState.set(false);
    this.calendarMode.set('days');
    if (this.isBrowser) {
      const dialog = this.dialogElement().nativeElement;
      if (dialog.open) {
        if (typeof dialog.close === 'function') dialog.close();
        else dialog.removeAttribute('open');
      }
    }
    this.completeClose();
  }

  /** @internal */
  protected onDialogClosed(): void {
    if (this.closeCompleted) return;
    this.openState.set(false);
    this.calendarMode.set('days');
    this.completeClose();
  }

  /** @internal */
  protected onDialogCancel(event: Event): void {
    event.preventDefault();
    this.close();
  }

  /** @internal */
  protected onDialogClick(event: MouseEvent): void {
    if (event.target === this.dialogElement().nativeElement) this.close();
  }

  /** @internal */
  protected onDialogKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
    } else if (event.key === 'Tab') {
      this.keepTabFocusInsideDialog(event);
    }
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
    if (this.disabled() || this.readonly()) return;
    const currentFocus = parseIsoDate(this.focusedIso()) ?? this.visibleMonth();
    const target = dateInMonth(
      this.visibleMonth().getFullYear(),
      monthIndex,
      currentFocus.getDate(),
    );
    const targetIso = safeFormatIsoDate(target);
    const resolved = targetIso === null ? null : this.resolveAvailableIso(targetIso, 1);
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
    if (this.disabled() || this.readonly() || this.isDateUnavailableForSelection(iso)) return;
    this.dateSelected.emit(iso);
  }

  /** @internal */
  protected requestClear(): void {
    if (this.disabled() || this.readonly() || this.required() || !this.canClear()) return;
    this.cleared.emit();
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
    } else if (event.key === 'End') {
      target = addDays(date, DAYS_IN_WEEK - 1 - dayOffsetFromWeekStart(date, this.dateLocale()));
    } else if (event.key === 'PageUp') {
      target = event.shiftKey ? changeYear(date, -1) : changeMonth(date, -1);
      direction = -1;
    } else if (event.key === 'PageDown') {
      target = event.shiftKey ? changeYear(date, 1) : changeMonth(date, 1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.selectDate(iso);
      return;
    }
    if (target === null) return;
    event.preventDefault();
    const targetIso = safeFormatIsoDate(target);
    const resolved = targetIso === null ? null : this.resolveAvailableIso(targetIso, direction);
    const resolvedDate = resolved === null ? null : parseIsoDate(resolved);
    if (resolvedDate === null || resolved === null) return;
    this.focusedIso.set(resolved);
    this.visibleMonth.set(startOfMonth(resolvedDate));
    this.focusedMonthIndex.set(resolvedDate.getMonth());
    this.changeDetectorRef.detectChanges();
    this.focusDay(resolved);
  }

  private preferredSelectedIso(): string {
    if (this.activeBoundary() === 'single') return this.selectedDate();
    if (this.activeBoundary() === 'end') return this.rangeEnd() || this.rangeStart();
    return this.rangeStart();
  }

  private initialFocusableIso(preferredIso: string): string {
    const preferred =
      parseIsoDate(preferredIso) === null ? this.preferredSelectedIso() : preferredIso;
    if (parseIsoDate(preferred) !== null && !this.isDateUnavailableForSelection(preferred)) {
      return preferred;
    }
    const today = safeFormatIsoDate(new Date());
    if (today === null) return '';
    return this.resolveAvailableIso(today, 1) ?? this.resolveAvailableIso(today, -1) ?? '';
  }

  private isDateUnavailableForSelection(iso: string): boolean {
    if (
      isDateUnavailable(iso, {
        min: this.min(),
        max: this.max(),
        disabledDates: this.disabledDates(),
      })
    ) {
      return true;
    }
    return (
      this.activeBoundary() === 'end' &&
      parseIsoDate(this.rangeStart()) !== null &&
      intervalCrossesDisabledDate(this.rangeStart(), iso, this.disabledDates())
    );
  }

  private resolveAvailableIso(candidate: string, direction: 1 | -1): string | null {
    let date = parseIsoDate(candidate);
    if (date === null) return null;
    const min = validIsoOrNull(this.min());
    const max = validIsoOrNull(this.max());
    let iso = candidate;
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
    while (this.isDateUnavailableForSelection(iso)) {
      if (this.intervalRemainsBlocked(iso, direction)) return null;
      date = addDays(date, direction);
      const nextIso = safeFormatIsoDate(date);
      if (nextIso === null) return null;
      iso = nextIso;
      if ((min !== null && iso < min) || (max !== null && iso > max)) return null;
    }
    return iso;
  }

  private intervalRemainsBlocked(candidate: string, direction: 1 | -1): boolean {
    const start = this.rangeStart();
    if (
      this.activeBoundary() !== 'end' ||
      parseIsoDate(start) === null ||
      !intervalCrossesDisabledDate(start, candidate, this.disabledDates())
    ) {
      return false;
    }
    return (candidate >= start && direction === 1) || (candidate <= start && direction === -1);
  }

  private changeVisibleMonth(offset: number): void {
    const focusDate = parseIsoDate(this.focusedIso()) ?? this.visibleMonth();
    const targetIso = safeFormatIsoDate(changeMonth(focusDate, offset));
    const resolved =
      targetIso === null ? null : this.resolveAvailableIso(targetIso, offset < 0 ? -1 : 1);
    this.moveFocusToResolvedDate(resolved);
  }

  private changeVisibleYear(offset: number): void {
    const focusDate = parseIsoDate(this.focusedIso()) ?? this.visibleMonth();
    const targetIso = safeFormatIsoDate(changeYear(focusDate, offset));
    const resolved =
      targetIso === null ? null : this.resolveAvailableIso(targetIso, offset < 0 ? -1 : 1);
    this.moveFocusToResolvedDate(resolved);
  }

  private moveFocusToResolvedDate(resolved: string | null): void {
    const resolvedDate = resolved === null ? null : parseIsoDate(resolved);
    if (resolvedDate === null || resolved === null) return;
    this.focusedIso.set(resolved);
    this.visibleMonth.set(startOfMonth(resolvedDate));
    this.focusedMonthIndex.set(resolvedDate.getMonth());
  }

  private buildWeekdayLabels(): WeekdayLabel[] {
    const firstDay = firstDayOfWeek(this.dateLocale());
    const sunday = createLocalDate(2026, 1, 1);
    const shortFormatter = new Intl.DateTimeFormat(this.dateLocale(), { weekday: 'short' });
    const longFormatter = new Intl.DateTimeFormat(this.dateLocale(), { weekday: 'long' });
    return Array.from({ length: DAYS_IN_WEEK }, (_, index) => {
      const date = addDays(sunday, (firstDay + index) % DAYS_IN_WEEK);
      return { short: shortFormatter.format(date), long: longFormatter.format(date) };
    });
  }

  private buildCalendarCells(): (CalendarCell | null)[] {
    const year = this.visibleMonth().getFullYear();
    const month = this.visibleMonth().getMonth();
    const startOffset = dayOffsetFromWeekStart(createLocalDate(year, month, 1), this.dateLocale());
    const cells: (CalendarCell | null)[] = Array.from({ length: startOffset }, () => null);
    const todayIso = safeFormatIsoDate(new Date());
    const rangeStart = this.rangeStart();
    const rangeEnd = this.rangeEnd();
    const hasRange = parseIsoDate(rangeStart) !== null && parseIsoDate(rangeEnd) !== null;
    const rangeLower = rangeStart <= rangeEnd ? rangeStart : rangeEnd;
    const rangeUpper = rangeStart <= rangeEnd ? rangeEnd : rangeStart;
    for (let day = 1; day <= daysInMonth(year, month); day += 1) {
      const date = createLocalDate(year, month, day);
      const iso = formatIsoDate(date);
      const rangeStartSelected = this.activeBoundary() !== 'single' && iso === rangeStart;
      const rangeEndSelected = this.activeBoundary() !== 'single' && iso === rangeEnd;
      const inRange = hasRange && iso > rangeLower && iso < rangeUpper;
      const selected =
        this.activeBoundary() === 'single'
          ? iso === this.selectedDate()
          : rangeStartSelected || rangeEndSelected || inRange;
      cells.push({
        iso,
        label: String(day),
        ariaLabel: formatLongDate(date, this.dateLocale()),
        selected,
        rangeStart: rangeStartSelected,
        rangeEnd: rangeEndSelected,
        inRange,
        today: iso === todayIso,
        disabled: this.isDateUnavailableForSelection(iso),
      });
    }
    while (cells.length % DAYS_IN_WEEK !== 0) cells.push(null);
    return cells;
  }

  private buildMonthOptions(): MonthOption[] {
    const year = this.visibleMonth().getFullYear();
    const selectedMonth = this.visibleMonth().getMonth();
    const shortMonthFormatter = new Intl.DateTimeFormat(this.dateLocale(), { month: 'short' });
    const longMonthFormatter = new Intl.DateTimeFormat(this.dateLocale(), { month: 'long' });
    return Array.from({ length: MONTHS_IN_YEAR }, (_, monthIndex) => {
      const date = createLocalDate(year, monthIndex, 1);
      return {
        index: monthIndex,
        label: shortMonthFormatter.format(date),
        ariaLabel: longMonthFormatter.format(date),
        selected: monthIndex === selectedMonth,
      };
    });
  }

  private completeClose(): void {
    if (this.closeCompleted) return;
    this.closeCompleted = true;
    this.closed.emit();
    this.changeDetectorRef.detectChanges();
    if (this.isBrowser) this.returnFocusElement?.focus();
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
    const dialog = this.dialogElement().nativeElement;
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

function safeFormatIsoDate(date: Date): string | null {
  try {
    return formatIsoDate(date);
  } catch {
    return null;
  }
}

function validIsoOrNull(value: string | undefined): string | null {
  return value === undefined || parseIsoDate(value) === null ? null : value;
}

function chunkRows<T>(items: readonly T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }
  return rows;
}
