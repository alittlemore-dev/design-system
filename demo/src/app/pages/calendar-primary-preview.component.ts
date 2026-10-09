import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  CalendarComponent,
  ModalDialogDirective,
  type CalendarEntry,
  type CalendarDateSelection,
  type CalendarView,
} from '@alittlemore.dev/design-system';
import { EN_LABELS } from './calendar-demo-labels';

@Component({
  imports: [CalendarComponent, ModalDialogDirective, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="p-4">
      <a routerLink="/preview/calendar">Calendar preview</a>
      <h1 class="h4 mt-3">Primary-entry compatibility</h1>
      @if (failed()) {
        <p role="alert">Could not load the calendar.</p>
        <button type="button" class="btn btn-outline-secondary" (click)="reload()">
          Retry calendar
        </button>
      }
      <ds-calendar
        id="primary-calendar"
        [date]="date()"
        today="2026-10-09"
        [labels]="labels"
        [entries]="entries"
        [view]="view()"
        dateLocale="en-US"
        (dateChange)="date.set($event)"
        (viewChange)="view.set($event)"
        (rangeChange)="ranges.set(ranges() + 1)"
        (dateSelected)="selectDay($event)"
        (entrySelected)="selectEntry($event)"
        (loadError)="failed.set(true)"
      />
      <output>Range updates: {{ ranges() }}</output>
    </main>
    <dialog
      dsModalDialog
      #dialog="dsModalDialog"
      [dismissible]="true"
      aria-labelledby="primary-selection"
      (dismissed)="dialog.close()"
    >
      <div class="p-4">
        <h2 id="primary-selection" class="h5">{{ selection() }}</h2>
        <button type="button" class="btn btn-outline-secondary" (click)="dialog.close()">
          Close
        </button>
      </div>
    </dialog>
  `,
})
export class CalendarPrimaryPreviewComponent {
  private readonly document = inject(DOCUMENT);
  protected readonly labels = EN_LABELS;
  protected readonly date = signal('2026-10-09');
  protected readonly view = signal<CalendarView>('month');
  protected readonly ranges = signal(0);
  protected readonly failed = signal(false);
  protected readonly selection = signal('');
  private readonly dialog = viewChild.required(ModalDialogDirective);
  protected readonly entries: readonly CalendarEntry[] = [
    {
      id: 'primary-event',
      title: 'Interface review',
      typeLabel: 'Event',
      tone: 'accent',
      start: '2026-10-09T10:00:00Z',
      end: '2026-10-09T11:00:00Z',
      allDay: false,
    },
  ];
  protected selectEntry(entry: CalendarEntry): void {
    this.selection.set(entry.title);
    this.dialog().open();
  }
  protected selectDay(selection: CalendarDateSelection): void {
    this.selection.set(selection.start.slice(0, 10));
    this.dialog().open();
  }
  protected reload(): void {
    this.document.defaultView?.location.reload();
  }
}
