import { Component, PLATFORM_ID, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  LocalizedDateRange,
  LocalizedDateRangePickerComponent,
  LocalizedDateRangePickerLabels,
} from './localized-date-range-picker.component';

const LABELS: LocalizedDateRangePickerLabels = {
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
  groupLabel: 'Booking dates',
  startDate: 'Start date',
  endDate: 'End date',
  selectStartDate: 'Select a start date',
  selectEndDate: 'Select an end date',
  invalidRange: 'Enter a valid date range.',
  requiredRange: 'Enter both dates.',
};

@Component({
  imports: [ReactiveFormsModule, LocalizedDateRangePickerComponent],
  template: `<ds-localized-date-range-picker
    inputId="range"
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
class RangePickerFormHostComponent {
  readonly labels = LABELS;
  readonly control = new FormControl<LocalizedDateRange>(
    { start: '', end: '' },
    { nonNullable: true },
  );
  readonly required = signal(false);
  readonly min = signal<string | undefined>(undefined);
  readonly max = signal<string | undefined>(undefined);
  readonly disabledDates = signal<readonly string[] | undefined>(undefined);
}

describe('LocalizedDateRangePickerComponent', () => {
  let fixture: ComponentFixture<LocalizedDateRangePickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LocalizedDateRangePickerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LocalizedDateRangePickerComponent);
    setInputs({ start: '2026-02-05', end: '2026-02-09' });
  });

  afterEach(() => fixture.destroy());

  it('renders two locale-formatted fields in a named group with persistent guidance', () => {
    expect(group().getAttribute('role')).toBe('group');
    expect(group().getAttribute('aria-label')).toBe('Booking dates');
    expect(startInput().id).toBe('range');
    expect(endInput().id).toBe('range-end-date');
    expect(startInput().value).toBe('05/02/2026');
    expect(endInput().value).toBe('09/02/2026');
    expect(document.querySelector(`label[for="${startInput().id}"]`)?.textContent).toContain(
      'Start date',
    );
    expect(document.querySelector(`label[for="${endInput().id}"]`)?.textContent).toContain(
      'End date',
    );
    expect(startInput().getAttribute('aria-describedby')).toContain('FormatHint');
    expect(endInput().getAttribute('aria-describedby')).toContain('FormatHint');
  });

  it('renders both calendar toggles with SVG icons instead of font emoji', () => {
    for (const toggle of [startToggle(), endToggle()]) {
      expect(toggle.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
      expect(toggle.textContent).not.toContain('📅');
    }
  });

  it('selects start then end in the dialog and closes after the complete range', () => {
    const changed = jest.fn();
    fixture.componentInstance.valueChange.subscribe(changed);

    startToggle().click();
    dayButton('2026-02-06').click();
    fixture.detectChanges();

    expect(changed).toHaveBeenLastCalledWith({ start: '2026-02-06', end: '' });
    expect(calendar().open).toBe(true);
    expect(activeBoundary()).toBe('Select an end date');

    dayButton('2026-02-10').click();
    expect(changed).toHaveBeenLastCalledWith({ start: '2026-02-06', end: '2026-02-10' });
    expect(calendar().open).toBe(false);
    expect(document.activeElement).toBe(startToggle());
  });

  it('falls back from an empty end toggle to start selection and swaps reversed clicks', () => {
    const changed = jest.fn();
    fixture.componentInstance.valueChange.subscribe(changed);
    setInputs({ start: '', end: '' });

    endToggle().click();
    expect(activeBoundary()).toBe('Select a start date');
    calendar().querySelector<HTMLButtonElement>('[data-testid="date-picker-close"]')!.click();

    setInputs({ start: '2026-02-05', end: '2026-02-09' });
    startToggle().click();
    dayButton('2026-02-10').click();
    dayButton('2026-02-06').click();

    expect(changed).toHaveBeenLastCalledWith({ start: '2026-02-06', end: '2026-02-10' });
  });

  it('supports equality and resets a completed range when opening start', () => {
    const changed = jest.fn();
    fixture.componentInstance.valueChange.subscribe(changed);
    startToggle().click();
    dayButton('2026-02-08').click();
    expect(changed).toHaveBeenLastCalledWith({ start: '2026-02-08', end: '' });
    dayButton('2026-02-08').click();
    expect(changed).toHaveBeenLastCalledWith({ start: '2026-02-08', end: '2026-02-08' });
  });

  it('keeps reversed and partial manual text as drafts without emitting a corrupt range', () => {
    const changed = jest.fn();
    fixture.componentInstance.valueChange.subscribe(changed);

    setText(startInput(), '10/02/2026');
    setText(endInput(), '06/02/2026');
    fixture.detectChanges();
    expect(changed).not.toHaveBeenCalled();
    expect(message()).toBe('Enter a valid date range.');
    expect(
      fixture.componentInstance.validate(
        new FormControl({ start: '2026-02-10', end: '2026-02-06' }),
      ),
    ).toEqual({
      dateRangeInvalid: true,
    });

    setText(endInput(), '');
    fixture.detectChanges();
    expect(
      fixture.componentInstance.validate(new FormControl({ start: '2026-02-10', end: '' })),
    ).toEqual({
      dateRangeInvalid: true,
    });
  });

  it('keeps a required empty range as a draft with its required-range message', () => {
    fixture.componentRef.setInput('required', true);
    fixture.detectChanges();
    setText(startInput(), '');
    setText(endInput(), '');

    expect(message()).toBe('Enter both dates.');
    expect(fixture.componentInstance.validate(new FormControl({ start: '', end: '' }))).toEqual({
      required: true,
    });
  });

  it('commits manual valid locale values and retains controlled values until accepted', () => {
    const changed = jest.fn();
    fixture.componentInstance.valueChange.subscribe(changed);
    setInputs({ start: '', end: '' });
    setText(startInput(), '05/02/2026');
    setText(endInput(), '09/02/2026');
    expect(changed).toHaveBeenLastCalledWith({ start: '2026-02-05', end: '2026-02-09' });

    setInputs({ start: '2026-02-05', end: '2026-02-09' });
    startToggle().click();
    dayButton('2026-02-06').click();
    fixture.detectChanges();
    expect(startInput().value).toBe('05/02/2026');
    expect(endInput().value).toBe('09/02/2026');

    fixture.componentRef.setInput('value', { start: '2026-02-06', end: '' });
    fixture.detectChanges();
    expect(startInput().value).toBe('06/02/2026');
    expect(endInput().value).toBe('');
  });

  it('presents external invalid state with the invalid-range message', () => {
    fixture.componentRef.setInput('invalid', true);
    fixture.detectChanges();

    expect(message()).toBe('Enter a valid date range.');
    expect(startInput().getAttribute('aria-invalid')).toBe('true');
    expect(endInput().classList).toContain('is-invalid');
  });

  it('sets required-range custom validity for a required empty range', () => {
    setInputs({ start: '', end: '' });
    fixture.componentRef.setInput('required', true);
    fixture.detectChanges();

    expect(startInput().validationMessage).toBe('Enter both dates.');
    expect(endInput().validationMessage).toBe('Enter both dates.');
  });

  it('marks interval-crossing disabled dates and unavailable bounds invalid in the dialog and validator', () => {
    setInputs({ start: '2026-02-05', end: '2026-02-09' }, { disabledDates: ['2026-02-07'] });
    expect(
      fixture.componentInstance.validate(
        new FormControl({ start: '2026-02-05', end: '2026-02-09' }),
      ),
    ).toEqual({
      dateRangeUnavailable: true,
    });

    setInputs({ start: '2026-02-05', end: '2026-02-09' }, { min: '2026-02-05', max: '2026-02-09' });
    expect(
      fixture.componentInstance.validate(
        new FormControl({ start: '2026-02-05', end: '2026-02-09' }),
      ),
    ).toBeNull();

    setInputs({ start: '2026-02-05', end: '2026-02-09' }, { disabledDates: ['2026-02-07'] });
    endToggle().click();
    expect(dayButton('2026-02-09').disabled).toBe(true);
    expect(dayButton('2026-02-07').disabled).toBe(true);

    setInputs({ start: '2026-02-05', end: '2026-02-09' }, { min: '2026-02-06' });
    expect(
      fixture.componentInstance.validate(
        new FormControl({ start: '2026-02-05', end: '2026-02-09' }),
      ),
    ).toEqual({
      dateRangeUnavailable: true,
    });

    setInputs(
      { start: '2026-02-05', end: '2026-02-09' },
      { min: 'not-a-date', max: 'also-not-a-date' },
    );
    expect(
      fixture.componentInstance.validate(
        new FormControl({ start: '2026-02-05', end: '2026-02-09' }),
      ),
    ).toBeNull();
  });

  it('keeps manual unavailable endpoints and disabled-crossing ranges as non-emitting drafts', () => {
    const changed = jest.fn();
    fixture.componentInstance.valueChange.subscribe(changed);
    setInputs({ start: '2026-02-06', end: '2026-02-09' }, { min: '2026-02-06' });
    setText(startInput(), '05/02/2026');

    expect(changed).not.toHaveBeenCalled();
    expect(startInput().value).toBe('05/02/2026');
    expect(
      fixture.componentInstance.validate(
        new FormControl({ start: '2026-02-05', end: '2026-02-09' }),
      ),
    ).toEqual({ dateRangeUnavailable: true });

    setInputs({ start: '2026-02-05', end: '2026-02-06' }, { disabledDates: ['2026-02-07'] });
    setText(endInput(), '09/02/2026');

    expect(changed).not.toHaveBeenCalled();
    expect(endInput().value).toBe('09/02/2026');
    expect(
      fixture.componentInstance.validate(
        new FormControl({ start: '2026-02-05', end: '2026-02-09' }),
      ),
    ).toEqual({ dateRangeUnavailable: true });
  });

  it('exposes ARIA range selection and preserves dialog keyboard focus behavior', () => {
    endToggle().click();
    expect(dayButton('2026-02-05').getAttribute('aria-selected')).toBe('true');
    expect(dayButton('2026-02-09').getAttribute('aria-selected')).toBe('true');
    expect(dayButton('2026-02-07').getAttribute('aria-selected')).toBe('true');

    calendar().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(calendar().open).toBe(false);
    expect(document.activeElement).toBe(endToggle());
  });

  it('selects a range with the keyboard without moving focus out of the dialog between endpoints', () => {
    const changed = jest.fn();
    fixture.componentInstance.valueChange.subscribe(changed);
    startToggle().click();
    dayButton('2026-02-06').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    fixture.detectChanges();

    expect(activeBoundary()).toBe('Select an end date');
    expect(calendar().open).toBe(true);
    expect(calendar().contains(document.activeElement)).toBe(true);
    expect(changed).toHaveBeenLastCalledWith({ start: '2026-02-06', end: '' });
  });

  it('uses required and external invalid state, supports clear, and notifies forms of dynamic constraints', async () => {
    const hostFixture = TestBed.createComponent(RangePickerFormHostComponent);
    hostFixture.detectChanges();
    const picker = hostFixture.debugElement.children[0]
      .componentInstance as LocalizedDateRangePickerComponent;
    const validatorChange = jest.fn();
    picker.registerOnValidatorChange(validatorChange);
    hostFixture.componentInstance.required.set(true);
    hostFixture.detectChanges();
    expect(picker.validate(new FormControl({ start: '', end: '' }))).toEqual({ required: true });
    expect(hostFixture.nativeElement.querySelector('[data-testid="date-picker-clear"]')).toBeNull();
    hostFixture.componentInstance.required.set(false);
    hostFixture.componentInstance.disabledDates.set(['2026-02-05']);
    hostFixture.detectChanges();
    expect(validatorChange).toHaveBeenCalled();
    hostFixture.destroy();

    const changed = jest.fn();
    fixture.componentInstance.valueChange.subscribe(changed);
    startToggle().click();
    calendar().querySelector<HTMLButtonElement>('[data-testid="date-picker-clear"]')!.click();
    expect(changed).toHaveBeenLastCalledWith({ start: '', end: '' });
    expect(calendar().open).toBe(false);
  });

  it('integrates range changes and touched state with an Angular form control', () => {
    const hostFixture = TestBed.createComponent(RangePickerFormHostComponent);
    const host = hostFixture.componentInstance;
    host.control.setValue({ start: '2026-02-05', end: '2026-02-09' });
    hostFixture.detectChanges();

    const hostStart = hostFixture.nativeElement.querySelector('#range') as HTMLInputElement;
    hostStart.value = '06/02/2026';
    hostStart.dispatchEvent(new Event('input'));
    hostFixture.detectChanges();
    expect(host.control.value).toEqual({ start: '2026-02-06', end: '2026-02-09' });

    const hostToggle = hostFixture.nativeElement.querySelector(
      '[data-testid="date-range-start-toggle"]',
    ) as HTMLButtonElement;
    hostToggle.click();
    hostFixture.detectChanges();
    (
      hostFixture.nativeElement.querySelector(
        '[data-testid="date-picker-close"]',
      ) as HTMLButtonElement
    ).click();
    expect(host.control.touched).toBe(true);
    hostFixture.destroy();
  });

  it('honors readonly and disabled state and closes on form disable', () => {
    setInputs({ start: '2026-02-05', end: '2026-02-09' }, { readonly: true });
    expect(startToggle().disabled).toBe(true);
    startToggle().click();
    expect(calendar().open).toBe(false);

    fixture.componentRef.setInput('readonly', false);
    fixture.detectChanges();
    startToggle().click();
    fixture.componentInstance.setDisabledState(true);
    expect(calendar().open).toBe(false);
  });

  it('does not touch browser-only APIs while rendered on the server platform', async () => {
    fixture.destroy();
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [LocalizedDateRangePickerComponent],
      providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
    }).compileComponents();
    const serverFixture = TestBed.createComponent(LocalizedDateRangePickerComponent);
    serverFixture.componentRef.setInput('inputId', 'server-range');
    serverFixture.componentRef.setInput('controlSize', 'default');
    serverFixture.componentRef.setInput('dateLocale', 'en-GB');
    serverFixture.componentRef.setInput('labels', LABELS);
    serverFixture.componentRef.setInput('required', false);
    serverFixture.componentRef.setInput('invalid', false);
    serverFixture.componentRef.setInput('controlDisabled', false);
    serverFixture.componentRef.setInput('readonly', false);
    expect(() => serverFixture.detectChanges()).not.toThrow();
    serverFixture.destroy();
  });

  function setInputs(
    value: LocalizedDateRange,
    overrides: Partial<{
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
    fixture.componentRef.setInput('required', false);
    fixture.componentRef.setInput('invalid', false);
    fixture.componentRef.setInput('controlDisabled', false);
    fixture.componentRef.setInput('readonly', overrides.readonly ?? false);
    fixture.componentRef.setInput('min', overrides.min);
    fixture.componentRef.setInput('max', overrides.max);
    fixture.componentRef.setInput('disabledDates', overrides.disabledDates);
    fixture.detectChanges();
  }

  function group(): HTMLElement {
    return fixture.nativeElement.querySelector('[data-testid="date-range-group"]')!;
  }
  function startInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('#range') as HTMLInputElement;
  }
  function endInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('#range-end-date') as HTMLInputElement;
  }
  function startToggle(): HTMLButtonElement {
    return fixture.nativeElement.querySelector(
      '[data-testid="date-range-start-toggle"]',
    ) as HTMLButtonElement;
  }
  function endToggle(): HTMLButtonElement {
    return fixture.nativeElement.querySelector(
      '[data-testid="date-range-end-toggle"]',
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
        .querySelector('[data-testid="date-range-validation-message"]')
        ?.textContent.trim() ?? ''
    );
  }
  function setText(input: HTMLInputElement, value: string): void {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }
});
