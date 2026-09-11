import { Component, PLATFORM_ID, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  LocalizedDateTimePickerComponent,
  LocalizedDateTimePickerLabels,
} from './localized-datetime-picker.component';

const LABELS: LocalizedDateTimePickerLabels = {
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
  groupLabel: 'Appointment date and time',
  dateInput: 'Date',
  timeInput: 'Time',
  timeFormatHint: 'Time format: HH:MM',
  invalidTime: 'Enter a valid time.',
  requiredTime: 'Enter a time.',
};

@Component({
  imports: [ReactiveFormsModule, LocalizedDateTimePickerComponent],
  template: `<ds-localized-datetime-picker
    inputId="form-appointment"
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
class DateTimePickerFormHostComponent {
  readonly labels = LABELS;
  readonly control = new FormControl('', { nonNullable: true });
  readonly required = signal(false);
  readonly min = signal<string | undefined>(undefined);
  readonly max = signal<string | undefined>(undefined);
  readonly disabledDates = signal<readonly string[] | undefined>(undefined);
}

describe('LocalizedDateTimePickerComponent', () => {
  let fixture: ComponentFixture<LocalizedDateTimePickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LocalizedDateTimePickerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LocalizedDateTimePickerComponent);
    setInputs('2026-02-05T09:30');
  });

  afterEach(() => fixture.destroy());

  it('renders a strict local datetime as localized date text and native minute time', () => {
    expect(dateInput().value).toBe('05/02/2026');
    expect(timeInput().value).toBe('09:30');
    expect(timeInput().type).toBe('time');
    expect(timeInput().step).toBe('60');
  });

  it('renders the calendar toggle with an SVG icon instead of font emoji', () => {
    expect(calendarToggle().querySelector('svg[aria-hidden="true"]')).not.toBeNull();
    expect(calendarToggle().textContent).not.toContain('📅');
  });

  it('renders linked visible labels and persistent guidance in a named group', () => {
    expect(group().getAttribute('role')).toBe('group');
    expect(group().getAttribute('aria-label')).toBe(LABELS.groupLabel);
    expect(dateInput().id).toBe('appointment');
    expect(timeInput().id).toBe('appointment-time');
    expect(document.querySelector('label[for="appointment"]')?.textContent).toContain('Date');
    expect(document.querySelector('label[for="appointment-time"]')?.textContent).toContain('Time');
    expect(dateInput().getAttribute('aria-describedby')).toContain('DateHint');
    expect(timeInput().getAttribute('aria-describedby')).toContain('TimeHint');
    expect(fixture.nativeElement.textContent).toContain(LABELS.formatHint);
    expect(fixture.nativeElement.textContent).toContain(LABELS.timeFormatHint);
  });

  it('keeps incomplete drafts visible and emits as soon as both parts are valid', () => {
    setInputs(undefined);
    fixture.componentInstance.writeValue('');
    fixture.detectChanges();
    const changed = jest.fn();
    fixture.componentInstance.valueChange.subscribe(changed);

    setText(dateInput(), '05/02/2026');
    expect(changed).not.toHaveBeenCalled();
    expect(dateInput().value).toBe('05/02/2026');

    setText(timeInput(), '09:30');
    expect(changed).toHaveBeenLastCalledWith('2026-02-05T09:30');

    setText(timeInput(), '10:45');
    expect(changed).toHaveBeenLastCalledWith('2026-02-05T10:45');
  });

  it('keeps a time-only draft visible without emitting a noncanonical model', () => {
    setInputs(undefined);
    fixture.componentInstance.writeValue('');
    fixture.detectChanges();
    const changed = jest.fn();
    fixture.componentInstance.valueChange.subscribe(changed);

    setText(timeInput(), '09:30');

    expect(changed).not.toHaveBeenCalled();
    expect(dateInput().value).toBe('');
    expect(timeInput().value).toBe('09:30');
  });

  it('selects a date, closes the calendar, and focuses an empty time input before completion', () => {
    setInputs(undefined);
    fixture.componentInstance.writeValue('2026-02-05T09:30');
    fixture.detectChanges();
    const changed = jest.fn();
    fixture.componentInstance.valueChange.subscribe(changed);
    setText(timeInput(), '');

    calendarToggle().click();
    dayButton('2026-02-06').click();
    fixture.detectChanges();

    expect(calendar().open).toBe(false);
    expect(document.activeElement).toBe(timeInput());
    expect(dateInput().value).toBe('06/02/2026');
    expect(changed).not.toHaveBeenCalled();

    setText(timeInput(), '10:15');
    expect(changed).toHaveBeenLastCalledWith('2026-02-06T10:15');
  });

  it('emits immediately when either complete valid part changes', () => {
    setInputs(undefined);
    fixture.componentInstance.writeValue('2026-02-05T09:30');
    fixture.detectChanges();
    const changed = jest.fn();
    fixture.componentInstance.valueChange.subscribe(changed);

    setText(dateInput(), '06/02/2026');
    setText(timeInput(), '11:00');

    expect(changed.mock.calls).toEqual([['2026-02-06T09:30'], ['2026-02-06T11:00']]);
  });

  it('validates optional empty, required empty, malformed, and incomplete datetime values', () => {
    setInputs('');
    expect(fixture.componentInstance.validate(new FormControl(''))).toBeNull();

    fixture.componentRef.setInput('required', true);
    fixture.detectChanges();
    expect(fixture.componentInstance.validate(new FormControl(''))).toEqual({ required: true });

    fixture.componentRef.setInput('required', false);
    fixture.componentRef.setInput('value', '2026-02-05');
    fixture.detectChanges();
    expect(fixture.componentInstance.validate(new FormControl('2026-02-05'))).toEqual({
      dateTimeInvalid: true,
    });

    fixture.componentRef.setInput('value', '2026-02-05T9:30');
    fixture.detectChanges();
    expect(fixture.componentInstance.validate(new FormControl('2026-02-05T9:30'))).toEqual({
      dateTimeInvalid: true,
    });

    setInputs(undefined);
    fixture.componentInstance.writeValue('');
    fixture.detectChanges();
    setText(dateInput(), '05/02/2026');
    expect(fixture.componentInstance.validate(new FormControl(''))).toEqual({
      dateTimeInvalid: true,
    });
    expect(message()).toBe(LABELS.requiredTime);
  });

  it('distinguishes missing draft fields from malformed date and datetime values', () => {
    setInputs(undefined);
    fixture.componentInstance.writeValue('');
    fixture.detectChanges();

    setText(timeInput(), '09:30');
    expect(message()).toBe(LABELS.requiredDate);
    expect(dateInput().validationMessage).toBe(LABELS.requiredDate);
    expect(timeInput().validationMessage).toBe('');

    setText(timeInput(), '');
    setText(dateInput(), '31/02/2026');
    expect(message()).toBe(LABELS.invalidDate);
    expect(dateInput().validationMessage).toBe(LABELS.invalidDate);
    expect(timeInput().validationMessage).toBe('');

    setText(dateInput(), '05/02/2026');
    expect(message()).toBe(LABELS.requiredTime);
    expect(dateInput().validationMessage).toBe('');
    expect(timeInput().validationMessage).toBe(LABELS.requiredTime);

    setInputs('2026-02-05T9:30');
    expect(message()).toBe(LABELS.invalidTime);
    expect(dateInput().validationMessage).toBe('');
    expect(timeInput().validationMessage).toBe(LABELS.invalidTime);
  });

  it('applies inclusive datetime bounds to time while keeping boundary dates selectable', () => {
    setInputs('2026-02-05T09:00', {
      min: '2026-02-05T09:00',
      max: '2026-02-06T17:00',
    });
    expect(fixture.componentInstance.validate(new FormControl('2026-02-05T09:00'))).toBeNull();
    expect(fixture.componentInstance.validate(new FormControl('2026-02-05T08:59'))).toEqual({
      dateTimeUnavailable: true,
    });
    expect(fixture.componentInstance.validate(new FormControl('2026-02-06T17:00'))).toBeNull();
    expect(fixture.componentInstance.validate(new FormControl('2026-02-06T17:01'))).toEqual({
      dateTimeUnavailable: true,
    });
    expect(timeInput().min).toBe('09:00');
    expect(timeInput().max).toBe('');

    calendarToggle().click();
    expect(dayButton('2026-02-05').disabled).toBe(false);
    expect(dayButton('2026-02-06').disabled).toBe(false);
    calendar().querySelector<HTMLButtonElement>('[data-testid="date-picker-close"]')!.click();

    fixture.componentRef.setInput('value', '2026-02-06T17:00');
    fixture.detectChanges();
    expect(timeInput().min).toBe('');
    expect(timeInput().max).toBe('17:00');
  });

  it('attributes whole-date bound failures to date and boundary-time failures to time', () => {
    setInputs('2026-02-04T12:00', {
      min: '2026-02-05T09:00',
      max: '2026-02-06T17:00',
    });

    expect(message()).toBe(LABELS.invalidDate);
    expect(dateInput().validationMessage).toBe(LABELS.invalidDate);
    expect(timeInput().validationMessage).toBe('');

    fixture.componentRef.setInput('value', '2026-02-05T08:59');
    fixture.detectChanges();

    expect(message()).toBe(LABELS.invalidTime);
    expect(dateInput().validationMessage).toBe('');
    expect(timeInput().validationMessage).toBe(LABELS.invalidTime);
  });

  it('attributes dates after maximum to date and late maximum-date times to time', () => {
    setInputs('2026-02-07T12:00', {
      min: '2026-02-05T09:00',
      max: '2026-02-06T17:00',
    });

    expect(message()).toBe('Enter a valid date.');
    expect(dateInput().validationMessage).toBe('Enter a valid date.');
    expect(timeInput().validationMessage).toBe('');

    fixture.componentRef.setInput('value', '2026-02-06T17:01');
    fixture.detectChanges();

    expect(message()).toBe('Enter a valid time.');
    expect(dateInput().validationMessage).toBe('');
    expect(timeInput().validationMessage).toBe('Enter a valid time.');
  });

  it('ignores malformed bounds and rejects disabled whole dates', () => {
    setInputs('2026-02-05T09:30', {
      min: 'not-a-minimum',
      max: '2026-02-30T10:00',
      disabledDates: ['2026-02-06'],
    });
    expect(fixture.componentInstance.validate(new FormControl('2026-02-05T09:30'))).toBeNull();
    expect(fixture.componentInstance.validate(new FormControl('2026-02-06T00:00'))).toEqual({
      dateTimeUnavailable: true,
    });

    calendarToggle().click();
    expect(dayButton('2026-02-06').disabled).toBe(true);
  });

  it('keeps controlled edits and calendar selections external until accepted', () => {
    const changed = jest.fn();
    fixture.componentInstance.valueChange.subscribe(changed);

    setText(dateInput(), '06/02/2026');
    expect(changed).toHaveBeenLastCalledWith('2026-02-06T09:30');
    expect(dateInput().value).toBe('05/02/2026');

    fixture.componentRef.setInput('value', '2026-02-06T09:30');
    fixture.detectChanges();
    expect(dateInput().value).toBe('06/02/2026');

    calendarToggle().click();
    dayButton('2026-02-07').click();
    fixture.detectChanges();
    expect(changed).toHaveBeenLastCalledWith('2026-02-07T09:30');
    expect(dateInput().value).toBe('06/02/2026');
  });

  it('clears an optional controlled value, closes, and waits for acceptance', () => {
    const changed = jest.fn();
    fixture.componentInstance.valueChange.subscribe(changed);
    calendarToggle().click();
    calendar().querySelector<HTMLButtonElement>('[data-testid="date-picker-clear"]')!.click();
    fixture.detectChanges();

    expect(changed).toHaveBeenLastCalledWith('');
    expect(calendar().open).toBe(false);
    expect(dateInput().value).toBe('05/02/2026');
    expect(timeInput().value).toBe('09:30');

    fixture.componentRef.setInput('value', '');
    fixture.detectChanges();
    expect(dateInput().value).toBe('');
    expect(timeInput().value).toBe('');
  });

  it('sets field-specific native validity and presents external invalid state', () => {
    setInputs('');
    fixture.componentRef.setInput('required', true);
    fixture.detectChanges();
    expect(dateInput().validationMessage).toBe(LABELS.requiredDate);
    expect(timeInput().validationMessage).toBe(LABELS.requiredTime);

    setInputs(undefined);
    fixture.componentInstance.writeValue('');
    fixture.detectChanges();
    setText(dateInput(), '05/02/2026');
    expect(timeInput().validationMessage).toBe(LABELS.requiredTime);

    setInputs('2026-02-05T09:30');
    fixture.componentRef.setInput('invalid', true);
    fixture.detectChanges();
    expect(dateInput().getAttribute('aria-invalid')).toBe('true');
    expect(timeInput().classList).toContain('is-invalid');
  });

  it('notifies validity changes and registered validators when constraints change', () => {
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

  it('integrates value, touched, and disabled state with Angular forms', () => {
    const hostFixture = TestBed.createComponent(DateTimePickerFormHostComponent);
    const host = hostFixture.componentInstance;
    host.control.setValue('2027-12-15T14:20');
    hostFixture.detectChanges();
    const hostDate = hostFixture.nativeElement.querySelector(
      '#form-appointment',
    ) as HTMLInputElement;
    const hostTime = hostFixture.nativeElement.querySelector(
      '#form-appointment-time',
    ) as HTMLInputElement;
    expect(hostDate.value).toBe('15/12/2027');
    expect(hostTime.value).toBe('14:20');

    hostTime.value = '15:45';
    hostTime.dispatchEvent(new Event('input'));
    hostTime.dispatchEvent(new Event('blur'));
    hostFixture.detectChanges();
    expect(host.control.value).toBe('2027-12-15T15:45');
    expect(host.control.touched).toBe(true);

    host.control.disable();
    hostFixture.detectChanges();
    expect(hostDate.disabled).toBe(true);
    expect(hostTime.disabled).toBe(true);
    hostFixture.destroy();
  });

  it('preserves dialog keyboard focus behavior and closes when readonly or disabled', () => {
    expect(calendarToggle().getAttribute('aria-haspopup')).toBe('dialog');
    calendarToggle().click();
    expect(calendarToggle().getAttribute('aria-expanded')).toBe('true');
    calendar().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(calendar().open).toBe(false);
    expect(document.activeElement).toBe(calendarToggle());

    calendarToggle().click();
    fixture.componentRef.setInput('readonly', true);
    fixture.detectChanges();
    expect(calendar().open).toBe(false);
    expect(dateInput().readOnly).toBe(true);
    expect(timeInput().readOnly).toBe(true);

    fixture.componentRef.setInput('readonly', false);
    fixture.detectChanges();
    calendarToggle().click();
    fixture.componentInstance.setDisabledState(true);
    fixture.detectChanges();
    expect(calendar().open).toBe(false);
    expect(calendarToggle().disabled).toBe(true);
  });

  it('does not touch browser-only APIs on the server platform', async () => {
    fixture.destroy();
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [LocalizedDateTimePickerComponent],
      providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
    }).compileComponents();
    const serverFixture = TestBed.createComponent(LocalizedDateTimePickerComponent);
    serverFixture.componentRef.setInput('inputId', 'server-datetime');
    serverFixture.componentRef.setInput('value', '2026-02-05T09:30');
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
          '[data-testid="datetime-picker-toggle"]',
        ) as HTMLButtonElement
      ).click(),
    ).not.toThrow();
    serverFixture.destroy();
  });

  function setInputs(
    value: string | undefined,
    constraints: {
      min?: string;
      max?: string;
      disabledDates?: readonly string[];
    } = {},
  ): void {
    fixture.componentRef.setInput('inputId', 'appointment');
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
    return fixture.nativeElement.querySelector(
      '[data-testid="datetime-picker-group"]',
    ) as HTMLElement;
  }

  function dateInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('#appointment') as HTMLInputElement;
  }

  function timeInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('#appointment-time') as HTMLInputElement;
  }

  function calendarToggle(): HTMLButtonElement {
    return fixture.nativeElement.querySelector(
      '[data-testid="datetime-picker-toggle"]',
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

  function setText(input: HTMLInputElement, value: string): void {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function message(): string {
    return (
      fixture.nativeElement
        .querySelector('[data-testid="datetime-picker-validation-message"]')
        ?.textContent.trim() ?? ''
    );
  }
});
