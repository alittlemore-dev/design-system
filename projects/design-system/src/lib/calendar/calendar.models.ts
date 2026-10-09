import type { IconName } from '../icon/icon.component';

export type CalendarView = 'month' | 'week' | 'day' | 'agenda' | 'year';
export type CalendarEntryTone = 'accent' | 'info' | 'neutral';
export interface CalendarEntry {
  readonly id: string;
  readonly title: string;
  /** ISO date for all-day entries, ISO timestamp for timed entries. End is exclusive. */
  readonly start: string;
  readonly end?: string;
  readonly allDay: boolean;
  readonly typeLabel: string;
  readonly tone?: CalendarEntryTone;
  readonly icon?: IconName;
}
export interface CalendarLabels {
  readonly calendar: string;
  readonly previous: string;
  readonly next: string;
  readonly today: string;
  readonly view: string;
  readonly views: Readonly<Record<CalendarView, string>>;
  readonly allDay: string;
  readonly noEvents: string;
  readonly loading: string;
  readonly more: (count: number) => string;
}
export interface MiniCalendarLabels {
  readonly calendar: string;
  readonly previousMonth: string;
  readonly nextMonth: string;
  readonly keyboardHelp: string;
}
export interface CalendarRange {
  readonly start: string;
  readonly end: string;
  readonly date: string;
  readonly view: CalendarView;
}
export interface CalendarDateSelection {
  readonly date: string;
  readonly start: string;
  readonly allDay: boolean;
}
