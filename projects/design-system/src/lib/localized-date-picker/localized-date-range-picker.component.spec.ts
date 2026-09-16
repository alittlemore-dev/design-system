import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import {
  LocalizedDateRangePickerComponent,
  LocalizedDateRangePickerLabels,
} from './localized-date-range-picker.component';
import {
  DEFAULT_RANGE_REQUIREMENTS,
  EMPTY_DATE_RANGE,
  LocalizedDateRange,
  LocalizedRangeRequirements,
} from './localized-temporal-picker.types';

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2
    ? true
    : false;
type Expect<Value extends true> = Value;
type RangeLabelKeys = Expect<
  Equal<
    keyof LocalizedDateRangePickerLabels,
    | 'placeholder'
    | 'openPicker'
    | 'changeValue'
    | 'dialog'
    | 'groupLabel'
    | 'startDate'
    | 'endDate'
    | 'selectStartDate'
    | 'selectEndDate'
    | 'accessibleRangeSeparator'
    | 'announceRangePreview'
    | 'previousMonth'
    | 'nextMonth'
    | 'openMonthYearPicker'
    | 'previousYear'
    | 'nextYear'
    | 'clear'
    | 'cancel'
    | 'done'
    | 'today'
    | 'dateFormatHint'
    | 'keyboardHelp'
    | 'invalidRange'
    | 'unavailableRange'
    | 'requiredRange'
  >
>;

void (0 as unknown as RangeLabelKeys);

const LABELS = {
  placeholder: 'dd/mm/yyyy',
  openPicker: 'Open date range picker',
  changeValue: 'Change date range',
  dialog: 'Choose a date range',
  groupLabel: 'Booking dates',
  startDate: 'Start date',
  endDate: 'End date',
  selectStartDate: 'Select a start date',
  selectEndDate: 'Select an end date',
  accessibleRangeSeparator: 'to',
  announceRangePreview: (start: string, end: string) => `Preview from ${start} to ${end}`,
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  openMonthYearPicker: 'Choose month and year',
  previousYear: 'Previous year',
  nextYear: 'Next year',
  clear: 'Clear',
  cancel: 'Cancel',
  done: 'Done',
  today: 'Today',
  dateFormatHint: 'Date format: DD/MM/YYYY',
  keyboardHelp: 'Use the arrow keys to choose a date.',
  invalidRange: 'Enter a valid date range.',
  unavailableRange: 'This date range is unavailable.',
  requiredRange: 'Enter the required dates.',
} satisfies LocalizedDateRangePickerLabels;

describe('LocalizedDateRangePickerComponent', () => {
  let fixture: ComponentFixture<LocalizedDateRangePickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LocalizedDateRangePickerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LocalizedDateRangePickerComponent);
    setInputs({ start: '2026-02-05', end: '2026-02-09' });
    installDialogMethods(calendarDialog());
  });

  afterEach(() => fixture.destroy());

  it('renders one composite shell with two visible text inputs, one fixed en dash, and one SVG trigger', () => {
    const field = temporalField();
    const inputs = field.querySelectorAll('input[type="text"]');
    const triggers = field.querySelectorAll('[data-testid="temporal-picker-field-trigger"]');

    expect(fixture.nativeElement.querySelectorAll('.temporal-picker-field-shell')).toHaveLength(1);
    expect(inputs).toHaveLength(2);
    expect(triggers).toHaveLength(1);
    expect(triggers[0].querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(1);
    expect(
      field.querySelector('[data-testid="temporal-picker-field-separator"]')?.textContent,
    ).toBe('–');
    expect(field.textContent).not.toContain('📅');
    expect(field.getAttribute('role')).toBe('group');
    expect(field.getAttribute('aria-label')).toBe(LABELS.groupLabel);
    expect(startInput().getAttribute('aria-label')).toBe(LABELS.startDate);
    expect(endInput().getAttribute('aria-label')).toBe(LABELS.endDate);
    expect(calendarToggle().getAttribute('aria-label')).toBe(LABELS.changeValue);
  });

  it('renders the canonical empty range as two blank inputs and accepts it by default', () => {
    setInputs(EMPTY_DATE_RANGE);

    expect(startInput().value).toBe('');
    expect(endInput().value).toBe('');
    expect(calendarToggle().getAttribute('aria-label')).toBe(LABELS.openPicker);
    expect(fixture.componentInstance.requirements()).toEqual(DEFAULT_RANGE_REQUIREMENTS);
    expect(fixture.componentInstance.validate(new FormControl(EMPTY_DATE_RANGE))).toBeNull();
  });

  it('round-trips a valid partial range without emitting empty strings', () => {
    setInputs({ start: '2026-09-11', end: null });
    expect(startInput().value).toBe('11/09/2026');
    expect(endInput().value).toBe('');

    fixture.componentRef.setInput('value', undefined);
    fixture.componentInstance.writeValue({ start: '2026-09-11', end: null });
    const valueChange = jest.fn();
    const onChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    fixture.componentInstance.registerOnChange(onChange);
    fixture.detectChanges();

    setText(endInput(), '12/09/2026');
    endInput().dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    fixture.detectChanges();

    expect(valueChange.mock.calls).toEqual([[{ start: '2026-09-11', end: '2026-09-12' }]]);
    expect(onChange.mock.calls).toEqual([[{ start: '2026-09-11', end: '2026-09-12' }]]);

    setText(endInput(), '');
    endInput().dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    fixture.detectChanges();
    expect(valueChange).toHaveBeenLastCalledWith({ start: '2026-09-11', end: null });
    expect(onChange).toHaveBeenLastCalledWith({ start: '2026-09-11', end: null });
  });

  it.each([
    [{ start: false, end: false, paired: false }, EMPTY_DATE_RANGE, null],
    [
      { start: true, end: false, paired: false },
      EMPTY_DATE_RANGE,
      { required: { start: true, end: false } },
    ],
    [
      { start: false, end: true, paired: false },
      EMPTY_DATE_RANGE,
      { required: { start: false, end: true } },
    ],
    [
      { start: true, end: true, paired: false },
      EMPTY_DATE_RANGE,
      { required: { start: true, end: true } },
    ],
    [{ start: false, end: false, paired: true }, EMPTY_DATE_RANGE, null],
    [
      { start: true, end: false, paired: true },
      EMPTY_DATE_RANGE,
      { required: { start: true, end: false } },
    ],
    [
      { start: false, end: true, paired: true },
      EMPTY_DATE_RANGE,
      { required: { start: false, end: true } },
    ],
    [
      { start: true, end: true, paired: true },
      EMPTY_DATE_RANGE,
      { required: { start: true, end: true } },
    ],
  ] as const)(
    'produces exact required errors for requirements %p',
    (requirements, value, expected) => {
      fixture.componentRef.setInput('requirements', requirements);
      fixture.detectChanges();
      expect(fixture.componentInstance.validate(new FormControl(value))).toEqual(expected);
    },
  );

  it('applies paired requiredness only when the opposite endpoint is present', () => {
    fixture.componentRef.setInput('requirements', { start: false, end: false, paired: true });
    fixture.detectChanges();

    expect(
      fixture.componentInstance.validate(
        new FormControl<LocalizedDateRange>({ start: '2026-02-05', end: null }),
      ),
    ).toEqual({ required: { start: false, end: true } });
    expect(
      fixture.componentInstance.validate(
        new FormControl<LocalizedDateRange>({ start: null, end: '2026-02-09' }),
      ),
    ).toEqual({ required: { start: true, end: false } });
  });

  it('marks only the malformed manual endpoint and reports the exact structured error', () => {
    setText(startInput(), '31/02/2026');

    expect(startInput().getAttribute('aria-invalid')).toBe('true');
    expect(endInput().getAttribute('aria-invalid')).toBeNull();
    expect(validationMessage()).toBe(LABELS.invalidRange);
    expect(
      fixture.componentInstance.validate(
        new FormControl<LocalizedDateRange>({ start: '2026-02-05', end: '2026-02-09' }),
      ),
    ).toEqual({ dateRangeInvalid: { start: true } });

    dispatchKey(startInput(), 'Escape');
    setText(endInput(), '31/02/2026');
    expect(startInput().getAttribute('aria-invalid')).toBeNull();
    expect(endInput().getAttribute('aria-invalid')).toBe('true');
    expect(
      fixture.componentInstance.validate(
        new FormControl<LocalizedDateRange>({ start: '2026-02-05', end: '2026-02-09' }),
      ),
    ).toEqual({ dateRangeInvalid: { end: true } });
  });

  it('suppresses required overlap for malformed endpoints and prioritizes invalid range errors', () => {
    fixture.componentRef.setInput('requirements', { start: true, end: false, paired: false });
    fixture.componentRef.setInput('value', { start: 'bad', end: '2026-02-04' });
    fixture.componentRef.setInput('min', '2026-02-05');
    fixture.detectChanges();

    expect(
      fixture.componentInstance.validate(new FormControl({ start: 'bad', end: '2026-02-04' })),
    ).toEqual({
      dateRangeInvalid: { start: true },
      dateRangeUnavailable: { end: true },
    });
    expect(validationMessage()).toBe(LABELS.invalidRange);
  });

  it('preserves a malformed dialog endpoint until it is canonically replaced', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 1, 5));
    fixture.componentRef.setInput('value', { start: 'bad', end: '2026-02-08' });
    fixture.detectChanges();
    openCalendarFrom('start');

    expect(dialogAction('done').disabled).toBe(true);
    dayButton('2026-02-06').click();
    fixture.detectChanges();
    expect(dialogAction('done').disabled).toBe(false);
  });

  it('rejects reversed manual input while accepting equal boundaries', () => {
    const valueChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    setText(startInput(), '10/02/2026');
    setText(endInput(), '06/02/2026');
    endInput().dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    fixture.detectChanges();

    expect(valueChange).not.toHaveBeenCalled();
    expect(
      fixture.componentInstance.validate(
        new FormControl<LocalizedDateRange>({ start: '2026-02-10', end: '2026-02-06' }),
      ),
    ).toEqual({ dateRangeInvalid: { order: true } });

    setText(startInput(), '08/02/2026');
    setText(endInput(), '08/02/2026');
    endInput().dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    fixture.detectChanges();
    expect(valueChange).toHaveBeenLastCalledWith({ start: '2026-02-08', end: '2026-02-08' });
  });

  it('keeps calendar selection and range preview in the dialog draft until Done', () => {
    const valueChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    openCalendarFrom('start');

    dayButton('2026-02-06').click();
    fixture.detectChanges();
    expect(valueChange).not.toHaveBeenCalled();
    expect(activeBoundary()).toBe(LABELS.selectEndDate);
    expect(endInput().parentElement?.classList).toContain('temporal-picker-field-endpoint-active');
    expect(startInput().value).toBe('05/02/2026');
    expect(endInput().value).toBe('09/02/2026');

    dayButton('2026-02-10').dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    dayButton('2026-02-10').focus();
    fixture.detectChanges();
    expect(valueChange).not.toHaveBeenCalled();
    expect(dayButton('2026-02-10').classList).toContain('localized-date-picker-preview-end');
    expect(
      calendarDialog().querySelector('[data-testid="date-picker-status"]')?.textContent,
    ).toContain('Preview from');
  });

  it('alternates completed-range edits and orders each replacement', () => {
    const valueChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    openCalendarFrom('start');
    dayButton('2026-02-10').click();
    fixture.detectChanges();

    expect(dayButton('2026-02-09').getAttribute('aria-selected')).toBe('true');
    dayButton('2026-02-06').click();
    fixture.detectChanges();
    expect(dayButton('2026-02-06').classList).toContain('localized-date-picker-range-start');
    expect(dayButton('2026-02-09').classList).toContain('localized-date-picker-range-end');
    expect(valueChange).not.toHaveBeenCalled();

    dialogAction('done').click();
    fixture.detectChanges();
    expect(valueChange.mock.calls).toEqual([[{ start: '2026-02-06', end: '2026-02-09' }]]);
  });

  it('keeps the rendered endpoints synchronized through four alternating selections', () => {
    setInputs(EMPTY_DATE_RANGE, {
      min: '2026-02-01',
      max: '2026-02-28',
      disabledDates: ['2026-02-27'],
    });
    openCalendarFrom('start');

    for (const iso of ['2026-02-12', '2026-02-13', '2026-02-10', '2026-02-08']) {
      dayButton(iso).click();
      fixture.detectChanges();
    }

    expect(dayButton('2026-02-08').classList).toContain('localized-date-picker-range-start');
    expect(dayButton('2026-02-10').classList).toContain('localized-date-picker-range-end');
  });

  it('prevents disabled interval candidates from changing the draft', () => {
    setInputs(EMPTY_DATE_RANGE, {
      min: '2026-02-01',
      max: '2026-02-28',
      disabledDates: ['2026-02-07'],
    });
    const valueChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    openCalendarFrom('start');
    dayButton('2026-02-05').click();
    fixture.detectChanges();

    expect(dayButton('2026-02-09').disabled).toBe(true);
    expect(dayButton('2026-02-09').getAttribute('aria-disabled')).toBe('true');
    dayButton('2026-02-09').click();
    fixture.detectChanges();
    expect(dialogAction('done').disabled).toBe(false);
    dialogAction('done').click();
    fixture.detectChanges();
    expect(valueChange.mock.calls).toEqual([[{ start: '2026-02-05', end: null }]]);
  });

  it('commits one canonical object only on Done and rolls draft changes back on Cancel, Escape, and backdrop', () => {
    const valueChange = jest.fn();
    const onChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    fixture.componentInstance.registerOnChange(onChange);

    for (const close of ['cancel', 'escape', 'backdrop'] as const) {
      openCalendarFrom('start');
      dayButton('2026-02-06').click();
      fixture.detectChanges();
      if (close === 'cancel') dialogAction('cancel').click();
      else if (close === 'escape') dispatchKey(calendarDialog(), 'Escape');
      else calendarDialog().dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();
      expect(valueChange).not.toHaveBeenCalled();
      expect(startInput().value).toBe('05/02/2026');
      expect(endInput().value).toBe('09/02/2026');
    }

    openCalendarFrom('end');
    dayButton('2026-02-10').click();
    fixture.detectChanges();
    dialogAction('done').click();
    fixture.detectChanges();
    const expected = { start: '2026-02-09', end: '2026-02-10' };
    expect(valueChange.mock.calls).toEqual([[expected]]);
    expect(onChange.mock.calls).toEqual([[expected]]);
  });

  it('keeps Clear transactional and emits the canonical empty object only after Done', () => {
    const valueChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    openCalendarFrom('start');

    dialogAction('clear').click();
    fixture.detectChanges();
    expect(valueChange).not.toHaveBeenCalled();
    expect(startInput().value).toBe('05/02/2026');
    expect(endInput().value).toBe('09/02/2026');

    dialogAction('done').click();
    fixture.detectChanges();
    expect(valueChange.mock.calls).toEqual([[{ start: null, end: null }]]);
  });

  it('allows a permitted partial range to be confirmed', () => {
    setInputs(EMPTY_DATE_RANGE, { min: '2026-02-01', max: '2026-02-28' });
    const valueChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    openCalendarFrom('end');
    dayButton('2026-02-09').click();
    fixture.detectChanges();

    expect(dialogAction('done').disabled).toBe(false);
    dialogAction('done').click();
    fixture.detectChanges();
    expect(valueChange.mock.calls).toEqual([[{ start: '2026-02-09', end: null }]]);
  });

  it('fills both required boundaries with Enter and confirms the completed draft with Done', () => {
    setInputs(EMPTY_DATE_RANGE, {
      requirements: { start: true, end: true, paired: false },
      min: '2026-02-01',
      max: '2026-02-28',
    });
    const valueChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    openCalendarFrom('start');

    dispatchKey(dayButton('2026-02-06'), 'Enter');
    expect(valueChange).not.toHaveBeenCalled();
    expect(calendarDialog().open).toBe(true);
    expect(activeBoundary()).toBe(LABELS.selectEndDate);

    dispatchKey(dayButton('2026-02-06'), 'Enter');
    expect(valueChange).not.toHaveBeenCalled();
    expect(calendarDialog().open).toBe(true);

    dialogAction('done').click();
    expect(valueChange.mock.calls).toEqual([[{ start: '2026-02-06', end: '2026-02-06' }]]);
    expect(calendarDialog().open).toBe(false);
  });

  it('reports exact endpoint and interval availability errors and a common unavailable message', () => {
    setInputs(
      { start: '2026-02-05', end: '2026-02-09' },
      { min: '2026-02-06', disabledDates: ['2026-02-07'] },
    );

    expect(
      fixture.componentInstance.validate(
        new FormControl<LocalizedDateRange>({ start: '2026-02-05', end: '2026-02-09' }),
      ),
    ).toEqual({ dateRangeUnavailable: { start: true, interval: true } });
    expect(startInput().getAttribute('aria-invalid')).toBe('true');
    expect(endInput().getAttribute('aria-invalid')).toBe('true');
    expect(validationMessage()).toBe(LABELS.unavailableRange);

    fixture.componentRef.setInput('min', undefined);
    fixture.componentRef.setInput('max', '2026-02-08');
    fixture.componentRef.setInput('disabledDates', undefined);
    fixture.detectChanges();
    expect(
      fixture.componentInstance.validate(
        new FormControl<LocalizedDateRange>({ start: '2026-02-05', end: '2026-02-09' }),
      ),
    ).toEqual({ dateRangeUnavailable: { end: true } });
  });

  it('emits validity transitions for requiredness, manual drafts, ordering, and availability', () => {
    const validityChange = jest.fn();
    fixture.componentInstance.validityChange.subscribe(validityChange);

    fixture.componentRef.setInput('requirements', { start: true, end: false, paired: false });
    fixture.componentRef.setInput('value', EMPTY_DATE_RANGE);
    fixture.detectChanges();
    expect(validityChange).toHaveBeenLastCalledWith(false);

    fixture.componentRef.setInput('value', { start: '2026-02-05', end: null });
    fixture.detectChanges();
    expect(validityChange).toHaveBeenLastCalledWith(true);

    setText(startInput(), '31/02/2026');
    expect(validityChange).toHaveBeenLastCalledWith(false);
    dispatchKey(startInput(), 'Escape');
    expect(validityChange).toHaveBeenLastCalledWith(true);

    setText(endInput(), '04/02/2026');
    expect(validityChange).toHaveBeenLastCalledWith(false);
    dispatchKey(endInput(), 'Escape');
    expect(validityChange).toHaveBeenLastCalledWith(true);

    fixture.componentRef.setInput('min', '2026-02-06');
    fixture.detectChanges();
    expect(validityChange).toHaveBeenLastCalledWith(false);
  });

  it('treats public null or malformed shapes as invalid but writeValue(null) as an empty-range reset', () => {
    fixture.componentRef.setInput('value', undefined);
    fixture.componentInstance.writeValue({ start: '2027-12-15', end: null });
    fixture.detectChanges();
    expect(startInput().value).toBe('15/12/2027');

    expect(fixture.componentInstance.validate(new FormControl(null))).toEqual({
      dateRangeInvalid: { start: true, end: true },
    });
    expect(fixture.componentInstance.validate(new FormControl({ start: '2026-02-05' }))).toEqual({
      dateRangeInvalid: { end: true },
    });

    fixture.componentInstance.writeValue(null);
    fixture.detectChanges();
    expect(startInput().value).toBe('');
    expect(endInput().value).toBe('');

    fixture.componentRef.setInput('value', null as unknown as LocalizedDateRange);
    fixture.detectChanges();
    expect(validationMessage()).toBe(LABELS.invalidRange);
    fixture.componentRef.setInput('value', { start: '2026-02-05', end: null });
    fixture.detectChanges();
    expect(startInput().value).toBe('05/02/2026');
  });

  it('keeps readonly focusable, disables all controls when disabled, and closes an open draft', () => {
    fixture.componentRef.setInput('readonly', true);
    fixture.detectChanges();
    expect(startInput().readOnly).toBe(true);
    expect(startInput().disabled).toBe(false);
    expect(calendarToggle().disabled).toBe(true);

    fixture.componentRef.setInput('readonly', false);
    fixture.detectChanges();
    openCalendarFrom('start');
    fixture.componentInstance.setDisabledState(true);
    fixture.detectChanges();
    expect(calendarDialog().open).toBe(false);
    expect(startInput().disabled).toBe(true);
    expect(endInput().disabled).toBe(true);
  });

  function setInputs(
    value: LocalizedDateRange,
    overrides: Partial<{
      requirements: LocalizedRangeRequirements;
      min: string;
      max: string;
      disabledDates: readonly string[];
      readonly: boolean;
    }> = {},
  ): void {
    fixture.componentRef.setInput('value', value);
    fixture.componentRef.setInput('inputId', 'range');
    fixture.componentRef.setInput('controlSize', 'default');
    fixture.componentRef.setInput('dateLocale', 'en-GB');
    fixture.componentRef.setInput('labels', LABELS);
    fixture.componentRef.setInput(
      'requirements',
      overrides.requirements ?? DEFAULT_RANGE_REQUIREMENTS,
    );
    fixture.componentRef.setInput('invalid', false);
    fixture.componentRef.setInput('controlDisabled', false);
    fixture.componentRef.setInput('readonly', overrides.readonly ?? false);
    fixture.componentRef.setInput('min', overrides.min);
    fixture.componentRef.setInput('max', overrides.max);
    fixture.componentRef.setInput('disabledDates', overrides.disabledDates);
    fixture.detectChanges();
  }

  function temporalField(): HTMLElement {
    return fixture.nativeElement.querySelector('[data-testid="temporal-picker-field"]')!;
  }

  function startInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('#range') as HTMLInputElement;
  }

  function endInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('#range-end') as HTMLInputElement;
  }

  function calendarToggle(): HTMLButtonElement {
    return fixture.nativeElement.querySelector(
      '[data-testid="temporal-picker-field-trigger"]',
    ) as HTMLButtonElement;
  }

  function calendarDialog(): HTMLDialogElement {
    return fixture.nativeElement.querySelector(
      '[data-testid="date-picker-calendar"]',
    ) as HTMLDialogElement;
  }

  function dayButton(iso: string): HTMLButtonElement {
    const button = calendarDialog().querySelector(`[data-date="${iso}"]`) as HTMLButtonElement;
    expect(button).not.toBeNull();
    return button;
  }

  function dialogAction(action: 'clear' | 'cancel' | 'done'): HTMLButtonElement {
    return calendarDialog().querySelector(
      `[data-testid="date-picker-${action}"]`,
    ) as HTMLButtonElement;
  }

  function activeBoundary(): string {
    return (
      calendarDialog().querySelector('[data-testid="date-picker-status"]')?.textContent?.trim() ??
      ''
    );
  }

  function validationMessage(): string {
    return (
      fixture.nativeElement
        .querySelector('[data-testid="date-range-validation-message"]')
        ?.textContent.trim() ?? ''
    );
  }

  function openCalendarFrom(boundary: 'start' | 'end'): void {
    (boundary === 'start' ? startInput() : endInput()).focus();
    fixture.detectChanges();
    calendarToggle().click();
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
});

describe('LocalizedDateRangePickerComponent server-platform browser guard fixture', () => {
  it('avoids browser-only constraint-validation calls and inline styles', async () => {
    await TestBed.configureTestingModule({
      imports: [LocalizedDateRangePickerComponent],
      providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
    }).compileComponents();
    const fixture = TestBed.createComponent(LocalizedDateRangePickerComponent);
    fixture.componentRef.setInput('inputId', 'server-range');
    fixture.componentRef.setInput('value', EMPTY_DATE_RANGE);
    fixture.componentRef.setInput('controlSize', 'default');
    fixture.componentRef.setInput('dateLocale', 'en-GB');
    fixture.componentRef.setInput('labels', LABELS);
    fixture.componentRef.setInput('requirements', DEFAULT_RANGE_REQUIREMENTS);
    fixture.componentRef.setInput('invalid', false);
    fixture.componentRef.setInput('controlDisabled', false);
    fixture.componentRef.setInput('readonly', false);
    const setCustomValidity = jest.spyOn(HTMLInputElement.prototype, 'setCustomValidity');

    fixture.detectChanges();

    expect(setCustomValidity).not.toHaveBeenCalled();
    expect(
      fixture.nativeElement
        .querySelector('[data-testid="temporal-picker-field-trigger"]')
        ?.getAttribute('aria-label'),
    ).toBe(LABELS.openPicker);
    expect(fixture.nativeElement.querySelector('[style]')).toBeNull();
    setCustomValidity.mockRestore();
    fixture.destroy();
  });
});
