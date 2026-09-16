import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import {
  LocalizedDateTimeRangePickerComponent,
  LocalizedDateTimeRangePickerLabels,
} from './localized-datetime-range-picker.component';
import {
  DEFAULT_RANGE_REQUIREMENTS,
  EMPTY_DATETIME_RANGE,
  LocalizedDateTimeRange,
  LocalizedRangeRequirements,
  LocalizedTimePickerMode,
} from './localized-temporal-picker.types';

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2
    ? true
    : false;
type Expect<Value extends true> = Value;
type DateTimeRangeLabelKeys = Expect<
  Equal<
    keyof LocalizedDateTimeRangePickerLabels,
    | 'placeholder'
    | 'openPicker'
    | 'changeValue'
    | 'dialog'
    | 'groupLabel'
    | 'startDateTime'
    | 'endDateTime'
    | 'selectStartDateTime'
    | 'selectEndDateTime'
    | 'accessibleRangeSeparator'
    | 'announceRangePreview'
    | 'previousMonth'
    | 'nextMonth'
    | 'openMonthYearPicker'
    | 'previousYear'
    | 'nextYear'
    | 'hour'
    | 'minute'
    | 'dateFormatHint'
    | 'timeFormatHint'
    | 'clear'
    | 'cancel'
    | 'done'
    | 'today'
    | 'now'
    | 'keyboardHelp'
    | 'invalidRange'
    | 'unavailableRange'
    | 'requiredRange'
  >
>;

void (0 as unknown as DateTimeRangeLabelKeys);

const LABELS = {
  placeholder: 'dd/mm/yyyy HH:mm',
  openPicker: 'Open date and time range picker',
  changeValue: 'Change date and time range',
  dialog: 'Choose a date and time range',
  groupLabel: 'Booking date and time range',
  startDateTime: 'Start date and time',
  endDateTime: 'End date and time',
  selectStartDateTime: 'Select a start date and time',
  selectEndDateTime: 'Select an end date and time',
  accessibleRangeSeparator: 'to',
  announceRangePreview: (start: string, end: string) => `Preview from ${start} to ${end}`,
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  openMonthYearPicker: 'Choose month and year',
  previousYear: 'Previous year',
  nextYear: 'Next year',
  hour: 'Hour',
  minute: 'Minute',
  dateFormatHint: 'Date format: DD/MM/YYYY',
  timeFormatHint: 'Time format: HH:mm',
  clear: 'Clear',
  cancel: 'Cancel',
  done: 'Done',
  today: 'Today',
  now: 'Now',
  keyboardHelp: 'Use the arrow keys to choose a date.',
  invalidRange: 'Enter a valid date and time range.',
  unavailableRange: 'This date and time range is unavailable.',
  requiredRange: 'Enter the required dates and times.',
} satisfies LocalizedDateTimeRangePickerLabels;

describe('LocalizedDateTimeRangePickerComponent', () => {
  let fixture: ComponentFixture<LocalizedDateTimeRangePickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LocalizedDateTimeRangePickerComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(LocalizedDateTimeRangePickerComponent);
    setInputs({ start: '2026-02-05T09:30', end: '2026-02-09T17:45' });
    installDialogMethods();
  });

  afterEach(() => {
    jest.useRealTimers();
    fixture.destroy();
  });

  it('is standalone OnPush and renders one shell, two combined inputs, one en dash, and one SVG trigger', () => {
    const metadata = (
      LocalizedDateTimeRangePickerComponent as unknown as {
        ɵcmp: { standalone: boolean; onPush: boolean; selectors: string[][] };
      }
    ).ɵcmp;
    const field = temporalField();

    expect(metadata.standalone).toBe(true);
    expect(metadata.onPush).toBe(true);
    expect(metadata.selectors).toContainEqual(['ds-localized-datetime-range-picker']);
    expect(fixture.nativeElement.querySelectorAll('.temporal-picker-field-shell')).toHaveLength(1);
    expect(field.querySelectorAll('input[type="text"]')).toHaveLength(2);
    expect(startInput().value).toBe('05/02/2026 09:30');
    expect(endInput().value).toBe('09/02/2026 17:45');
    expect(startInput().getAttribute('aria-label')).toBe(LABELS.startDateTime);
    expect(endInput().getAttribute('aria-label')).toBe(LABELS.endDateTime);
    expect(field.querySelectorAll('[data-testid="temporal-picker-field-trigger"]')).toHaveLength(1);
    expect(trigger().querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(1);
    expect(
      field.querySelector('[data-testid="temporal-picker-field-separator"]')?.textContent,
    ).toBe('–');
    expect(field.getAttribute('aria-label')).toBe(LABELS.groupLabel);
    expect(trigger().getAttribute('aria-label')).toBe(LABELS.changeValue);
    expect(fixture.nativeElement.querySelector('[style]')).toBeNull();
  });

  it('uses a non-null empty range and defaults requirements and time mode', () => {
    setInputs(EMPTY_DATETIME_RANGE);
    expect(startInput().value).toBe('');
    expect(endInput().value).toBe('');
    expect(trigger().getAttribute('aria-label')).toBe(LABELS.openPicker);
    expect(fixture.componentInstance.requirements()).toEqual(DEFAULT_RANGE_REQUIREMENTS);
    expect(fixture.componentInstance.timePickerMode()).toBe('auto');
    expect(fixture.componentInstance.validate(new FormControl(EMPTY_DATETIME_RANGE))).toBeNull();
  });

  it('round-trips nullable partials without emitting empty strings', () => {
    fixture.componentRef.setInput('value', undefined);
    fixture.componentInstance.writeValue({ start: '2026-02-05T09:30', end: null });
    const valueChange = jest.fn();
    const onChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    fixture.componentInstance.registerOnChange(onChange);
    fixture.detectChanges();

    expect(startInput().value).toBe('05/02/2026 09:30');
    expect(endInput().value).toBe('');
    setText(endInput(), '09/02/2026 17:45');
    endInput().dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    fixture.detectChanges();
    expect(valueChange).toHaveBeenLastCalledWith({
      start: '2026-02-05T09:30',
      end: '2026-02-09T17:45',
    });

    setText(endInput(), '');
    endInput().dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    fixture.detectChanges();
    expect(valueChange).toHaveBeenLastCalledWith({ start: '2026-02-05T09:30', end: null });
    expect(onChange).toHaveBeenLastCalledWith({ start: '2026-02-05T09:30', end: null });
    expect(valueChange.mock.calls.flat()).not.toContainEqual({
      start: '2026-02-05T09:30',
      end: '',
    });
  });

  it('emits a controlled edit request but keeps rendering the bound value', () => {
    const valueChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);

    setText(endInput(), '10/02/2026 18:00');
    endInput().dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    fixture.detectChanges();

    expect(valueChange).toHaveBeenLastCalledWith({
      start: '2026-02-05T09:30',
      end: '2026-02-10T18:00',
    });
    expect(startInput().value).toBe('05/02/2026 09:30');
    expect(endInput().value).toBe('09/02/2026 17:45');
  });

  it.each([
    [{ start: false, end: false, paired: false }, null],
    [{ start: true, end: false, paired: false }, { required: { start: true, end: false } }],
    [{ start: false, end: true, paired: false }, { required: { start: false, end: true } }],
    [{ start: true, end: true, paired: false }, { required: { start: true, end: true } }],
    [{ start: false, end: false, paired: true }, null],
    [{ start: true, end: false, paired: true }, { required: { start: true, end: false } }],
    [{ start: false, end: true, paired: true }, { required: { start: false, end: true } }],
    [{ start: true, end: true, paired: true }, { required: { start: true, end: true } }],
  ] as const)('applies independent endpoint requirements %p', (requirements, expected) => {
    fixture.componentRef.setInput('requirements', requirements);
    fixture.detectChanges();
    expect(fixture.componentInstance.validate(new FormControl(EMPTY_DATETIME_RANGE))).toEqual(
      expected,
    );
  });

  it('applies paired requirements only when the opposite complete endpoint exists', () => {
    fixture.componentRef.setInput('requirements', { start: false, end: false, paired: true });
    fixture.detectChanges();
    expect(
      fixture.componentInstance.validate(
        new FormControl<LocalizedDateTimeRange>({ start: '2026-02-05T09:30', end: null }),
      ),
    ).toEqual({ required: { start: false, end: true } });
    expect(
      fixture.componentInstance.validate(
        new FormControl<LocalizedDateTimeRange>({ start: null, end: '2026-02-09T17:45' }),
      ),
    ).toEqual({ required: { start: true, end: false } });
  });

  it('keeps incomplete manual parts as internal drafts and marks only their endpoint invalid', () => {
    const valueChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    setText(startInput(), '06/02/2026');
    expect(startInput().value).toBe('06/02/2026');
    expect(valueChange).not.toHaveBeenCalled();
    expect(startInput().getAttribute('aria-invalid')).toBe('true');
    expect(endInput().getAttribute('aria-invalid')).toBeNull();
    expect(validationMessage()).toBe(LABELS.invalidRange);
    expect(
      fixture.componentInstance.validate(
        new FormControl<LocalizedDateTimeRange>({
          start: '2026-02-05T09:30',
          end: '2026-02-09T17:45',
        }),
      ),
    ).toEqual({ dateTimeRangeInvalid: { start: true } });

    dispatchKey(startInput(), 'Escape');
    setText(endInput(), '09/02/2026 24:00');
    expect(endInput().getAttribute('aria-invalid')).toBe('true');
    expect(
      fixture.componentInstance.validate(
        new FormControl<LocalizedDateTimeRange>({
          start: '2026-02-05T09:30',
          end: '2026-02-09T17:45',
        }),
      ),
    ).toEqual({ dateTimeRangeInvalid: { end: true } });
  });

  it('keeps reversed manual datetimes visible and non-emitting while accepting equality', () => {
    const valueChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    setText(startInput(), '10/02/2026 09:30');
    setText(endInput(), '06/02/2026 17:45');
    endInput().dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    fixture.detectChanges();
    expect(valueChange).not.toHaveBeenCalled();
    expect(startInput().value).toBe('10/02/2026 09:30');
    expect(endInput().value).toBe('06/02/2026 17:45');
    expect(
      fixture.componentInstance.validate(
        new FormControl<LocalizedDateTimeRange>({
          start: '2026-02-10T09:30',
          end: '2026-02-06T17:45',
        }),
      ),
    ).toEqual({ dateTimeRangeInvalid: { order: true } });

    setText(startInput(), '08/02/2026 09:30');
    setText(endInput(), '08/02/2026 09:30');
    endInput().dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    fixture.detectChanges();
    expect(valueChange).toHaveBeenLastCalledWith({
      start: '2026-02-08T09:30',
      end: '2026-02-08T09:30',
    });
  });

  it('reports exact endpoint and disabled-interval availability errors', () => {
    setInputs(
      { start: '2026-02-05T08:59', end: '2026-02-09T17:01' },
      {
        min: '2026-02-05T09:00',
        max: '2026-02-09T17:00',
        disabledDates: ['2026-02-07'],
      },
    );
    expect(
      fixture.componentInstance.validate(
        new FormControl<LocalizedDateTimeRange>({
          start: '2026-02-05T08:59',
          end: '2026-02-09T17:01',
        }),
      ),
    ).toEqual({ dateTimeRangeUnavailable: { start: true, end: true, interval: true } });
    expect(validationMessage()).toBe(LABELS.unavailableRange);
    expect(
      fixture.componentInstance.validate(
        new FormControl<LocalizedDateTimeRange>({
          start: '2026-02-05T09:00',
          end: '2026-02-09T17:00',
        }),
      ),
    ).toEqual({ dateTimeRangeUnavailable: { interval: true } });
  });

  it('shows date and time panels together, no endpoint tabs, and advances the active field', () => {
    openDialogFrom('start');
    expect(dialog().querySelector('[data-testid="date-picker-time-panel"]')).not.toBeNull();
    expect(dialog().querySelector('[role="grid"]')).not.toBeNull();
    expect(dialog().querySelector('[role="tab"]')).toBeNull();
    expect(dialogStatus()).toBe(LABELS.selectStartDateTime);
    dayButton('2026-02-06').click();
    fixture.detectChanges();
    expect(dialogStatus()).toBe(LABELS.selectEndDateTime);
    expect(endInput().parentElement?.classList).toContain('temporal-picker-field-endpoint-active');
  });

  it('alternates the date phase while keeping both time endpoints directly focusable', () => {
    setInputs(EMPTY_DATETIME_RANGE, {
      min: '2026-02-01T00:00',
      max: '2026-02-28T23:59',
      timePickerMode: 'custom',
    });
    const valueChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    openDialogFrom('start');

    dayButton('2026-02-05').click();
    fixture.detectChanges();
    expect(dialogStatus()).toBe(LABELS.selectEndDateTime);
    expect(dialogAction('done').disabled).toBe(true);
    expect(valueChange).not.toHaveBeenCalled();

    segmentedButton('hour').focus();
    dispatchKey(segmentedButton('hour'), 'ArrowUp');
    expect(dialogStatus()).toBe(LABELS.selectStartDateTime);
    dispatchKey(segmentedButton('minute'), 'ArrowUp');
    expect(dialogStatus()).toBe(LABELS.selectStartDateTime);
    expect(dialogAction('done').disabled).toBe(false);
    expect(valueChange).not.toHaveBeenCalled();

    dialogAction('done').click();
    expect(valueChange.mock.calls).toEqual([[{ start: '2026-02-05T00:00', end: null }]]);
  });

  it('keeps an empty time-first draft on start until its date completes the endpoint', () => {
    setInputs(EMPTY_DATETIME_RANGE, {
      min: '2026-02-01T00:00',
      max: '2026-02-28T23:59',
      timePickerMode: 'custom',
    });
    const valueChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    openDialogFrom('start');

    dispatchKey(segmentedButton('hour'), 'ArrowUp');
    dispatchKey(segmentedButton('minute'), 'ArrowUp');
    expect(dialogStatus()).toBe(LABELS.selectStartDateTime);
    expect(dialogAction('done').disabled).toBe(true);

    dayButton('2026-02-05').click();
    fixture.detectChanges();
    expect(dialogStatus()).toBe(LABELS.selectEndDateTime);
    expect(dialogAction('done').disabled).toBe(false);
    expect(valueChange).not.toHaveBeenCalled();

    dialogAction('done').click();
    expect(valueChange.mock.calls).toEqual([[{ start: '2026-02-05T00:00', end: null }]]);
  });

  it('previews the range and blocks disabled interval candidates', () => {
    setInputs(EMPTY_DATETIME_RANGE, {
      min: '2026-02-01T00:00',
      max: '2026-02-28T23:59',
      disabledDates: ['2026-02-07'],
    });
    openDialogFrom('start');
    dayButton('2026-02-05').click();
    fixture.detectChanges();
    segmentedButton('hour').focus();
    dispatchKey(segmentedButton('hour'), 'ArrowUp');
    dispatchKey(segmentedButton('minute'), 'ArrowUp');
    fixture.detectChanges();
    expect(dialogStatus()).toBe(LABELS.selectStartDateTime);
    expect(dayButton('2026-02-09').disabled).toBe(true);
    dayButton('2026-02-06').dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    dayButton('2026-02-06').focus();
    fixture.detectChanges();
    expect(dayButton('2026-02-06').classList).toContain('localized-date-picker-preview-end');
    expect(dialogStatus()).toContain(LABELS.selectEndDateTime);
    expect(dialogStatus()).toContain('Preview from');
  });

  it('preserves semantic time slots when a complete-range start date is replaced', () => {
    const valueChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    openDialogFrom('end');
    dayButton('2026-02-04').click();
    fixture.detectChanges();
    dialogAction('done').click();
    fixture.detectChanges();
    expect(valueChange.mock.calls).toEqual([
      [{ start: '2026-02-04T09:30', end: '2026-02-09T17:45' }],
    ]);
  });

  it('keeps dialog edits transactional across Done, Cancel, Escape, and backdrop', () => {
    const valueChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    for (const close of ['cancel', 'escape', 'backdrop'] as const) {
      openDialogFrom('end');
      dayButton('2026-02-10').click();
      fixture.detectChanges();
      if (close === 'cancel') dialogAction('cancel').click();
      else if (close === 'escape') dispatchKey(calendarDialog(), 'Escape');
      else calendarDialog().dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();
      expect(valueChange).not.toHaveBeenCalled();
      expect(endInput().value).toBe('09/02/2026 17:45');
    }
    openDialogFrom('end');
    dayButton('2026-02-10').click();
    fixture.detectChanges();
    dialogAction('done').click();
    expect(valueChange.mock.calls).toEqual([
      [{ start: '2026-02-09T09:30', end: '2026-02-10T17:45' }],
    ]);
  });

  it('keeps Clear transactional and emits the canonical empty object only after Done', () => {
    const valueChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    openDialogFrom('end');
    dialogAction('clear').click();
    fixture.detectChanges();
    expect(valueChange).not.toHaveBeenCalled();
    expect(startInput().value).toBe('05/02/2026 09:30');
    expect(endInput().value).toBe('09/02/2026 17:45');
    dialogAction('done').click();
    expect(valueChange.mock.calls).toEqual([[{ start: null, end: null }]]);
  });

  it('targets Now at the active endpoint and supports custom and native modes', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 1, 8, 14, 7));
    const valueChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    fixture.componentRef.setInput('timePickerMode', 'custom');
    fixture.detectChanges();
    openDialogFrom('end');
    expect(dialog().querySelectorAll('[data-testid="segmented-time-input"]')).toHaveLength(2);
    segmentedButton('hour', 'end').focus();
    dialog().querySelector<HTMLButtonElement>('[data-testid="date-picker-now"]')?.click();
    fixture.detectChanges();
    expect(valueChange).not.toHaveBeenCalled();
    dialogAction('done').click();
    expect(valueChange).toHaveBeenLastCalledWith({
      start: '2026-02-05T09:30',
      end: '2026-02-08T14:07',
    });

    setInputs({ start: '2026-02-05T09:30', end: '2026-02-09T17:45' }, { timePickerMode: 'native' });
    openDialogFrom('end');
    const nativeTimes = dialog().querySelectorAll<HTMLInputElement>(
      '[data-testid="date-picker-native-time"]',
    );
    expect(nativeTimes).toHaveLength(2);
    const nativeTime = nativeTimes[1];
    expect(nativeTime.step).toBe('60');
    nativeTime.value = '18:00';
    nativeTime.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    dialogAction('done').click();
    expect(valueChange).toHaveBeenLastCalledWith({
      start: '2026-02-05T09:30',
      end: '2026-02-09T18:00',
    });
  });

  it('re-evaluates auto time-control capability at every open', () => {
    const matchMedia = jest.fn().mockReturnValue({ matches: true });
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: matchMedia });
    fixture.componentRef.setInput('timePickerMode', 'auto');
    fixture.detectChanges();
    openDialogFrom('end');
    expect(dialog().querySelector('[data-testid="date-picker-native-time"]')).not.toBeNull();
    dialogAction('cancel').click();
    matchMedia.mockReturnValue({ matches: false });
    openDialogFrom('end');
    expect(dialog().querySelector('[data-testid="segmented-time-input"]')).not.toBeNull();
  });

  it('retains both semantic time slots when replacing a completed range start', () => {
    const valueChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    setInputs(
      { start: '2026-02-05T09:30', end: '2026-02-09T17:45' },
      { requirements: { start: false, end: false, paired: true } },
    );
    openDialogFrom('start');
    dispatchKey(dayButton('2026-02-06'), 'Enter');
    expect(calendarDialog().open).toBe(true);
    expect(dialogStatus()).toBe(LABELS.selectEndDateTime);
    expect(valueChange).not.toHaveBeenCalled();
    expect(calendarDialog().open).toBe(true);
    expect(dialogAction('done').disabled).toBe(false);
    dialogAction('done').click();
    expect(valueChange.mock.calls).toEqual([
      [{ start: '2026-02-06T09:30', end: '2026-02-09T17:45' }],
    ]);
    expect(calendarDialog().open).toBe(false);
  });

  it('supports CVA, touched, validity, readonly, and disabled states', () => {
    const changed = jest.fn();
    const touched = jest.fn();
    const validity = jest.fn();
    fixture.componentInstance.registerOnChange(changed);
    fixture.componentInstance.registerOnTouched(touched);
    fixture.componentInstance.validityChange.subscribe(validity);
    fixture.componentRef.setInput('value', undefined);
    fixture.componentInstance.writeValue({ start: '2027-12-15T14:20', end: null });
    fixture.detectChanges();
    setText(endInput(), '16/12/2027 16:40');
    endInput().dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    fixture.detectChanges();
    expect(changed).toHaveBeenLastCalledWith({
      start: '2027-12-15T14:20',
      end: '2027-12-16T16:40',
    });
    expect(touched).toHaveBeenCalled();

    fixture.componentRef.setInput('requirements', { start: true, end: true, paired: false });
    fixture.componentInstance.writeValue(EMPTY_DATETIME_RANGE);
    fixture.detectChanges();
    expect(validity).toHaveBeenLastCalledWith(false);
    fixture.componentRef.setInput('readonly', true);
    fixture.detectChanges();
    expect(startInput().readOnly).toBe(true);
    expect(startInput().disabled).toBe(false);
    expect(trigger().disabled).toBe(true);

    fixture.componentRef.setInput('readonly', false);
    fixture.componentRef.setInput('requirements', DEFAULT_RANGE_REQUIREMENTS);
    fixture.componentInstance.writeValue({
      start: '2026-02-05T09:30',
      end: '2026-02-09T17:45',
    });
    fixture.detectChanges();
    openDialogFrom('end');
    fixture.componentInstance.setDisabledState(true);
    fixture.detectChanges();
    expect(calendarDialog().open).toBe(false);
    expect(startInput().disabled).toBe(true);
    expect(endInput().disabled).toBe(true);
  });

  it('rejects public null/malformed shapes and treats writeValue(null) as an empty reset', () => {
    expect(fixture.componentInstance.validate(new FormControl(null))).toEqual({
      dateTimeRangeInvalid: { start: true, end: true },
    });
    expect(
      fixture.componentInstance.validate(new FormControl({ start: '2026-02-05T09:30' })),
    ).toEqual({ dateTimeRangeInvalid: { end: true } });
    fixture.componentRef.setInput('value', undefined);
    fixture.componentInstance.writeValue(null);
    fixture.detectChanges();
    expect(startInput().value).toBe('');
    expect(endInput().value).toBe('');
  });

  it('suppresses required overlap and prioritizes invalid over unavailable range errors', () => {
    fixture.componentRef.setInput('requirements', { start: true, end: false, paired: false });
    fixture.componentRef.setInput('value', {
      start: 'bad',
      end: '2026-02-04T17:00',
    });
    fixture.componentRef.setInput('min', '2026-02-05T09:00');
    fixture.detectChanges();

    expect(
      fixture.componentInstance.validate(
        new FormControl({ start: 'bad', end: '2026-02-04T17:00' }),
      ),
    ).toEqual({
      dateTimeRangeInvalid: { start: true },
      dateTimeRangeUnavailable: { end: true },
    });
    expect(validationMessage()).toBe(LABELS.invalidRange);
  });

  it('keeps malformed dialog source state unconfirmable until explicit Clear', () => {
    fixture.componentRef.setInput('value', {
      start: 'bad',
      end: '2026-02-09T17:45',
    });
    fixture.detectChanges();
    openDialogFrom('start');

    expect(dialogAction('done').disabled).toBe(true);
    dialogAction('clear').click();
    fixture.detectChanges();
    expect(dialogAction('done').disabled).toBe(false);
  });

  it('restores focus to the single trigger after closing', () => {
    openDialogFrom('end');
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    dispatchKey(calendarDialog(), 'Escape');
    expect(calendarDialog().open).toBe(false);
    expect(document.activeElement).toBe(trigger());
  });

  function setInputs(
    value: LocalizedDateTimeRange,
    overrides: Partial<{
      requirements: LocalizedRangeRequirements;
      min: string;
      max: string;
      disabledDates: readonly string[];
      timePickerMode: LocalizedTimePickerMode;
    }> = {},
  ): void {
    fixture.componentRef.setInput('inputId', 'booking');
    fixture.componentRef.setInput('value', value);
    fixture.componentRef.setInput('controlSize', 'default');
    fixture.componentRef.setInput('dateLocale', 'en-GB');
    fixture.componentRef.setInput('labels', LABELS);
    fixture.componentRef.setInput(
      'requirements',
      overrides.requirements ?? DEFAULT_RANGE_REQUIREMENTS,
    );
    fixture.componentRef.setInput('invalid', false);
    fixture.componentRef.setInput('controlDisabled', false);
    fixture.componentRef.setInput('readonly', false);
    fixture.componentRef.setInput('min', overrides.min);
    fixture.componentRef.setInput('max', overrides.max);
    fixture.componentRef.setInput('disabledDates', overrides.disabledDates);
    fixture.componentRef.setInput('timePickerMode', overrides.timePickerMode ?? 'auto');
    fixture.detectChanges();
  }

  function temporalField(): HTMLElement {
    return fixture.nativeElement.querySelector('[data-testid="temporal-picker-field"]')!;
  }

  function startInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('#booking')!;
  }

  function endInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('#booking-end')!;
  }

  function trigger(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('[data-testid="temporal-picker-field-trigger"]')!;
  }

  function calendarDialog(): HTMLDialogElement {
    return fixture.nativeElement.querySelector('[data-testid="date-picker-calendar"]')!;
  }

  function dialog(): HTMLElement {
    return fixture.nativeElement.querySelector('ds-calendar-dialog')!;
  }

  function dayButton(iso: string): HTMLButtonElement {
    return dialog().querySelector(`[data-date="${iso}"]`)!;
  }

  function dialogAction(action: 'clear' | 'cancel' | 'done'): HTMLButtonElement {
    return dialog().querySelector(`[data-testid="date-picker-${action}"]`)!;
  }

  function segmentedButton(
    segment: 'hour' | 'minute',
    boundary: 'start' | 'end' = 'start',
  ): HTMLButtonElement {
    return dialog().querySelector(
      `[data-time-boundary="${boundary}"] [data-segment="${segment}"]`,
    )!;
  }

  function dialogStatus(): string {
    return dialog().querySelector('[data-testid="date-picker-status"]')?.textContent?.trim() ?? '';
  }

  function validationMessage(): string {
    return (
      fixture.nativeElement
        .querySelector('[data-testid="datetime-range-validation-message"]')
        ?.textContent.trim() ?? ''
    );
  }

  function openDialogFrom(boundary: 'start' | 'end'): void {
    (boundary === 'start' ? startInput() : endInput()).click();
    fixture.detectChanges();
    trigger().click();
    fixture.detectChanges();
  }

  function setText(input: HTMLInputElement, value: string): void {
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  }

  function dispatchKey(element: HTMLElement, key: string): void {
    element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    fixture.detectChanges();
  }

  function installDialogMethods(): void {
    const element = calendarDialog();
    Object.defineProperty(element, 'showModal', {
      configurable: true,
      value: (): void => element.setAttribute('open', ''),
    });
    Object.defineProperty(element, 'close', {
      configurable: true,
      value: (): void => {
        element.removeAttribute('open');
        element.dispatchEvent(new Event('close'));
      },
    });
  }
});

describe('LocalizedDateTimeRangePickerComponent server guard', () => {
  it('avoids browser-only validity calls and inline styles', async () => {
    await TestBed.configureTestingModule({
      imports: [LocalizedDateTimeRangePickerComponent],
      providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
    }).compileComponents();
    const fixture = TestBed.createComponent(LocalizedDateTimeRangePickerComponent);
    fixture.componentRef.setInput('inputId', 'server-datetime-range');
    fixture.componentRef.setInput('value', EMPTY_DATETIME_RANGE);
    fixture.componentRef.setInput('controlSize', 'default');
    fixture.componentRef.setInput('dateLocale', 'en-GB');
    fixture.componentRef.setInput('labels', LABELS);
    fixture.componentRef.setInput('invalid', false);
    fixture.componentRef.setInput('controlDisabled', false);
    fixture.componentRef.setInput('readonly', false);
    const setCustomValidity = jest.spyOn(HTMLInputElement.prototype, 'setCustomValidity');
    fixture.detectChanges();
    expect(setCustomValidity).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[style]')).toBeNull();
    setCustomValidity.mockRestore();
    fixture.destroy();
  });
});
