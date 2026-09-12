import { Component, PLATFORM_ID, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  LocalizedDatePickerComponent,
  LocalizedDatePickerLabels,
} from './localized-date-picker.component';

const LABELS: LocalizedDatePickerLabels = {
  placeholder: 'дд.мм.гггг',
  openCalendar: 'Открыть календарь',
  changeCalendar: 'Изменить дату',
  dialog: 'Выбор даты',
  previousMonth: 'Предыдущий месяц',
  nextMonth: 'Следующий месяц',
  openMonthYearPicker: 'Выбрать месяц и год',
  previousYear: 'Предыдущий год',
  nextYear: 'Следующий год',
  clear: 'Очистить',
  cancel: 'Отмена',
  done: 'Готово',
  today: 'Сегодня',
  formatHint: 'Формат даты: ДД.ММ.ГГГГ',
  selectDate: 'Выберите дату',
  invalidDate: 'Введите корректную дату в формате ДД.ММ.ГГГГ.',
  unavailableDate: 'Эта дата недоступна.',
  requiredDate: 'Укажите дату.',
  keyboardHelp: 'Используйте стрелки для выбора даты.',
};

@Component({
  imports: [ReactiveFormsModule, LocalizedDatePickerComponent],
  template: `<ds-localized-date-picker
    inputId="date"
    [labels]="labels"
    controlSize="default"
    dateLocale="en-GB"
    [required]="true"
    [invalid]="control.invalid"
    [controlDisabled]="false"
    [readonly]="false"
    [formControl]="control"
  />`,
})
class DatePickerFormHostComponent {
  readonly labels = LABELS;
  readonly control = new FormControl<string | null>(null, { validators: Validators.required });
}

@Component({
  imports: [ReactiveFormsModule, LocalizedDatePickerComponent],
  template: `<ds-localized-date-picker
    inputId="validator-date"
    [labels]="labels"
    controlSize="default"
    dateLocale="en-GB"
    [required]="isRequired()"
    [invalid]="false"
    [controlDisabled]="false"
    [readonly]="false"
    [min]="min()"
    [max]="max()"
    [disabledDates]="disabledDates()"
    [formControl]="control"
  />`,
})
class DatePickerValidatorHostComponent {
  readonly labels = { ...LABELS, placeholder: 'dd/mm/yyyy' };
  readonly control = new FormControl<string | null>(null);
  readonly isRequired = signal(false);
  readonly min = signal<string | undefined>(undefined);
  readonly max = signal<string | undefined>(undefined);
  readonly disabledDates = signal<readonly string[] | undefined>(undefined);
}

describe('LocalizedDatePickerComponent', () => {
  let fixture: ComponentFixture<LocalizedDatePickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LocalizedDatePickerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LocalizedDatePickerComponent);
    fixture.componentRef.setInput('inputId', 'publishedFrom');
    fixture.componentRef.setInput('value', '2026-02-05');
    fixture.componentRef.setInput('controlSize', 'default');
    fixture.componentRef.setInput('dateLocale', 'ru-RU');
    fixture.componentRef.setInput('labels', LABELS);
    fixture.componentRef.setInput('invalid', false);
    fixture.componentRef.setInput('controlDisabled', false);
    fixture.componentRef.setInput('readonly', false);
    fixture.detectChanges();
    installDialogMethods(calendarDialog());
  });

  afterEach(() => fixture.destroy());

  it('renders a localized field with persistent format guidance', () => {
    const input = dateInput();
    const toggle = calendarToggle();

    expect(input.type).toBe('text');
    expect(input.value).toBe('05.02.2026');
    expect(input.placeholder).toBe('дд.мм.гггг');
    expect(input.getAttribute('aria-describedby')).toContain('FormatHint');
    expect(document.getElementById(input.getAttribute('aria-describedby')!)).not.toBeNull();
    expect(toggle.getAttribute('aria-haspopup')).toBe('dialog');
    expect(toggle.getAttribute('aria-controls')).toBe(calendarDialog().id);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.getAttribute('aria-label')).toContain('Изменить дату');
    expect(toggle.getAttribute('aria-label')).toContain('5 февраля 2026');
    expect(fixture.componentInstance.required()).toBe(false);
  });

  it('distinguishes a controlled null value from an unbound CVA value', () => {
    fixture.componentInstance.writeValue('2027-12-15');
    fixture.componentRef.setInput('value', null);
    fixture.detectChanges();

    expect(dateInput().value).toBe('');

    fixture.componentRef.setInput('value', undefined);
    fixture.detectChanges();
    expect(dateInput().value).toBe('15.12.2027');

    fixture.componentInstance.writeValue(null);
    fixture.detectChanges();
    expect(dateInput().value).toBe('');
  });

  it('opens a named modal dialog and exposes calendar grid semantics', () => {
    openCalendar();

    const dialog = calendarDialog();
    const grid = dialog.querySelector('[role="grid"]') as HTMLElement;
    const selectedDay = dayButton('2026-02-05');
    const weekdayHeaders = dialog.querySelectorAll('[role="columnheader"]');

    expect(dialog.open).toBe(true);
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-label')).toBe('Выбор даты');
    expect(grid.getAttribute('aria-labelledby')).toContain('MonthHeading');
    expect(grid.getAttribute('aria-describedby')).toContain('KeyboardHelp');
    expect(weekdayHeaders).toHaveLength(7);
    expect(weekdayHeaders[0].querySelector('abbr')?.getAttribute('title')).toBe('понедельник');
    expect(selectedDay.getAttribute('role')).toBe('gridcell');
    expect(selectedDay.getAttribute('aria-selected')).toBe('true');
    expect(monthHeading().getAttribute('aria-live')).toBe('polite');
    expect(calendarToggle().getAttribute('aria-expanded')).toBe('true');
  });

  it('uses stylesheet-owned dialog positioning for strict style-src-attr CSP', () => {
    openCalendar();
    expect(calendarDialog().getAttribute('style')).toBeNull();
  });

  it('moves focus to the selected day and keeps one day in the Tab sequence', () => {
    openCalendar();
    const dayButtons = calendarDialog().querySelectorAll<HTMLButtonElement>('[data-date]');
    const tabStops = [...dayButtons].filter((button) => button.tabIndex === 0);
    expect(document.activeElement).toBe(dayButton('2026-02-05'));
    expect(tabStops).toHaveLength(1);
    expect(tabStops[0].dataset['date']).toBe('2026-02-05');
  });

  it('uses arrow, Home, and End keys to navigate by day and localized week', () => {
    openCalendar();
    dispatchKey(dayButton('2026-02-05'), 'ArrowRight');
    expect(document.activeElement).toBe(dayButton('2026-02-06'));
    dispatchKey(dayButton('2026-02-06'), 'ArrowUp');
    expect(document.activeElement).toBe(dayButton('2026-01-30'));
    dispatchKey(dayButton('2026-01-30'), 'Home');
    expect(document.activeElement).toBe(dayButton('2026-01-26'));
    dispatchKey(dayButton('2026-01-26'), 'End');
    expect(document.activeElement).toBe(dayButton('2026-02-01'));
  });

  it('uses PageUp and PageDown to preserve the day across month and year boundaries', () => {
    fixture.componentRef.setInput('value', '2026-01-31');
    fixture.detectChanges();
    openCalendar();
    dispatchKey(dayButton('2026-01-31'), 'PageDown');
    expect(document.activeElement).toBe(dayButton('2026-02-28'));
    dispatchKey(dayButton('2026-02-28'), 'PageUp', { shiftKey: true });
    expect(document.activeElement).toBe(dayButton('2025-02-28'));
  });

  it('selects with Enter as a draft and repeated Enter commits exactly once', () => {
    const valueChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    openCalendar();
    dispatchKey(dayButton('2026-02-05'), 'ArrowRight');
    dispatchKey(dayButton('2026-02-06'), 'Enter');
    expect(valueChange).not.toHaveBeenCalled();
    expect(calendarDialog().open).toBe(true);

    dispatchKey(dayButton('2026-02-06'), 'Enter');
    expect(valueChange.mock.calls).toEqual([['2026-02-06']]);
    expect(calendarDialog().open).toBe(false);
    expect(document.activeElement).toBe(calendarToggle());
  });

  it('keeps a controlled calendar selection external until the parent accepts it', () => {
    const valueChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);

    openCalendar();
    dayButton('2026-02-06').click();
    fixture.detectChanges();

    expect(valueChange).not.toHaveBeenCalled();
    expect(calendarDialog().open).toBe(true);
    dialogAction('done').click();
    fixture.detectChanges();

    expect(valueChange.mock.calls).toEqual([['2026-02-06']]);
    expect(dateInput().value).toBe('05.02.2026');
    expect(calendarToggle().getAttribute('aria-label')).toContain('5 февраля 2026');

    fixture.componentRef.setInput('value', '2026-02-06');
    fixture.detectChanges();

    expect(dateInput().value).toBe('06.02.2026');
    expect(valueChange).toHaveBeenCalledTimes(1);
  });

  it('rolls a changed dialog draft back on Escape or backdrop click and restores focus', () => {
    const valueChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    openCalendar();
    dayButton('2026-02-06').click();
    fixture.detectChanges();
    dispatchKey(dayButton('2026-02-06'), 'Escape');
    expect(valueChange).not.toHaveBeenCalled();
    expect(calendarDialog().open).toBe(false);
    expect(document.activeElement).toBe(calendarToggle());
    openCalendar();
    expect(dayButton('2026-02-05').getAttribute('aria-selected')).toBe('true');
    dayButton('2026-02-07').click();
    fixture.detectChanges();
    calendarDialog().dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    expect(valueChange).not.toHaveBeenCalled();
    expect(dateInput().value).toBe('05.02.2026');
    expect(calendarDialog().open).toBe(false);
    expect(document.activeElement).toBe(calendarToggle());
  });

  it('wraps Tab and Shift+Tab focus inside the modal dialog', () => {
    openCalendar();
    const done = dialogAction('done');
    const previousMonth = calendarDialog().querySelector(
      '[data-testid="date-picker-previous-month"]',
    ) as HTMLButtonElement;
    done.focus();
    dispatchKey(done, 'Tab');
    expect(document.activeElement).toBe(previousMonth);

    previousMonth.focus();
    dispatchKey(previousMonth, 'Tab', { shiftKey: true });
    expect(document.activeElement).toBe(done);
  });

  it('retains invalid manual input without emitting and Escape restores committed text', () => {
    const valueChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    const input = dateInput();
    input.value = '31.02.2026';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(valueChange).not.toHaveBeenCalled();
    expect(input.value).toBe('31.02.2026');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-errormessage')).toContain('Error');
    expect(validationMessage().textContent).toContain(LABELS.invalidDate);

    dispatchKey(input, 'Escape');
    expect(input.value).toBe('05.02.2026');
    expect(input.getAttribute('aria-invalid')).toBeNull();
  });

  it('synchronizes manual invalidity to the native constraint-validation API', () => {
    const input = dateInput();
    input.value = '31.02.2026';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(input.validationMessage).toBe(LABELS.invalidDate);

    input.value = '06.02.2026';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(input.validationMessage).toBe('');
  });

  it('parses localized manual input and renders a value accepted by the controlled parent', () => {
    fixture.componentRef.setInput('value', '2026-03-04');
    fixture.componentRef.setInput('dateLocale', 'en-US');
    fixture.componentRef.setInput('labels', {
      ...LABELS,
      placeholder: 'mm/dd/yyyy',
      formatHint: 'Date format: MM/DD/YYYY',
    });
    const valueChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe((value) => {
      valueChange(value);
      fixture.componentRef.setInput('value', value);
    });
    fixture.detectChanges();
    const input = dateInput();
    expect(input.value).toBe('03/04/2026');
    input.value = '03/31/2026';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(valueChange).not.toHaveBeenCalled();
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(valueChange).toHaveBeenCalledWith('2026-03-31');
    expect(input.value).toBe('03/31/2026');
  });

  it('emits one value change for a manual edit in controlled mode', () => {
    const valueChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    const input = dateInput();

    input.value = '06.02.2026';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(valueChange).not.toHaveBeenCalled();

    dispatchKey(input, 'Enter');

    expect(valueChange).toHaveBeenCalledTimes(1);
    expect(valueChange).toHaveBeenCalledWith('2026-02-06');
  });

  it('normalizes a completed empty manual edit to null for outputs and CVA', () => {
    fixture.componentRef.setInput('value', undefined);
    fixture.componentInstance.writeValue('2026-02-05');
    const valueChange = jest.fn();
    const onChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    fixture.componentInstance.registerOnChange(onChange);
    fixture.detectChanges();

    const input = dateInput();
    input.value = '';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(valueChange.mock.calls).toEqual([[null]]);
    expect(onChange.mock.calls).toEqual([[null]]);
    expect(dateInput().value).toBe('');
  });

  it('keeps a valid controlled manual edit external through blur until the parent accepts it', () => {
    const valueChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    const input = dateInput();

    input.value = '06.02.2026';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(valueChange).not.toHaveBeenCalled();
    expect(input.value).toBe('06.02.2026');

    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(input.value).toBe('05.02.2026');
    expect(valueChange.mock.calls).toEqual([['2026-02-06']]);

    fixture.componentRef.setInput('value', '2026-02-06');
    fixture.detectChanges();

    expect(input.value).toBe('06.02.2026');
    expect(valueChange).toHaveBeenCalledTimes(1);
  });

  it('rejects malformed model ISO values and produces canonical localized ISO years', () => {
    fixture.componentRef.setInput('value', 'garbage');
    fixture.detectChanges();
    expect(fixture.componentInstance.validate(new FormControl('garbage'))).toEqual({
      dateInvalid: true,
    });

    fixture.componentRef.setInput('value', '2026-2-5');
    fixture.detectChanges();
    expect(fixture.componentInstance.validate(new FormControl('2026-2-5'))).toEqual({
      dateInvalid: true,
    });

    fixture.componentRef.setInput('value', '999-02-05');
    fixture.detectChanges();
    expect(fixture.componentInstance.validate(new FormControl('999-02-05'))).toEqual({
      dateInvalid: true,
    });

    fixture.componentRef.setInput('value', '');
    fixture.detectChanges();
    expect(fixture.componentInstance.validate(new FormControl(''))).toEqual({
      dateInvalid: true,
    });

    fixture.componentRef.setInput('value', undefined);
    fixture.componentRef.setInput('dateLocale', 'en-US');
    fixture.componentRef.setInput('labels', {
      ...LABELS,
      placeholder: 'mm/dd/yyyy',
      formatHint: 'Date format: MM/DD/YYYY',
    });
    const valueChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    fixture.detectChanges();
    const input = dateInput();
    input.value = '03/31/0999';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(valueChange).not.toHaveBeenCalled();
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(valueChange).toHaveBeenCalledWith('0999-03-31');

    valueChange.mockClear();
    input.value = '03/31/10000';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(valueChange).not.toHaveBeenCalled();
  });

  it.each([42, { date: '2026-02-05' }, Symbol('bad-date')])(
    'guards malformed bound runtime value %p without throwing',
    (value) => {
      expect(() => {
        fixture.componentRef.setInput('value', value);
        fixture.detectChanges();
      }).not.toThrow();
      expect(dateInput().value).toBe('');
      expect(fixture.componentInstance.validate(new FormControl(value))).toEqual({
        dateInvalid: true,
      });
      expect(dateInput().getAttribute('aria-invalid')).toBe('true');
      expect(validationMessage().textContent).toContain(LABELS.invalidDate);
    },
  );

  it.each([42, { date: '2026-02-05' }, Symbol('bad-date')])(
    'retains malformed CVA runtime value %p for validation without throwing',
    (value) => {
      fixture.componentRef.setInput('value', undefined);
      expect(() => {
        fixture.componentInstance.writeValue(value);
        fixture.detectChanges();
      }).not.toThrow();
      expect(dateInput().value).toBe('');
      expect(dateInput().getAttribute('aria-invalid')).toBe('true');
      expect(fixture.componentInstance.validate(new FormControl(value))).toEqual({
        dateInvalid: true,
      });
    },
  );

  it('shows invalid rather than required for a present malformed required value', () => {
    fixture.componentRef.setInput('value', 42);
    fixture.componentRef.setInput('required', true);
    fixture.detectChanges();

    expect(validationMessage().textContent).toContain(LABELS.invalidDate);
  });

  it('keeps a malformed optional source value unconfirmable until explicit Clear', () => {
    fixture.componentRef.setInput('value', undefined);
    fixture.componentInstance.writeValue('bad');
    fixture.detectChanges();

    openCalendar();

    expect(dialogAction('done').disabled).toBe(true);
    dialogAction('clear').click();
    fixture.detectChanges();
    expect(dialogAction('done').disabled).toBe(false);
  });

  it('disables unavailable dates and dynamic constraints gate Done', () => {
    fixture.componentRef.setInput('min', '2026-02-05');
    fixture.componentRef.setInput('max', '2026-02-20');
    fixture.componentRef.setInput('disabledDates', ['2026-02-06', '2026-02-10']);
    const valueChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    fixture.detectChanges();
    openCalendar();
    expect(dayButton('2026-02-04').disabled).toBe(true);
    expect(dayButton('2026-02-04').getAttribute('aria-disabled')).toBe('true');
    expect(dayButton('2026-02-10').disabled).toBe(true);
    expect(dayButton('2026-02-21').disabled).toBe(true);
    dayButton('2026-02-10').click();
    dispatchKey(dayButton('2026-02-05'), 'ArrowRight');
    expect(valueChange).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(dayButton('2026-02-07'));

    dayButton('2026-02-07').click();
    fixture.detectChanges();
    expect(dialogAction('done').disabled).toBe(false);
    fixture.componentRef.setInput('max', '2026-02-06');
    fixture.detectChanges();
    expect(dialogAction('done').disabled).toBe(true);
  });

  it('rolls Clear back on Cancel and commits null only after Done', () => {
    fixture.componentRef.setInput('value', undefined);
    fixture.componentInstance.writeValue('2026-02-05');
    const valueChange = jest.fn();
    const onChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    fixture.componentInstance.registerOnChange(onChange);
    fixture.detectChanges();
    openCalendar();
    const clear = dialogAction('clear');
    clear.click();
    fixture.detectChanges();
    expect(valueChange).not.toHaveBeenCalled();
    expect(calendarDialog().open).toBe(true);
    expect(calendarDialog().querySelector('[data-testid="date-picker-clear"]')).toBeNull();
    dialogAction('cancel').click();
    fixture.detectChanges();
    expect(dateInput().value).toBe('05.02.2026');

    openCalendar();
    dialogAction('clear').click();
    fixture.detectChanges();
    dialogAction('done').click();
    fixture.detectChanges();
    expect(valueChange.mock.calls).toEqual([[null]]);
    expect(onChange.mock.calls).toEqual([[null]]);
    expect(dateInput().value).toBe('');
    expect(calendarDialog().open).toBe(false);
    fixture.componentRef.setInput('required', true);
    fixture.detectChanges();
    openCalendar();
    expect(calendarDialog().querySelector('[data-testid="date-picker-clear"]')).toBeNull();
  });

  it('keeps a confirmed controlled clear external until the parent accepts null', () => {
    const valueChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);

    openCalendar();
    const clear = dialogAction('clear');
    clear.click();
    fixture.detectChanges();

    expect(valueChange).not.toHaveBeenCalled();
    dialogAction('done').click();
    fixture.detectChanges();

    expect(valueChange.mock.calls).toEqual([[null]]);
    expect(dateInput().value).toBe('05.02.2026');
    expect(calendarToggle().getAttribute('aria-label')).toContain('5 февраля 2026');

    fixture.componentRef.setInput('value', null);
    fixture.detectChanges();

    expect(dateInput().value).toBe('');
    expect(valueChange).toHaveBeenCalledTimes(1);
  });

  it('announces required errors and honors readonly and disabled states', () => {
    fixture.componentRef.setInput('value', null);
    fixture.componentRef.setInput('required', true);
    fixture.componentRef.setInput('invalid', true);
    fixture.detectChanges();
    expect(validationMessage().textContent).toContain(LABELS.requiredDate);
    expect(dateInput().required).toBe(true);
    expect(dateInput().getAttribute('aria-required')).toBe('true');

    fixture.componentRef.setInput('required', false);
    fixture.detectChanges();
    expect(dateInput().required).toBe(false);
    expect(dateInput().getAttribute('aria-required')).toBeNull();

    fixture.componentRef.setInput('required', true);
    fixture.componentRef.setInput('readonly', true);
    fixture.detectChanges();
    expect(dateInput().readOnly).toBe(true);
    expect(calendarToggle().disabled).toBe(true);
    fixture.componentRef.setInput('readonly', false);
    fixture.componentRef.setInput('controlDisabled', true);
    fixture.detectChanges();
    expect(dateInput().disabled).toBe(true);
    expect(calendarToggle().disabled).toBe(true);
  });

  it('closes an open calendar and rejects selection when disabled or readonly inputs change', () => {
    const valueChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    openCalendar();

    fixture.componentRef.setInput('controlDisabled', true);
    fixture.detectChanges();
    expect(calendarDialog().open).toBe(false);
    expect(calendarDialog().querySelector('[data-date]')).toBeNull();
    expect(valueChange).not.toHaveBeenCalled();

    fixture.componentRef.setInput('controlDisabled', false);
    fixture.componentRef.setInput('readonly', false);
    fixture.detectChanges();
    openCalendar();
    expect(calendarDialog().open).toBe(true);

    fixture.componentRef.setInput('readonly', true);
    fixture.detectChanges();
    expect(calendarDialog().open).toBe(false);
    expect(calendarDialog().querySelector('[data-date]')).toBeNull();
    expect(valueChange).not.toHaveBeenCalled();
  });

  it('marks the control touched when a manual interaction completes or the dialog closes', () => {
    const onTouched = jest.fn();
    fixture.componentInstance.registerOnTouched(onTouched);

    const input = dateInput();
    input.value = '06.02.2026';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(onTouched).toHaveBeenCalledTimes(1);

    openCalendar();
    dialogAction('cancel').click();
    fixture.detectChanges();
    expect(onTouched).toHaveBeenCalledTimes(2);
  });

  it('integrates nullable change, touched, writeValue, and disabled state with Angular forms', () => {
    fixture.componentRef.setInput('value', undefined);
    const onChange = jest.fn();
    const onTouched = jest.fn();
    fixture.componentInstance.registerOnChange(onChange);
    fixture.componentInstance.registerOnTouched(onTouched);
    fixture.componentInstance.writeValue('2027-12-15');
    fixture.detectChanges();
    expect(dateInput().value).toBe('15.12.2027');
    dateInput().value = '16.12.2027';
    dateInput().dispatchEvent(new Event('input'));
    dateInput().dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(onChange).toHaveBeenCalledWith('2027-12-16');
    expect(onTouched).toHaveBeenCalled();
    fixture.componentInstance.writeValue(null);
    fixture.detectChanges();
    expect(dateInput().value).toBe('');
    fixture.componentInstance.setDisabledState(true);
    fixture.detectChanges();
    expect(dateInput().disabled).toBe(true);
  });

  it('makes Angular forms invalid while the text field contains an invalid date', () => {
    fixture.componentRef.setInput('value', undefined);
    fixture.componentInstance.writeValue('2027-12-15');
    const validatorChange = jest.fn();
    const validityChange = jest.fn();
    fixture.componentInstance.registerOnValidatorChange(validatorChange);
    fixture.componentInstance.validityChange.subscribe(validityChange);
    fixture.detectChanges();
    const input = dateInput();
    input.value = '31.02.2027';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(validatorChange).toHaveBeenCalled();
    expect(fixture.componentInstance.validate(new FormControl('2027-12-15'))).toEqual({
      dateInvalid: true,
    });
    expect(validityChange).toHaveBeenCalledWith(false);
    input.value = '16.12.2027';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(fixture.componentInstance.validate(new FormControl('2027-12-16'))).toBeNull();
    expect(validityChange).toHaveBeenCalledWith(true);
  });

  it('emits validity transitions for malformed values and unavailable-date constraints', () => {
    const validityChange = jest.fn();
    fixture.componentInstance.validityChange.subscribe(validityChange);

    fixture.componentRef.setInput('value', 'garbage');
    fixture.detectChanges();
    fixture.componentRef.setInput('value', '2026-02-05');
    fixture.detectChanges();
    fixture.componentRef.setInput('min', '2026-02-06');
    fixture.detectChanges();
    fixture.componentRef.setInput('min', undefined);
    fixture.detectChanges();

    expect(validityChange.mock.calls).toEqual([[false], [true], [false], [true]]);
  });

  it('supports keyboard navigation in the month picker with one month tab stop', () => {
    openCalendar();
    const toggle = calendarDialog().querySelector(
      '[data-testid="date-picker-month-year-toggle"]',
    ) as HTMLButtonElement;
    toggle.click();
    fixture.detectChanges();
    const monthButtons = calendarDialog().querySelectorAll<HTMLButtonElement>('[data-month-index]');
    const selectedMonth = calendarDialog().querySelector(
      '[data-month-index="1"]',
    ) as HTMLButtonElement;
    expect([...monthButtons].filter((button) => button.tabIndex === 0)).toHaveLength(1);
    expect(document.activeElement).toBe(selectedMonth);
    dispatchKey(selectedMonth, 'ArrowRight');
    const march = calendarDialog().querySelector('[data-month-index="2"]') as HTMLButtonElement;
    expect(document.activeElement).toBe(march);
    dispatchKey(march, 'Enter');
    expect(
      calendarDialog().querySelector('[data-testid="date-picker-month-year-panel"]'),
    ).toBeNull();
    expect(document.activeElement).toBe(dayButton('2026-03-05'));
  });

  it('retains the month picker when the selected month contains no available date', () => {
    fixture.componentRef.setInput('min', '2026-03-01');
    fixture.componentRef.setInput('max', '2026-03-31');
    fixture.componentRef.setInput(
      'disabledDates',
      Array.from({ length: 31 }, (_, index) => `2026-03-${String(index + 1).padStart(2, '0')}`),
    );
    fixture.detectChanges();
    openCalendar();
    const monthYearToggle = calendarDialog().querySelector(
      '[data-testid="date-picker-month-year-toggle"]',
    ) as HTMLButtonElement;
    monthYearToggle.click();
    fixture.detectChanges();
    const march = calendarDialog().querySelector('[data-month-index="2"]') as HTMLButtonElement;
    march.click();
    fixture.detectChanges();

    expect(
      calendarDialog().querySelector('[data-testid="date-picker-month-year-panel"]'),
    ).not.toBeNull();
    expect(calendarDialog().querySelector('[data-month-index="2"]')).toBe(document.activeElement);
  });

  it('integrates value, touched, disabled, and required state through Reactive Forms', async () => {
    await TestBed.resetTestingModule()
      .configureTestingModule({
        imports: [DatePickerFormHostComponent],
      })
      .compileComponents();
    const hostFixture = TestBed.createComponent(DatePickerFormHostComponent);
    hostFixture.detectChanges();
    const input = hostFixture.nativeElement.querySelector('#date') as HTMLInputElement;
    const control = hostFixture.componentInstance.control;
    expect(control.invalid).toBe(true);
    input.value = '15/12/2027';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    hostFixture.detectChanges();
    expect(control.value).toBe('2027-12-15');
    expect(control.touched).toBe(true);
    expect(control.valid).toBe(true);
    control.disable();
    hostFixture.detectChanges();
    expect(input.disabled).toBe(true);
    hostFixture.destroy();
  });

  it('reports component validator errors through a real FormControl and refreshes dynamic inputs', async () => {
    await TestBed.resetTestingModule()
      .configureTestingModule({
        imports: [DatePickerValidatorHostComponent],
      })
      .compileComponents();
    const hostFixture = TestBed.createComponent(DatePickerValidatorHostComponent);
    const host = hostFixture.componentInstance;
    hostFixture.detectChanges();

    host.control.setValue('garbage');
    hostFixture.detectChanges();
    expect(host.control.errors).toEqual({ dateInvalid: true });

    host.control.setValue('2026-02-05');
    hostFixture.detectChanges();
    expect(host.control.errors).toBeNull();

    host.isRequired.set(true);
    host.control.setValue(null);
    hostFixture.changeDetectorRef.markForCheck();
    hostFixture.detectChanges();
    await hostFixture.whenStable();
    const picker = hostFixture.debugElement.children[0]
      .componentInstance as LocalizedDatePickerComponent;
    expect(picker.required()).toBe(true);
    expect(host.control.errors).toEqual({ required: true });

    host.isRequired.set(false);
    hostFixture.changeDetectorRef.markForCheck();
    hostFixture.detectChanges();
    await hostFixture.whenStable();
    expect(host.control.errors).toBeNull();

    host.min.set('2026-02-06');
    host.control.setValue('2026-02-05');
    hostFixture.changeDetectorRef.markForCheck();
    hostFixture.detectChanges();
    await hostFixture.whenStable();
    expect(host.control.errors).toEqual({ dateUnavailable: true });

    host.min.set(undefined);
    hostFixture.changeDetectorRef.markForCheck();
    hostFixture.detectChanges();
    await hostFixture.whenStable();
    expect(host.control.errors).toBeNull();

    host.max.set('2026-02-04');
    hostFixture.changeDetectorRef.markForCheck();
    hostFixture.detectChanges();
    await hostFixture.whenStable();
    expect(host.control.errors).toEqual({ dateUnavailable: true });

    host.max.set(undefined);
    hostFixture.changeDetectorRef.markForCheck();
    hostFixture.detectChanges();
    await hostFixture.whenStable();
    expect(host.control.errors).toBeNull();

    host.disabledDates.set(['2026-02-05']);
    hostFixture.changeDetectorRef.markForCheck();
    hostFixture.detectChanges();
    await hostFixture.whenStable();
    expect(host.control.errors).toEqual({ dateUnavailable: true });

    host.disabledDates.set([]);
    hostFixture.changeDetectorRef.markForCheck();
    hostFixture.detectChanges();
    await hostFixture.whenStable();
    expect(host.control.errors).toBeNull();
    hostFixture.destroy();
  });

  function openCalendar(): void {
    calendarToggle().click();
    fixture.detectChanges();
  }

  function dateInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('#publishedFrom') as HTMLInputElement;
  }

  function calendarToggle(): HTMLButtonElement {
    return fixture.nativeElement.querySelector(
      '[data-testid="temporal-picker-field-trigger"]',
    ) as HTMLButtonElement;
  }

  function dialogAction(action: 'clear' | 'cancel' | 'done'): HTMLButtonElement {
    return calendarDialog().querySelector(
      `[data-testid="date-picker-${action}"]`,
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

  function monthHeading(): HTMLElement {
    return calendarDialog().querySelector(
      '[data-testid="date-picker-month-heading"]',
    ) as HTMLElement;
  }

  function validationMessage(): HTMLElement {
    return fixture.nativeElement.querySelector(
      '[data-testid="date-picker-validation-message"]',
    ) as HTMLElement;
  }

  function dispatchKey(
    element: HTMLElement,
    key: string,
    init: Pick<KeyboardEventInit, 'shiftKey'> = {},
  ): void {
    element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...init }));
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

describe('LocalizedDatePickerComponent server-platform browser guard fixture', () => {
  it('skips browser-only constraint-validation APIs when the platform is server', async () => {
    await TestBed.configureTestingModule({
      imports: [LocalizedDatePickerComponent],
      providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
    }).compileComponents();
    const fixture = TestBed.createComponent(LocalizedDatePickerComponent);
    fixture.componentRef.setInput('inputId', 'serverDate');
    fixture.componentRef.setInput('value', '2026-02-05');
    fixture.componentRef.setInput('controlSize', 'default');
    fixture.componentRef.setInput('dateLocale', 'ru-RU');
    fixture.componentRef.setInput('labels', LABELS);
    fixture.componentRef.setInput('required', false);
    fixture.componentRef.setInput('invalid', false);
    fixture.componentRef.setInput('controlDisabled', false);
    fixture.componentRef.setInput('readonly', false);
    const setCustomValidity = jest.spyOn(HTMLInputElement.prototype, 'setCustomValidity');
    fixture.detectChanges();
    expect(setCustomValidity).not.toHaveBeenCalled();
    setCustomValidity.mockRestore();
    fixture.destroy();
  });
});
