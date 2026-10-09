import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  computed,
  effect,
  input,
  inject,
  output,
  signal,
  viewChildren,
} from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import {
  addDays,
  changeMonth,
  firstDayOfWeek,
  formatIsoDate,
  formatLongDate,
  parseIsoDate,
  startOfMonth,
} from '../localized-date-picker/localized-date-picker.utils';
import type { MiniCalendarLabels } from './calendar.models';

@Component({
  selector: 'ds-mini-calendar',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mini-calendar.component.html',
  styleUrl: './mini-calendar.component.scss',
})
export class MiniCalendarComponent {
  readonly id = input.required<string>();
  readonly date = input.required<string>();
  readonly today = input.required<string>();
  readonly dateLocale = input('en-US');
  readonly labels = input.required<MiniCalendarLabels>();
  readonly markedDates = input<readonly string[]>([]);
  readonly dateChange = output<string>();
  readonly monthChange = output<string>();
  /** @internal */ protected readonly month = signal('');
  /** @internal */ protected readonly focusedDate = signal('');
  private readonly buttons = viewChildren<ElementRef<HTMLButtonElement>>('dayButton');
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly syncDate = effect(() => {
    const date = this.date();
    if (!parseIsoDate(date)) return;
    this.month.set(date.slice(0, 7) + '-01');
    this.focusedDate.set(date);
  });
  /** @internal */ protected readonly monthTitle = computed(() => {
    const date = parseIsoDate(this.month());
    return date
      ? new Intl.DateTimeFormat(this.dateLocale(), { month: 'long', year: 'numeric' }).format(date)
      : '';
  });
  /** @internal */ protected readonly weekdays = computed(() =>
    Array.from({ length: 7 }, (_, offset) => {
      const day = addDays(new Date(2026, 0, 4), firstDayOfWeek(this.dateLocale()) + offset);
      return {
        short: new Intl.DateTimeFormat(this.dateLocale(), { weekday: 'narrow' }).format(day),
        long: new Intl.DateTimeFormat(this.dateLocale(), { weekday: 'long' }).format(day),
      };
    }),
  );
  /** @internal */ protected readonly weeks = computed(() => {
    const month = parseIsoDate(this.month());
    if (!month) return [];
    const first = startOfMonth(month);
    const offset = (first.getDay() - firstDayOfWeek(this.dateLocale()) + 7) % 7;
    const start = addDays(first, -offset);
    return Array.from({ length: 6 }, (_, week) =>
      Array.from({ length: 7 }, (_, column) => {
        const day = addDays(start, week * 7 + column);
        const iso = formatIsoDate(day);
        return {
          iso,
          number: day.getDate(),
          label: formatLongDate(day, this.dateLocale()),
          outside: day.getMonth() !== month.getMonth(),
          marked: this.markedDates().includes(iso),
        };
      }),
    );
  });
  /** @internal */ protected moveMonth(offset: number): void {
    const date = parseIsoDate(this.focusedDate()) ?? parseIsoDate(this.month());
    if (!date) return;
    const next = changeMonth(date, offset);
    this.month.set(formatIsoDate(startOfMonth(next)));
    this.focusedDate.set(formatIsoDate(next));
    this.monthChange.emit(this.month());
  }
  /** @internal */ protected select(date: string): void {
    this.dateChange.emit(date);
  }
  /** @internal */ protected navigate(event: KeyboardEvent, date: string): void {
    const current = parseIsoDate(date);
    if (!current) return;
    let next: Date;
    switch (event.key) {
      case 'ArrowLeft':
        next = addDays(current, -1);
        break;
      case 'ArrowRight':
        next = addDays(current, 1);
        break;
      case 'ArrowUp':
        next = addDays(current, -7);
        break;
      case 'ArrowDown':
        next = addDays(current, 7);
        break;
      case 'Home':
        next = addDays(current, -((current.getDay() - firstDayOfWeek(this.dateLocale()) + 7) % 7));
        break;
      case 'End':
        next = addDays(
          current,
          6 - ((current.getDay() - firstDayOfWeek(this.dateLocale()) + 7) % 7),
        );
        break;
      case 'PageUp':
        next = changeMonth(current, event.shiftKey ? -12 : -1);
        break;
      case 'PageDown':
        next = changeMonth(current, event.shiftKey ? 12 : 1);
        break;
      default:
        return;
    }
    event.preventDefault();
    const iso = formatIsoDate(next);
    this.focusedDate.set(iso);
    if (iso.slice(0, 7) !== this.month().slice(0, 7)) {
      this.month.set(formatIsoDate(startOfMonth(next)));
      this.monthChange.emit(this.month());
    }
    // The grid has one tab stop; arrow movement does not commit a selected date.
    this.changeDetector.detectChanges();
    this.buttons()
      .find((button) => button.nativeElement.dataset['date'] === iso)
      ?.nativeElement.focus();
  }
}
