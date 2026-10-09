import { EN_LABELS, RU_LABELS, EN_MINI, RU_MINI } from './calendar-demo-labels';
import { DOCUMENT } from '@angular/common';
import { BreakpointObserver } from '@angular/cdk/layout';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { map } from 'rxjs';
import {
  CalendarComponent,
  MiniCalendarComponent,
  type CalendarEntry,
  type CalendarView,
  type CalendarDateSelection,
} from '@alittlemore.dev/design-system/calendar';
import { ModalDialogDirective, ThemeService } from '@alittlemore.dev/design-system';

@Component({
  selector: 'demo-calendar-preview',
  standalone: true,
  imports: [RouterLink, CalendarComponent, MiniCalendarComponent, ModalDialogDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './calendar-preview.component.html',
  styleUrl: './calendar-preview.component.scss',
})
export class CalendarPreviewComponent {
  private readonly changeDetector = inject(ChangeDetectorRef);
  protected readonly theme = inject(ThemeService);
  protected readonly locale = signal('en-US');
  protected readonly calendarFailed = signal(false);
  protected readonly date = signal('2026-10-09');
  protected readonly view = signal<CalendarView>('month');
  protected readonly labels = computed(() => (this.locale() === 'ru-RU' ? RU_LABELS : EN_LABELS));
  protected readonly miniLabels = computed(() => (this.locale() === 'ru-RU' ? RU_MINI : EN_MINI));
  protected readonly selected = signal<CalendarEntry | null>(null);
  protected readonly selectedDay = signal<string | null>(null);
  protected readonly detailDialog = viewChild.required(ModalDialogDirective);
  private readonly detailClose = viewChild.required<ElementRef<HTMLButtonElement>>('detailClose');
  protected readonly narrow = toSignal(
    inject(BreakpointObserver)
      .observe('(max-width: 767px)')
      .pipe(map((state) => state.matches)),
    { initialValue: false },
  );
  private readonly document = inject(DOCUMENT);
  protected retryCalendar(): void {
    this.document.defaultView?.location.reload();
  }
  private readonly responsiveView = effect(() => {
    this.view.set(this.narrow() ? 'agenda' : 'month');
  });
  protected readonly entries = computed<readonly CalendarEntry[]>(() => {
    const ru = this.locale() === 'ru-RU';
    const event = (id: string, title: string, date: string, end?: string): CalendarEntry => ({
      id,
      title,
      start: date,
      ...(end ? { end } : {}),
      allDay: !date.includes('T'),
      typeLabel: ru ? 'Событие' : 'Event',
      tone: 'accent',
      icon: 'calendar',
    });
    const birthday = (id: string, name: string, date: string): CalendarEntry => ({
      id,
      title: name,
      start: date,
      allDay: true,
      typeLabel: ru ? 'День рождения' : 'Birthday',
      tone: 'info',
      icon: 'people',
    });
    const memorable = (id: string, title: string, date: string): CalendarEntry => ({
      id,
      title,
      start: date,
      allDay: true,
      typeLabel: ru ? 'Памятная дата' : 'Memorable date',
      tone: 'neutral',
      icon: 'calendar',
    });
    return [
      event(
        'review',
        ru ? 'Обсуждение интерфейса' : 'Interface review',
        '2026-10-09T10:00:00Z',
        '2026-10-09T11:00:00Z',
      ),
      memorable(
        'launch',
        ru ? 'Годовщина запуска проекта' : 'Project launch anniversary',
        '2026-10-10',
      ),
      birthday('michael', ru ? 'Михаил Орлов' : 'Michael Orlov', '2026-10-10'),
      event(
        'team',
        ru ? 'Встреча команды' : 'Team meeting',
        '2026-10-10T09:00:00Z',
        '2026-10-10T10:00:00Z',
      ),
      event(
        'notes',
        ru ? 'Подготовить заметки к обсуждению' : 'Prepare notes for discussion',
        '2026-10-10T11:00:00Z',
        '2026-10-10T12:00:00Z',
      ),
      event(
        'call',
        ru ? 'Созвон с командой' : 'Call with the team',
        '2026-10-10T14:00:00Z',
        '2026-10-10T14:30:00Z',
      ),
      memorable(
        'community',
        ru ? 'День сообщества разработчиков' : 'Developer community day',
        '2026-10-10',
      ),
      birthday('anna', ru ? 'Анна Соколова' : 'Anna Sokolova', '2026-10-11'),
      memorable('meeting', ru ? 'Годовщина знакомства' : 'First meeting anniversary', '2026-10-11'),
      event(
        'planning',
        ru ? 'Планирование недели' : 'Weekly planning',
        '2026-10-12T09:00:00Z',
        '2026-10-12T10:00:00Z',
      ),
      event('trip', ru ? 'Поездка' : 'Trip', '2026-10-14', '2026-10-17'),
      birthday('elena', ru ? 'Елена Миронова' : 'Elena Mironova', '2026-10-16'),
      memorable('family', ru ? 'Семейная годовщина' : 'Family anniversary', '2026-10-18'),
      event(
        'demo',
        ru ? 'Демо проекта' : 'Project demo',
        '2026-10-21T15:00:00Z',
        '2026-10-21T16:00:00Z',
      ),
      birthday('alex', ru ? 'Алексей Волков' : 'Alex Volkov', '2026-10-23'),
      event(
        'meetup',
        ru ? 'Встреча сообщества' : 'Community meetup',
        '2026-10-28T18:00:00Z',
        '2026-10-28T20:00:00Z',
      ),
    ];
  });
  protected readonly markedDates = computed(() => [
    ...new Set(this.entries().map((entry) => entry.start.slice(0, 10))),
  ]);
  protected readonly dayEntries = computed(() =>
    this.entries().filter(
      (entry) =>
        entry.start.slice(0, 10) <= this.selectedDay()! &&
        (entry.end && entry.allDay
          ? entry.end.slice(0, 10) > this.selectedDay()!
          : (entry.end?.slice(0, 10) ?? entry.start.slice(0, 10)) >= this.selectedDay()!),
    ),
  );
  protected selectEntry(entry: CalendarEntry): void {
    this.selectedDay.set(null);
    this.selected.set(entry);
    this.changeDetector.detectChanges();
    if (this.detailDialog().isOpen()) this.detailClose().nativeElement.focus();
    this.detailDialog().open();
  }
  protected selectDay(selection: CalendarDateSelection): void {
    this.selected.set(null);
    this.selectedDay.set(selection.date);
    this.changeDetector.detectChanges();
    this.detailDialog().open();
  }
  protected chooseDate(date: string): void {
    this.date.set(date);
  }
  protected titleForDate(date: string): string {
    return new Intl.DateTimeFormat(this.locale(), { dateStyle: 'long', timeZone: 'UTC' }).format(
      new Date(`${date}T12:00:00Z`),
    );
  }
  protected entryTime(entry: CalendarEntry): string {
    return entry.allDay
      ? this.labels().allDay
      : new Intl.DateTimeFormat(this.locale(), {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: 'UTC',
        }).format(new Date(entry.start));
  }
}
