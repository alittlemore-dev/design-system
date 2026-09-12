export interface LocalizedDateRange {
  readonly start: string | null;
  readonly end: string | null;
}

export interface LocalizedTimeRange {
  readonly start: string | null;
  readonly end: string | null;
}

export interface LocalizedDateTimeRange {
  readonly start: string | null;
  readonly end: string | null;
}

export interface LocalizedRangeRequirements {
  readonly start: boolean;
  readonly end: boolean;
  readonly paired: boolean;
}

export type LocalizedTimePickerMode = 'auto' | 'native' | 'custom';
export type LocalizedDatePickerControlSize = 'default' | 'small';
export type TemporalKind = 'date' | 'time' | 'datetime';
export type TemporalBoundary = 'single' | 'start' | 'end';

export const EMPTY_DATE_RANGE: LocalizedDateRange = Object.freeze({ start: null, end: null });
export const EMPTY_TIME_RANGE: LocalizedTimeRange = Object.freeze({ start: null, end: null });
export const EMPTY_DATETIME_RANGE: LocalizedDateTimeRange = Object.freeze({
  start: null,
  end: null,
});
export const DEFAULT_RANGE_REQUIREMENTS: LocalizedRangeRequirements = Object.freeze({
  start: false,
  end: false,
  paired: false,
});
