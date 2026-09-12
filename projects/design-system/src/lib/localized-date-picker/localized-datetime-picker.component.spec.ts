import { Component, PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  LocalizedDateTimePickerComponent,
  type LocalizedDateTimePickerLabels,
} from './localized-datetime-picker.component';

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2
    ? true
    : false;
type Expect<Value extends true> = Value;
type LabelKeys = Expect<
  Equal<
    keyof LocalizedDateTimePickerLabels,
    | 'placeholder'
    | 'openPicker'
    | 'changeValue'
    | 'dialog'
    | 'dateTimeInput'
    | 'previousMonth'
    | 'nextMonth'
    | 'openMonthYearPicker'
    | 'previousYear'
    | 'nextYear'
    | 'hour'
    | 'minute'
    | 'dateFormatHint'
    | 'timeFormatHint'
    | 'selectDate'
    | 'clear'
    | 'cancel'
    | 'done'
    | 'today'
    | 'now'
    | 'keyboardHelp'
    | 'invalidDateTime'
    | 'unavailableDateTime'
    | 'requiredDateTime'
  >
>;

void (0 as unknown as LabelKeys);

const LABELS = {
  placeholder: 'dd/mm/yyyy HH:mm',
  openPicker: 'Open date and time picker',
  changeValue: 'Change date and time',
  dialog: 'Choose a date and time',
  dateTimeInput: 'Date and time',
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  openMonthYearPicker: 'Choose month and year',
  previousYear: 'Previous year',
  nextYear: 'Next year',
  hour: 'Hour',
  minute: 'Minute',
  dateFormatHint: 'Date format: DD/MM/YYYY',
  timeFormatHint: 'Time format: HH:mm',
  selectDate: 'Select date',
  clear: 'Clear',
  cancel: 'Cancel',
  done: 'Done',
  today: 'Today',
  now: 'Now',
  keyboardHelp: 'Use the calendar and time controls to choose a date and time.',
  invalidDateTime: 'Enter a valid date and time.',
  unavailableDateTime: 'This date and time is unavailable.',
  requiredDateTime: 'Enter the required date and time.',
} satisfies LocalizedDateTimePickerLabels;

@Component({
  imports: [ReactiveFormsModule, LocalizedDateTimePickerComponent],
  template: `<ds-localized-datetime-picker
    inputId="form-appointment"
    [labels]="labels"
    controlSize="default"
    dateLocale="en-GB"
    [invalid]="false"
    [controlDisabled]="false"
    [readonly]="false"
    [formControl]="control"
  />`,
})
class DateTimePickerFormHostComponent {
  readonly labels = LABELS;
  readonly control = new FormControl<string | null>(null);
}

describe('LocalizedDateTimePickerComponent', () => {
  let fixture: ComponentFixture<LocalizedDateTimePickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LocalizedDateTimePickerComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(LocalizedDateTimePickerComponent);
    setInputs('2026-02-05T09:30');
    installDialogMethods();
  });

  afterEach(() => {
    jest.useRealTimers();
    fixture.destroy();
  });

  it('is standalone and OnPush with one localized editable datetime field and one SVG trigger', () => {
    const metadata = (
      LocalizedDateTimePickerComponent as unknown as {
        ɵcmp: { standalone: boolean; onPush: boolean; selectors: string[][] };
      }
    ).ɵcmp;
    expect(metadata.standalone).toBe(true);
    expect(metadata.onPush).toBe(true);
    expect(metadata.selectors).toContainEqual(['ds-localized-datetime-picker']);
    expect(field().querySelectorAll('input')).toHaveLength(1);
    expect(input().type).toBe('text');
    expect(input().value).toBe('05/02/2026 09:30');
    expect(input().getAttribute('aria-label')).toBe(LABELS.dateTimeInput);
    expect(trigger().querySelector('svg[aria-hidden="true"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('input[type="time"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[style]')).toBeNull();
  });

  it('commits localized manual input on blur or Enter and rolls back on Escape', () => {
    const valueChange = jest.fn();
    const touched = jest.fn();
    fixture.componentRef.setInput('value', undefined);
    fixture.componentInstance.writeValue('2026-02-05T09:30');
    fixture.componentInstance.valueChange.subscribe(valueChange);
    fixture.componentInstance.registerOnTouched(touched);
    fixture.detectChanges();

    setText('06/02/2026 10:45');
    input().dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    fixture.detectChanges();
    expect(valueChange).toHaveBeenLastCalledWith('2026-02-06T10:45');
    expect(touched).toHaveBeenCalled();

    setText('07/02/2026 11:00');
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(input().value).toBe('06/02/2026 10:45');

    setText('08/02/2026 12:15');
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
    expect(valueChange).toHaveBeenLastCalledWith('2026-02-08T12:15');
  });

  it('keeps malformed manual text visible without emitting a model value', () => {
    const valueChange = jest.fn();
    fixture.componentRef.setInput('value', undefined);
    fixture.componentInstance.writeValue('2026-02-05T09:30');
    fixture.componentInstance.valueChange.subscribe(valueChange);
    fixture.detectChanges();

    setText('31/02/2026 09:30');
    input().dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    fixture.detectChanges();

    expect(input().value).toBe('31/02/2026 09:30');
    expect(valueChange).not.toHaveBeenCalled();
    expect(message()).toBe(LABELS.invalidDateTime);
  });

  it('shows calendar and custom time controls together and keeps both changes draft-only until Done', () => {
    const valueChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    trigger().click();
    fixture.detectChanges();

    expect(dialog().querySelector('[role="grid"]')).not.toBeNull();
    expect(dialog().querySelector('[data-testid="segmented-time-input"]')).not.toBeNull();
    dayButton('2026-02-06').click();
    fixture.detectChanges();
    expect(valueChange).not.toHaveBeenCalled();
    segmentedButton('hour').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    fixture.detectChanges();
    expect(valueChange).not.toHaveBeenCalled();

    dialogAction('done').click();
    fixture.detectChanges();
    expect(valueChange).toHaveBeenCalledWith('2026-02-06T10:30');
  });

  it('requires either a clear optional draft or a complete available datetime before Done', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 1, 5, 12, 0));
    setInputs(null, { required: true });
    trigger().click();
    fixture.detectChanges();
    expect(dialogAction('done').disabled).toBe(true);

    dayButton('2026-02-05').click();
    fixture.detectChanges();
    expect(dialogAction('done').disabled).toBe(true);

    segmentedButton('hour').dispatchEvent(new KeyboardEvent('keydown', { key: '0' }));
    segmentedButton('hour').dispatchEvent(new KeyboardEvent('keydown', { key: '9' }));
    segmentedButton('minute').dispatchEvent(new KeyboardEvent('keydown', { key: '3' }));
    segmentedButton('minute').dispatchEvent(new KeyboardEvent('keydown', { key: '0' }));
    fixture.detectChanges();
    expect(dialogAction('done').disabled).toBe(false);

    dialogAction('cancel').click();
    setInputs('2026-02-05T09:30', { min: '2026-02-05T10:00' });
    trigger().click();
    fixture.detectChanges();
    expect(dialogAction('done').disabled).toBe(true);
  });

  it('keeps Clear transactional and commits null through Done when optional', () => {
    const valueChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    trigger().click();
    fixture.detectChanges();

    dialogAction('clear').click();
    fixture.detectChanges();
    expect(valueChange).not.toHaveBeenCalled();
    expect(dialogAction('done').disabled).toBe(false);

    dialogAction('done').click();
    fixture.detectChanges();
    expect(valueChange).toHaveBeenCalledWith(null);
  });

  it('sets both local parts with Now as a draft and does not commit before Done', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 8, 11, 14, 7));
    const valueChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    trigger().click();
    fixture.detectChanges();

    dialog().querySelector<HTMLButtonElement>('[data-testid="date-picker-now"]')!.click();
    fixture.detectChanges();
    expect(valueChange).not.toHaveBeenCalled();
    expect(dayButton('2026-09-11').getAttribute('aria-selected')).toBe('true');
    expect(dialog().querySelector('[data-testid="segmented-time-input"]')?.textContent).toContain(
      '14',
    );
    expect(dialog().querySelector('[data-testid="segmented-time-input"]')?.textContent).toContain(
      '07',
    );

    dialogAction('done').click();
    fixture.detectChanges();
    expect(valueChange).toHaveBeenCalledWith('2026-09-11T14:07');
  });

  it.each([
    [null, false, null],
    [null, true, { required: true }],
  ])('validates absent runtime value %p with required=%p', (value, required, expected) => {
    setInputs(value, { required });
    expect(fixture.componentInstance.validate(new FormControl(value))).toEqual(expected);
    expect(input().value).toBe('');
  });

  it.each(['', '2026-02-05', '2026-02-05T9:30', '2026-02-30T09:30', 42, {}])(
    'keeps malformed runtime value %p out of the field while reporting dateTimeInvalid',
    (value) => {
      fixture.componentRef.setInput('value', value);
      fixture.detectChanges();

      expect(input().value).toBe('');
      expect(fixture.componentInstance.validate(new FormControl(value))).toEqual({
        dateTimeInvalid: true,
      });
      expect(input().getAttribute('aria-invalid')).toBe('true');
      expect(message()).toBe(LABELS.invalidDateTime);
    },
  );

  it('keeps a malformed optional source value unconfirmable until explicit Clear', () => {
    fixture.componentRef.setInput('value', undefined);
    fixture.componentInstance.writeValue('bad');
    fixture.detectChanges();

    trigger().click();
    fixture.detectChanges();

    expect(dialogAction('done').disabled).toBe(true);
    dialogAction('clear').click();
    fixture.detectChanges();
    expect(dialogAction('done').disabled).toBe(false);
  });

  it('rolls back changed date and time on Cancel and reopens from the committed value', () => {
    const valueChange = jest.fn();
    const cvaChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    fixture.componentInstance.registerOnChange(cvaChange);
    trigger().click();
    fixture.detectChanges();

    dayButton('2026-02-06').click();
    fixture.detectChanges();
    segmentedButton('hour').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    fixture.detectChanges();
    dialogAction('cancel').click();
    fixture.detectChanges();

    expect(valueChange).not.toHaveBeenCalled();
    expect(cvaChange).not.toHaveBeenCalled();
    expect(input().value).toBe('05/02/2026 09:30');
    expect(dialogElement().open).toBe(false);

    trigger().click();
    fixture.detectChanges();
    expect(dayButton('2026-02-05').getAttribute('aria-selected')).toBe('true');
    expect(dayButton('2026-02-06').getAttribute('aria-selected')).toBe('false');
    expect(dialog().querySelector('[data-testid="segmented-time-input"]')?.textContent).toContain(
      '09',
    );
    expect(dialog().querySelector('[data-testid="segmented-time-input"]')?.textContent).toContain(
      '30',
    );
  });

  it('rolls back Clear on Cancel and reopens from the committed value', () => {
    const valueChange = jest.fn();
    const cvaChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    fixture.componentInstance.registerOnChange(cvaChange);
    trigger().click();
    fixture.detectChanges();

    dialogAction('clear').click();
    fixture.detectChanges();
    dialogAction('cancel').click();
    fixture.detectChanges();

    expect(valueChange).not.toHaveBeenCalled();
    expect(cvaChange).not.toHaveBeenCalled();
    expect(input().value).toBe('05/02/2026 09:30');
    expect(dialogElement().open).toBe(false);

    trigger().click();
    fixture.detectChanges();
    expect(dayButton('2026-02-05').getAttribute('aria-selected')).toBe('true');
    expect(dialog().querySelector('[data-testid="segmented-time-input"]')?.textContent).toContain(
      '09',
    );
    expect(dialog().querySelector('[data-testid="segmented-time-input"]')?.textContent).toContain(
      '30',
    );
  });

  it('uses exact invalid, unavailable, and required messages with native validity', () => {
    setInputs(null, { required: true });
    expect(input().required).toBe(true);
    expect(message()).toBe(LABELS.requiredDateTime);
    expect(input().validationMessage).toBe(LABELS.requiredDateTime);

    setInputs('2026-02-05T09:30', { disabledDates: ['2026-02-05'] });
    expect(message()).toBe(LABELS.unavailableDateTime);
    expect(input().validationMessage).toBe(LABELS.unavailableDateTime);

    setInputs('not a datetime');
    expect(message()).toBe(LABELS.invalidDateTime);
    expect(input().validationMessage).toBe(LABELS.invalidDateTime);
  });

  it('notifies Angular validation and validityChange when a required manual draft is blanked', () => {
    const validatorChange = jest.fn();
    const validityChange = jest.fn();
    setInputs('2026-02-05T09:30', { required: true });
    fixture.componentInstance.registerOnValidatorChange(validatorChange);
    fixture.componentInstance.validityChange.subscribe(validityChange);
    validatorChange.mockClear();

    setText('');

    expect(validatorChange).toHaveBeenCalled();
    expect(validityChange).toHaveBeenLastCalledWith(false);
    expect(fixture.componentInstance.validate(new FormControl('2026-02-05T09:30'))).toEqual({
      required: true,
    });
  });

  it('treats datetime min and max as inclusive including same-date time edges', () => {
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
    expect(fixture.componentInstance.validate(new FormControl('2026-02-07T00:00'))).toEqual({
      dateTimeUnavailable: true,
    });
  });

  it('disables a disabled local date for every time while leaving adjacent dates available', () => {
    setInputs('2026-02-05T09:30', { disabledDates: ['2026-02-06'] });
    expect(fixture.componentInstance.validate(new FormControl('2026-02-06T00:00'))).toEqual({
      dateTimeUnavailable: true,
    });
    expect(fixture.componentInstance.validate(new FormControl('2026-02-06T23:59'))).toEqual({
      dateTimeUnavailable: true,
    });
    trigger().click();
    fixture.detectChanges();
    expect(dayButton('2026-02-05').disabled).toBe(false);
    expect(dayButton('2026-02-06').disabled).toBe(true);
  });

  it('keeps controlled commits external while uncontrolled CVA commits locally and marks touched', () => {
    const valueChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    setText('06/02/2026 10:45');
    input().dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    fixture.detectChanges();
    expect(valueChange).toHaveBeenCalledWith('2026-02-06T10:45');
    expect(input().value).toBe('05/02/2026 09:30');

    const hostFixture = TestBed.createComponent(DateTimePickerFormHostComponent);
    const host = hostFixture.componentInstance;
    host.control.setValue('2027-12-15T14:20');
    hostFixture.detectChanges();
    const hostInput = hostFixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(hostInput.value).toBe('15/12/2027 14:20');
    hostInput.value = '16/12/2027 15:45';
    hostInput.dispatchEvent(new Event('input', { bubbles: true }));
    hostInput.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    hostFixture.detectChanges();
    expect(host.control.value).toBe('2027-12-16T15:45');
    expect(host.control.touched).toBe(true);
    host.control.disable();
    hostFixture.detectChanges();
    expect(hostInput.disabled).toBe(true);
    hostFixture.destroy();
  });

  it('treats bound null as controlled and undefined as CVA-backed state', () => {
    setInputs(null);
    fixture.componentInstance.writeValue('2027-12-15T14:20');
    fixture.detectChanges();
    expect(input().value).toBe('');

    fixture.componentRef.setInput('value', undefined);
    fixture.detectChanges();
    expect(input().value).toBe('15/12/2027 14:20');
  });

  it('uses native time only when selected and re-evaluates auto mode at every dialog open', () => {
    const valueChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    fixture.componentRef.setInput('timePickerMode', 'native');
    fixture.detectChanges();
    trigger().click();
    fixture.detectChanges();
    const nativeTime = dialog().querySelector<HTMLInputElement>(
      '[data-testid="date-picker-native-time"]',
    )!;
    expect(nativeTime.step).toBe('60');
    nativeTime.value = '10:45';
    nativeTime.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(valueChange).not.toHaveBeenCalled();
    dialogAction('done').click();
    fixture.detectChanges();
    expect(valueChange).toHaveBeenCalledWith('2026-02-05T10:45');

    const matchMedia = jest.fn().mockReturnValue({ matches: true });
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: matchMedia });
    fixture.componentRef.setInput('timePickerMode', 'auto');
    fixture.detectChanges();
    trigger().click();
    fixture.detectChanges();
    expect(dialog().querySelector('[data-testid="date-picker-native-time"]')).not.toBeNull();
    dialogAction('cancel').click();
    matchMedia.mockReturnValue({ matches: false });
    trigger().click();
    fixture.detectChanges();
    expect(dialog().querySelector('[data-testid="segmented-time-input"]')).not.toBeNull();
  });

  it('blocks interaction when readonly or disabled and closes an open dialog', () => {
    const valueChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    trigger().click();
    fixture.detectChanges();
    fixture.componentRef.setInput('readonly', true);
    fixture.detectChanges();
    expect(dialogElement().open).toBe(false);
    expect(input().readOnly).toBe(true);
    expect(trigger().disabled).toBe(true);

    fixture.componentRef.setInput('readonly', false);
    fixture.componentInstance.setDisabledState(true);
    fixture.detectChanges();
    expect(input().disabled).toBe(true);
    expect(trigger().disabled).toBe(true);
    expect(valueChange).not.toHaveBeenCalled();
  });

  it('does not touch browser-only APIs on the server platform', async () => {
    fixture.destroy();
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [LocalizedDateTimePickerComponent],
      providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
    }).compileComponents();
    const serverFixture = TestBed.createComponent(LocalizedDateTimePickerComponent);
    setServerInputs(serverFixture);
    expect(() => serverFixture.detectChanges()).not.toThrow();
    expect(() =>
      (
        serverFixture.nativeElement.querySelector(
          '[data-testid="temporal-picker-field-trigger"]',
        ) as HTMLButtonElement
      ).click(),
    ).not.toThrow();
    serverFixture.destroy();
  });

  function setInputs(
    value: string | null | undefined,
    extra: {
      required?: boolean;
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
    fixture.componentRef.setInput('required', extra.required ?? false);
    fixture.componentRef.setInput('invalid', false);
    fixture.componentRef.setInput('controlDisabled', false);
    fixture.componentRef.setInput('readonly', false);
    fixture.componentRef.setInput('min', extra.min);
    fixture.componentRef.setInput('max', extra.max);
    fixture.componentRef.setInput('disabledDates', extra.disabledDates);
    fixture.componentRef.setInput('timePickerMode', 'custom');
    fixture.detectChanges();
  }

  function field(): HTMLElement {
    return fixture.nativeElement.querySelector('[data-testid="temporal-picker-field"]');
  }

  function input(): HTMLInputElement {
    return field().querySelector('input')!;
  }

  function trigger(): HTMLButtonElement {
    return field().querySelector('[data-testid="temporal-picker-field-trigger"]')!;
  }

  function dialog(): HTMLElement {
    return fixture.nativeElement.querySelector('ds-calendar-dialog');
  }

  function dialogElement(): HTMLDialogElement {
    return dialog().querySelector('dialog')!;
  }

  function dialogAction(name: 'clear' | 'done' | 'cancel'): HTMLButtonElement {
    return dialog().querySelector(`[data-testid="date-picker-${name}"]`)!;
  }

  function dayButton(iso: string): HTMLButtonElement {
    return dialog().querySelector(`[data-date="${iso}"]`)!;
  }

  function segmentedButton(segment: 'hour' | 'minute'): HTMLButtonElement {
    return dialog().querySelector(`[data-segment="${segment}"]`)!;
  }

  function setText(value: string): void {
    input().value = value;
    input().dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  }

  function message(): string {
    return (
      fixture.nativeElement
        .querySelector('[data-testid="datetime-picker-validation-message"]')
        ?.textContent.trim() ?? ''
    );
  }

  function installDialogMethods(): void {
    const element = dialogElement();
    Object.defineProperty(element, 'showModal', {
      configurable: true,
      value: jest.fn(() => element.setAttribute('open', '')),
    });
    Object.defineProperty(element, 'close', {
      configurable: true,
      value: jest.fn(() => element.removeAttribute('open')),
    });
  }
});

function setServerInputs(fixture: ComponentFixture<LocalizedDateTimePickerComponent>): void {
  fixture.componentRef.setInput('inputId', 'server-datetime');
  fixture.componentRef.setInput('value', '2026-02-05T09:30');
  fixture.componentRef.setInput('controlSize', 'default');
  fixture.componentRef.setInput('dateLocale', 'en-GB');
  fixture.componentRef.setInput('labels', LABELS);
  fixture.componentRef.setInput('invalid', false);
  fixture.componentRef.setInput('controlDisabled', false);
  fixture.componentRef.setInput('readonly', false);
}
