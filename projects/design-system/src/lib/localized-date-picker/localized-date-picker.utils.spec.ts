import {
  addDays,
  changeMonth,
  changeYear,
  compareIsoDates,
  compareTimes,
  composeDateTime,
  createLocalDate,
  formatDateForLocale,
  formatDateTimeForLocale,
  formatIsoDate,
  intervalCrossesDisabledDate,
  inspectRange,
  isDateDisabled,
  isDateRangeOrdered,
  isDateTimeRangeOrdered,
  isDateWithinBounds,
  isNullableDateRangeOrdered,
  isNullableDateTimeRangeOrdered,
  isNullableTimeRangeOrdered,
  isTimeWithinBounds,
  parseDateForLocale,
  parseDateTime,
  parseDateTimeForLocale,
  parseIsoDate,
  parseNullableDateForLocale,
  parseTime,
  requiredEndpoints,
  resolveTimePickerMode,
  dateRangeAvailability,
  timeRangeAvailability,
  dateTimeRangeAvailability,
} from './localized-date-picker.utils';
import {
  DEFAULT_RANGE_REQUIREMENTS,
  EMPTY_DATE_RANGE,
  EMPTY_DATETIME_RANGE,
  EMPTY_TIME_RANGE,
} from './localized-temporal-picker.types';

describe('localized date picker utilities', () => {
  describe('canonical dates', () => {
    it('round-trips leap dates and the supported canonical year boundaries', () => {
      const leapDate = parseIsoDate('2024-02-29');
      const firstYear = parseIsoDate('0000-02-29');
      const lastYear = parseIsoDate('9999-12-31');

      expect(leapDate === null ? null : formatIsoDate(leapDate)).toBe('2024-02-29');
      expect(firstYear === null ? null : formatIsoDate(firstYear)).toBe('0000-02-29');
      expect(lastYear === null ? null : formatIsoDate(lastYear)).toBe('9999-12-31');
    });

    it.each(['2023-02-29', '2024-02-30', '2026-13-01', '2026-00-10', '2026-2-05'])(
      'rejects the invalid or noncanonical date %s',
      (value) => {
        expect(parseIsoDate(value)).toBeNull();
      },
    );
  });

  describe('localized numeric dates', () => {
    it('formats and parses dates using the locale field order', () => {
      expect(formatDateForLocale('2024-02-29', 'en-US')).toBe('02/29/2024');
      expect(formatDateForLocale('2024-02-29', 'en-GB')).toBe('29/02/2024');
      expect(parseDateForLocale('02/29/2024', 'en-US')).toBe('2024-02-29');
      expect(parseDateForLocale('29.02.2024', 'en-GB')).toBe('2024-02-29');
      expect(parseDateForLocale('', 'en-GB')).toBe('');
    });

    it('rejects impossible, malformed, and out-of-range localized dates', () => {
      expect(parseDateForLocale('02/29/2023', 'en-US')).toBeNull();
      expect(parseDateForLocale('29/02', 'en-GB')).toBeNull();
      expect(parseDateForLocale('01/01/10000', 'en-GB')).toBeNull();
    });

    it('maps an empty redesigned date field to the canonical null absence', () => {
      expect(parseNullableDateForLocale('', 'en-US')).toBeNull();
      expect(formatDateForLocale(null, 'en-US')).toBe('');
    });
  });

  describe('date arithmetic and constraints', () => {
    it('uses calendar arithmetic and clamps month and year changes', () => {
      const januaryLast = createLocalDate(2024, 0, 31);
      const leapDay = createLocalDate(2024, 1, 29);

      expect(formatIsoDate(addDays(leapDay, 1))).toBe('2024-03-01');
      expect(formatIsoDate(changeMonth(januaryLast, 1))).toBe('2024-02-29');
      expect(formatIsoDate(changeYear(leapDay, 1))).toBe('2025-02-28');
    });

    it('compares canonical dates including equality', () => {
      expect(compareIsoDates('2026-02-05', '2026-02-06')).toBe(-1);
      expect(compareIsoDates('2026-02-05', '2026-02-05')).toBe(0);
      expect(compareIsoDates('2026-02-06', '2026-02-05')).toBe(1);
      expect(compareIsoDates('not-a-date', '2026-02-05')).toBeNull();
    });

    it('treats valid minimum and maximum dates as inclusive and ignores invalid bounds', () => {
      expect(isDateWithinBounds('2026-02-05', '2026-02-05', '2026-02-20')).toBe(true);
      expect(isDateWithinBounds('2026-02-20', '2026-02-05', '2026-02-20')).toBe(true);
      expect(isDateWithinBounds('2026-02-04', '2026-02-05', '2026-02-20')).toBe(false);
      expect(isDateWithinBounds('2026-02-21', '2026-02-05', '2026-02-20')).toBe(false);
      expect(isDateWithinBounds('2026-02-04', 'invalid', undefined)).toBe(true);
    });

    it('matches only canonical disabled dates', () => {
      const disabledDates = ['2026-02-06', '2026-2-07', 'invalid'];

      expect(isDateDisabled('2026-02-06', disabledDates)).toBe(true);
      expect(isDateDisabled('2026-02-07', disabledDates)).toBe(false);
      expect(isDateDisabled('invalid', disabledDates)).toBe(false);
    });

    it('detects disabled dates anywhere in an inclusive interval', () => {
      const disabledDates = ['2026-02-10', '2026-02-15'];

      expect(intervalCrossesDisabledDate('2026-02-05', '2026-02-10', disabledDates)).toBe(true);
      expect(intervalCrossesDisabledDate('2026-02-15', '2026-02-05', disabledDates)).toBe(true);
      expect(intervalCrossesDisabledDate('2026-02-10', '2026-02-10', disabledDates)).toBe(true);
      expect(intervalCrossesDisabledDate('2026-02-05', '2026-02-09', disabledDates)).toBe(false);
    });
  });

  describe('local wall-clock times and datetimes', () => {
    it('strictly parses minute-precision times', () => {
      expect(parseTime('00:00')).toEqual({ hour: 0, minute: 0 });
      expect(parseTime('23:59')).toEqual({ hour: 23, minute: 59 });
      expect(parseTime('24:00')).toBeNull();
      expect(parseTime('23:60')).toBeNull();
      expect(parseTime('9:05')).toBeNull();
      expect(parseTime('09:05:00')).toBeNull();
    });

    it('strictly parses and composes local datetimes without conversion', () => {
      expect(parseDateTime('2024-02-29T23:59')).toEqual({
        date: '2024-02-29',
        time: '23:59',
      });
      expect(parseDateTime('0000-02-29T00:00')).toEqual({
        date: '0000-02-29',
        time: '00:00',
      });
      expect(parseDateTime('9999-12-31T23:59')).toEqual({
        date: '9999-12-31',
        time: '23:59',
      });
      expect(parseDateTime('2023-02-29T12:00')).toBeNull();
      expect(parseDateTime('2024-02-29T24:00')).toBeNull();
      expect(parseDateTime('2024-02-29T12:00Z')).toBeNull();
      expect(composeDateTime('2024-02-29', '23:59')).toBe('2024-02-29T23:59');
      expect(composeDateTime('2024-02-30', '23:59')).toBeNull();
      expect(composeDateTime('2024-02-29', '24:00')).toBeNull();
    });

    it.each([
      ['09:30', '09:30', 0],
      ['22:00', '02:00', 1],
      ['invalid', '02:00', null],
    ] as const)('compares wall-clock times %s and %s', (left, right, expected) => {
      expect(compareTimes(left, right)).toBe(expected);
    });

    it.each([
      ['09:30', '09:30', '18:00', true],
      ['08:59', '09:30', '18:00', false],
      ['08:00', 'invalid', '24:00', true],
    ] as const)('applies only valid inclusive time bounds', (value, min, max, expected) => {
      expect(isTimeWithinBounds(value, min, max)).toBe(expected);
    });

    it('parses and formats local datetimes without timezone conversion', () => {
      expect(parseDateTimeForLocale('09/11/2026 07:05', 'en-US')).toBe('2026-09-11T07:05');
      expect(formatDateTimeForLocale('2026-09-11T07:05', 'de-DE')).toBe('11.09.2026 07:05');
    });
  });

  describe('range ordering', () => {
    it('accepts ordered and equal date ranges but rejects reversals and malformed endpoints', () => {
      expect(isDateRangeOrdered('2026-02-05', '2026-02-06')).toBe(true);
      expect(isDateRangeOrdered('2026-02-05', '2026-02-05')).toBe(true);
      expect(isDateRangeOrdered('2026-02-06', '2026-02-05')).toBe(false);
      expect(isDateRangeOrdered('invalid', '2026-02-05')).toBe(false);
    });

    it('accepts ordered and equal datetime ranges but rejects reversals', () => {
      expect(isDateTimeRangeOrdered('2026-02-05T09:00', '2026-02-05T09:01')).toBe(true);
      expect(isDateTimeRangeOrdered('2026-02-05T09:00', '2026-02-05T09:00')).toBe(true);
      expect(isDateTimeRangeOrdered('2026-02-05T09:01', '2026-02-05T09:00')).toBe(false);
      expect(isDateTimeRangeOrdered('2026-02-05', '2026-02-05T09:00')).toBe(false);
    });

    it('accepts nullable equal ranges as ordered', () => {
      expect(isNullableDateRangeOrdered({ start: '2026-02-05', end: '2026-02-05' })).toBe(true);
      expect(isNullableTimeRangeOrdered({ start: '09:30', end: '09:30' })).toBe(true);
      expect(
        isNullableDateTimeRangeOrdered({
          start: '2026-02-05T09:30',
          end: '2026-02-05T09:30',
        }),
      ).toBe(true);
    });
  });

  describe('nullable temporal range contracts', () => {
    it('keeps canonical empty values and default requirements immutable', () => {
      expect(EMPTY_DATE_RANGE).toEqual({ start: null, end: null });
      expect(EMPTY_TIME_RANGE).toEqual({ start: null, end: null });
      expect(EMPTY_DATETIME_RANGE).toEqual({ start: null, end: null });
      expect(DEFAULT_RANGE_REQUIREMENTS).toEqual({ start: false, end: false, paired: false });
      expect(Object.isFrozen(EMPTY_DATE_RANGE)).toBe(true);
      expect(Object.isFrozen(EMPTY_TIME_RANGE)).toBe(true);
      expect(Object.isFrozen(EMPTY_DATETIME_RANGE)).toBe(true);
      expect(Object.isFrozen(DEFAULT_RANGE_REQUIREMENTS)).toBe(true);
    });

    it('requires the missing paired endpoint without requiring an entirely empty range', () => {
      expect(
        requiredEndpoints(
          { start: false, end: false, paired: true },
          { start: '09:00', end: null },
        ),
      ).toEqual({ start: false, end: true });
    });

    it('preserves malformed endpoint evidence instead of treating it as absence', () => {
      expect(inspectRange({ start: '', end: null }, parseIsoDate)).toEqual({
        value: { start: null, end: null },
        malformed: { start: true, end: false },
        present: { start: true, end: false },
        shapeInvalid: false,
      });
    });

    it('normalizes only CVA reset nulls to the canonical empty date range', () => {
      expect(inspectRange(null, parseIsoDate, true)).toEqual({
        value: EMPTY_DATE_RANGE,
        malformed: { start: false, end: false },
        present: { start: false, end: false },
        shapeInvalid: false,
      });
      expect(inspectRange(null, parseIsoDate, false)).toEqual({
        value: EMPTY_DATE_RANGE,
        malformed: { start: false, end: false },
        present: { start: false, end: false },
        shapeInvalid: true,
      });
    });

    it('reports endpoint and interval availability separately for each temporal kind', () => {
      expect(
        dateRangeAvailability(
          { start: '2026-02-05', end: '2026-02-07' },
          { disabledDates: ['2026-02-06'] },
        ),
      ).toEqual({ startUnavailable: false, endUnavailable: false, rangeUnavailable: true });
      expect(
        timeRangeAvailability({ start: '08:00', end: '18:00' }, { min: '09:00', max: '17:00' }),
      ).toEqual({ startUnavailable: true, endUnavailable: true, rangeUnavailable: false });
      expect(
        dateTimeRangeAvailability(
          { start: '2026-02-05T08:00', end: '2026-02-05T18:00' },
          { min: '2026-02-05T09:00', max: '2026-02-05T17:00' },
        ),
      ).toEqual({ startUnavailable: true, endUnavailable: true, rangeUnavailable: false });
    });

    it.each([
      ['auto', false, false, 'custom'],
      ['auto', true, false, 'custom'],
      ['auto', true, true, 'native'],
      ['native', false, false, 'custom'],
      ['custom', true, true, 'custom'],
    ] as const)(
      'resolves the time picker mode %s',
      (requested, browser, coarsePointer, expected) => {
        expect(resolveTimePickerMode(requested, browser, coarsePointer)).toBe(expected);
      },
    );
  });
});
