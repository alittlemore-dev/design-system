import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import {
  LocalizedTimePickerComponent,
  type LocalizedTimePickerLabels,
} from './localized-time-picker.component';

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2
    ? true
    : false;
type Expect<Value extends true> = Value;
type LabelKeys = Expect<
  Equal<
    keyof LocalizedTimePickerLabels,
    | 'placeholder'
    | 'openTimePicker'
    | 'changeTime'
    | 'dialog'
    | 'timeInput'
    | 'hour'
    | 'minute'
    | 'formatHint'
    | 'invalidTime'
    | 'unavailableTime'
    | 'requiredTime'
    | 'clear'
    | 'cancel'
    | 'done'
    | 'now'
    | 'keyboardHelp'
  >
>;

void (0 as unknown as LabelKeys);

const LABELS = {
  placeholder: 'HH:mm',
  openTimePicker: 'Open time picker',
  changeTime: 'Change time',
  dialog: 'Choose a time',
  timeInput: 'Time',
  hour: 'Hour',
  minute: 'Minute',
  formatHint: 'Time format: HH:mm',
  invalidTime: 'Enter a valid time.',
  unavailableTime: 'This time is unavailable.',
  requiredTime: 'Enter the required time.',
  clear: 'Clear',
  cancel: 'Cancel',
  done: 'Done',
  now: 'Now',
  keyboardHelp: 'Use the time controls to choose a time.',
} satisfies LocalizedTimePickerLabels;

describe('LocalizedTimePickerComponent', () => {
  let fixture: ComponentFixture<LocalizedTimePickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LocalizedTimePickerComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(LocalizedTimePickerComponent);
    setInputs('09:30');
    installDialogMethods();
  });

  afterEach(() => fixture.destroy());

  it('is a standalone OnPush ds-localized-time-picker with an accessible SVG clock trigger', () => {
    const metadata = (
      LocalizedTimePickerComponent as unknown as {
        ɵcmp: { standalone: boolean; onPush: boolean; selectors: string[][] };
      }
    ).ɵcmp;
    expect(metadata.standalone).toBe(true);
    expect(metadata.onPush).toBe(true);
    expect(metadata.selectors).toContainEqual(['ds-localized-time-picker']);
    expect(trigger().querySelector('svg[aria-hidden="true"]')).not.toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('🕒');
    expect(fixture.nativeElement.querySelector('[style]')).toBeNull();
  });

  it.each([null, '09:30'])('renders canonical value %p', (value) => {
    setInputs(value);
    expect(input().value).toBe(value ?? '');
  });

  it.each(['', '9:30', '24:00', '12:60', 'bad'])('rejects malformed runtime value %p', (value) => {
    setInputs(value as never);
    expect(fixture.componentInstance.validate(new FormControl(value))).toEqual({
      timeInvalid: true,
    });
    expect(input().getAttribute('aria-invalid')).toBe('true');
  });

  it.each(['', '9:30', '24:00', 42])(
    'keeps controlled runtime value %p out of the display while reporting timeInvalid',
    (value) => {
      setInputs(null);
      fixture.componentRef.setInput('value', value);
      fixture.detectChanges();

      expect(input().value).toBe('');
      expect(fixture.componentInstance.validate(new FormControl(value))).toEqual({
        timeInvalid: true,
      });
      expect(input().getAttribute('aria-invalid')).toBe('true');
    },
  );

  it.each(['', '12:60', {}, 42])(
    'keeps CVA runtime value %p out of the display while reporting timeInvalid',
    (value) => {
      fixture.componentRef.setInput('value', undefined);
      fixture.componentInstance.writeValue(value);
      fixture.detectChanges();

      expect(input().value).toBe('');
      expect(fixture.componentInstance.validate(new FormControl(value))).toEqual({
        timeInvalid: true,
      });
      expect(input().getAttribute('aria-invalid')).toBe('true');
    },
  );

  it('keeps a malformed optional CVA value source-invalid in the dialog until Clear', () => {
    fixture.componentRef.setInput('value', undefined);
    fixture.componentInstance.writeValue('bad');
    fixture.detectChanges();

    trigger().click();
    fixture.detectChanges();

    expect(dialogAction('done').disabled).toBe(true);
    expect(dialogAction('clear')).not.toBeNull();
    dialogAction('clear').click();
    fixture.detectChanges();
    expect(dialogAction('done').disabled).toBe(false);
  });

  it('shows invalid rather than required for a present malformed required value', () => {
    setInputs('bad' as never, { required: true });

    expect(fixture.componentInstance.validate(new FormControl('bad'))).toEqual({
      timeInvalid: true,
    });
    expect(validationMessage()).toBe(LABELS.invalidTime);
  });

  it('commits canonical manual input on blur or Enter and rolls a manual draft back on Escape', () => {
    const valueChange = jest.fn();
    const touched = jest.fn();
    fixture.componentRef.setInput('value', undefined);
    fixture.componentInstance.writeValue('09:30');
    fixture.componentInstance.valueChange.subscribe(valueChange);
    fixture.componentInstance.registerOnTouched(touched);
    fixture.detectChanges();

    setText('10:45');
    input().dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    fixture.detectChanges();
    expect(valueChange).toHaveBeenLastCalledWith('10:45');
    expect(touched).toHaveBeenCalled();

    setText('11:00');
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(input().value).toBe('10:45');

    setText('12:15');
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
    expect(valueChange).toHaveBeenLastCalledWith('12:15');
  });

  it('keeps dialog changes and Now as a draft until Done', () => {
    const valueChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    jest.useFakeTimers().setSystemTime(new Date(2026, 8, 11, 14, 7));
    trigger().click();
    fixture.detectChanges();

    dialog().querySelector<HTMLButtonElement>('[data-testid="date-picker-now"]')?.click();
    fixture.detectChanges();
    expect(valueChange).not.toHaveBeenCalled();
    expect(dialog().querySelector('[data-testid="segmented-time-input"]')?.textContent).toContain(
      '14',
    );
    expect(dialog().querySelector('[data-testid="segmented-time-input"]')?.textContent).toContain(
      '07',
    );

    dialogAction('done').click();
    fixture.detectChanges();
    expect(valueChange).toHaveBeenCalledWith('14:07');
    jest.useRealTimers();
  });

  it('uses native time input with minute steps only when native mode is selected at open', () => {
    fixture.componentRef.setInput('timePickerMode', 'native');
    fixture.detectChanges();
    trigger().click();
    fixture.detectChanges();
    expect(
      dialog().querySelector<HTMLInputElement>('[data-testid="date-picker-native-time"]')?.step,
    ).toBe('60');
  });

  it('keeps custom segmented changes and Clear in the dialog draft until Done', () => {
    const valueChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    trigger().click();
    fixture.detectChanges();

    segmentedButton('hour').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    fixture.detectChanges();
    expect(valueChange).not.toHaveBeenCalled();
    dialogAction('clear').click();
    fixture.detectChanges();
    expect(valueChange).not.toHaveBeenCalled();

    dialogAction('done').click();
    fixture.detectChanges();
    expect(valueChange).toHaveBeenCalledWith(null);
  });

  it('does not confirm a pending Enter edit that makes the displayed time unavailable', async () => {
    const valueChange = jest.fn();
    setInputs('09:30', { min: '09:00' });
    fixture.componentInstance.valueChange.subscribe(valueChange);
    trigger().click();
    fixture.detectChanges();

    segmentedButton('hour').dispatchEvent(
      new KeyboardEvent('keydown', { key: '8', bubbles: true }),
    );
    segmentedButton('hour').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();

    expect(valueChange).not.toHaveBeenCalled();
    expect(dialogAction('done').disabled).toBe(true);
    expect(dialog().querySelector('dialog')?.hasAttribute('open')).toBe(true);
  });

  it('does not confirm a pending Done edit that makes the displayed time unavailable', async () => {
    const valueChange = jest.fn();
    setInputs('09:30', { min: '09:00' });
    fixture.componentInstance.valueChange.subscribe(valueChange);
    trigger().click();
    fixture.detectChanges();

    segmentedButton('hour').dispatchEvent(
      new KeyboardEvent('keydown', { key: '8', bubbles: true }),
    );
    dialogAction('done').click();
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();

    expect(valueChange).not.toHaveBeenCalled();
    expect(dialogAction('done').disabled).toBe(true);
    expect(dialog().querySelector('dialog')?.hasAttribute('open')).toBe(true);
  });

  it('does not confirm a native Enter edit before its unavailable draft is rebound', () => {
    const valueChange = jest.fn();
    setInputs('09:30', { min: '09:00', timePickerMode: 'native' });
    fixture.componentInstance.valueChange.subscribe(valueChange);
    trigger().click();
    fixture.detectChanges();
    const nativeInput = dialog().querySelector<HTMLInputElement>(
      '[data-testid="date-picker-native-time"]',
    );
    if (nativeInput === null) throw new Error('Expected the native time input.');

    nativeInput.value = '08:30';
    nativeInput.dispatchEvent(new Event('input', { bubbles: true }));
    nativeInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();

    expect(valueChange).not.toHaveBeenCalled();
    expect(dialog().querySelector('dialog')?.hasAttribute('open')).toBe(true);
  });

  it('keeps an optional hour-only custom draft open until completion or Clear', async () => {
    const valueChange = jest.fn();
    setInputs(null);
    fixture.componentInstance.valueChange.subscribe(valueChange);
    trigger().click();
    fixture.detectChanges();

    segmentedButton('hour').dispatchEvent(
      new KeyboardEvent('keydown', { key: '1', bubbles: true }),
    );
    dialogAction('done').click();
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();

    expect(valueChange).not.toHaveBeenCalled();
    expect(dialog().querySelector('dialog')?.hasAttribute('open')).toBe(true);
    expect(dialogAction('done').disabled).toBe(true);
    expect(dialog().querySelector('[data-testid="segmented-time-input"]')?.textContent).toContain(
      '01',
    );

    dialogAction('clear').click();
    fixture.detectChanges();
    expect(dialog().querySelector('[data-testid="segmented-time-input"]')?.textContent).toContain(
      '--',
    );
    expect(dialogAction('done').disabled).toBe(false);
  });

  it('keeps native input changes in the dialog draft until Done', () => {
    const valueChange = jest.fn();
    fixture.componentRef.setInput('timePickerMode', 'native');
    fixture.componentInstance.valueChange.subscribe(valueChange);
    fixture.detectChanges();
    trigger().click();
    fixture.detectChanges();

    const nativeInput = dialog().querySelector<HTMLInputElement>(
      '[data-testid="date-picker-native-time"]',
    )!;
    nativeInput.value = '10:45';
    nativeInput.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(valueChange).not.toHaveBeenCalled();

    dialogAction('done').click();
    fixture.detectChanges();
    expect(valueChange).toHaveBeenCalledWith('10:45');
  });

  it('discards a changed dialog draft on Cancel', () => {
    const valueChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    trigger().click();
    fixture.detectChanges();

    segmentedButton('hour').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    fixture.detectChanges();
    dialogAction('cancel').click();
    fixture.detectChanges();

    expect(valueChange).not.toHaveBeenCalled();
    expect(input().value).toBe('09:30');
  });

  it('re-evaluates auto capability at each open', () => {
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

  it('treats inclusive valid bounds as available and ignores invalid limits', () => {
    setInputs('09:00', { min: '09:00', max: '17:00' });
    expect(fixture.componentInstance.validate(new FormControl('09:00'))).toBeNull();
    expect(fixture.componentInstance.validate(new FormControl('17:00'))).toBeNull();
    expect(fixture.componentInstance.validate(new FormControl('08:59'))).toEqual({
      timeUnavailable: true,
    });
    setInputs('09:00', { min: 'not a time', max: '99:99' });
    expect(fixture.componentInstance.validate(new FormControl('00:00'))).toBeNull();
  });

  it('reports exact required, invalid, and unavailable validator keys', () => {
    fixture.componentRef.setInput('required', true);
    fixture.detectChanges();
    expect(fixture.componentInstance.validate(new FormControl(null))).toEqual({ required: true });
    expect(fixture.componentInstance.validate(new FormControl('nope'))).toEqual({
      timeInvalid: true,
    });
    fixture.componentRef.setInput('min', '10:00');
    fixture.detectChanges();
    expect(fixture.componentInstance.validate(new FormControl('09:59'))).toEqual({
      timeUnavailable: true,
    });
  });

  it('supports controlled null, CVA, readonly, and validityChange', () => {
    const changed = jest.fn();
    const validity = jest.fn();
    fixture.componentInstance.registerOnChange(changed);
    fixture.componentInstance.validityChange.subscribe(validity);
    setInputs(null);
    expect(input().value).toBe('');
    fixture.componentRef.setInput('value', undefined);
    fixture.componentInstance.writeValue('09:30');
    fixture.detectChanges();
    setText('10:00');
    input().dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    fixture.detectChanges();
    expect(changed).toHaveBeenLastCalledWith('10:00');
    fixture.componentRef.setInput('readonly', true);
    fixture.detectChanges();
    expect(trigger().disabled).toBe(true);
    fixture.componentRef.setInput('readonly', false);
    fixture.componentRef.setInput('required', true);
    fixture.componentInstance.writeValue(null);
    fixture.detectChanges();
    expect(validity).toHaveBeenLastCalledWith(false);
  });

  it('blocks field and dialog interaction when controlDisabled or CVA disabled', () => {
    const valueChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    fixture.componentRef.setInput('controlDisabled', true);
    fixture.detectChanges();
    expect(input().disabled).toBe(true);
    expect(trigger().disabled).toBe(true);

    setText('10:00');
    input().dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    fixture.detectChanges();
    expect(valueChange).not.toHaveBeenCalled();

    fixture.componentRef.setInput('controlDisabled', false);
    fixture.detectChanges();
    trigger().click();
    fixture.detectChanges();
    fixture.componentInstance.setDisabledState(true);
    fixture.detectChanges();
    expect(trigger().disabled).toBe(true);
    expect(valueChange).not.toHaveBeenCalled();
  });

  function setInputs(value: string | null | undefined, extra: Record<string, unknown> = {}): void {
    fixture.componentRef.setInput('inputId', 'time');
    fixture.componentRef.setInput('value', value);
    fixture.componentRef.setInput('controlSize', 'default');
    fixture.componentRef.setInput('labels', LABELS);
    fixture.componentRef.setInput('invalid', false);
    fixture.componentRef.setInput('controlDisabled', false);
    fixture.componentRef.setInput('readonly', false);
    fixture.componentRef.setInput('required', false);
    fixture.componentRef.setInput('min', undefined);
    fixture.componentRef.setInput('max', undefined);
    fixture.componentRef.setInput('timePickerMode', 'custom');
    for (const [name, inputValue] of Object.entries(extra))
      fixture.componentRef.setInput(name, inputValue);
    fixture.detectChanges();
  }

  function input(): HTMLInputElement {
    return fixture.nativeElement.querySelector('ds-temporal-picker-field input');
  }

  function trigger(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('[data-testid="temporal-picker-field-trigger"]');
  }

  function dialog(): HTMLElement {
    return fixture.nativeElement.querySelector('ds-calendar-dialog');
  }

  function dialogAction(name: 'clear' | 'done' | 'cancel'): HTMLButtonElement {
    return dialog().querySelector(`[data-testid="date-picker-${name}"]`)!;
  }

  function validationMessage(): string {
    return (
      fixture.nativeElement
        .querySelector('[data-testid="time-picker-validation-message"]')
        ?.textContent.trim() ?? ''
    );
  }

  function setText(value: string): void {
    input().value = value;
    input().dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  }

  function segmentedButton(segment: 'hour' | 'minute'): HTMLButtonElement {
    return dialog().querySelector(`[data-segment="${segment}"]`)!;
  }

  function installDialogMethods(): void {
    const element = dialog().querySelector('dialog') as HTMLDialogElement;
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
