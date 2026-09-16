import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import {
  LocalizedTimeRangePickerComponent,
  type LocalizedTimeRangePickerLabels,
} from './localized-time-range-picker.component';
import {
  DEFAULT_RANGE_REQUIREMENTS,
  EMPTY_TIME_RANGE,
  type LocalizedRangeRequirements,
  type LocalizedTimeRange,
  type LocalizedTimePickerMode,
} from './localized-temporal-picker.types';

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2
    ? true
    : false;
type Expect<Value extends true> = Value;
type LabelKeys = Expect<
  Equal<
    keyof LocalizedTimeRangePickerLabels,
    | 'placeholder'
    | 'openPicker'
    | 'changeValue'
    | 'dialog'
    | 'groupLabel'
    | 'startTime'
    | 'endTime'
    | 'selectStartTime'
    | 'selectEndTime'
    | 'accessibleRangeSeparator'
    | 'hour'
    | 'minute'
    | 'formatHint'
    | 'clear'
    | 'cancel'
    | 'done'
    | 'now'
    | 'keyboardHelp'
    | 'invalidRange'
    | 'unavailableRange'
    | 'requiredRange'
  >
>;

void (0 as unknown as LabelKeys);

const LABELS = {
  placeholder: 'HH:mm',
  openPicker: 'Open time range picker',
  changeValue: 'Change time range',
  dialog: 'Choose a time range',
  groupLabel: 'Working hours',
  startTime: 'Start time',
  endTime: 'End time',
  selectStartTime: 'Select a start time',
  selectEndTime: 'Select an end time',
  accessibleRangeSeparator: 'to',
  hour: 'Hour',
  minute: 'Minute',
  formatHint: 'Time format: HH:mm',
  clear: 'Clear',
  cancel: 'Cancel',
  done: 'Done',
  now: 'Now',
  keyboardHelp: 'Use the time controls to choose a time.',
  invalidRange: 'Enter a valid time range.',
  unavailableRange: 'This time range is unavailable.',
  requiredRange: 'Enter the required times.',
} satisfies LocalizedTimeRangePickerLabels;

describe('LocalizedTimeRangePickerComponent', () => {
  let fixture: ComponentFixture<LocalizedTimeRangePickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LocalizedTimeRangePickerComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(LocalizedTimeRangePickerComponent);
    setInputs({ start: '09:00', end: '17:00' });
    installDialogMethods();
  });

  afterEach(() => {
    jest.useRealTimers();
    fixture.destroy();
  });

  it('is standalone OnPush and renders one shell, two HH:mm inputs, one fixed en dash, and one SVG clock trigger', () => {
    const metadata = (
      LocalizedTimeRangePickerComponent as unknown as {
        ɵcmp: { standalone: boolean; onPush: boolean; selectors: string[][] };
      }
    ).ɵcmp;
    const field = temporalField();

    expect(metadata.standalone).toBe(true);
    expect(metadata.onPush).toBe(true);
    expect(metadata.selectors).toContainEqual(['ds-localized-time-range-picker']);
    expect(fixture.nativeElement.querySelectorAll('.temporal-picker-field-shell')).toHaveLength(1);
    expect(field.querySelectorAll('input[type="text"]')).toHaveLength(2);
    expect(startInput().placeholder).toBe('HH:mm');
    expect(endInput().placeholder).toBe('HH:mm');
    expect(field.querySelectorAll('[data-testid="temporal-picker-field-trigger"]')).toHaveLength(1);
    expect(trigger().querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(1);
    expect(
      field.querySelector('[data-testid="temporal-picker-field-separator"]')?.textContent,
    ).toBe('–');
    expect(field.getAttribute('role')).toBe('group');
    expect(field.getAttribute('aria-label')).toBe(LABELS.groupLabel);
    expect(startInput().getAttribute('aria-label')).toBe(LABELS.startTime);
    expect(endInput().getAttribute('aria-label')).toBe(LABELS.endTime);
    expect(trigger().getAttribute('aria-label')).toBe(LABELS.changeValue);
    expect(fixture.nativeElement.querySelector('[style]')).toBeNull();
  });

  it('renders a non-null canonical empty range and defaults requirements and mode', () => {
    setInputs(EMPTY_TIME_RANGE);

    expect(startInput().value).toBe('');
    expect(endInput().value).toBe('');
    expect(trigger().getAttribute('aria-label')).toBe(LABELS.openPicker);
    expect(fixture.componentInstance.requirements()).toEqual(DEFAULT_RANGE_REQUIREMENTS);
    expect(fixture.componentInstance.timePickerMode()).toBe('auto');
    expect(fixture.componentInstance.validate(new FormControl(EMPTY_TIME_RANGE))).toBeNull();
  });

  it('round-trips null endpoints and never emits empty strings', () => {
    fixture.componentRef.setInput('value', undefined);
    fixture.componentInstance.writeValue({ start: '09:00', end: null });
    const valueChange = jest.fn();
    const onChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    fixture.componentInstance.registerOnChange(onChange);
    fixture.detectChanges();

    expect(startInput().value).toBe('09:00');
    expect(endInput().value).toBe('');

    setText(endInput(), '10:30');
    endInput().dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    fixture.detectChanges();
    expect(valueChange).toHaveBeenLastCalledWith({ start: '09:00', end: '10:30' });

    setText(endInput(), '');
    endInput().dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    fixture.detectChanges();
    expect(valueChange).toHaveBeenLastCalledWith({ start: '09:00', end: null });
    expect(onChange).toHaveBeenLastCalledWith({ start: '09:00', end: null });
    expect(valueChange.mock.calls.flat()).not.toContainEqual({ start: '09:00', end: '' });
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
  ] as const)('applies independent start/end/paired requirements %p', (requirements, expected) => {
    fixture.componentRef.setInput('requirements', requirements);
    fixture.detectChanges();
    expect(fixture.componentInstance.validate(new FormControl(EMPTY_TIME_RANGE))).toEqual(expected);
  });

  it('applies paired requiredness only when the opposite endpoint is present', () => {
    fixture.componentRef.setInput('requirements', { start: false, end: false, paired: true });
    fixture.detectChanges();

    expect(
      fixture.componentInstance.validate(
        new FormControl<LocalizedTimeRange>({ start: '09:00', end: null }),
      ),
    ).toEqual({ required: { start: false, end: true } });
    expect(
      fixture.componentInstance.validate(
        new FormControl<LocalizedTimeRange>({ start: null, end: '17:00' }),
      ),
    ).toEqual({ required: { start: true, end: false } });
  });

  it('reports malformed endpoints separately, accepts equality, and rejects overnight order', () => {
    expect(
      fixture.componentInstance.validate(
        new FormControl<LocalizedTimeRange>({ start: '9:00', end: '17:00' }),
      ),
    ).toEqual({ timeRangeInvalid: { start: true } });
    expect(
      fixture.componentInstance.validate(
        new FormControl<LocalizedTimeRange>({ start: '09:00', end: '17:60' }),
      ),
    ).toEqual({ timeRangeInvalid: { end: true } });
    expect(
      fixture.componentInstance.validate(
        new FormControl<LocalizedTimeRange>({ start: '09:00', end: '09:00' }),
      ),
    ).toBeNull();
    expect(
      fixture.componentInstance.validate(
        new FormControl<LocalizedTimeRange>({ start: '22:00', end: '02:00' }),
      ),
    ).toEqual({ timeRangeInvalid: { order: true } });
  });

  it('marks manual endpoint/order failures and shows the common invalid-range message', () => {
    setText(startInput(), '9:00');
    expect(startInput().getAttribute('aria-invalid')).toBe('true');
    expect(endInput().getAttribute('aria-invalid')).toBeNull();
    expect(validationMessage()).toBe(LABELS.invalidRange);

    dispatchKey(startInput(), 'Escape');
    setText(startInput(), '22:00');
    setText(endInput(), '02:00');
    expect(startInput().getAttribute('aria-invalid')).toBe('true');
    expect(endInput().getAttribute('aria-invalid')).toBe('true');
    expect(validationMessage()).toBe(LABELS.invalidRange);
  });

  it('treats non-empty malformed required input as invalid rather than missing', () => {
    fixture.componentRef.setInput('requirements', { start: true, end: false, paired: false });
    fixture.detectChanges();

    setText(startInput(), '9:00');

    expect(
      fixture.componentInstance.validate(
        new FormControl<LocalizedTimeRange>({ start: '09:00', end: '17:00' }),
      ),
    ).toEqual({ timeRangeInvalid: { start: true } });
    expect(validationMessage()).toBe(LABELS.invalidRange);
    expect(startInput().getAttribute('aria-invalid')).toBe('true');

    setText(startInput(), '');
    expect(
      fixture.componentInstance.validate(
        new FormControl<LocalizedTimeRange>({ start: '09:00', end: '17:00' }),
      ),
    ).toEqual({ required: { start: true, end: false } });
    expect(validationMessage()).toBe(LABELS.requiredRange);
  });

  it('prioritizes invalid order over simultaneous unavailable endpoints', () => {
    setInputs({ start: '18:00', end: '08:00' }, { min: '09:00', max: '17:00' });

    expect(validationMessage()).toBe(LABELS.invalidRange);
  });

  it('preserves a malformed dialog endpoint until a complete canonical time edit replaces it', () => {
    fixture.componentRef.setInput('value', { start: 'bad', end: '17:00' });
    fixture.componentRef.setInput('timePickerMode', 'custom');
    fixture.detectChanges();
    openDialogFrom('start');

    expect(dialogAction('done').disabled).toBe(true);
    segmentedButton('hour').focus();
    dispatchKey(segmentedButton('hour'), '1');
    dispatchKey(segmentedButton('hour'), '4');
    segmentedButton('minute').focus();
    dispatchKey(segmentedButton('minute'), '4');
    dispatchKey(segmentedButton('minute'), '5');
    expect(dialogAction('done').disabled).toBe(false);
  });

  it('uses inclusive valid min/max, ignores invalid bounds, and reports structured unavailable endpoints', () => {
    setInputs({ start: '08:59', end: '17:01' }, { min: '09:00', max: '17:00' });
    expect(
      fixture.componentInstance.validate(
        new FormControl<LocalizedTimeRange>({ start: '09:00', end: '17:00' }),
      ),
    ).toBeNull();
    expect(
      fixture.componentInstance.validate(new FormControl(fixture.componentInstance.value())),
    ).toEqual({ timeRangeUnavailable: { start: true, end: true } });
    expect(validationMessage()).toBe(LABELS.unavailableRange);

    setInputs({ start: '00:00', end: '23:59' }, { min: 'bad', max: '99:99' });
    expect(
      fixture.componentInstance.validate(
        new FormControl<LocalizedTimeRange>({ start: '00:00', end: '23:59' }),
      ),
    ).toBeNull();
  });

  it('switches the active endpoint from field focus and focused dialog editor', () => {
    startInput().focus();
    fixture.detectChanges();
    expect(startInput().parentElement?.classList).toContain(
      'temporal-picker-field-endpoint-active',
    );

    endInput().click();
    fixture.detectChanges();
    expect(endInput().parentElement?.classList).toContain('temporal-picker-field-endpoint-active');

    openDialogFrom('start');
    expect(dialogStatus()).toBe(LABELS.selectStartTime);
    segmentedButton('hour').focus();
    dispatchKey(segmentedButton('hour'), 'ArrowUp');
    segmentedButton('hour').dispatchEvent(
      new FocusEvent('blur', { bubbles: true, relatedTarget: dialogAction('done') }),
    );
    fixture.detectChanges();
    expect(dialogStatus()).toBe(LABELS.selectStartTime);

    segmentedButton('hour', 'end').focus();
    fixture.detectChanges();
    expect(dialogStatus()).toBe(LABELS.selectEndTime);
    expect(endInput().parentElement?.classList).toContain('temporal-picker-field-endpoint-active');
  });

  it('keeps a whole segmented start edit atomic before advancing to the end', () => {
    const valueChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    setInputs({ start: '09:30', end: '17:00' }, { timePickerMode: 'custom' });
    openDialogFrom('start');

    segmentedButton('hour').focus();
    dispatchKey(segmentedButton('hour'), '1');
    dispatchKey(segmentedButton('hour'), '4');
    segmentedButton('minute').focus();
    dispatchKey(segmentedButton('minute'), '4');
    dispatchKey(segmentedButton('minute'), '5');

    expect(dialogStatus()).toBe(LABELS.selectStartTime);
    dialogAction('done').click();
    fixture.detectChanges();

    expect(valueChange).toHaveBeenLastCalledWith({ start: '14:45', end: '17:00' });
  });

  it('keeps a permitted partial range minute-only draft open until completion or Clear', async () => {
    const valueChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    setInputs(EMPTY_TIME_RANGE, { timePickerMode: 'custom' });
    openDialogFrom('start');

    segmentedButton('minute').dispatchEvent(
      new KeyboardEvent('keydown', { key: '5', bubbles: true }),
    );
    dialogAction('done').click();
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();

    expect(valueChange).not.toHaveBeenCalled();
    expect(calendarDialog().open).toBe(true);
    expect(dialogAction('done').disabled).toBe(true);
    expect(segmentedText()).toContain('05');

    dialogAction('clear').click();
    fixture.detectChanges();
    expect(segmentedText()).toContain('--');
    expect(dialogAction('done').disabled).toBe(false);
  });

  it('keeps custom/native/Now changes transactional and targets the active endpoint', () => {
    const valueChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    jest.useFakeTimers().setSystemTime(new Date(2026, 8, 11, 14, 7));
    fixture.componentRef.setInput('timePickerMode', 'custom');
    fixture.detectChanges();
    openDialogFrom('end');
    expect(dialog().querySelectorAll('[data-testid="segmented-time-input"]')).toHaveLength(2);
    segmentedButton('hour', 'end').focus();
    dialog().querySelector<HTMLButtonElement>('[data-testid="date-picker-now"]')?.click();
    fixture.detectChanges();
    expect(valueChange).not.toHaveBeenCalled();
    expect(segmentedText('end')).toContain('14');
    expect(segmentedText('end')).toContain('07');
    dialogAction('cancel').click();

    setInputs({ start: '09:00', end: '17:00' }, { timePickerMode: 'native' });
    openDialogFrom('end');
    const nativeInputs = dialog().querySelectorAll<HTMLInputElement>(
      '[data-testid="date-picker-native-time"]',
    );
    expect(nativeInputs).toHaveLength(2);
    const native = nativeInputs[1];
    expect(native.step).toBe('60');
    native.value = '18:00';
    native.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(valueChange).not.toHaveBeenCalled();
    dialogAction('done').click();
    expect(valueChange).toHaveBeenLastCalledWith({ start: '09:00', end: '18:00' });
  });

  it('re-evaluates auto native capability at each open', () => {
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

  it('allows a permitted partial range to be confirmed', () => {
    setInputs({ start: null, end: '17:00' });
    const valueChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    openDialogFrom('end');

    expect(dialogAction('done').disabled).toBe(false);
    dialogAction('done').click();
    expect(valueChange).toHaveBeenLastCalledWith({ start: null, end: '17:00' });
  });

  it('keeps Clear as a draft until Done and rolls changes back on Cancel, Escape, and backdrop', () => {
    const valueChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);

    openDialogFrom('end');
    dialogAction('clear').click();
    expect(valueChange).not.toHaveBeenCalled();
    expect(startInput().value).toBe('09:00');
    expect(endInput().value).toBe('17:00');
    dialogAction('done').click();
    expect(valueChange).toHaveBeenLastCalledWith({ start: null, end: null });

    valueChange.mockClear();
    for (const close of ['cancel', 'escape', 'backdrop'] as const) {
      openDialogFrom('end');
      dispatchKey(segmentedButton('hour'), 'ArrowUp');
      if (close === 'cancel') dialogAction('cancel').click();
      else if (close === 'escape') dispatchKey(calendarDialog(), 'Escape');
      else calendarDialog().dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();
      expect(valueChange).not.toHaveBeenCalled();
      expect(startInput().value).toBe('09:00');
      expect(endInput().value).toBe('17:00');
    }
  });

  it('supports controlled/CVA/touched/disabled/readonly and validity transitions', () => {
    const changed = jest.fn();
    const touched = jest.fn();
    const validity = jest.fn();
    fixture.componentInstance.registerOnChange(changed);
    fixture.componentInstance.registerOnTouched(touched);
    fixture.componentInstance.validityChange.subscribe(validity);
    fixture.componentRef.setInput('value', undefined);
    fixture.componentInstance.writeValue({ start: '10:00', end: null });
    fixture.detectChanges();
    setText(endInput(), '11:00');
    endInput().dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    fixture.detectChanges();
    expect(changed).toHaveBeenLastCalledWith({ start: '10:00', end: '11:00' });
    expect(touched).toHaveBeenCalled();

    fixture.componentRef.setInput('requirements', { start: true, end: true, paired: false });
    fixture.componentInstance.writeValue(EMPTY_TIME_RANGE);
    fixture.detectChanges();
    expect(validity).toHaveBeenLastCalledWith(false);

    fixture.componentRef.setInput('readonly', true);
    fixture.detectChanges();
    expect(startInput().readOnly).toBe(true);
    expect(startInput().disabled).toBe(false);
    expect(trigger().disabled).toBe(true);

    fixture.componentRef.setInput('readonly', false);
    fixture.componentRef.setInput('requirements', DEFAULT_RANGE_REQUIREMENTS);
    fixture.componentInstance.writeValue({ start: '10:00', end: '11:00' });
    fixture.detectChanges();
    openDialogFrom('end');
    fixture.componentInstance.setDisabledState(true);
    fixture.detectChanges();
    expect(calendarDialog().open).toBe(false);
    expect(startInput().disabled).toBe(true);
    expect(endInput().disabled).toBe(true);
    expect(trigger().disabled).toBe(true);
  });

  it('treats public null/malformed shapes as invalid but writeValue(null) as an empty reset', () => {
    expect(fixture.componentInstance.validate(new FormControl(null))).toEqual({
      timeRangeInvalid: { start: true, end: true },
    });
    expect(fixture.componentInstance.validate(new FormControl({ start: '09:00' }))).toEqual({
      timeRangeInvalid: { end: true },
    });

    fixture.componentRef.setInput('value', undefined);
    fixture.componentInstance.writeValue(null);
    fixture.detectChanges();
    expect(startInput().value).toBe('');
    expect(endInput().value).toBe('');
  });

  function setInputs(
    value: LocalizedTimeRange,
    overrides: Partial<{
      requirements: LocalizedRangeRequirements;
      min: string;
      max: string;
      timePickerMode: LocalizedTimePickerMode;
    }> = {},
  ): void {
    fixture.componentRef.setInput('inputId', 'time-range');
    fixture.componentRef.setInput('value', value);
    fixture.componentRef.setInput('controlSize', 'default');
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
    fixture.componentRef.setInput('timePickerMode', overrides.timePickerMode ?? 'auto');
    fixture.detectChanges();
  }

  function temporalField(): HTMLElement {
    return fixture.nativeElement.querySelector('[data-testid="temporal-picker-field"]')!;
  }

  function startInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('#time-range')!;
  }

  function endInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('#time-range-end')!;
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

  function segmentedText(boundary: 'start' | 'end' = 'start'): string {
    return (
      dialog().querySelector(`[data-time-boundary="${boundary}"] ds-segmented-time-input`)
        ?.textContent ?? ''
    );
  }

  function dialogStatus(): string {
    return dialog().querySelector('[data-testid="date-picker-status"]')?.textContent?.trim() ?? '';
  }

  function validationMessage(): string {
    return (
      fixture.nativeElement
        .querySelector('[data-testid="time-range-validation-message"]')
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

describe('LocalizedTimeRangePickerComponent server guard', () => {
  it('avoids browser-only validity calls and inline styles', async () => {
    await TestBed.configureTestingModule({
      imports: [LocalizedTimeRangePickerComponent],
      providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
    }).compileComponents();
    const fixture = TestBed.createComponent(LocalizedTimeRangePickerComponent);
    fixture.componentRef.setInput('inputId', 'server-time-range');
    fixture.componentRef.setInput('value', EMPTY_TIME_RANGE);
    fixture.componentRef.setInput('controlSize', 'default');
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
