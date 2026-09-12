import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  TemporalFieldEndpointEvent,
  TemporalPickerFieldComponent,
} from './temporal-picker-field.component';

describe('TemporalPickerFieldComponent', () => {
  let fixture: ComponentFixture<TemporalPickerFieldComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TemporalPickerFieldComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TemporalPickerFieldComponent);
    setInputs();
  });

  afterEach(() => fixture.destroy());

  it('renders a range as two text inputs in one shell with one trigger', () => {
    fixture.componentRef.setInput('range', true);
    fixture.detectChanges();

    expect(inputs()).toHaveLength(2);
    expect(trigger()).not.toBeNull();
    expect(shell().contains(inputs()[0])).toBe(true);
    expect(shell().contains(inputs()[1])).toBe(true);
  });

  it('keeps a datetime range to two text inputs', () => {
    fixture.componentRef.setInput('range', true);
    fixture.componentRef.setInput('groupLabel', 'Date and time range');
    fixture.componentRef.setInput('iconKind', 'calendar');
    fixture.detectChanges();

    expect(inputs()).toHaveLength(2);
    expect(trigger().querySelector('svg')).not.toBeNull();
  });

  it('assigns the provided id to the single/start input and derives the end id', () => {
    fixture.componentRef.setInput('range', true);
    fixture.componentRef.setInput('inputId', 'availability');
    fixture.detectChanges();

    expect(startInput().id).toBe('availability');
    expect(endInput().id).toBe('availability-end');
  });

  it('renders an aria-hidden, non-focusable en dash only for ranges', () => {
    fixture.componentRef.setInput('range', true);
    fixture.detectChanges();

    const separator = fixture.nativeElement.querySelector(
      '[data-testid="temporal-picker-field-separator"]',
    ) as HTMLElement;

    expect(separator.textContent).toBe('–');
    expect(separator.getAttribute('aria-hidden')).toBe('true');
    expect(separator.getAttribute('contenteditable')).toBeNull();
    expect(separator.getAttribute('tabindex')).toBeNull();
    expect(separator.tabIndex).toBe(-1);
    expect(
      fixture.nativeElement.querySelectorAll('[data-testid="temporal-picker-field-separator"]'),
    ).toHaveLength(1);
  });

  it('exposes the group and endpoint labels independently', () => {
    fixture.componentRef.setInput('range', true);
    fixture.componentRef.setInput('triggerLabel', 'Open booking dates');
    fixture.detectChanges();

    expect(shell().getAttribute('role')).toBe('group');
    expect(shell().getAttribute('aria-label')).toBe('Booking dates');
    expect(startInput().getAttribute('aria-label')).toBe('Start date');
    expect(endInput().getAttribute('aria-label')).toBe('End date');
    expect(trigger().getAttribute('aria-label')).toBe('Open booking dates');
  });

  it('marks only the active endpoint', () => {
    fixture.componentRef.setInput('range', true);
    fixture.componentRef.setInput('activeBoundary', 'end');
    fixture.detectChanges();

    expect(startInput().parentElement?.classList).not.toContain(
      'temporal-picker-field-endpoint-active',
    );
    expect(endInput().parentElement?.classList).toContain('temporal-picker-field-endpoint-active');
  });

  it('exposes endpoint invalidity independently', () => {
    fixture.componentRef.setInput('range', true);
    fixture.componentRef.setInput('startInvalid', true);
    fixture.componentRef.setInput('endInvalid', false);
    fixture.detectChanges();

    expect(startInput().getAttribute('aria-invalid')).toBe('true');
    expect(endInput().getAttribute('aria-invalid')).toBeNull();

    fixture.componentRef.setInput('startInvalid', false);
    fixture.componentRef.setInput('endInvalid', true);
    fixture.detectChanges();

    expect(startInput().getAttribute('aria-invalid')).toBeNull();
    expect(endInput().getAttribute('aria-invalid')).toBe('true');
  });

  it('exposes native and accessible required state independently per endpoint', () => {
    fixture.componentRef.setInput('range', true);
    fixture.componentRef.setInput('startRequired', true);
    fixture.componentRef.setInput('endRequired', false);
    fixture.detectChanges();

    expect(startInput().required).toBe(true);
    expect(startInput().getAttribute('aria-required')).toBe('true');
    expect(endInput().required).toBe(false);
    expect(endInput().getAttribute('aria-required')).toBeNull();

    fixture.componentRef.setInput('startRequired', false);
    fixture.componentRef.setInput('endRequired', true);
    fixture.detectChanges();

    expect(startInput().required).toBe(false);
    expect(startInput().getAttribute('aria-required')).toBeNull();
    expect(endInput().required).toBe(true);
    expect(endInput().getAttribute('aria-required')).toBe('true');
  });

  it('shows an endpoint-scoped invalid indicator without styling the other endpoint', () => {
    fixture.componentRef.setInput('range', true);
    fixture.componentRef.setInput('startInvalid', true);
    fixture.detectChanges();

    expect(startInput().parentElement?.getAttribute('data-invalid')).toBe('true');
    expect(endInput().parentElement?.getAttribute('data-invalid')).toBeNull();
  });

  it('emits the boundary and current text for input, blur, Enter, and Escape', () => {
    fixture.componentRef.setInput('range', true);
    fixture.detectChanges();
    const inputEvents: TemporalFieldEndpointEvent[] = [];
    const blurEvents: TemporalFieldEndpointEvent[] = [];
    const enterEvents: TemporalFieldEndpointEvent[] = [];
    const escapeEvents: TemporalFieldEndpointEvent[] = [];
    fixture.componentInstance.endpointInput.subscribe((event) => inputEvents.push(event));
    fixture.componentInstance.endpointBlur.subscribe((event) => blurEvents.push(event));
    fixture.componentInstance.endpointEnter.subscribe((event) => enterEvents.push(event));
    fixture.componentInstance.endpointEscape.subscribe((event) => escapeEvents.push(event));

    endInput().value = '14/02/2026';
    endInput().dispatchEvent(new Event('input', { bubbles: true }));
    endInput().dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    endInput().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    endInput().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(inputEvents).toEqual([{ boundary: 'end', text: '14/02/2026' }]);
    expect(blurEvents).toEqual([{ boundary: 'end', text: '14/02/2026' }]);
    expect(enterEvents).toEqual([{ boundary: 'end', text: '14/02/2026' }]);
    expect(escapeEvents).toEqual([{ boundary: 'end', text: '14/02/2026' }]);
  });

  it('identifies endpoint activation and trigger activation boundaries', () => {
    fixture.componentRef.setInput('range', true);
    fixture.componentRef.setInput('activeBoundary', 'end');
    fixture.detectChanges();
    const endpoints: string[] = [];
    const triggers: string[] = [];
    fixture.componentInstance.endpointActivated.subscribe((boundary) => endpoints.push(boundary));
    fixture.componentInstance.triggerActivated.subscribe((boundary) => triggers.push(boundary));

    startInput().dispatchEvent(new FocusEvent('focus', { bubbles: true }));
    endInput().click();
    trigger().click();

    expect(endpoints).toEqual(['start', 'end']);
    expect(triggers).toEqual(['end']);
  });

  it('keeps readonly inputs focusable and blocks trigger activation', () => {
    fixture.componentRef.setInput('readonly', true);
    fixture.detectChanges();
    const triggers: string[] = [];
    fixture.componentInstance.triggerActivated.subscribe((boundary) => triggers.push(boundary));

    startInput().focus();
    trigger().click();

    expect(document.activeElement).toBe(startInput());
    expect(startInput().readOnly).toBe(true);
    expect(startInput().disabled).toBe(false);
    expect(trigger().disabled).toBe(true);
    expect(triggers).toEqual([]);
  });

  it('disables both endpoint inputs and the trigger', () => {
    fixture.componentRef.setInput('range', true);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    expect(startInput().disabled).toBe(true);
    expect(endInput().disabled).toBe(true);
    expect(trigger().disabled).toBe(true);
  });

  it('applies Bootstrap compact classes to the endpoint and trigger', () => {
    fixture.componentRef.setInput('controlSize', 'small');
    fixture.detectChanges();

    expect(startInput().classList).toContain('form-control-sm');
    expect(trigger().classList).toContain('btn-sm');
  });

  it('uses an SVG icon for calendar and clock triggers without emoji', () => {
    fixture.componentRef.setInput('iconKind', 'clock');
    fixture.detectChanges();

    expect(trigger().querySelector('svg[aria-hidden="true"]')).not.toBeNull();
    expect(trigger().textContent).not.toMatch(/[📅🕐🕑🕒🕓🕔🕕🕖🕗🕘🕙🕚🕛]/u);
  });

  it('renders no hidden transport input, native name attributes, or inline styles', () => {
    fixture.componentRef.setInput('range', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('input[type="hidden"]')).toHaveLength(0);
    expect(fixture.nativeElement.querySelectorAll('input[name]')).toHaveLength(0);
    expect(fixture.nativeElement.querySelectorAll('[style]')).toHaveLength(0);
  });

  function setInputs(): void {
    fixture.componentRef.setInput('range', false);
    fixture.componentRef.setInput('inputId', 'booking');
    fixture.componentRef.setInput('startText', '10/02/2026');
    fixture.componentRef.setInput('endText', '12/02/2026');
    fixture.componentRef.setInput('groupLabel', 'Booking dates');
    fixture.componentRef.setInput('triggerLabel', 'Open booking dates');
    fixture.componentRef.setInput('startLabel', 'Start date');
    fixture.componentRef.setInput('endLabel', 'End date');
    fixture.componentRef.setInput('accessibleSeparator', 'to');
    fixture.componentRef.setInput('activeBoundary', 'single');
    fixture.componentRef.setInput('startInvalid', false);
    fixture.componentRef.setInput('endInvalid', false);
    fixture.componentRef.setInput('startRequired', false);
    fixture.componentRef.setInput('endRequired', false);
    fixture.componentRef.setInput('controlSize', 'default');
    fixture.componentRef.setInput('disabled', false);
    fixture.componentRef.setInput('readonly', false);
    fixture.componentRef.setInput('startDescribedBy', 'start-hint');
    fixture.componentRef.setInput('endDescribedBy', 'end-hint');
    fixture.componentRef.setInput('startErrorId', 'start-error');
    fixture.componentRef.setInput('endErrorId', 'end-error');
    fixture.componentRef.setInput('placeholder', 'dd/mm/yyyy');
    fixture.componentRef.setInput('iconKind', 'calendar');
    fixture.componentRef.setInput('expanded', false);
    fixture.componentRef.setInput('dialogId', 'booking-dialog');
    fixture.detectChanges();
  }

  function shell(): HTMLElement {
    return fixture.nativeElement.querySelector(
      '[data-testid="temporal-picker-field"]',
    ) as HTMLElement;
  }

  function inputs(): HTMLInputElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('input[type="text"]'));
  }

  function startInput(): HTMLInputElement {
    return inputs()[0];
  }

  function endInput(): HTMLInputElement {
    return inputs()[1];
  }

  function trigger(): HTMLButtonElement {
    return fixture.nativeElement.querySelector(
      '[data-testid="temporal-picker-field-trigger"]',
    ) as HTMLButtonElement;
  }
});
