import { Component, PLATFORM_ID, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  LocalizedDateTimeRange,
  LocalizedDateTimeRangePickerComponent,
  LocalizedDateTimeRangePickerLabels,
} from './localized-datetime-range-picker.component';

const LABELS: LocalizedDateTimeRangePickerLabels = {
  placeholder: 'dd/mm/yyyy',
  openCalendar: 'Open calendar',
  changeCalendar: 'Change date',
  dialog: 'Choose a date',
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  openMonthYearPicker: 'Choose month and year',
  previousYear: 'Previous year',
  nextYear: 'Next year',
  clear: 'Clear',
  close: 'Close',
  formatHint: 'Date format: DD/MM/YYYY',
  invalidDate: 'Enter a valid date.',
  requiredDate: 'Enter a date.',
  keyboardHelp: 'Use the arrow keys to choose a date.',
  groupLabel: 'Booking date and time range',
  startDate: 'Start date',
  startTime: 'Start time',
  endDate: 'End date',
  endTime: 'End time',
  selectStartDate: 'Select a start date',
  selectEndDate: 'Select an end date',
  timeFormatHint: 'Time format: HH:MM',
  invalidTime: 'Enter a valid time.',
  requiredTime: 'Enter a time.',
  invalidRange: 'Enter a valid date and time range.',
  requiredRange: 'Enter a date and time range.',
};

@Component({
  imports: [ReactiveFormsModule, LocalizedDateTimeRangePickerComponent],
  template: `<ds-localized-datetime-range-picker
    inputId="form-booking"
    [labels]="labels"
    controlSize="default"
    dateLocale="en-GB"
    [required]="required()"
    [invalid]="false"
    [controlDisabled]="false"
    [readonly]="false"
    [min]="min()"
    [max]="max()"
    [disabledDates]="disabledDates()"
    [formControl]="control"
  />`,
})
class DateTimeRangeFormHostComponent {
  readonly labels = LABELS;
  readonly control = new FormControl<LocalizedDateTimeRange>(
    { start: '', end: '' },
    { nonNullable: true },
  );
  readonly required = signal(false);
  readonly min = signal<string | undefined>(undefined);
  readonly max = signal<string | undefined>(undefined);
  readonly disabledDates = signal<readonly string[] | undefined>(undefined);
}

describe('LocalizedDateTimeRangePickerComponent', () => {
  let fixture: ComponentFixture<LocalizedDateTimeRangePickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LocalizedDateTimeRangePickerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LocalizedDateTimeRangePickerComponent);
    setInputs({ start: '2026-02-05T09:30', end: '2026-02-09T17:45' });
  });

  afterEach(() => fixture.destroy());

  it('renders four linked fields with canonical IDs and native minute time controls', () => {
    expect(group().getAttribute('role')).toBe('group');
    expect(group().getAttribute('aria-label')).toBe(LABELS.groupLabel);
    expect(startDateInput().id).toBe('booking');
    expect(startTimeInput().id).toBe('booking-start-time');
    expect(endDateInput().id).toBe('booking-end-date');
    expect(endTimeInput().id).toBe('booking-end-time');
    expect(startDateInput().value).toBe('05/02/2026');
    expect(startTimeInput().value).toBe('09:30');
    expect(endDateInput().value).toBe('09/02/2026');
    expect(endTimeInput().value).toBe('17:45');
    expect(startTimeInput().type).toBe('time');
    expect(startTimeInput().step).toBe('60');
    expect(endTimeInput().type).toBe('time');
    expect(endTimeInput().step).toBe('60');
  });

  it('renders both calendar toggles with SVG icons instead of font emoji', () => {
    for (const toggle of [startToggle(), endToggle()]) {
      expect(toggle.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
      expect(toggle.textContent).not.toContain('📅');
    }
  });

  it('renders consumer labels and persistent date and time hints', () => {
    expect(labelFor('booking')).toContain(LABELS.startDate);
    expect(labelFor('booking-start-time')).toContain(LABELS.startTime);
    expect(labelFor('booking-end-date')).toContain(LABELS.endDate);
    expect(labelFor('booking-end-time')).toContain(LABELS.endTime);
    expect(startDateInput().getAttribute('aria-describedby')).toContain('DateHint');
    expect(startTimeInput().getAttribute('aria-describedby')).toContain('TimeHint');
    expect(fixture.nativeElement.textContent).toContain(LABELS.formatHint);
    expect(fixture.nativeElement.textContent).toContain(LABELS.timeFormatHint);
  });

  it('keeps incomplete pairs as drafts and emits progressive canonical endpoints', () => {
    setInputs(undefined);
    fixture.componentInstance.writeValue({ start: '', end: '' });
    fixture.detectChanges();
    const changed = jest.fn();
    fixture.componentInstance.valueChange.subscribe(changed);

    setText(startDateInput(), '05/02/2026');
    expect(changed).not.toHaveBeenCalled();
    expect(startDateInput().value).toBe('05/02/2026');

    setText(startTimeInput(), '09:30');
    expect(changed).toHaveBeenLastCalledWith({ start: '2026-02-05T09:30', end: '' });

    setText(endDateInput(), '09/02/2026');
    expect(changed).toHaveBeenCalledTimes(1);
    expect(endDateInput().value).toBe('09/02/2026');

    setText(endTimeInput(), '17:45');
    expect(changed.mock.calls).toEqual([
      [{ start: '2026-02-05T09:30', end: '' }],
      [{ start: '2026-02-05T09:30', end: '2026-02-09T17:45' }],
    ]);
  });

  it('emits an end-first partial without putting an incomplete endpoint in the model', () => {
    setInputs(undefined);
    fixture.componentInstance.writeValue({ start: '', end: '' });
    fixture.detectChanges();
    const changed = jest.fn();
    fixture.componentInstance.valueChange.subscribe(changed);

    setText(endTimeInput(), '17:45');
    expect(changed).not.toHaveBeenCalled();
    setText(endDateInput(), '09/02/2026');

    expect(changed).toHaveBeenLastCalledWith({ start: '', end: '2026-02-09T17:45' });
  });

  it('starts a new calendar cycle with the retained start time and focuses the missing end time', () => {
    setInputs(undefined);
    fixture.componentInstance.writeValue({
      start: '2026-02-05T09:30',
      end: '2026-02-09T17:45',
    });
    fixture.detectChanges();
    const changed = jest.fn();
    fixture.componentInstance.valueChange.subscribe(changed);

    startToggle().click();
    dayButton('2026-02-06').click();
    fixture.detectChanges();

    expect(changed).toHaveBeenLastCalledWith({ start: '2026-02-06T09:30', end: '' });
    expect(calendar().open).toBe(true);
    expect(activeBoundary()).toBe(LABELS.selectEndDate);
    expect(endDateInput().value).toBe('');
    expect(endTimeInput().value).toBe('');

    dayButton('2026-02-10').click();
    fixture.detectChanges();

    expect(calendar().open).toBe(false);
    expect(document.activeElement).toBe(endTimeInput());
    expect(endDateInput().value).toBe('10/02/2026');
    expect(changed).toHaveBeenCalledTimes(1);

    setText(endTimeInput(), '18:00');
    expect(changed).toHaveBeenLastCalledWith({
      start: '2026-02-06T09:30',
      end: '2026-02-10T18:00',
    });
  });

  it('swaps only clicked dates while times remain bound to their endpoint fields', () => {
    setInputs(undefined);
    fixture.componentInstance.writeValue({
      start: '2026-02-05T09:30',
      end: '2026-02-09T17:45',
    });
    fixture.detectChanges();
    const changed = jest.fn();
    fixture.componentInstance.valueChange.subscribe(changed);

    endToggle().click();
    dayButton('2026-02-04').click();
    fixture.detectChanges();

    expect(changed).toHaveBeenLastCalledWith({
      start: '2026-02-04T09:30',
      end: '2026-02-05T17:45',
    });
    expect(startTimeInput().value).toBe('09:30');
    expect(endTimeInput().value).toBe('17:45');
  });

  it('allows equal datetimes but keeps reversed manual values visible and non-emitting', () => {
    setInputs(undefined);
    fixture.componentInstance.writeValue({
      start: '2026-02-05T09:30',
      end: '2026-02-09T17:45',
    });
    fixture.detectChanges();
    const changed = jest.fn();
    fixture.componentInstance.valueChange.subscribe(changed);

    setText(endDateInput(), '05/02/2026');
    setText(endTimeInput(), '09:30');
    expect(changed).toHaveBeenLastCalledWith({
      start: '2026-02-05T09:30',
      end: '2026-02-05T09:30',
    });

    changed.mockClear();
    setText(endTimeInput(), '09:29');
    expect(changed).not.toHaveBeenCalled();
    expect(endTimeInput().value).toBe('09:29');

    setText(endTimeInput(), '10:00');
    setText(startDateInput(), '10/02/2026');
    expect(changed).toHaveBeenCalledTimes(1);
    expect(startDateInput().value).toBe('10/02/2026');
    expect(endDateInput().value).toBe('05/02/2026');
  });

  it('distinguishes optional empty, required empty, malformed, partial, and reversed ranges', () => {
    setInputs({ start: '', end: '' });
    expect(fixture.componentInstance.validate(new FormControl({ start: '', end: '' }))).toBeNull();

    fixture.componentRef.setInput('required', true);
    fixture.detectChanges();
    expect(fixture.componentInstance.validate(new FormControl({ start: '', end: '' }))).toEqual({
      required: true,
    });
    expect(message()).toBe(LABELS.requiredRange);
    expect(startDateInput().validationMessage).toBe(LABELS.requiredDate);
    expect(startTimeInput().validationMessage).toBe(LABELS.requiredTime);
    expect(endDateInput().validationMessage).toBe(LABELS.requiredDate);
    expect(endTimeInput().validationMessage).toBe(LABELS.requiredTime);

    fixture.componentRef.setInput('required', false);
    fixture.componentRef.setInput('value', { start: '2026-02-05', end: '' });
    fixture.detectChanges();
    expect(
      fixture.componentInstance.validate(new FormControl({ start: '2026-02-05', end: '' })),
    ).toEqual({ dateTimeRangeInvalid: true });

    expect(
      fixture.componentInstance.validate(new FormControl({ start: '2026-02-05T09:30', end: '' })),
    ).toEqual({ dateTimeRangeInvalid: true });
    expect(
      fixture.componentInstance.validate(
        new FormControl({ start: '2026-02-05T09:31', end: '2026-02-05T09:30' }),
      ),
    ).toEqual({ dateTimeRangeInvalid: true });
    expect(
      fixture.componentInstance.validate(
        new FormControl({ start: '2026-02-05T09:30', end: '2026-02-05T09:30' }),
      ),
    ).toBeNull();
  });

  it('keeps reversed same-day and incomplete manual drafts visible and invalid', () => {
    setInputs(undefined);
    fixture.componentInstance.writeValue({
      start: '2026-02-05T09:30',
      end: '2026-02-05T10:30',
    });
    fixture.detectChanges();
    const changed = jest.fn();
    fixture.componentInstance.valueChange.subscribe(changed);

    setText(endTimeInput(), '09:29');
    expect(changed).not.toHaveBeenCalled();
    expect(message()).toBe(LABELS.invalidRange);
    expect(
      fixture.componentInstance.validate(
        new FormControl({
          start: '2026-02-05T09:30',
          end: '2026-02-05T10:30',
        }),
      ),
    ).toEqual({ dateTimeRangeInvalid: true });

    setText(endTimeInput(), '');
    expect(endTimeInput().value).toBe('');
    expect(changed).not.toHaveBeenCalled();
    expect(message()).toBe(LABELS.invalidRange);
  });

  it('applies inclusive datetime bounds and ignores malformed constraints', () => {
    setInputs(
      { start: '2026-02-05T09:00', end: '2026-02-09T17:45' },
      { min: '2026-02-05T09:00', max: '2026-02-09T17:45' },
    );
    expect(
      fixture.componentInstance.validate(
        new FormControl({ start: '2026-02-05T09:00', end: '2026-02-09T17:45' }),
      ),
    ).toBeNull();
    expect(
      fixture.componentInstance.validate(
        new FormControl({ start: '2026-02-05T08:59', end: '2026-02-09T17:45' }),
      ),
    ).toEqual({ dateTimeRangeUnavailable: true });
    expect(
      fixture.componentInstance.validate(
        new FormControl({ start: '2026-02-05T09:00', end: '2026-02-09T17:46' }),
      ),
    ).toEqual({ dateTimeRangeUnavailable: true });

    setInputs(
      { start: '2026-02-05T09:00', end: '2026-02-09T17:45' },
      { min: 'not-a-datetime', max: '2026-02-30T17:45' },
    );
    expect(
      fixture.componentInstance.validate(
        new FormControl({ start: '2026-02-05T09:00', end: '2026-02-09T17:45' }),
      ),
    ).toBeNull();
  });

  it('rejects disabled endpoints and every date crossed by the inclusive interval', () => {
    setInputs(
      { start: '2026-02-05T09:30', end: '2026-02-09T17:45' },
      { disabledDates: ['2026-02-07'] },
    );
    expect(
      fixture.componentInstance.validate(
        new FormControl({ start: '2026-02-05T09:30', end: '2026-02-09T17:45' }),
      ),
    ).toEqual({ dateTimeRangeUnavailable: true });
    expect(
      fixture.componentInstance.validate(
        new FormControl({ start: '2026-02-07T09:30', end: '2026-02-07T17:45' }),
      ),
    ).toEqual({ dateTimeRangeUnavailable: true });

    setInputs({ start: '2026-02-05T09:30', end: '' }, { disabledDates: ['2026-02-07'] });
    endToggle().click();
    expect(dayButton('2026-02-07').disabled).toBe(true);
    expect(dayButton('2026-02-09').disabled).toBe(true);
  });

  it('highlights completed intervals and exposes boundary-specific native time constraints', () => {
    setInputs(
      { start: '2026-02-05T09:00', end: '2026-02-09T17:45' },
      { min: '2026-02-05T09:00', max: '2026-02-09T17:45' },
    );
    expect(startTimeInput().min).toBe('09:00');
    expect(startTimeInput().max).toBe('');
    expect(endTimeInput().min).toBe('');
    expect(endTimeInput().max).toBe('17:45');

    endToggle().click();
    expect(dayButton('2026-02-05').disabled).toBe(false);
    expect(dayButton('2026-02-09').disabled).toBe(false);
    expect(dayButton('2026-02-05').getAttribute('aria-selected')).toBe('true');
    expect(dayButton('2026-02-07').getAttribute('aria-selected')).toBe('true');
    expect(dayButton('2026-02-09').getAttribute('aria-selected')).toBe('true');
  });

  it('keeps unavailable complete drafts visible without emitting them', () => {
    setInputs(undefined, { min: '2026-02-05T09:00' });
    fixture.componentInstance.writeValue({
      start: '2026-02-05T09:30',
      end: '2026-02-09T17:45',
    });
    fixture.detectChanges();
    const changed = jest.fn();
    fixture.componentInstance.valueChange.subscribe(changed);

    setText(startTimeInput(), '08:59');

    expect(changed).not.toHaveBeenCalled();
    expect(startTimeInput().value).toBe('08:59');
    expect(startTimeInput().validationMessage).toBe(LABELS.invalidTime);
    expect(message()).toBe(LABELS.invalidRange);
    expect(
      fixture.componentInstance.validate(
        new FormControl({ start: '2026-02-05T09:30', end: '2026-02-09T17:45' }),
      ),
    ).toEqual({ dateTimeRangeUnavailable: true });
  });

  it('keeps controlled changes external while retaining incomplete drafts until acceptance', () => {
    const changed = jest.fn();
    fixture.componentInstance.valueChange.subscribe(changed);

    setText(startTimeInput(), '10:00');
    expect(changed).toHaveBeenLastCalledWith({
      start: '2026-02-05T10:00',
      end: '2026-02-09T17:45',
    });
    expect(startTimeInput().value).toBe('09:30');

    fixture.componentRef.setInput('value', {
      start: '2026-02-05T10:00',
      end: '2026-02-09T17:45',
    });
    fixture.detectChanges();
    expect(startTimeInput().value).toBe('10:00');

    changed.mockClear();
    setText(endTimeInput(), '');
    expect(changed).not.toHaveBeenCalled();
    expect(endTimeInput().value).toBe('');
  });

  it('clears every draft and the uncontrolled model and closes the shared calendar', () => {
    setInputs(undefined);
    fixture.componentInstance.writeValue({
      start: '2026-02-05T09:30',
      end: '2026-02-09T17:45',
    });
    fixture.detectChanges();
    const changed = jest.fn();
    fixture.componentInstance.valueChange.subscribe(changed);
    setText(endTimeInput(), '');
    endToggle().click();

    clearButton().click();
    fixture.detectChanges();

    expect(changed).toHaveBeenLastCalledWith({ start: '', end: '' });
    expect(startDateInput().value).toBe('');
    expect(startTimeInput().value).toBe('');
    expect(endDateInput().value).toBe('');
    expect(endTimeInput().value).toBe('');
    expect(calendar().open).toBe(false);
  });

  it('uses external invalid state and omits clear when the range is required', () => {
    fixture.componentRef.setInput('invalid', true);
    fixture.detectChanges();
    expect(message()).toBe(LABELS.invalidRange);
    expect(startDateInput().getAttribute('aria-invalid')).toBe('true');
    expect(endTimeInput().classList).toContain('is-invalid');

    fixture.componentRef.setInput('invalid', false);
    fixture.componentRef.setInput('required', true);
    fixture.detectChanges();
    endToggle().click();
    expect(calendar().querySelector('[data-testid="date-picker-clear"]')).toBeNull();
  });

  it('notifies validity and registered validators when datetime constraints change', () => {
    const validatorChange = jest.fn();
    const validityChange = jest.fn();
    fixture.componentInstance.registerOnValidatorChange(validatorChange);
    fixture.componentInstance.validityChange.subscribe(validityChange);

    fixture.componentRef.setInput('min', '2026-02-05T10:00');
    fixture.detectChanges();
    expect(validatorChange).toHaveBeenCalled();
    expect(validityChange).toHaveBeenCalledWith(false);

    fixture.componentRef.setInput('min', '2026-02-05T09:30');
    fixture.detectChanges();
    expect(validityChange).toHaveBeenCalledWith(true);
  });

  it('integrates canonical values, touched state, validation, and disabled state with forms', () => {
    const hostFixture = TestBed.createComponent(DateTimeRangeFormHostComponent);
    const host = hostFixture.componentInstance;
    host.control.setValue({
      start: '2027-12-15T14:20',
      end: '2027-12-16T16:40',
    });
    hostFixture.detectChanges();

    const hostStartDate = hostFixture.nativeElement.querySelector(
      '#form-booking',
    ) as HTMLInputElement;
    const hostEndTime = hostFixture.nativeElement.querySelector(
      '#form-booking-end-time',
    ) as HTMLInputElement;
    expect(hostStartDate.value).toBe('15/12/2027');
    expect(hostEndTime.value).toBe('16:40');

    hostEndTime.value = '17:15';
    hostEndTime.dispatchEvent(new Event('input'));
    hostEndTime.dispatchEvent(new Event('blur'));
    hostFixture.detectChanges();
    expect(host.control.value).toEqual({
      start: '2027-12-15T14:20',
      end: '2027-12-16T17:15',
    });
    expect(host.control.touched).toBe(true);

    host.min.set('2027-12-15T15:00');
    hostFixture.detectChanges();
    expect(host.control.errors).toEqual({ dateTimeRangeUnavailable: true });

    host.control.disable();
    hostFixture.detectChanges();
    expect(hostStartDate.disabled).toBe(true);
    expect(hostEndTime.disabled).toBe(true);
    hostFixture.destroy();
  });

  it('preserves dialog keyboard, focus-return, active-boundary, and range ARIA behavior', () => {
    endToggle().click();
    expect(endToggle().getAttribute('aria-expanded')).toBe('true');
    expect(activeBoundary()).toBe(LABELS.selectEndDate);
    expect(dayButton('2026-02-07').getAttribute('aria-selected')).toBe('true');
    calendar().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(calendar().open).toBe(false);
    expect(document.activeElement).toBe(endToggle());

    startToggle().click();
    dayButton('2026-02-06').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    fixture.detectChanges();
    expect(calendar().open).toBe(true);
    expect(activeBoundary()).toBe(LABELS.selectEndDate);
    expect(calendar().contains(document.activeElement)).toBe(true);
  });

  it('honors readonly and CVA-disabled state and closes an open dialog', () => {
    fixture.componentRef.setInput('readonly', true);
    fixture.detectChanges();
    expect(startDateInput().readOnly).toBe(true);
    expect(startTimeInput().readOnly).toBe(true);
    expect(startToggle().disabled).toBe(true);

    fixture.componentRef.setInput('readonly', false);
    fixture.detectChanges();
    endToggle().click();
    fixture.componentInstance.setDisabledState(true);
    fixture.detectChanges();
    expect(calendar().open).toBe(false);
    expect(startDateInput().disabled).toBe(true);
    expect(endTimeInput().disabled).toBe(true);
  });

  it('does not invoke browser-only APIs while rendered on the server platform', async () => {
    fixture.destroy();
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [LocalizedDateTimeRangePickerComponent],
      providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
    }).compileComponents();
    const serverFixture = TestBed.createComponent(LocalizedDateTimeRangePickerComponent);
    serverFixture.componentRef.setInput('inputId', 'server-range');
    serverFixture.componentRef.setInput('value', {
      start: '2026-02-05T09:30',
      end: '2026-02-09T17:45',
    });
    serverFixture.componentRef.setInput('controlSize', 'default');
    serverFixture.componentRef.setInput('dateLocale', 'en-GB');
    serverFixture.componentRef.setInput('labels', LABELS);
    serverFixture.componentRef.setInput('required', false);
    serverFixture.componentRef.setInput('invalid', false);
    serverFixture.componentRef.setInput('controlDisabled', false);
    serverFixture.componentRef.setInput('readonly', false);
    expect(() => serverFixture.detectChanges()).not.toThrow();
    expect(() =>
      (
        serverFixture.nativeElement.querySelector(
          '[data-testid="datetime-range-start-toggle"]',
        ) as HTMLButtonElement
      ).click(),
    ).not.toThrow();
    serverFixture.destroy();
  });

  function setInputs(
    value: LocalizedDateTimeRange | undefined,
    constraints: {
      min?: string;
      max?: string;
      disabledDates?: readonly string[];
    } = {},
  ): void {
    fixture.componentRef.setInput('inputId', 'booking');
    fixture.componentRef.setInput('value', value);
    fixture.componentRef.setInput('controlSize', 'default');
    fixture.componentRef.setInput('dateLocale', 'en-GB');
    fixture.componentRef.setInput('labels', LABELS);
    fixture.componentRef.setInput('required', false);
    fixture.componentRef.setInput('invalid', false);
    fixture.componentRef.setInput('controlDisabled', false);
    fixture.componentRef.setInput('readonly', false);
    fixture.componentRef.setInput('min', constraints.min);
    fixture.componentRef.setInput('max', constraints.max);
    fixture.componentRef.setInput('disabledDates', constraints.disabledDates);
    fixture.detectChanges();
  }

  function group(): HTMLElement {
    return fixture.nativeElement.querySelector('[data-testid="datetime-range-group"]')!;
  }

  function startDateInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('#booking') as HTMLInputElement;
  }

  function startTimeInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('#booking-start-time') as HTMLInputElement;
  }

  function endDateInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('#booking-end-date') as HTMLInputElement;
  }

  function endTimeInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('#booking-end-time') as HTMLInputElement;
  }

  function labelFor(id: string): string {
    return fixture.nativeElement.querySelector(`label[for="${id}"]`)?.textContent ?? '';
  }

  function startToggle(): HTMLButtonElement {
    return fixture.nativeElement.querySelector(
      '[data-testid="datetime-range-start-toggle"]',
    ) as HTMLButtonElement;
  }

  function endToggle(): HTMLButtonElement {
    return fixture.nativeElement.querySelector(
      '[data-testid="datetime-range-end-toggle"]',
    ) as HTMLButtonElement;
  }

  function calendar(): HTMLDialogElement {
    return fixture.nativeElement.querySelector(
      '[data-testid="date-picker-calendar"]',
    ) as HTMLDialogElement;
  }

  function dayButton(iso: string): HTMLButtonElement {
    return calendar().querySelector<HTMLButtonElement>(`[data-date="${iso}"]`)!;
  }

  function clearButton(): HTMLButtonElement {
    return calendar().querySelector('[data-testid="date-picker-clear"]') as HTMLButtonElement;
  }

  function activeBoundary(): string {
    return (
      calendar()
        .querySelector('[data-testid="date-picker-active-boundary"]')
        ?.textContent?.trim() ?? ''
    );
  }

  function message(): string {
    return (
      fixture.nativeElement
        .querySelector('[data-testid="datetime-range-validation-message"]')
        ?.textContent.trim() ?? ''
    );
  }

  function setText(input: HTMLInputElement, value: string): void {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }
});
