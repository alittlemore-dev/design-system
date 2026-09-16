import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SegmentedTimeInputComponent } from './segmented-time-input.component';

describe('SegmentedTimeInputComponent', () => {
  let fixture: ComponentFixture<SegmentedTimeInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SegmentedTimeInputComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(SegmentedTimeInputComponent);
    setInputs(null);
  });

  afterEach(() => fixture.destroy());

  it('shows an empty time and does not emit after editing only one segment', () => {
    const changed = jest.fn();
    fixture.componentInstance.valueChange.subscribe(changed);

    expect(timeGroup().getAttribute('aria-label')).toBe('--:--');
    expect(hourSegment().textContent?.trim()).toBe('--');
    expect(minuteSegment().textContent?.trim()).toBe('--');

    press(hourSegment(), '1');

    expect(changed).not.toHaveBeenCalled();
    expect(timeGroup().getAttribute('aria-label')).toBe('01:--');
  });

  it('emits a canonical time after both empty segments are completed', () => {
    const changed = jest.fn();
    fixture.componentInstance.valueChange.subscribe(changed);

    press(hourSegment(), '1');
    press(minuteSegment(), '0');
    press(minuteSegment(), '5');

    expect(changed).toHaveBeenLastCalledWith('01:05');
  });

  it('renders separately focusable spinbuttons around a non-focusable colon', () => {
    const segments = fixture.nativeElement.querySelectorAll('[role="spinbutton"]');
    const colon = fixture.nativeElement.querySelector('[data-testid="segmented-time-colon"]');

    expect(segments).toHaveLength(2);
    expect(hourSegment().tabIndex).toBe(0);
    expect(minuteSegment().tabIndex).toBe(0);
    expect(colon.tabIndex).toBe(-1);
    expect(colon.getAttribute('tabindex')).toBeNull();
  });

  it('exposes labels, bounds, and the composed HH:mm value to assistive technology', () => {
    setInputs('09:30');

    expect(hourSegment().getAttribute('aria-label')).toBe('Hours');
    expect(hourSegment().getAttribute('aria-valuemin')).toBe('0');
    expect(hourSegment().getAttribute('aria-valuemax')).toBe('23');
    expect(hourSegment().getAttribute('aria-valuenow')).toBe('9');
    expect(minuteSegment().getAttribute('aria-label')).toBe('Minutes');
    expect(minuteSegment().getAttribute('aria-valuemin')).toBe('0');
    expect(minuteSegment().getAttribute('aria-valuemax')).toBe('59');
    expect(minuteSegment().getAttribute('aria-valuenow')).toBe('30');
    expect(timeGroup().getAttribute('aria-label')).toBe('09:30');
  });

  it('changes only the focused segment with arrow keys', () => {
    setInputs('12:34');
    const changed = jest.fn();
    fixture.componentInstance.valueChange.subscribe(changed);

    press(hourSegment(), 'ArrowUp');
    press(minuteSegment(), 'ArrowDown');

    expect(changed.mock.calls).toEqual([['13:34'], ['13:33']]);
  });

  it.each([
    ['23:30', 'hour', 'ArrowUp', '00:30'],
    ['00:30', 'hour', 'ArrowDown', '23:30'],
    ['12:59', 'minute', 'ArrowUp', '12:00'],
    ['12:00', 'minute', 'ArrowDown', '12:59'],
  ] as const)('wraps %s %s values with %s', (value, segment, key, expected) => {
    setInputs(value);
    const changed = jest.fn();
    fixture.componentInstance.valueChange.subscribe(changed);

    press(segment === 'hour' ? hourSegment() : minuteSegment(), key);

    expect(changed).toHaveBeenLastCalledWith(expected);
  });

  it('renders mouse-operable increment and decrement controls for both segments', () => {
    setInputs('09:30');

    expect(adjustButton('hour', 1).getAttribute('aria-label')).toBe('Hours +1');
    expect(adjustButton('hour', -1).getAttribute('aria-label')).toBe('Hours −1');
    expect(adjustButton('minute', 1).getAttribute('aria-label')).toBe('Minutes +1');
    expect(adjustButton('minute', -1).getAttribute('aria-label')).toBe('Minutes −1');
  });

  it('changes and wraps hour and minute values from mouse clicks', () => {
    setInputs('23:00');
    const changed = jest.fn();
    fixture.componentInstance.valueChange.subscribe(changed);

    adjustButton('hour', 1).click();
    fixture.detectChanges();
    adjustButton('minute', -1).click();
    fixture.detectChanges();

    expect(changed.mock.calls).toEqual([['00:00'], ['00:59']]);
  });

  it.each(['disabled', 'readonly'] as const)('prevents mouse adjustment when %s', (state) => {
    setInputs('12:34');
    fixture.componentRef.setInput(state, true);
    fixture.detectChanges();
    const changed = jest.fn();
    fixture.componentInstance.valueChange.subscribe(changed);

    expect(adjustButton('hour', 1).disabled).toBe(true);
    adjustButton('hour', 1).click();

    expect(timeGroup().getAttribute('aria-label')).toBe('12:34');
    expect(changed).not.toHaveBeenCalled();
  });

  it('replaces the active segment after two numeric key presses', () => {
    setInputs('12:34');
    const changed = jest.fn();
    fixture.componentInstance.valueChange.subscribe(changed);

    press(hourSegment(), '0');
    press(hourSegment(), '9');

    expect(hourSegment().textContent?.trim()).toBe('09');
    expect(changed).toHaveBeenLastCalledWith('09:34');
  });

  it('ignores invalid and non-numeric keys without emitting', () => {
    setInputs('12:34');
    const changed = jest.fn();
    fixture.componentInstance.valueChange.subscribe(changed);

    press(hourSegment(), 'a');
    press(hourSegment(), '2');
    press(hourSegment(), '9');

    expect(changed).not.toHaveBeenCalled();
    expect(hourSegment().textContent?.trim()).toBe('12');
  });

  it('requests confirmation only after the composed time is valid', () => {
    const confirmed = jest.fn();
    fixture.componentInstance.confirmRequested.subscribe(confirmed);

    press(hourSegment(), '1');
    press(hourSegment(), 'Enter');
    press(minuteSegment(), '0');
    press(minuteSegment(), '5');
    press(minuteSegment(), 'Enter');

    expect(confirmed).toHaveBeenCalledTimes(1);
  });

  it('finalizes a pending digit on blur and emits the displayed composed value', () => {
    setInputs('09:30');
    const changed = jest.fn();
    fixture.componentInstance.valueChange.subscribe(changed);

    hourSegment().focus();
    press(hourSegment(), '1');
    hourSegment().dispatchEvent(new FocusEvent('blur', { bubbles: true, relatedTarget: null }));
    fixture.detectChanges();

    expect(timeGroup().getAttribute('aria-label')).toBe('01:30');
    expect(changed).toHaveBeenLastCalledWith('01:30');
  });

  it('emits a pending displayed value before Enter requests confirmation', () => {
    setInputs('09:30');
    const events: string[] = [];
    fixture.componentInstance.valueChange.subscribe((value) => events.push(`value:${value}`));
    fixture.componentInstance.confirmRequested.subscribe(() => events.push('confirm'));

    press(hourSegment(), '1');
    press(hourSegment(), 'Enter');

    expect(events).toEqual(['value:01:30', 'confirm']);
  });

  it.each(['disabled', 'readonly'] as const)('prevents mutation when %s', (state) => {
    setInputs('12:34');
    fixture.componentRef.setInput(state, true);
    fixture.detectChanges();
    const changed = jest.fn();
    fixture.componentInstance.valueChange.subscribe(changed);

    press(hourSegment(), 'ArrowUp');
    press(hourSegment(), '0');
    press(hourSegment(), '9');

    expect(timeGroup().getAttribute('aria-label')).toBe('12:34');
    expect(changed).not.toHaveBeenCalled();
  });

  it('uses CSS classes and attributes instead of inline styles', () => {
    expect(fixture.nativeElement.querySelectorAll('[style]')).toHaveLength(0);
  });

  function setInputs(value: string | null): void {
    fixture.componentRef.setInput('value', value);
    fixture.componentRef.setInput('disabled', false);
    fixture.componentRef.setInput('readonly', false);
    fixture.componentRef.setInput('hourLabel', 'Hours');
    fixture.componentRef.setInput('minuteLabel', 'Minutes');
    fixture.detectChanges();
  }

  function timeGroup(): HTMLElement {
    return fixture.nativeElement.querySelector(
      '[data-testid="segmented-time-input"]',
    ) as HTMLElement;
  }

  function hourSegment(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('[data-segment="hour"]') as HTMLButtonElement;
  }

  function minuteSegment(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('[data-segment="minute"]') as HTMLButtonElement;
  }

  function adjustButton(segment: 'hour' | 'minute', change: 1 | -1): HTMLButtonElement {
    return fixture.nativeElement.querySelector(
      `[data-adjust-segment="${segment}"][data-adjust="${change}"]`,
    ) as HTMLButtonElement;
  }

  function press(element: HTMLElement, key: string): void {
    element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    fixture.detectChanges();
  }
});
