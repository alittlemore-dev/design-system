const CANONICAL_ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAYS_IN_WEEK = 7;

export function parseIsoDate(value: string): Date | null {
  if (!CANONICAL_ISO_DATE_PATTERN.test(value)) return null;
  const [yearPart, monthPart, dayPart] = value.split('-');
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);
  if (!isValidDateParts(year, month, day)) return null;
  const date = createLocalDate(year, month - 1, day);
  return formatIsoDate(date) === value ? date : null;
}

export function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  if (!Number.isFinite(date.getTime()) || year < 0 || year > 9999) {
    throw new RangeError('Date must have a year from 0000 through 9999.');
  }
  return `${String(year).padStart(4, '0')}-${padDatePart(date.getMonth() + 1)}-${padDatePart(
    date.getDate(),
  )}`;
}

export function formatLongDate(date: Date, dateLocale: string): string {
  return new Intl.DateTimeFormat(dateLocale, { dateStyle: 'long' }).format(date);
}

export function createLocalDate(year: number, monthIndex: number, day: number): Date {
  const date = new Date(0);
  date.setHours(0, 0, 0, 0);
  date.setFullYear(year, monthIndex, day);
  return date;
}

export function startOfMonth(date: Date): Date {
  return createLocalDate(date.getFullYear(), date.getMonth(), 1);
}

export function daysInMonth(year: number, monthIndex: number): number {
  return createLocalDate(year, monthIndex + 1, 0).getDate();
}

export function dateInMonth(year: number, monthIndex: number, day: number): Date {
  return createLocalDate(year, monthIndex, Math.min(day, daysInMonth(year, monthIndex)));
}

export function changeMonth(date: Date, offset: number): Date {
  const target = createLocalDate(date.getFullYear(), date.getMonth() + offset, 1);
  return dateInMonth(target.getFullYear(), target.getMonth(), date.getDate());
}

export function changeYear(date: Date, offset: number): Date {
  return dateInMonth(date.getFullYear() + offset, date.getMonth(), date.getDate());
}

export function addDays(date: Date, offset: number): Date {
  return createLocalDate(date.getFullYear(), date.getMonth(), date.getDate() + offset);
}

export function firstDayOfWeek(dateLocale: string): number {
  const locale = new Intl.Locale(dateLocale) as Intl.Locale & {
    getWeekInfo?: () => { firstDay: number };
  };
  const firstDay = locale.getWeekInfo?.().firstDay;
  if (firstDay !== undefined) return firstDay % DAYS_IN_WEEK;
  return (locale.region ?? locale.maximize().region) === 'US' ? 0 : 1;
}

export function dayOffsetFromWeekStart(date: Date, dateLocale: string): number {
  return (date.getDay() - firstDayOfWeek(dateLocale) + DAYS_IN_WEEK) % DAYS_IN_WEEK;
}

export function isValidDateParts(year: number, month: number, day: number): boolean {
  if (
    !Number.isInteger(year) ||
    year < 0 ||
    year > 9999 ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return false;
  }
  const date = createLocalDate(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function padDatePart(value: number): string {
  return String(value).padStart(2, '0');
}
