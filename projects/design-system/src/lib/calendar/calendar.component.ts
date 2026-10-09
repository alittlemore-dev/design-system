import {
  ChangeDetectionStrategy,
  Component,
  ComponentRef,
  DestroyRef,
  ErrorHandler,
  ViewContainerRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type {
  CalendarComponent as CalendarRenderer,
  CalendarDateSelection,
  CalendarEntry,
  CalendarLabels,
  CalendarRange,
  CalendarView,
} from '@alittlemore.dev/design-system/calendar';

/** Keeps existing primary imports available without eagerly loading the calendar capability. */
@Component({
  selector: 'ds-calendar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container #outlet />
    @if (!renderer() && !failed()) {
      <div class="placeholder" role="status">{{ labels().loading }}</div>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .placeholder {
      min-height: 26rem;
      display: grid;
      place-items: center;
    }
  `,
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
  private readonly errorHandler = inject(ErrorHandler);
  private readonly outlet = viewChild.required('outlet', { read: ViewContainerRef });
  /** @internal */ protected readonly renderer = signal<ComponentRef<CalendarRenderer> | null>(
    null,
  );
  /** @internal */ protected readonly failed = signal(false);
  private readonly properties = computed(() => ({
    id: this.id(),
    date: this.date(),
    today: this.today(),
    labels: this.labels(),
    entries: this.entries(),
    view: this.view(),
    views: this.views(),
    dateLocale: this.dateLocale(),
    timeZone: this.timeZone(),
    loading: this.loading(),
  }));
  private readonly sync = effect(() => {
    const renderer = this.renderer();
    if (renderer) this.updateInputs(renderer);
  });

  constructor() {
    afterNextRender(() => {
      void import('@alittlemore.dev/design-system/calendar')
        .then(({ CalendarComponent }) => {
          if (this.destroyRef.destroyed) return;
          const renderer = this.outlet().createComponent(CalendarComponent);
          this.updateInputs(renderer);
          const instance = renderer.instance;
          instance.dateChange.subscribe((value) => this.dateChange.emit(value));
          instance.viewChange.subscribe((value) => this.viewChange.emit(value));
          instance.rangeChange.subscribe((value) => this.rangeChange.emit(value));
          instance.dateSelected.subscribe((value) => this.dateSelected.emit(value));
          instance.entrySelected.subscribe((value) => this.entrySelected.emit(value));
          instance.loadError.subscribe(() => this.loadError.emit());
          this.renderer.set(renderer);
          renderer.changeDetectorRef.detectChanges();
        })
        .catch((error: unknown) => {
          if (this.destroyRef.destroyed) return;
          this.failed.set(true);
          this.loadError.emit();
          this.errorHandler.handleError(error);
        });
    });
  }

  private updateInputs(renderer: ComponentRef<CalendarRenderer>): void {
    for (const [name, value] of Object.entries(this.properties())) renderer.setInput(name, value);
  }
}
