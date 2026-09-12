import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Injector,
  PLATFORM_ID,
  afterNextRender,
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
  parseTime,
  resolveTimePickerMode,
  startOfMonth,
} from './localized-date-picker.utils';
import {
  LocalizedTimePickerMode,
  TemporalBoundary,
  TemporalKind,
} from './localized-temporal-picker.types';
import { SegmentedTimeInputComponent } from './segmented-time-input.component';

export interface TemporalEndpointDraft {
  readonly date: string | null;
  readonly time: string | null;
  readonly sourceInvalid?: boolean;
}

export interface TemporalRangeDraft {
  readonly start: TemporalEndpointDraft;
  readonly end: TemporalEndpointDraft;
}

export interface CalendarDialogLabels {
  readonly dialog: string;
  readonly previousMonth: string;
  readonly nextMonth: string;
  readonly openMonthYearPicker: string;
  readonly previousYear: string;
  readonly nextYear: string;
  readonly clear: string;
  readonly cancel: string;
  readonly done: string;
  readonly today: string;
  readonly now: string;
  readonly timeInput: string;
  readonly hour: string;
  readonly minute: string;
  readonly keyboardHelp: string;
  readonly announceRangePreview: (start: string, end: string) => string;
}

interface LegacyCalendarDialogLabels {
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

interface CalendarCell {
  readonly iso: string;
  readonly label: string;
  readonly ariaLabel: string;
  readonly selected: boolean;
  readonly rangeStart: boolean;
  readonly rangeEnd: boolean;
  readonly inRange: boolean;
  readonly preview: boolean;
  readonly previewEnd: boolean;
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
  imports: [SegmentedTimeInputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './calendar-dialog.component.html',
  styleUrl: './calendar-dialog.component.scss',
})
export class CalendarDialogComponent {
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly dialogElement = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly closeButtonElement =
    viewChild.required<ElementRef<HTMLButtonElement>>('closeButton');
  private readonly dayButtonElements = viewChildren<ElementRef<HTMLButtonElement>>('dayButton');
  private readonly monthButtonElements = viewChildren<ElementRef<HTMLButtonElement>>('monthButton');
  private readonly segmentedTimeInputs = viewChildren(SegmentedTimeInputComponent);

  readonly dialogId = input.required<string>();
  readonly dateLocale = input('en-US');
  readonly labels = input.required<CalendarDialogLabels | LegacyCalendarDialogLabels>();
  readonly kind = input<TemporalKind>('date');
  readonly range = input(false);
  readonly draft = input<TemporalRangeDraft>(emptyDraft());
  readonly canConfirm = input(false);
  readonly timePickerMode = input<LocalizedTimePickerMode>('auto');
  readonly required = input(false);
  readonly canClear = input(true);
  readonly disabled = input(false);
  readonly readonly = input(false);
  readonly selectedDate = input('');
  readonly rangeStart = input('');
  readonly rangeEnd = input('');
  readonly activeBoundary = input<TemporalBoundary>('single');
  readonly activeBoundaryLabel = input('');
  readonly startTimeLabel = input('');
  readonly endTimeLabel = input('');
  readonly min = input<string>();
  readonly max = input<string>();
  readonly disabledDates = input<readonly string[]>();

  readonly draftChange = output<TemporalRangeDraft>();
  readonly activeBoundaryChange = output<TemporalBoundary>();
  readonly previewEnd = output<string | null>();
  readonly done = output<void>();
  readonly cancelled = output<void>();
  readonly cleared = output<void>();
  readonly dateSelected = output<string>();
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

  /** @internal */
  protected readonly effectiveTimePickerMode = signal<'native' | 'custom'>('custom');

  /** @internal */
  protected readonly previewIso = signal<string | null>(null);

  private readonly dateSelectionBoundary = signal<'start' | 'end'>('start');
  private readonly timeSelectionBoundary = signal<'start' | 'end'>('start');

  /** @internal */
  protected readonly showsDate = computed(() => this.kind() !== 'time');

  /** @internal */
  protected readonly showsTime = computed(() => this.kind() !== 'date');

  /** @internal */
  protected readonly temporalLabels = computed(() => {
    const labels = this.labels();
    return isCalendarDialogLabels(labels) ? labels : null;
  });

  /** @internal */
  protected readonly showsTimePanel = computed(
    () => this.showsTime() && this.temporalLabels() !== null,
  );

  /** @internal */
  protected readonly timeBoundaries = computed<readonly ('start' | 'end')[]>(() =>
    this.range() ? ['start', 'end'] : ['start'],
  );

  /** @internal */
  protected readonly statusText = computed(() => {
    const active = this.activeBoundaryLabel();
    const preview = this.previewIso();
    const start = this.effectiveRangeStart();
    if (preview === null || parseIsoDate(start) === null) return active;
    const startDate = parseIsoDate(start);
    const endDate = parseIsoDate(preview);
    if (startDate === null || endDate === null) return active;
    const announcement = this.temporalLabels()?.announceRangePreview(
      formatLongDate(startDate, this.dateLocale()),
      formatLongDate(endDate, this.dateLocale()),
    );
    return [active, announcement].filter(Boolean).join('. ');
  });

  /** @internal */
  protected readonly todayUnavailable = computed(() => {
    const today = safeFormatIsoDate(new Date());
    return today === null || this.isTodayUnavailable(today);
  });

  /** @internal */
  protected readonly nowUnavailable = computed(() => {
    const now = new Date();
    const date = safeFormatIsoDate(now);
    const time = formatLocalTime(now);
    return (
      (this.kind() !== 'time' && (date === null || this.isDateUnavailableForSelection(date))) ||
      !this.isTimeAvailable(time, this.kind() === 'time' ? null : date)
    );
  });

  /** @internal */
  protected readonly cancelLabel = computed(() => {
    const labels = this.labels();
    return isCalendarDialogLabels(labels) ? labels.cancel : labels.close;
  });

  /** @internal */
  protected readonly doneLabel = computed(() => this.temporalLabels()?.done ?? null);

  /** @internal */
  protected readonly todayLabel = computed(() => this.temporalLabels()?.today ?? null);

  /** @internal */
  protected readonly nowLabel = computed(() => this.temporalLabels()?.now ?? null);

  /** @internal */
  protected readonly hourLabel = computed(() => this.temporalLabels()?.hour ?? '');

  /** @internal */
  protected readonly minuteLabel = computed(() => this.temporalLabels()?.minute ?? '');

  /** @internal */
  protected readonly timeInputLabel = computed(() => this.temporalLabels()?.timeInput ?? '');

  private readonly openState = signal(false);

  /** @internal */
  protected readonly contentRendered = computed(() => this.isBrowser && this.openState());

  private returnFocusElement: HTMLElement | null = null;
  private closeCompleted = true;
  private readonly transactionDraft = signal<TemporalRangeDraft | null>(null);
  private nativeTimeChangePending = false;

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

  private readonly draftSyncEffect = effect(() => {
    const draft = this.draft();
    if (this.openState()) {
      this.transactionDraft.set(draft);
      this.nativeTimeChangePending = false;
    }
  });

  open(trigger: HTMLElement, preferredIso = ''): boolean {
    if (!this.isBrowser || this.disabled() || this.readonly()) return false;
    this.transactionDraft.set(this.draft());
    this.dateSelectionBoundary.set(this.initialDateSelectionBoundary());
    this.timeSelectionBoundary.set(this.initialTimeSelectionBoundary());
    if (this.range()) {
      this.activeBoundaryChange.emit(
        this.showsDate() ? this.dateSelectionBoundary() : this.timeSelectionBoundary(),
      );
    }
    const coarsePointer =
      this.timePickerMode() === 'auto' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(hover: none) and (pointer: coarse)').matches
        : false;
    this.effectiveTimePickerMode.set(
      resolveTimePickerMode(this.timePickerMode(), true, coarsePointer),
    );
    const focusIso = this.initialFocusableIso(preferredIso);
    const focusDate = parseIsoDate(focusIso);
    if (focusDate !== null) {
      this.visibleMonth.set(startOfMonth(focusDate));
      this.focusedMonthIndex.set(focusDate.getMonth());
    }
    this.focusedIso.set(focusIso);
    this.setPreview(null);
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
    this.focusInitialControl();
    return true;
  }

  close(): void {
    if (!this.openState() && this.closeCompleted) return;
    this.openState.set(false);
    this.calendarMode.set('days');
    this.setPreview(null);
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
    this.setPreview(null);
    this.completeClose();
  }

  /** @internal */
  protected onDialogCancel(event: Event): void {
    event.preventDefault();
    this.requestCancel();
  }

  /** @internal */
  protected onDialogClick(event: MouseEvent): void {
    if (event.target === this.dialogElement().nativeElement) this.requestCancel();
  }

  /** @internal */
  protected onDialogKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.requestCancel();
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
    const current = this.currentTransactionDraft();
    let next: TemporalRangeDraft;
    if (!this.range()) {
      next = {
        start: withoutSourceInvalid({ ...current.start, date: iso }),
        end: current.end,
      };
    } else {
      const boundary = this.dateSelectionBoundary();
      next = normalizeDraftDates(
        boundary === 'start'
          ? {
              start: withoutSourceInvalid({ ...current.start, date: iso }),
              end: current.end,
            }
          : {
              start: current.start,
              end: withoutSourceInvalid({ ...current.end, date: iso }),
            },
      );
      const nextBoundary = boundary === 'start' ? 'end' : 'start';
      this.dateSelectionBoundary.set(nextBoundary);
      this.activeBoundaryChange.emit(nextBoundary);
    }
    this.setPreview(null);
    this.emitDraftChange(next);
  }

  /** @internal */
  protected requestClear(): void {
    if (this.disabled() || this.readonly() || !this.canClear()) return;
    for (const input of this.segmentedTimeInputs()) input.clearValue();
    this.dateSelectionBoundary.set('start');
    this.timeSelectionBoundary.set('start');
    this.transactionDraft.set(emptyDraft());
    this.cleared.emit();
  }

  /** @internal */
  protected requestCancel(): void {
    if (this.closeCompleted) return;
    this.cancelled.emit();
    this.close();
  }

  /** @internal */
  protected requestDone(valueAlreadyEmitted = false): void {
    if (this.disabled() || this.readonly() || this.closeCompleted) return;
    let valueEmitted = false;
    for (const input of this.segmentedTimeInputs()) {
      valueEmitted = input.finalizePendingEdit() || valueEmitted;
    }
    if (valueAlreadyEmitted || valueEmitted || this.nativeTimeChangePending) {
      afterNextRender(() => this.finishDoneRequest(), { injector: this.injector });
      return;
    }
    this.finishDoneRequest();
  }

  private finishDoneRequest(): void {
    if (this.disabled() || this.readonly() || this.closeCompleted) return;
    if (!this.canConfirm()) return;
    this.done.emit();
    this.close();
  }

  /** @internal */
  protected selectToday(): void {
    const today = safeFormatIsoDate(new Date());
    if (today === null || this.isTodayUnavailable(today) || this.disabled() || this.readonly()) {
      return;
    }
    this.selectDate(today);
  }

  /** @internal */
  protected selectNow(): void {
    const now = new Date();
    const date = safeFormatIsoDate(now);
    if (this.nowUnavailable() || this.disabled() || this.readonly()) return;
    this.emitEndpointChange(this.range() ? this.timeSelectionBoundary() : 'start', {
      ...(this.kind() === 'datetime' && date !== null ? { date } : {}),
      time: formatLocalTime(now),
    });
  }

  /** @internal */
  protected onTimeChange(boundary: 'start' | 'end', value: string): void {
    if (this.disabled() || this.readonly()) return;
    if (parseTime(value) === null) {
      this.emitEndpointChange(boundary, { time: null }, true);
      return;
    }
    this.emitEndpointChange(boundary, { time: value });
  }

  /** @internal */
  protected onTimeIncomplete(boundary: 'start' | 'end'): void {
    if (this.disabled() || this.readonly()) return;
    this.emitEndpointChange(boundary, { time: null }, true);
  }

  /** @internal */
  protected onNativeTimeInput(boundary: 'start' | 'end', event: Event): void {
    if (this.disabled() || this.readonly()) return;
    this.nativeTimeChangePending = true;
    this.onTimeChange(boundary, (event.target as HTMLInputElement).value);
  }

  /** @internal */
  protected onNativeTimeKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    this.requestDone();
  }

  /** @internal */
  protected completeTimeEdit(boundary: 'start' | 'end'): void {
    this.setFocusedTimeBoundary(boundary);
  }

  /** @internal */
  protected setFocusedTimeBoundary(boundary: 'start' | 'end'): void {
    if (!this.range()) return;
    this.timeSelectionBoundary.set(boundary);
    this.activeBoundaryChange.emit(boundary);
  }

  /** @internal */
  protected timeValue(boundary: 'start' | 'end'): string | null {
    return this.currentTransactionDraft()[boundary].time;
  }

  /** @internal */
  protected nativeTimeMinFor(boundary: 'start' | 'end'): string | null {
    return projectedTimeLimit(
      this.kind(),
      this.min(),
      this.currentTransactionDraft()[boundary].date,
    );
  }

  /** @internal */
  protected nativeTimeMaxFor(boundary: 'start' | 'end'): string | null {
    return projectedTimeLimit(
      this.kind(),
      this.max(),
      this.currentTransactionDraft()[boundary].date,
    );
  }

  /** @internal */
  protected timeBoundaryLabel(boundary: 'start' | 'end'): string {
    if (!this.range()) return this.timeInputLabel();
    return boundary === 'start' ? this.startTimeLabel() : this.endTimeLabel();
  }

  /** @internal */
  protected timeSegmentLabel(boundary: 'start' | 'end', segment: 'hour' | 'minute'): string {
    const segmentLabel = segment === 'hour' ? this.hourLabel() : this.minuteLabel();
    return [this.timeBoundaryLabel(boundary), segmentLabel].filter(Boolean).join(': ');
  }

  /** @internal */
  protected onDayPointerEnter(iso: string): void {
    this.updatePreview(iso);
  }

  /** @internal */
  protected onDayFocus(iso: string): void {
    if (this.range()) this.activeBoundaryChange.emit(this.dateSelectionBoundary());
    this.updatePreview(iso);
  }

  /** @internal */
  protected onGridMouseLeave(event: MouseEvent): void {
    const grid = event.currentTarget as HTMLElement;
    if (!grid.contains(this.document.activeElement)) this.setPreview(null);
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
      if (event.key === 'Enter' && this.isFinalFilledEndpoint(iso)) {
        this.requestDone();
        return;
      }
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
    this.updatePreview(resolved);
  }

  private preferredSelectedIso(): string {
    if (!this.range()) return this.effectiveSingleDate();
    if (this.dateSelectionBoundary() === 'end') {
      return this.effectiveRangeEnd() || this.effectiveRangeStart();
    }
    return this.effectiveRangeStart();
  }

  private emitEndpointChange(
    boundary: 'start' | 'end',
    change: Partial<TemporalEndpointDraft>,
    sourceInvalid = false,
  ): void {
    const current = this.currentTransactionDraft();
    const endpoint = { ...current[boundary], ...change };
    const replacement: TemporalEndpointDraft = sourceInvalid
      ? { ...endpoint, sourceInvalid: true }
      : withoutSourceInvalid(endpoint);
    this.emitDraftChange({
      start: boundary === 'start' ? replacement : current.start,
      end: boundary === 'end' ? replacement : current.end,
    });
  }

  private currentTransactionDraft(): TemporalRangeDraft {
    return this.transactionDraft() ?? this.draft();
  }

  private emitDraftChange(next: TemporalRangeDraft): void {
    this.transactionDraft.set(next);
    this.draftChange.emit(next);
  }

  private updatePreview(iso: string): void {
    if (
      !this.range() ||
      this.dateSelectionBoundary() !== 'end' ||
      this.temporalLabels() === null ||
      parseIsoDate(this.effectiveRangeStart()) === null ||
      this.isDateUnavailableForSelection(iso)
    ) {
      return;
    }
    this.setPreview(iso);
  }

  private setPreview(value: string | null): void {
    if (this.previewIso() === value) return;
    this.previewIso.set(value);
    this.previewEnd.emit(value);
  }

  private isFinalFilledEndpoint(iso: string): boolean {
    if (!this.canConfirm()) return false;
    if (!this.range()) return iso === this.effectiveSingleDate();
    const start = this.effectiveRangeStart();
    const end = this.effectiveRangeEnd();
    if (start !== '' && end === '') return iso === start;
    if (start === '' && end !== '') return iso === end;
    return this.dateSelectionBoundary() === 'end' && end !== '' && iso === end;
  }

  private isTimeAvailable(time: string, date: string | null): boolean {
    if (parseTime(time) === null) return false;
    const min = projectedTimeLimit(this.kind(), this.min(), date);
    const max = projectedTimeLimit(this.kind(), this.max(), date);
    if (min !== null && time < min) return false;
    if (max !== null && time > max) return false;
    if (this.kind() === 'datetime' || !this.range() || this.timeSelectionBoundary() === 'start')
      return true;
    const other =
      this.timeSelectionBoundary() === 'end'
        ? this.currentTransactionDraft().start
        : this.currentTransactionDraft().end;
    if (date === null) {
      if (other.time === null) return true;
      return this.timeSelectionBoundary() === 'end' ? time >= other.time : time <= other.time;
    }
    if (other.date === null || other.time === null) return true;
    const dateOrder = date.localeCompare(other.date);
    const ordered = dateOrder === 0 ? time.localeCompare(other.time) : dateOrder;
    return this.timeSelectionBoundary() === 'end' ? ordered >= 0 : ordered <= 0;
  }

  private isTodayUnavailable(today: string): boolean {
    if (this.isDateUnavailableForSelection(today)) return true;
    const retainedTime = this.currentTransactionDraft()[this.dateSelectionBoundary()].time;
    return (
      this.kind() === 'datetime' &&
      retainedTime !== null &&
      !this.isTimeAvailable(retainedTime, today)
    );
  }

  private effectiveSingleDate(): string {
    return this.currentTransactionDraft().start.date ?? '';
  }

  private effectiveRangeStart(): string {
    return this.currentTransactionDraft().start.date ?? '';
  }

  private effectiveRangeEnd(): string {
    return this.currentTransactionDraft().end.date ?? '';
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
        min: projectedDateLimit(this.kind(), this.min()) ?? undefined,
        max: projectedDateLimit(this.kind(), this.max()) ?? undefined,
        disabledDates: this.disabledDates(),
      })
    ) {
      return true;
    }
    const otherDate =
      this.dateSelectionBoundary() === 'end'
        ? this.effectiveRangeStart()
        : this.effectiveRangeEnd();
    return (
      this.range() &&
      parseIsoDate(otherDate) !== null &&
      intervalCrossesDisabledDate(otherDate, iso, this.disabledDates())
    );
  }

  private resolveAvailableIso(candidate: string, direction: 1 | -1): string | null {
    let date = parseIsoDate(candidate);
    if (date === null) return null;
    const min = projectedDateLimit(this.kind(), this.min());
    const max = projectedDateLimit(this.kind(), this.max());
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
    const otherDate =
      this.dateSelectionBoundary() === 'end'
        ? this.effectiveRangeStart()
        : this.effectiveRangeEnd();
    if (
      !this.range() ||
      parseIsoDate(otherDate) === null ||
      !intervalCrossesDisabledDate(otherDate, candidate, this.disabledDates())
    ) {
      return false;
    }
    return (
      (candidate >= otherDate && direction === 1) || (candidate <= otherDate && direction === -1)
    );
  }

  private initialDateSelectionBoundary(): 'start' | 'end' {
    if (!this.range()) return 'start';
    const current = this.currentTransactionDraft();
    return current.start.date !== null && current.end.date === null ? 'end' : 'start';
  }

  private initialTimeSelectionBoundary(): 'start' | 'end' {
    if (!this.range()) return 'start';
    const current = this.currentTransactionDraft();
    const startComplete =
      parseTime(current.start.time ?? '') !== null &&
      (this.kind() === 'time' || parseIsoDate(current.start.date ?? '') !== null);
    const endComplete =
      parseTime(current.end.time ?? '') !== null &&
      (this.kind() === 'time' || parseIsoDate(current.end.date ?? '') !== null);
    return startComplete && !endComplete ? 'end' : 'start';
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
    const rangeStart = this.effectiveRangeStart();
    const rangeEnd = this.effectiveRangeEnd();
    const hasRange = parseIsoDate(rangeStart) !== null && parseIsoDate(rangeEnd) !== null;
    const rangeLower = rangeStart <= rangeEnd ? rangeStart : rangeEnd;
    const rangeUpper = rangeStart <= rangeEnd ? rangeEnd : rangeStart;
    const previewEnd = this.previewIso();
    const hasPreview =
      this.range() &&
      this.dateSelectionBoundary() === 'end' &&
      this.temporalLabels() !== null &&
      parseIsoDate(rangeStart) !== null &&
      previewEnd !== null &&
      parseIsoDate(previewEnd) !== null;
    const previewLower = previewEnd !== null && rangeStart <= previewEnd ? rangeStart : previewEnd;
    const previewUpper = previewEnd !== null && rangeStart <= previewEnd ? previewEnd : rangeStart;
    for (let day = 1; day <= daysInMonth(year, month); day += 1) {
      const date = createLocalDate(year, month, day);
      const iso = formatIsoDate(date);
      const rangeStartSelected = this.range() && iso === rangeStart;
      const rangeEndSelected = this.range() && iso === rangeEnd;
      const inRange = hasRange && iso > rangeLower && iso < rangeUpper;
      const selected = !this.range()
        ? iso === this.effectiveSingleDate()
        : rangeStartSelected || rangeEndSelected || inRange;
      const preview =
        hasPreview &&
        previewLower !== null &&
        previewUpper !== null &&
        iso >= previewLower &&
        iso <= previewUpper &&
        !selected;
      cells.push({
        iso,
        label: String(day),
        ariaLabel: formatLongDate(date, this.dateLocale()),
        selected,
        rangeStart: rangeStartSelected,
        rangeEnd: rangeEndSelected,
        inRange,
        preview,
        previewEnd: hasPreview && iso === previewEnd && !selected,
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
    this.transactionDraft.set(null);
    this.nativeTimeChangePending = false;
    this.changeDetectorRef.detectChanges();
    if (this.isBrowser) this.returnFocusElement?.focus();
  }

  private focusCurrentDayOrClose(): void {
    if (this.focusedIso() !== '' && this.focusDay(this.focusedIso())) return;
    this.closeButtonElement().nativeElement.focus();
  }

  private focusInitialControl(): void {
    if (this.showsDate()) {
      this.focusCurrentDayOrClose();
      return;
    }
    const firstTimeControl = this.dialogElement().nativeElement.querySelector<HTMLElement>(
      'ds-segmented-time-input button, input[type="time"]',
    );
    (firstTimeControl ?? this.closeButtonElement().nativeElement).focus();
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

function formatLocalTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function emptyDraft(): TemporalRangeDraft {
  return {
    start: { date: null, time: null },
    end: { date: null, time: null },
  };
}

function withoutSourceInvalid(endpoint: TemporalEndpointDraft): TemporalEndpointDraft {
  return { date: endpoint.date, time: endpoint.time };
}

function normalizeDraftDates(draft: TemporalRangeDraft): TemporalRangeDraft {
  const startDate = draft.start.date;
  const endDate = draft.end.date;
  if (startDate === null || endDate === null || startDate <= endDate) return draft;
  return {
    start: withoutSourceInvalid({ ...draft.start, date: endDate }),
    end: withoutSourceInvalid({ ...draft.end, date: startDate }),
  };
}

function isCanonicalDateTime(value: string): boolean {
  const [date = '', time = '', ...rest] = value.split('T');
  return rest.length === 0 && parseIsoDate(date) !== null && parseTime(time) !== null;
}

function projectedTimeLimit(
  kind: TemporalKind,
  value: string | undefined,
  activeDate: string | null,
): string | null {
  if (value === undefined) return null;
  if (kind === 'time') return parseTime(value) === null ? null : value;
  if (kind !== 'datetime' || !isCanonicalDateTime(value) || activeDate === null) return null;
  const [date, time] = value.split('T');
  return date === activeDate ? time : null;
}

function projectedDateLimit(kind: TemporalKind, value: string | undefined): string | null {
  if (value === undefined) return null;
  if (kind === 'date') return parseIsoDate(value) === null ? null : value;
  if (kind !== 'datetime' || !isCanonicalDateTime(value)) return null;
  return value.slice(0, 10);
}

function isCalendarDialogLabels(
  labels: CalendarDialogLabels | LegacyCalendarDialogLabels,
): labels is CalendarDialogLabels {
  return (
    'cancel' in labels &&
    'done' in labels &&
    'today' in labels &&
    'now' in labels &&
    'timeInput' in labels &&
    'hour' in labels &&
    'minute' in labels &&
    'announceRangePreview' in labels
  );
}

function chunkRows<T>(items: readonly T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }
  return rows;
}
