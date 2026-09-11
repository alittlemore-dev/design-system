type DatePart = 'day' | 'month' | 'year';

const DATE_SEPARATOR_PATTERN = /[./-]/;
const CANONICAL_ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const CANONICAL_TIME_PATTERN = /^(\d{2}):(\d{2})$/;
const CANONICAL_DATE_TIME_PATTERN = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/;
const DAYS_IN_WEEK = 7;

export interface ParsedTime {
  readonly hour: number;
  readonly minute: number;
}

export interface ParsedDateTime {
  readonly date: string;
  readonly time: string;
}

export interface DateConstraints {
  readonly min?: string;
  readonly max?: string;
  readonly disabledDates?: readonly string[];
}

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

export function formatDateForLocale(value: string, dateLocale: string): string {
  if (value === '') return '';
  const date = parseIsoDate(value);
  return date === null
    ? value
    : new Intl.DateTimeFormat(dateLocale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(date);
}

export function formatLongDate(date: Date, dateLocale: string): string {
  return new Intl.DateTimeFormat(dateLocale, { dateStyle: 'long' }).format(date);
}

export function parseDateForLocale(value: string, dateLocale: string): string | null {
  const normalized = value.trim();
  if (normalized === '') return '';
  const rawParts = normalized.split(DATE_SEPARATOR_PATTERN);
  if (rawParts.length !== 3) return null;
  const numericParts = rawParts.map(Number);
  if (numericParts.some((part) => !Number.isInteger(part))) return null;
  const order = datePartOrder(dateLocale);
  const day = numericParts[order.indexOf('day')];
  const month = numericParts[order.indexOf('month')];
  const year = numericParts[order.indexOf('year')];
  if (!isValidDateParts(year, month, day)) return null;
  return `${String(year).padStart(4, '0')}-${padDatePart(month)}-${padDatePart(day)}`;
}

export function compareIsoDates(left: string, right: string): -1 | 0 | 1 | null {
  if (parseIsoDate(left) === null || parseIsoDate(right) === null) return null;
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

export function isDateWithinBounds(value: string, min?: string, max?: string): boolean {
  if (parseIsoDate(value) === null) return false;
  const validMin = validIsoDateOrNull(min);
  const validMax = validIsoDateOrNull(max);
  return (validMin === null || value >= validMin) && (validMax === null || value <= validMax);
}

export function isDateDisabled(value: string, disabledDates?: readonly string[]): boolean {
  if (parseIsoDate(value) === null) return false;
  return (
    disabledDates?.some(
      (disabledDate) => disabledDate === value && parseIsoDate(disabledDate) !== null,
    ) ?? false
  );
}

export function isDateUnavailable(value: string, constraints: DateConstraints = {}): boolean {
  return (
    !isDateWithinBounds(value, constraints.min, constraints.max) ||
    isDateDisabled(value, constraints.disabledDates)
  );
}

export function intervalCrossesDisabledDate(
  start: string,
  end: string,
  disabledDates?: readonly string[],
): boolean {
  if (parseIsoDate(start) === null || parseIsoDate(end) === null) return false;
  const lower = start <= end ? start : end;
  const upper = start <= end ? end : start;
  return (
    disabledDates?.some(
      (disabledDate) =>
        parseIsoDate(disabledDate) !== null && disabledDate >= lower && disabledDate <= upper,
    ) ?? false
  );
}

export function parseTime(value: string): ParsedTime | null {
  const match = CANONICAL_TIME_PATTERN.exec(value);
  if (match === null) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

export function parseDateTime(value: string): ParsedDateTime | null {
  const match = CANONICAL_DATE_TIME_PATTERN.exec(value);
  if (match === null || parseIsoDate(match[1]) === null || parseTime(match[2]) === null)
    return null;
  return { date: match[1], time: match[2] };
}

export function composeDateTime(date: string, time: string): string | null {
  return parseIsoDate(date) === null || parseTime(time) === null ? null : `${date}T${time}`;
}

export function isDateRangeOrdered(start: string, end: string): boolean {
  const comparison = compareIsoDates(start, end);
  return comparison !== null && comparison <= 0;
}

export function isDateTimeRangeOrdered(start: string, end: string): boolean {
  return parseDateTime(start) !== null && parseDateTime(end) !== null && start <= end;
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

function isValidDateParts(year: number, month: number, day: number): boolean {
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

function datePartOrder(dateLocale: string): DatePart[] {
  return new Intl.DateTimeFormat(dateLocale, { day: 'numeric', month: 'numeric', year: 'numeric' })
    .formatToParts(new Date(2006, 10, 22))
    .filter((part): part is Intl.DateTimeFormatPart & { type: DatePart } =>
      ['day', 'month', 'year'].includes(part.type),
    )
    .map((part) => part.type);
}

function validIsoDateOrNull(value: string | undefined): string | null {
  return value === undefined || parseIsoDate(value) === null ? null : value;
}

function padDatePart(value: number): string {
  return String(value).padStart(2, '0');
}
