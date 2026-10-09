import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ErrorHandler,
  NgZone,
  ViewEncapsulation,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import type { Calendar, CalendarOptions, DatesSetInfo, EventDisplayInfo } from 'fullcalendar';
import { Temporal } from 'temporal-polyfill';
import {
  IconComponent,
  getIconPaths,
  type IconName,
} from '@alittlemore.dev/design-system/primitives';
import {
  SiteSelectComponent,
  type SiteSelectOption,
} from '@alittlemore.dev/design-system/primitives';
import type {
  CalendarDateSelection,
  CalendarEntry,
  CalendarLabels,
  CalendarRange,
  CalendarView,
} from './calendar.models';

interface CalendarRuntime {
  readonly Calendar: typeof Calendar;
  readonly plugins: NonNullable<CalendarOptions['plugins']>;
  readonly locales: NonNullable<CalendarOptions['locales']>;
}
let runtimePromise: Promise<CalendarRuntime> | null = null;
function loadRuntime(): Promise<CalendarRuntime> {
  return (runtimePromise ??= Promise.all([
    import('fullcalendar'),
    import('fullcalendar/daygrid'),
    import('fullcalendar/timegrid'),
    import('fullcalendar/list'),
    import('fullcalendar/multimonth'),
    import('fullcalendar/interaction'),
    import('fullcalendar/themes/classic'),
    import('fullcalendar/locales/ru'),
  ])
    .then(([core, dayGrid, timeGrid, list, multiMonth, interaction, classic, russian]) => ({
      Calendar: core.Calendar,
      plugins: [
        classic.default,
        dayGrid.default,
        timeGrid.default,
        list.default,
        multiMonth.default,
        interaction.default,
      ],
      locales: [russian.default],
    }))
    .catch((error: unknown) => {
      runtimePromise = null;
      throw error;
    }));
}

const VIEWS: Readonly<Record<CalendarView, string>> = {
  month: 'dayGridMonth',
  week: 'timeGridWeek',
  day: 'timeGridDay',
  agenda: 'listMonth',
  year: 'multiMonthYear',
};

@Component({
  selector: 'ds-calendar',
  standalone: true,
  imports: [IconComponent, SiteSelectComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.scss',
})
export class CalendarComponent {
  readonly id = input.required<string>();
  readonly date = input.required<string>();
  readonly today = input.required<string>();
  readonly labels = input.required<CalendarLabels>();
  readonly entries = input<readonly CalendarEntry[]>([]);
  readonly view = input<CalendarView>('month');
  readonly views = input<readonly CalendarView[]>(['month', 'week', 'day', 'agenda', 'year']);
  readonly dateLocale = input('en-US');
  readonly timeZone = input('UTC');
  readonly loading = input(false);
  readonly dateChange = output<string>();
  readonly viewChange = output<CalendarView>();
  readonly rangeChange = output<CalendarRange>();
  readonly dateSelected = output<CalendarDateSelection>();
  readonly entrySelected = output<CalendarEntry>();
  readonly loadError = output<void>();
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private readonly errorHandler = inject(ErrorHandler);
  private readonly runtime = signal<CalendarRuntime | null>(null);
  private readonly zone = inject(NgZone);
  private readonly surface = viewChild.required<ElementRef<HTMLElement>>('surface');
  private readonly calendar = signal<Calendar | null>(null);
  private lastOptions: CalendarOptions | null = null;
  /** @internal */ protected readonly ready = signal(false);
  /** @internal */ protected readonly failed = signal(false);
  /** @internal */ protected readonly title = signal('');
  /** @internal */ protected readonly viewOptions = computed<readonly SiteSelectOption[]>(() =>
    this.views().map((value) => ({ value, label: this.labels().views[value] })),
  );
  /** @internal */ protected readonly options = computed<CalendarOptions>(() => ({
    plugins: this.runtime()?.plugins ?? [],
    now: this.today(),
    locale: this.dateLocale().startsWith('ru') ? 'ru' : 'en',
    locales: this.runtime()?.locales ?? [],
    firstDay: this.dateLocale().startsWith('ru') ? 1 : 0,
    timeZone: this.timeZone(),
    height: 'auto',
    eventDisplay: 'block',
    headerToolbar: false,
    fixedWeekCount: false,
    dayMaxEvents: 3,
    eventInteractive: true,
    eventsHint: this.labels().calendar,
    allDayText: this.labels().allDay,
    noEventsText: this.labels().noEvents,
    moreLinkText: this.labels().more,
    eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false, omitZeroMinute: false },
    slotHeaderFormat: { hour: '2-digit', minute: '2-digit', hour12: false, omitZeroMinute: false },
    events: this.entries().map((entry) => ({
      id: entry.id,
      title: entry.title,
      start: entry.start,
      end: entry.end,
      allDay: entry.allDay,
      extendedProps: { typeLabel: entry.typeLabel, icon: entry.icon, tone: entry.tone ?? 'accent' },
    })),
    eventClass: (info) =>
      `ds-calendar-entry ds-calendar-entry-${info.event.extendedProps['tone']}${info.view.type === 'dayGridMonth' ? ' ds-calendar-month-entry' : ''}`,
    eventInnerClass: 'ds-calendar-entry-inner',
    eventContent: (info) => this.entryContent(info),
    rowEventClass: 'ds-calendar-row-entry',
    listItemEventClass: 'ds-calendar-list-entry',
    moreLinkClass: 'ds-calendar-more',
    dayHeaderClass: 'ds-calendar-day-header',
    dayCellInnerClass: (info) => {
      if (info.inPopover || info.view.type === 'multiMonthYear') return '';
      let rows = 3;
      if (info.view.type !== 'dayGridMonth') {
        const date = info.date.toISOString().slice(0, 10);
        rows = Math.min(
          3,
          this.entries().filter(
            (entry) =>
              entry.allDay &&
              entry.start.slice(0, 10) <= date &&
              (entry.end ? entry.end.slice(0, 10) > date : entry.start.slice(0, 10) === date),
          ).length,
        );
      }
      return `ds-calendar-day-entries-${rows}`;
    },
    datesSet: (info) => this.rangeSet(info),
    dateClick: (info) =>
      this.emit(() =>
        this.dateSelected.emit({
          date: info.dateStr.slice(0, 10),
          start: info.dateStr,
          allDay: info.allDay,
        }),
      ),
    moreLinkClick: (info) => {
      const date = this.dateAtZone(info.date);
      this.emit(() => this.dateSelected.emit({ date, start: date, allDay: true }));
      return 'none';
    },
    eventClick: (info) => {
      info.jsEvent.preventDefault();
      const entry = this.entries().find((item) => item.id === info.event.id);
      if (entry) this.emit(() => this.entrySelected.emit(entry));
    },
  }));
  private readonly sync = effect(() => {
    const api = this.calendar();
    const options = this.options();
    const date = this.date();
    const view = this.view();
    if (!api) return;
    this.zone.runOutsideAngular(() => {
      if (options !== this.lastOptions) {
        this.lastOptions = options;
        api.resetOptions(options);
      }
      if (api.view.type !== VIEWS[view]) api.changeView(VIEWS[view], date);
      else if (this.dateAtZone(api.getDate()) !== date) api.gotoDate(date);
    });
  });
  constructor() {
    afterNextRender(() => {
      void loadRuntime()
        .then((runtime) => {
          if (this.destroyRef.destroyed) return;
          this.zone.runOutsideAngular(() => {
            this.runtime.set(runtime);
            const options = this.options();
            this.lastOptions = options;
            const api = new runtime.Calendar(this.surface().nativeElement, {
              ...options,
              initialDate: this.date(),
              initialView: VIEWS[this.view()],
            });
            api.render();
            this.calendar.set(api);
            this.ready.set(true);
          });
        })
        .catch((error: unknown) => {
          if (this.destroyRef.destroyed) return;
          this.zone.run(() => {
            this.failed.set(true);
            this.loadError.emit();
            this.errorHandler.handleError(error);
          });
        });
    });
    this.destroyRef.onDestroy(() => this.zone.runOutsideAngular(() => this.calendar()?.destroy()));
  }
  /** @internal */ protected previous(): void {
    this.zone.runOutsideAngular(() => this.calendar()?.prev());
  }
  /** @internal */ protected next(): void {
    this.zone.runOutsideAngular(() => this.calendar()?.next());
  }
  /** @internal */ protected goToday(): void {
    this.zone.runOutsideAngular(() => this.calendar()?.gotoDate(this.today()));
  }
  /** @internal */ protected changeView(value: string): void {
    const view = this.views().find((view) => view === value);
    if (view) this.zone.runOutsideAngular(() => this.calendar()?.changeView(VIEWS[view]));
  }
  private emit(action: () => void): void {
    queueMicrotask(() => {
      if (!this.destroyRef.destroyed) this.zone.run(() => untracked(action));
    });
  }
  private entryContent(info: EventDisplayInfo): { domNodes: HTMLElement[] } {
    const content = this.document.createElement('span');
    content.className = 'ds-calendar-entry-content';
    content.title = info.event.title;
    const type = this.document.createElement('span');
    type.className = 'visually-hidden';
    type.textContent = `${info.event.extendedProps['typeLabel']} · `;
    content.append(type);
    const icon = info.event.extendedProps['icon'] as IconName | undefined;
    const paths = icon ? getIconPaths(icon) : [];
    if (paths.length) {
      const svg = this.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      for (const [name, value] of Object.entries({
        width: '12',
        height: '12',
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': '1.75',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'aria-hidden': 'true',
        focusable: 'false',
      }))
        svg.setAttribute(name, value);
      for (const path of paths) {
        const element = this.document.createElementNS('http://www.w3.org/2000/svg', 'path');
        element.setAttribute('d', path);
        svg.append(element);
      }
      content.append(svg);
    }
    if (info.timeText) {
      const time = this.document.createElement('span');
      time.className = 'ds-calendar-entry-time';
      time.textContent = info.timeText;
      content.append(time);
    }
    const title = this.document.createElement('span');
    title.className = 'ds-calendar-entry-title';
    title.textContent = info.event.title;
    content.append(title);
    return { domNodes: [content] };
  }
  private dateAtZone(date: Date): string {
    return Temporal.Instant.from(date.toISOString())
      .toZonedDateTimeISO(this.timeZone())
      .toPlainDate()
      .toString();
  }
  private rangeSet(info: DatesSetInfo): void {
    const view = (Object.entries(VIEWS).find(([, name]) => name === info.view.type)?.[0] ??
      'month') as CalendarView;
    const date = this.dateAtZone(info.view.calendar.getDate());
    this.emit(() => {
      this.title.set(info.view.title);
      if (date !== this.date()) this.dateChange.emit(date);
      if (view !== this.view()) this.viewChange.emit(view);
      this.rangeChange.emit({
        start: info.startStr.slice(0, 10),
        end: info.endStr.slice(0, 10),
        date,
        view,
      });
    });
  }
}
