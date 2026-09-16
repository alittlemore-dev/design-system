import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  CalendarDialogComponent,
  CalendarDialogLabels,
  TemporalRangeDraft,
} from './calendar-dialog.component';

const LABELS: CalendarDialogLabels = {
  dialog: 'Choose date and time',
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  openMonthYearPicker: 'Choose month and year',
  previousYear: 'Previous year',
  nextYear: 'Next year',
  clear: 'Clear',
  cancel: 'Cancel',
  done: 'Done',
  today: 'Today',
  now: 'Now',
  timeInput: 'Time',
  hour: 'Hour',
  minute: 'Minute',
  keyboardHelp: 'Use arrow keys to choose a date.',
  announceRangePreview: (start, end) => `Preview from ${start} to ${end}`,
};

// @ts-expect-error Transactional dialog labels must include localized actions and announcements.
const _INCOMPLETE_TRANSACTION_LABELS: CalendarDialogLabels = {
  dialog: 'Choose date',
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  openMonthYearPicker: 'Choose month and year',
  previousYear: 'Previous year',
  nextYear: 'Next year',
  clear: 'Clear',
  keyboardHelp: 'Keyboard help',
};
void _INCOMPLETE_TRANSACTION_LABELS;

const SINGLE_DRAFT: TemporalRangeDraft = {
  start: { date: '2026-02-05', time: '09:30' },
  end: { date: null, time: null },
};

const RANGE_DRAFT: TemporalRangeDraft = {
  start: { date: '2026-02-05', time: '09:30' },
  end: { date: '2026-02-08', time: '17:45' },
};

describe('CalendarDialogComponent', () => {
  let fixture: ComponentFixture<CalendarDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarDialogComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(CalendarDialogComponent);
    setInputs(fixture, { draft: SINGLE_DRAFT });
    fixture.detectChanges();
    installDialogMethods(dialog());
  });

  afterEach(() => {
    jest.useRealTimers();
    fixture.destroy();
  });

  it('emits an immutable draft replacement for a date selection without emitting Done', () => {
    const draftChange = jest.fn();
    const done = jest.fn();
    const legacyDateSelected = jest.fn();
    const legacyClosed = jest.fn();
    fixture.componentInstance.draftChange.subscribe(draftChange);
    fixture.componentInstance.done.subscribe(done);
    fixture.componentInstance.dateSelected.subscribe(legacyDateSelected);
    fixture.componentInstance.closed.subscribe(legacyClosed);
    fixture.componentInstance.open(document.createElement('button'), '2026-02-05');

    dayButton('2026-02-06').click();

    expect(draftChange).toHaveBeenCalledWith({
      start: { date: '2026-02-06', time: '09:30' },
      end: { date: null, time: null },
    });
    expect(draftChange.mock.calls[0][0]).not.toBe(SINGLE_DRAFT);
    expect(draftChange.mock.calls[0][0].start).not.toBe(SINGLE_DRAFT.start);
    expect(SINGLE_DRAFT.start.date).toBe('2026-02-05');
    expect(done).not.toHaveBeenCalled();
    expect(legacyDateSelected).not.toHaveBeenCalled();
    expect(legacyClosed).not.toHaveBeenCalled();
    expect(dialog().open).toBe(true);
  });

  it('does not let legacy committed-value aliases replace an explicitly empty draft', () => {
    fixture.componentRef.setInput('draft', {
      start: { date: null, time: null },
      end: { date: null, time: null },
    });
    fixture.componentRef.setInput('selectedDate', '2026-02-05');
    fixture.detectChanges();
    fixture.componentInstance.open(document.createElement('button'), '2026-02-05');

    expect(dayButton('2026-02-05').getAttribute('aria-selected')).toBe('false');
  });

  it('emits Done and closes only when confirmation is currently allowed', () => {
    const done = jest.fn();
    fixture.componentInstance.done.subscribe(done);
    fixture.componentInstance.open(document.createElement('button'));

    actionButton('done').click();
    expect(done).not.toHaveBeenCalled();
    expect(dialog().open).toBe(true);

    fixture.componentRef.setInput('canConfirm', true);
    fixture.detectChanges();
    actionButton('done').click();
    expect(done).toHaveBeenCalledTimes(1);
    expect(dialog().open).toBe(false);
  });

  it('emits Clear without closing or confirming', () => {
    const cleared = jest.fn();
    const done = jest.fn();
    fixture.componentInstance.cleared.subscribe(cleared);
    fixture.componentInstance.done.subscribe(done);
    fixture.componentInstance.open(document.createElement('button'));

    actionButton('clear').click();

    expect(cleared).toHaveBeenCalledTimes(1);
    expect(done).not.toHaveBeenCalled();
    expect(dialog().open).toBe(true);
  });

  it.each([
    [
      'native cancel',
      (): void => {
        dialog().dispatchEvent(new Event('cancel', { cancelable: true }));
      },
    ],
    [
      'Escape',
      (): void => {
        dialog().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      },
    ],
    [
      'backdrop',
      (): void => {
        dialog().dispatchEvent(new MouseEvent('click', { bubbles: true }));
      },
    ],
  ])('emits Cancelled and closes for %s', (_name, closeInteraction) => {
    const cancelled = jest.fn();
    fixture.componentInstance.cancelled.subscribe(cancelled);
    fixture.componentInstance.open(document.createElement('button'));

    closeInteraction();

    expect(cancelled).toHaveBeenCalledTimes(1);
    expect(dialog().open).toBe(false);
  });

  it('keeps the legacy closed compatibility output inert for Cancel, Done, and native close', () => {
    const closed = jest.fn();
    fixture.componentInstance.closed.subscribe(closed);

    fixture.componentInstance.open(document.createElement('button'));
    actionButton('cancel').click();
    expect(closed).not.toHaveBeenCalled();

    fixture.componentRef.setInput('canConfirm', true);
    fixture.detectChanges();
    fixture.componentInstance.open(document.createElement('button'));
    actionButton('done').click();
    expect(closed).not.toHaveBeenCalled();

    fixture.componentInstance.open(document.createElement('button'));
    dialog().dispatchEvent(new Event('close'));
    expect(closed).not.toHaveBeenCalled();
  });

  it('treats repeated Enter on the focused selected single date as Done', () => {
    const done = jest.fn();
    fixture.componentInstance.done.subscribe(done);
    fixture.componentRef.setInput('canConfirm', true);
    fixture.detectChanges();
    fixture.componentInstance.open(document.createElement('button'), '2026-02-05');

    dayButton('2026-02-05').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );

    expect(done).toHaveBeenCalledTimes(1);
    expect(dialog().open).toBe(false);
  });

  it('treats Enter as Done only on the final filled range endpoint', () => {
    const done = jest.fn();
    fixture.componentInstance.done.subscribe(done);
    setInputs(fixture, {
      range: true,
      draft: RANGE_DRAFT,
      activeBoundary: 'end',
      canConfirm: true,
    });
    fixture.detectChanges();
    fixture.componentInstance.open(document.createElement('button'), '2026-02-08');

    dayButton('2026-02-05').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    expect(done).not.toHaveBeenCalled();

    dayButton('2026-02-08').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('emits pointer and keyboard range previews without exposing them as selected', () => {
    const previewEnd = jest.fn();
    fixture.componentInstance.previewEnd.subscribe(previewEnd);
    setInputs(fixture, {
      range: true,
      draft: { ...RANGE_DRAFT, end: { ...RANGE_DRAFT.end, date: null } },
      activeBoundary: 'end',
      activeBoundaryLabel: 'Choose the end date',
    });
    fixture.detectChanges();
    fixture.componentInstance.open(document.createElement('button'), '2026-02-05');

    dayButton('2026-02-08').dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();

    expect(previewEnd).toHaveBeenLastCalledWith('2026-02-08');
    expect(dayButton('2026-02-06').classList).toContain('localized-date-picker-preview');
    expect(dayButton('2026-02-08').classList).toContain('localized-date-picker-preview-end');
    expect(dayButton('2026-02-06').getAttribute('aria-selected')).toBe('false');
    expect(liveRegion().textContent).toContain('Choose the end date');
    expect(liveRegion().textContent).toContain('Preview from 5 February 2026 to 8 February 2026');

    dayButton('2026-02-09').focus();
    fixture.detectChanges();
    expect(previewEnd).toHaveBeenLastCalledWith('2026-02-09');
  });

  it('disables range-end candidates whose inclusive interval crosses a disabled date', () => {
    const draftChange = jest.fn();
    fixture.componentInstance.draftChange.subscribe(draftChange);
    setInputs(fixture, {
      range: true,
      draft: { ...RANGE_DRAFT, end: { ...RANGE_DRAFT.end, date: null } },
      activeBoundary: 'end',
      disabledDates: ['2026-02-07'],
    });
    fixture.detectChanges();
    fixture.componentInstance.open(document.createElement('button'), '2026-02-05');

    expect(dayButton('2026-02-06').disabled).toBe(false);
    expect(dayButton('2026-02-07').disabled).toBe(true);
    expect(dayButton('2026-02-08').disabled).toBe(true);
    expect(dayButton('2026-02-04').disabled).toBe(false);
    dayButton('2026-02-08').click();
    expect(draftChange).not.toHaveBeenCalled();
  });

  it('alternates range boundaries after every accepted date and keeps the dates ordered', () => {
    const draftChange = jest.fn();
    fixture.componentInstance.draftChange.subscribe(draftChange);
    setInputs(fixture, {
      range: true,
      activeBoundary: 'start',
      draft: {
        start: { date: null, time: null },
        end: { date: null, time: null },
      },
    });
    fixture.detectChanges();
    fixture.componentInstance.open(document.createElement('button'), '2026-02-12');

    dayButton('2026-02-12').click();
    dayButton('2026-02-13').click();
    dayButton('2026-02-10').click();
    dayButton('2026-02-08').click();

    expect(draftChange.mock.calls.map(([draft]) => draft)).toEqual([
      {
        start: { date: '2026-02-12', time: null },
        end: { date: null, time: null },
      },
      {
        start: { date: '2026-02-12', time: null },
        end: { date: '2026-02-13', time: null },
      },
      {
        start: { date: '2026-02-10', time: null },
        end: { date: '2026-02-13', time: null },
      },
      {
        start: { date: '2026-02-08', time: null },
        end: { date: '2026-02-10', time: null },
      },
    ]);
  });

  it('sorts a replacement start after the existing end and preserves semantic time slots', () => {
    const draftChange = jest.fn();
    fixture.componentInstance.draftChange.subscribe(draftChange);
    setInputs(fixture, {
      kind: 'datetime',
      range: true,
      activeBoundary: 'end',
      draft: RANGE_DRAFT,
    });
    fixture.detectChanges();
    fixture.componentInstance.open(document.createElement('button'), '2026-02-05');

    dayButton('2026-02-15').click();

    expect(draftChange).toHaveBeenLastCalledWith({
      start: { date: '2026-02-08', time: '09:30' },
      end: { date: '2026-02-15', time: '17:45' },
    });
  });

  it('allows equal range dates and resets a complete range to start selection when reopened', () => {
    const draftChange = jest.fn();
    fixture.componentInstance.draftChange.subscribe(draftChange);
    setInputs(fixture, {
      range: true,
      activeBoundary: 'end',
      draft: RANGE_DRAFT,
    });
    fixture.detectChanges();
    fixture.componentInstance.open(document.createElement('button'), '2026-02-05');

    dayButton('2026-02-08').click();

    expect(draftChange).toHaveBeenLastCalledWith({
      start: { date: '2026-02-08', time: '09:30' },
      end: { date: '2026-02-08', time: '17:45' },
    });
  });

  it('applies Today and Now to the active draft only and honors shortcut availability', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 1, 12, 14, 7));
    const draftChange = jest.fn();
    fixture.componentInstance.draftChange.subscribe(draftChange);
    setInputs(fixture, {
      kind: 'datetime',
      range: true,
      draft: RANGE_DRAFT,
      activeBoundary: 'end',
    });
    fixture.detectChanges();
    fixture.componentInstance.open(document.createElement('button'), '2026-02-05');

    actionButton('today').click();
    expect(draftChange).toHaveBeenLastCalledWith({
      start: { date: '2026-02-08', time: '09:30' },
      end: { date: '2026-02-12', time: '17:45' },
    });

    actionButton('now').click();
    expect(draftChange).toHaveBeenLastCalledWith({
      start: { date: '2026-02-12', time: '14:07' },
      end: { date: '2026-02-12', time: '17:45' },
    });

    fixture.componentRef.setInput('disabledDates', ['2026-02-12']);
    fixture.detectChanges();
    expect(actionButton('today').disabled).toBe(true);
    expect(actionButton('now').disabled).toBe(true);
  });

  it('routes Today through alternating range date selection and ordered replacements', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 1, 12, 14, 7));
    const draftChange = jest.fn();
    const activeBoundaryChange = jest.fn();
    fixture.componentInstance.draftChange.subscribe(draftChange);
    fixture.componentInstance.activeBoundaryChange.subscribe(activeBoundaryChange);
    setInputs(fixture, {
      kind: 'datetime',
      range: true,
      draft: RANGE_DRAFT,
      activeBoundary: 'start',
    });
    fixture.detectChanges();
    fixture.componentInstance.open(document.createElement('button'), '2026-02-05');

    actionButton('today').click();

    expect(draftChange).toHaveBeenLastCalledWith({
      start: { date: '2026-02-08', time: '09:30' },
      end: { date: '2026-02-12', time: '17:45' },
    });
    expect(activeBoundaryChange).toHaveBeenLastCalledWith('end');

    jest.setSystemTime(new Date(2026, 1, 4, 14, 7));
    setInputs(fixture, {
      kind: 'datetime',
      range: true,
      draft: RANGE_DRAFT,
      activeBoundary: 'end',
    });
    fixture.detectChanges();
    actionButton('today').click();

    expect(draftChange).toHaveBeenLastCalledWith({
      start: { date: '2026-02-04', time: '09:30' },
      end: { date: '2026-02-05', time: '17:45' },
    });
  });

  it('renders and announces the supplied localized transaction labels', () => {
    setInputs(fixture, {
      kind: 'datetime',
      range: true,
      draft: { ...RANGE_DRAFT, end: { ...RANGE_DRAFT.end, date: null } },
      activeBoundary: 'end',
      activeBoundaryLabel: 'Editing the finish',
    });
    fixture.componentRef.setInput('labels', {
      ...LABELS,
      cancel: 'Discard draft',
      done: 'Apply draft',
      today: 'Use local date',
      now: 'Use local time',
      hour: 'Localized hour',
      minute: 'Localized minute',
      announceRangePreview: (start: string, end: string) => `${start} through ${end}`,
    } satisfies CalendarDialogLabels);
    fixture.detectChanges();
    fixture.componentInstance.open(document.createElement('button'), '2026-02-05');

    expect(actionButton('cancel').textContent).toContain('Discard draft');
    expect(actionButton('done').textContent).toContain('Apply draft');
    expect(actionButton('today').textContent).toContain('Use local date');
    expect(actionButton('now').textContent).toContain('Use local time');
    expect(dialog().querySelector('[aria-label="Localized hour"]')).not.toBeNull();
    expect(dialog().querySelector('[aria-label="Localized minute"]')).not.toBeNull();
    dayButton('2026-02-08').dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();
    expect(liveRegion().textContent).toContain('5 February 2026 through 8 February 2026');
  });

  it('does not render hard-coded English fallbacks for a legacy label object', () => {
    setInputs(fixture, { kind: 'datetime' });
    fixture.componentRef.setInput('labels', {
      dialog: 'Legacy dialog',
      previousMonth: 'Previous month',
      nextMonth: 'Next month',
      openMonthYearPicker: 'Choose month and year',
      previousYear: 'Previous year',
      nextYear: 'Next year',
      clear: 'Clear legacy',
      close: 'Dismiss legacy',
      keyboardHelp: 'Legacy keyboard help',
    });
    fixture.detectChanges();
    fixture.componentInstance.open(document.createElement('button'), '2026-02-05');

    expect(dialog().querySelector('[data-testid="date-picker-done"]')).toBeNull();
    expect(dialog().querySelector('[data-testid="date-picker-today"]')).toBeNull();
    expect(dialog().querySelector('[data-testid="date-picker-now"]')).toBeNull();
    expect(dialog().querySelector('ds-segmented-time-input')).toBeNull();
    expect(actionButton('cancel').textContent).toContain('Dismiss legacy');
  });

  it('does not expose an unannounced range preview for legacy labels', () => {
    const previewEnd = jest.fn();
    fixture.componentInstance.previewEnd.subscribe(previewEnd);
    setInputs(fixture, {
      range: true,
      draft: { ...RANGE_DRAFT, end: { ...RANGE_DRAFT.end, date: null } },
      activeBoundary: 'end',
      activeBoundaryLabel: 'Choose the end date',
    });
    fixture.componentRef.setInput('labels', {
      dialog: 'Legacy dialog',
      previousMonth: 'Previous month',
      nextMonth: 'Next month',
      openMonthYearPicker: 'Choose month and year',
      previousYear: 'Previous year',
      nextYear: 'Next year',
      clear: 'Clear legacy',
      close: 'Dismiss legacy',
      keyboardHelp: 'Legacy keyboard help',
    });
    fixture.detectChanges();
    fixture.componentInstance.open(document.createElement('button'), '2026-02-05');

    dayButton('2026-02-08').dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();

    expect(previewEnd).not.toHaveBeenCalled();
    expect(dayButton('2026-02-06').classList).not.toContain('localized-date-picker-preview');
    expect(liveRegion().textContent).toContain('Choose the end date');
  });

  it('renders the segmented time control in custom mode and updates only the draft', () => {
    const draftChange = jest.fn();
    fixture.componentInstance.draftChange.subscribe(draftChange);
    setInputs(fixture, { kind: 'time', timePickerMode: 'custom' });
    fixture.detectChanges();
    fixture.componentInstance.open(document.createElement('button'));

    expect(dialog().querySelector('ds-segmented-time-input')).not.toBeNull();
    expect(dialog().querySelector('input[type="time"]')).toBeNull();
    const segmented = fixture.debugElement.children[0].query(
      (node) => node.name === 'ds-segmented-time-input',
    );
    segmented.triggerEventHandler('valueChange', '11:45');
    expect(draftChange).toHaveBeenCalledWith({
      start: { date: '2026-02-05', time: '11:45' },
      end: { date: null, time: null },
    });
  });

  it('renders both custom range times together and routes each edit to its own endpoint', () => {
    const draftChange = jest.fn();
    fixture.componentInstance.draftChange.subscribe(draftChange);
    setInputs(fixture, {
      kind: 'time',
      range: true,
      draft: RANGE_DRAFT,
      timePickerMode: 'custom',
    });
    fixture.componentRef.setInput('startTimeLabel', 'Start time');
    fixture.componentRef.setInput('endTimeLabel', 'End time');
    fixture.detectChanges();
    fixture.componentInstance.open(document.createElement('button'));

    const editors = fixture.debugElement.children[0].queryAll(
      (node) => node.name === 'ds-segmented-time-input',
    );
    expect(editors).toHaveLength(2);
    expect(
      [...dialog().querySelectorAll('[data-testid="date-picker-time-boundary-label"]')].map(
        (label) => label.textContent?.trim(),
      ),
    ).toEqual(['Start time', 'End time']);

    editors[1].triggerEventHandler('valueChange', '18:00');
    expect(draftChange).toHaveBeenLastCalledWith({
      start: RANGE_DRAFT.start,
      end: { date: '2026-02-08', time: '18:00' },
    });
  });

  it('renders two native range time inputs with endpoint-specific bounds and edits', () => {
    const draftChange = jest.fn();
    fixture.componentInstance.draftChange.subscribe(draftChange);
    setInputs(fixture, {
      kind: 'datetime',
      range: true,
      draft: RANGE_DRAFT,
      timePickerMode: 'native',
      min: '2026-02-05T09:00',
      max: '2026-02-08T18:00',
    });
    fixture.componentRef.setInput('startTimeLabel', 'Start time');
    fixture.componentRef.setInput('endTimeLabel', 'End time');
    fixture.detectChanges();
    fixture.componentInstance.open(document.createElement('button'));

    const inputs = dialog().querySelectorAll<HTMLInputElement>('input[type="time"]');
    expect(inputs).toHaveLength(2);
    expect(inputs[0].value).toBe('09:30');
    expect(inputs[0].min).toBe('09:00');
    expect(inputs[0].max).toBe('');
    expect(inputs[1].value).toBe('17:45');
    expect(inputs[1].min).toBe('');
    expect(inputs[1].max).toBe('18:00');

    inputs[0].value = '10:15';
    inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
    expect(draftChange).toHaveBeenLastCalledWith({
      start: { date: '2026-02-05', time: '10:15' },
      end: RANGE_DRAFT.end,
    });
  });

  it('keeps both range time editors available after one endpoint is completed', () => {
    const activeBoundaryChange = jest.fn();
    fixture.componentInstance.activeBoundaryChange.subscribe(activeBoundaryChange);
    setInputs(fixture, {
      kind: 'time',
      range: true,
      activeBoundary: 'start',
      draft: {
        start: { date: null, time: null },
        end: { date: null, time: null },
      },
    });
    fixture.detectChanges();
    fixture.componentInstance.open(document.createElement('button'));
    const segmented = fixture.debugElement.children[0].queryAll(
      (node) => node.name === 'ds-segmented-time-input',
    )[0];

    segmented.triggerEventHandler('valueChange', '14:45');
    segmented.triggerEventHandler('editCompleted', '14:45');

    expect(activeBoundaryChange).toHaveBeenLastCalledWith('start');
    expect(
      fixture.debugElement.children[0].queryAll((node) => node.name === 'ds-segmented-time-input'),
    ).toHaveLength(2);
  });

  it('renders a minute-precision native time input and keeps changes transactional', () => {
    const draftChange = jest.fn();
    const done = jest.fn();
    fixture.componentInstance.draftChange.subscribe(draftChange);
    fixture.componentInstance.done.subscribe(done);
    setInputs(fixture, { kind: 'time', timePickerMode: 'native' });
    fixture.detectChanges();
    fixture.componentInstance.open(document.createElement('button'));
    const input = dialog().querySelector('input[type="time"]') as HTMLInputElement;

    expect(input.step).toBe('60');
    input.value = '13:25';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    expect(draftChange).toHaveBeenCalledWith({
      start: { date: '2026-02-05', time: '13:25' },
      end: { date: null, time: null },
    });
    expect(done).not.toHaveBeenCalled();
  });

  it('forwards canonical time edits even when bounds, order, or a datetime date are incomplete', () => {
    const draftChange = jest.fn();
    fixture.componentInstance.draftChange.subscribe(draftChange);
    setInputs(fixture, {
      kind: 'datetime',
      range: true,
      activeBoundary: 'start',
      draft: {
        start: { date: null, time: '09:30' },
        end: { date: '2026-02-08', time: '17:00' },
      },
      min: '2026-02-05T10:00',
      max: '2026-02-08T18:00',
      timePickerMode: 'native',
    });
    fixture.detectChanges();
    fixture.componentInstance.open(document.createElement('button'));
    const input = dialog().querySelector('input[type="time"]') as HTMLInputElement;

    input.value = '19:00';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    expect(draftChange).toHaveBeenLastCalledWith({
      start: { date: null, time: '19:00' },
      end: { date: '2026-02-08', time: '17:00' },
    });
  });

  it('preserves a just-selected range end date when time changes before input rebinding', () => {
    const draftChange = jest.fn();
    fixture.componentInstance.draftChange.subscribe(draftChange);
    setInputs(fixture, {
      kind: 'datetime',
      range: true,
      activeBoundary: 'end',
      draft: {
        start: { date: '2026-02-05', time: '09:30' },
        end: { date: null, time: null },
      },
      timePickerMode: 'custom',
    });
    fixture.detectChanges();
    fixture.componentInstance.open(document.createElement('button'), '2026-02-05');

    dayButton('2026-02-08').click();
    const segmented = fixture.debugElement.children[0].queryAll(
      (node) => node.name === 'ds-segmented-time-input',
    )[1];
    segmented.triggerEventHandler('valueChange', '17:00');

    expect(draftChange).toHaveBeenNthCalledWith(1, {
      start: { date: '2026-02-05', time: '09:30' },
      end: { date: '2026-02-08', time: null },
    });
    expect(draftChange).toHaveBeenNthCalledWith(2, {
      start: { date: '2026-02-05', time: '09:30' },
      end: { date: '2026-02-08', time: '17:00' },
    });
  });

  it('resets its transaction draft on Cancel, reopen, and Clear', () => {
    const draftChange = jest.fn();
    fixture.componentInstance.draftChange.subscribe(draftChange);
    setInputs(fixture, { kind: 'datetime', timePickerMode: 'native' });
    fixture.detectChanges();

    fixture.componentInstance.open(document.createElement('button'), '2026-02-05');
    dayButton('2026-02-06').click();
    actionButton('cancel').click();

    fixture.componentInstance.open(document.createElement('button'), '2026-02-05');
    let input = dialog().querySelector('input[type="time"]') as HTMLInputElement;
    input.value = '12:00';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(draftChange).toHaveBeenLastCalledWith({
      start: { date: '2026-02-05', time: '12:00' },
      end: { date: null, time: null },
    });

    actionButton('clear').click();
    input = dialog().querySelector('input[type="time"]') as HTMLInputElement;
    input.value = '13:00';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(draftChange).toHaveBeenLastCalledWith({
      start: { date: null, time: '13:00' },
      end: { date: null, time: null },
    });
  });

  it('marks an emptied native time edit invalid instead of retaining the previous draft', () => {
    const draftChange = jest.fn();
    fixture.componentInstance.draftChange.subscribe(draftChange);
    setInputs(fixture, { kind: 'time', timePickerMode: 'native' });
    fixture.detectChanges();
    fixture.componentInstance.open(document.createElement('button'));
    const input = dialog().querySelector('input[type="time"]') as HTMLInputElement;

    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    expect(draftChange).toHaveBeenLastCalledWith({
      start: { date: '2026-02-05', time: null, sourceInvalid: true },
      end: { date: null, time: null },
    });
  });

  it('projects datetime min and max to calendar-day availability', () => {
    setInputs(fixture, {
      kind: 'datetime',
      draft: SINGLE_DRAFT,
      min: '2026-02-05T09:30',
      max: '2026-02-08T17:45',
    });
    fixture.detectChanges();
    fixture.componentInstance.open(document.createElement('button'), '2026-02-05');

    expect(dayButton('2026-02-04').disabled).toBe(true);
    expect(dayButton('2026-02-05').disabled).toBe(false);
    expect(dayButton('2026-02-08').disabled).toBe(false);
    expect(dayButton('2026-02-09').disabled).toBe(true);
  });

  it('ignores cross-kind date, time, and datetime bounds in dialog controls', () => {
    setInputs(fixture, {
      kind: 'date',
      draft: SINGLE_DRAFT,
      min: '2026-02-05T09:30',
      max: '17:00',
    });
    fixture.detectChanges();
    fixture.componentInstance.open(document.createElement('button'), '2026-02-05');
    expect(dayButton('2026-02-04').disabled).toBe(false);
    fixture.componentInstance.close();

    setInputs(fixture, {
      kind: 'datetime',
      draft: SINGLE_DRAFT,
      min: '2026-02-05',
      max: '17:00',
      timePickerMode: 'native',
    });
    fixture.detectChanges();
    fixture.componentInstance.open(document.createElement('button'), '2026-02-05');
    expect(dayButton('2026-02-04').disabled).toBe(false);
    let input = dialog().querySelector('input[type="time"]') as HTMLInputElement;
    expect(input.min).toBe('');
    expect(input.max).toBe('');
    fixture.componentInstance.close();

    setInputs(fixture, {
      kind: 'time',
      draft: SINGLE_DRAFT,
      min: '2026-02-05',
      max: '2026-02-08T17:45',
      timePickerMode: 'native',
    });
    fixture.detectChanges();
    fixture.componentInstance.open(document.createElement('button'));
    input = dialog().querySelector('input[type="time"]') as HTMLInputElement;
    expect(input.min).toBe('');
    expect(input.max).toBe('');
  });

  it('projects datetime boundary-day time edges to the active native time panel', () => {
    const draftChange = jest.fn();
    fixture.componentInstance.draftChange.subscribe(draftChange);
    setInputs(fixture, {
      kind: 'datetime',
      draft: SINGLE_DRAFT,
      min: '2026-02-05T09:30',
      max: '2026-02-08T17:45',
      timePickerMode: 'native',
    });
    fixture.detectChanges();
    fixture.componentInstance.open(document.createElement('button'), '2026-02-05');
    let input = dialog().querySelector('input[type="time"]') as HTMLInputElement;

    expect(input.min).toBe('09:30');
    expect(input.max).toBe('');
    input.value = '09:29';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(draftChange).toHaveBeenLastCalledWith({
      start: { date: '2026-02-05', time: '09:29' },
      end: { date: null, time: null },
    });
    input.value = '09:30';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(draftChange).toHaveBeenLastCalledWith({
      start: { date: '2026-02-05', time: '09:30' },
      end: { date: null, time: null },
    });

    fixture.componentRef.setInput('draft', {
      ...SINGLE_DRAFT,
      start: { ...SINGLE_DRAFT.start, date: '2026-02-08' },
    });
    fixture.detectChanges();
    input = dialog().querySelector('input[type="time"]') as HTMLInputElement;
    expect(input.min).toBe('');
    expect(input.max).toBe('17:45');
    draftChange.mockClear();
    input.value = '17:46';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(draftChange).toHaveBeenLastCalledWith({
      start: { date: '2026-02-08', time: '17:46' },
      end: { date: null, time: null },
    });
    input.value = '17:45';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(draftChange).toHaveBeenLastCalledWith({
      start: { date: '2026-02-08', time: '17:45' },
      end: { date: null, time: null },
    });
  });

  it('resolves auto time mode on each browser-side open', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'matchMedia');
    const matchMedia = jest.fn().mockReturnValue({ matches: true });
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: matchMedia });
    setInputs(fixture, { kind: 'time', timePickerMode: 'auto' });
    fixture.detectChanges();

    expect(dialog().querySelector('ds-segmented-time-input')).toBeNull();
    fixture.componentInstance.open(document.createElement('button'));
    expect(matchMedia).toHaveBeenCalledWith('(hover: none) and (pointer: coarse)');
    expect(dialog().querySelector('input[type="time"]')).not.toBeNull();

    fixture.componentInstance.close();
    matchMedia.mockReturnValue({ matches: false });
    fixture.componentInstance.open(document.createElement('button'));
    expect(dialog().querySelector('ds-segmented-time-input')).not.toBeNull();

    if (original) Object.defineProperty(window, 'matchMedia', original);
    else Reflect.deleteProperty(window, 'matchMedia');
  });

  it('wraps Tab inside the dialog and restores the exact opener after close', () => {
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();
    fixture.componentRef.setInput('canConfirm', true);
    fixture.detectChanges();
    fixture.componentInstance.open(opener, '2026-02-05');
    const focusable = visibleFocusableElements(dialog());
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    last.focus();
    last.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(document.activeElement).toBe(first);

    first.focus();
    first.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }),
    );
    expect(document.activeElement).toBe(last);

    actionButton('cancel').click();
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  function dialog(): HTMLDialogElement {
    return fixture.nativeElement.querySelector(
      '[data-testid="date-picker-calendar"]',
    ) as HTMLDialogElement;
  }

  function dayButton(iso: string): HTMLButtonElement {
    const button = dialog().querySelector(`[data-date="${iso}"]`) as HTMLButtonElement;
    expect(button).not.toBeNull();
    return button;
  }

  function actionButton(action: string): HTMLButtonElement {
    const button = dialog().querySelector(
      `[data-testid="date-picker-${action}"]`,
    ) as HTMLButtonElement;
    expect(button).not.toBeNull();
    return button;
  }

  function liveRegion(): HTMLElement {
    return dialog().querySelector('[data-testid="date-picker-status"]') as HTMLElement;
  }
});

describe('CalendarDialogComponent server platform', () => {
  it('omits clock-dependent closed-dialog UI and never calls browser APIs', async () => {
    const original = Object.getOwnPropertyDescriptor(window, 'matchMedia');
    const matchMedia = jest.fn().mockReturnValue({ matches: true });
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: matchMedia });
    await TestBed.configureTestingModule({
      imports: [CalendarDialogComponent],
      providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
    }).compileComponents();
    const fixture = TestBed.createComponent(CalendarDialogComponent);
    setInputs(fixture, {
      kind: 'datetime',
      timePickerMode: 'auto',
      draft: {
        start: { date: null, time: null },
        end: { date: null, time: null },
      },
    });
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector(
      '[data-testid="date-picker-calendar"]',
    ) as HTMLDialogElement;
    const showModal = jest.fn();
    Object.defineProperty(dialog, 'showModal', { configurable: true, value: showModal });
    const trigger = document.createElement('button');
    const focus = jest.spyOn(trigger, 'focus');

    expect(dialog.querySelector('.localized-date-picker-calendar-content')).toBeNull();
    expect(dialog.querySelector('[data-date]')).toBeNull();
    expect(dialog.querySelector('[data-testid="date-picker-month-heading"]')).toBeNull();
    expect(dialog.querySelector('ds-segmented-time-input')).toBeNull();
    expect(fixture.componentInstance.open(trigger, '2026-02-05')).toBe(false);
    expect(matchMedia).not.toHaveBeenCalled();
    expect(showModal).not.toHaveBeenCalled();
    expect(focus).not.toHaveBeenCalled();
    fixture.destroy();
    if (original) Object.defineProperty(window, 'matchMedia', original);
    else Reflect.deleteProperty(window, 'matchMedia');
  });
});

function setInputs(
  fixture: ComponentFixture<CalendarDialogComponent>,
  values: Partial<{
    kind: 'date' | 'time' | 'datetime';
    range: boolean;
    draft: TemporalRangeDraft;
    activeBoundary: 'single' | 'start' | 'end';
    activeBoundaryLabel: string;
    canConfirm: boolean;
    disabledDates: readonly string[];
    timePickerMode: 'auto' | 'native' | 'custom';
    min: string;
    max: string;
  }> = {},
): void {
  fixture.componentRef.setInput('dialogId', 'calendar-core-test');
  fixture.componentRef.setInput('dateLocale', 'en-GB');
  fixture.componentRef.setInput('labels', LABELS);
  fixture.componentRef.setInput('kind', values.kind ?? 'date');
  fixture.componentRef.setInput('range', values.range ?? false);
  fixture.componentRef.setInput('draft', values.draft ?? SINGLE_DRAFT);
  fixture.componentRef.setInput('activeBoundary', values.activeBoundary ?? 'single');
  fixture.componentRef.setInput('activeBoundaryLabel', values.activeBoundaryLabel ?? '');
  fixture.componentRef.setInput('canConfirm', values.canConfirm ?? false);
  fixture.componentRef.setInput('disabled', false);
  fixture.componentRef.setInput('readonly', false);
  fixture.componentRef.setInput('disabledDates', values.disabledDates);
  fixture.componentRef.setInput('timePickerMode', values.timePickerMode ?? 'custom');
  fixture.componentRef.setInput('min', values.min);
  fixture.componentRef.setInput('max', values.max);
}

function installDialogMethods(dialog: HTMLDialogElement): void {
  Object.defineProperty(dialog, 'showModal', {
    configurable: true,
    value: (): void => dialog.setAttribute('open', ''),
  });
  Object.defineProperty(dialog, 'close', {
    configurable: true,
    value: (): void => {
      dialog.removeAttribute('open');
      dialog.dispatchEvent(new Event('close'));
    },
  });
}

function visibleFocusableElements(dialog: HTMLDialogElement): HTMLElement[] {
  return [...dialog.querySelectorAll<HTMLElement>('button, input, [tabindex]')].filter(
    (element) => !element.hasAttribute('disabled') && element.tabIndex >= 0,
  );
}
