import type { CalendarLabels, MiniCalendarLabels } from '@alittlemore.dev/design-system/calendar';

export const EN_LABELS: CalendarLabels = {
  calendar: 'Calendar',
  previous: 'Previous period',
  next: 'Next period',
  today: 'Today',
  view: 'Calendar view',
  views: { month: 'Month', week: 'Week', day: 'Day', agenda: 'Agenda', year: 'Year' },
  allDay: 'All day',
  noEvents: 'No events in this period',
  loading: 'Loading calendar…',
  more: (count) => `+${count} more`,
};

export const RU_LABELS: CalendarLabels = {
  calendar: 'Календарь',
  previous: 'Предыдущий период',
  next: 'Следующий период',
  today: 'Сегодня',
  view: 'Вид календаря',
  views: { month: 'Месяц', week: 'Неделя', day: 'День', agenda: 'Расписание', year: 'Год' },
  allDay: 'Весь день',
  noEvents: 'В этом периоде нет событий',
  loading: 'Загрузка календаря…',
  more: (count) => `Ещё ${count}`,
};

export const EN_MINI: MiniCalendarLabels = {
  calendar: 'Choose a date',
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  keyboardHelp:
    'Use arrows to move between days, Page Up or Page Down to change month, and Enter to choose a date.',
};

export const RU_MINI: MiniCalendarLabels = {
  calendar: 'Выберите дату',
  previousMonth: 'Предыдущий месяц',
  nextMonth: 'Следующий месяц',
  keyboardHelp:
    'Стрелки перемещают фокус по дням, Page Up и Page Down меняют месяц, Enter выбирает дату.',
};
