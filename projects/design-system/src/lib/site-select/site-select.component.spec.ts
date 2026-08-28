import { PLATFORM_ID, Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { compile } from 'sass';
import { SiteSelectComponent, SiteSelectOption } from './site-select.component';

declare const __dirname: string;

const OPTIONS: readonly SiteSelectOption[] = [
  { value: '', label: 'Not set' },
  { value: 'alpha', label: 'Alpha' },
  { value: 'beta', label: 'Beta' },
  { value: 'bravo', label: 'Bravo' },
  { value: 'charlie', label: 'Charlie' },
];

describe('SiteSelectComponent', () => {
  let fixture: ComponentFixture<SiteSelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SiteSelectComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SiteSelectComponent);
    fixture.componentRef.setInput('inputId', 'example-select');
    fixture.componentRef.setInput('options', OPTIONS);
    fixture.componentRef.setInput('value', 'alpha');
    fixture.componentRef.setInput('controlSize', 'default');
    fixture.componentRef.setInput('appearance', 'default');
    fixture.componentRef.setInput('required', false);
    fixture.componentRef.setInput('invalid', false);
    fixture.componentRef.setInput('controlDisabled', false);
    fixture.componentRef.setInput('testId', 'example');
    fixture.detectChanges();
    installPopoverMethods(listbox());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the selected label and complete select-only combobox semantics', () => {
    const control = trigger();
    const popup = listbox();

    expect(control.textContent).toContain('Alpha');
    expect(control.getAttribute('role')).toBe('combobox');
    expect(control.getAttribute('aria-haspopup')).toBe('listbox');
    expect(control.getAttribute('aria-controls')).toBe(popup.id);
    expect(popup.id).toBe('example-select-listbox');
    expect(control.getAttribute('aria-expanded')).toBe('false');
    expect(control.getAttribute('aria-required')).toBeNull();
    expect(control.getAttribute('aria-invalid')).toBeNull();
    expect(popup.getAttribute('role')).toBe('listbox');
    expect(optionValues()).toEqual(['', 'alpha', 'beta', 'bravo', 'charlie']);
  });

  it('uses no inline styles in the trigger and listbox subtree', () => {
    expect(fixture.nativeElement.querySelector('[style]')).toBeNull();
  });

  it('keeps the popover usable without anchor positioning and gates the anchor enhancement', () => {
    const styles = componentStyles();
    const baseRule = extractCssBlock(styles, '.site-select-listbox[popover]');

    expect(baseRule).toMatch(/box-sizing:\s*border-box/);
    expect(baseRule).toMatch(/position:\s*fixed/);
    expect(baseRule).toMatch(/inset:\s*0/);
    expect(baseRule).toMatch(/margin:\s*auto/);
    expect(baseRule).toMatch(/min-inline-size:\s*min\(12rem,\s*(?:calc\()?100vw - 1rem\)?\)/);
    expect(baseRule).toMatch(/max-inline-size:\s*calc\(100vw - 1rem\)/);
    expect(baseRule).toMatch(/max-block-size:\s*min\(20rem,\s*(?:calc\()?100dvh - 1rem\)?\)/);
    expect(baseRule).not.toMatch(/anchor-size|position-area|position-try-fallbacks/);

    const anchorEnhancement = extractCssBlock(styles, '@supports (position-area: block-end)');
    expect(anchorEnhancement).toMatch(
      /@supports \(position-area:\s*block-end\) and \(min-inline-size:\s*anchor-size\(width\)\)/,
    );
    expect(anchorEnhancement).toMatch(/inset:\s*auto/);
    expect(anchorEnhancement).toMatch(/margin:\s*0\.25rem 0/);
    expect(anchorEnhancement).toMatch(/min-inline-size:[^;]*anchor-size\(width\)/);
    expect(anchorEnhancement).toMatch(/position-area:\s*block-end span-inline-start/);
    expect(anchorEnhancement).toMatch(/position-try-fallbacks:/);
  });

  it('notifies a directly registered validator callback when required changes', () => {
    const validatorChange = jest.fn();
    fixture.componentInstance.registerOnValidatorChange(validatorChange);

    fixture.componentRef.setInput('required', true);
    fixture.detectChanges();

    expect(validatorChange).toHaveBeenCalledTimes(1);
  });

  it('opens without changing the value and exposes the active option', () => {
    const valueChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);

    dispatchKey(trigger(), 'ArrowDown');

    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(trigger().getAttribute('aria-activedescendant')).toBe(option('alpha').id);
    expect(option('alpha').getAttribute('aria-selected')).toBe('true');
    expect(valueChange).not.toHaveBeenCalled();
  });

  it('navigates without committing and accepts the active option with Enter', () => {
    const valueChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    dispatchKey(trigger(), 'ArrowDown');

    dispatchKey(trigger(), 'ArrowDown');
    expect(trigger().textContent).toContain('Alpha');
    expect(trigger().getAttribute('aria-activedescendant')).toBe(option('beta').id);
    expect(valueChange).not.toHaveBeenCalled();

    dispatchKey(trigger(), 'Enter');
    expect(valueChange).toHaveBeenCalledWith('beta');
    expect(trigger().textContent).toContain('Alpha');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger());
  });

  it('keeps aria-selected on the committed option while navigation previews another option', () => {
    dispatchKey(trigger(), 'ArrowDown');
    dispatchKey(trigger(), 'ArrowDown');

    expect(option('alpha').getAttribute('aria-selected')).toBe('true');
    expect(option('beta').getAttribute('aria-selected')).toBe('false');
    expect(option('beta').classList).toContain('site-select-option-active');
    expect(option('alpha').classList).toContain('site-select-option-committed');
  });

  it('cancels keyboard navigation with Escape', () => {
    const valueChange = jest.fn();
    const parentKeydown = jest.fn();
    const parentKeyup = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    fixture.nativeElement.addEventListener('keydown', parentKeydown);
    fixture.nativeElement.addEventListener('keyup', parentKeyup);
    dispatchKey(trigger(), 'ArrowDown');
    dispatchKey(trigger(), 'End');
    parentKeydown.mockClear();

    dispatchKey(trigger(), 'Escape');
    trigger().dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', bubbles: true }));

    expect(valueChange).not.toHaveBeenCalled();
    expect(trigger().textContent).toContain('Alpha');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(parentKeydown).not.toHaveBeenCalled();
    expect(parentKeyup).not.toHaveBeenCalled();
  });

  it('supports Home, End, PageUp, PageDown and locale-aware typeahead', () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1_000);

    dispatchKey(trigger(), 'End');
    expect(activeValue()).toBe('charlie');

    dispatchKey(trigger(), 'Home');
    expect(activeValue()).toBe('');

    dispatchKey(trigger(), 'PageDown');
    expect(activeValue()).toBe('charlie');

    dispatchKey(trigger(), 'PageUp');
    expect(activeValue()).toBe('');

    dispatchKey(trigger(), 'b');
    expect(activeValue()).toBe('beta');

    now.mockReturnValue(1_100);
    dispatchKey(trigger(), 'r');
    expect(activeValue()).toBe('bravo');

    now.mockReturnValue(1_800);
    dispatchKey(trigger(), 'b');
    expect(activeValue()).toBe('beta');

    now.mockReturnValue(1_900);
    dispatchKey(trigger(), 'b');
    expect(activeValue()).toBe('bravo');

    now.mockRestore();
  });

  it('commits on Tab without preventing normal focus traversal', () => {
    const valueChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    dispatchKey(trigger(), 'ArrowDown');
    dispatchKey(trigger(), 'ArrowDown');
    const event = dispatchKey(trigger(), 'Tab');

    expect(valueChange).toHaveBeenCalledWith('beta');
    expect(event.defaultPrevented).toBe(false);
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it.each([
    ['Space', ' '],
    ['Alt+ArrowUp', 'ArrowUp'],
  ])('commits the active option with %s', (_name, key) => {
    const valueChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    dispatchKey(trigger(), 'ArrowDown');
    dispatchKey(trigger(), 'ArrowDown');
    const event = new KeyboardEvent('keydown', {
      key,
      altKey: key === 'ArrowUp',
      bubbles: true,
      cancelable: true,
    });
    trigger().dispatchEvent(event);
    fixture.detectChanges();

    expect(valueChange).toHaveBeenCalledWith('beta');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('commits an option clicked with the pointer', () => {
    const valueChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    trigger().click();
    fixture.detectChanges();

    option('charlie').click();
    fixture.detectChanges();

    expect(valueChange).toHaveBeenCalledWith('charlie');
    expect(trigger().textContent).toContain('Alpha');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('renders compact, bordered, invalid, required and disabled states', () => {
    fixture.componentRef.setInput('controlSize', 'small');
    fixture.componentRef.setInput('appearance', 'bordered');
    fixture.componentRef.setInput('required', true);
    fixture.componentRef.setInput('invalid', true);
    fixture.componentRef.setInput('controlDisabled', true);
    fixture.componentRef.setInput('ariaDescribedBy', 'example-error');
    fixture.detectChanges();

    expect(trigger().classList).toContain('site-select-trigger-small');
    expect(trigger().classList).toContain('site-select-trigger-bordered');
    expect(trigger().classList).toContain('is-invalid');
    expect(trigger().getAttribute('aria-required')).toBe('true');
    expect(trigger().getAttribute('aria-invalid')).toBe('true');
    expect(trigger().getAttribute('aria-describedby')).toBe('example-error');
    expect(trigger().disabled).toBe(true);

    trigger().click();
    fixture.detectChanges();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('keeps external value and option updates synchronized', () => {
    fixture.componentRef.setInput('value', 'beta');
    fixture.detectChanges();
    expect(trigger().textContent).toContain('Beta');

    fixture.componentRef.setInput('options', [
      { value: '', label: 'Not set' },
      { value: 'delta', label: 'Delta' },
    ]);
    fixture.detectChanges();
    expect(trigger().textContent?.trim()).toBe('');
  });

  it('reconciles an open active option after external value and option changes', () => {
    const valueChange = jest.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    dispatchKey(trigger(), 'ArrowDown');
    fixture.componentRef.setInput('value', 'charlie');
    fixture.detectChanges();
    expect(activeValue()).toBe('charlie');

    fixture.componentRef.setInput('options', [{ value: 'delta', label: 'Delta' }]);
    fixture.detectChanges();
    expect(trigger().getAttribute('aria-activedescendant')).toBe(option('delta').id);

    dispatchKey(trigger(), 'Enter');
    expect(valueChange).toHaveBeenCalledWith('delta');
  });

  it('closes when the controlDisabled input changes while open', () => {
    dispatchKey(trigger(), 'ArrowDown');
    expect(trigger().getAttribute('aria-expanded')).toBe('true');

    fixture.componentRef.setInput('controlDisabled', true);
    fixture.detectChanges();

    expect(trigger().disabled).toBe(true);
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('does not expose a native popover target or open for empty options', () => {
    fixture.componentRef.setInput('options', []);
    fixture.detectChanges();

    expect(trigger().getAttribute('popovertarget')).toBeNull();
    trigger().click();
    fixture.detectChanges();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('follows dispatched popover open and light-dismiss toggle events without touching', () => {
    const touched = jest.fn();
    fixture.componentInstance.registerOnTouched(touched);
    const popup = listbox();
    popup.showPopover();
    fixture.detectChanges();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');

    popup.hidePopover();
    fixture.detectChanges();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(touched).not.toHaveBeenCalled();
  });

  function trigger(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('#example-select') as HTMLButtonElement;
  }

  function listbox(): HTMLElement {
    return fixture.nativeElement.querySelector('[data-testid="example-listbox"]') as HTMLElement;
  }

  function option(value: string): HTMLElement {
    const element = [...listbox().querySelectorAll<HTMLElement>('[role="option"]')].find(
      (candidate) => candidate.dataset['value'] === value,
    );
    expect(element).toBeDefined();
    return element!;
  }

  function optionValues(): string[] {
    return [...listbox().querySelectorAll<HTMLElement>('[role="option"]')].map(
      (element) => element.dataset['value'] ?? '',
    );
  }

  function activeValue(): string {
    const activeId = trigger().getAttribute('aria-activedescendant');
    const active = activeId ? listbox().querySelector<HTMLElement>(`#${activeId}`) : null;
    return active?.dataset['value'] ?? '';
  }

  function dispatchKey(element: HTMLElement, key: string): KeyboardEvent {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    element.dispatchEvent(event);
    fixture.detectChanges();
    return event;
  }
});

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, SiteSelectComponent],
  template: `
    <ds-site-select
      inputId="form-select"
      [options]="options"
      controlSize="default"
      appearance="default"
      [required]="required()"
      [invalid]="control.invalid && control.touched"
      [controlDisabled]="false"
      [formControl]="control"
    />
  `,
})
class SiteSelectFormHostComponent {
  readonly options = OPTIONS;
  readonly control = new FormControl('', { nonNullable: true });
  readonly required = signal(true);
}

describe('SiteSelectComponent with Angular Forms', () => {
  it('bridges values, disabled state, touched state and required validation', async () => {
    await TestBed.configureTestingModule({
      imports: [SiteSelectFormHostComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(SiteSelectFormHostComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('ds-site-select') as HTMLElement;
    const trigger = host.querySelector('#form-select') as HTMLButtonElement;
    const popup = host.querySelector('[role="listbox"]') as HTMLElement;
    installPopoverMethods(popup);

    expect(fixture.componentInstance.control.hasError('required')).toBe(true);
    trigger.click();
    fixture.detectChanges();
    const beta = [...popup.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (element) => element.dataset['value'] === 'beta',
    );
    beta?.click();
    fixture.detectChanges();
    trigger.dispatchEvent(new FocusEvent('blur'));
    fixture.detectChanges();

    expect(fixture.componentInstance.control.value).toBe('beta');
    expect(fixture.componentInstance.control.touched).toBe(true);
    expect(fixture.componentInstance.control.valid).toBe(true);

    fixture.componentInstance.control.disable();
    fixture.detectChanges();
    expect(trigger.disabled).toBe(true);

    fixture.componentInstance.control.enable();
    fixture.componentInstance.control.setValue('alpha');
    fixture.detectChanges();
    expect(trigger.textContent).toContain('Alpha');
  });

  it('reacts to a runtime required input change through the component validator', async () => {
    await TestBed.configureTestingModule({
      imports: [SiteSelectFormHostComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(SiteSelectFormHostComponent);
    fixture.componentInstance.required.set(false);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.control.hasError('required')).toBe(false);

    fixture.componentInstance.required.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.control.hasError('required')).toBe(true);
  });

  it('marks touched on trigger blur, not Escape, viewport dismissal, or disabled close', async () => {
    await TestBed.configureTestingModule({
      imports: [SiteSelectFormHostComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(SiteSelectFormHostComponent);
    fixture.detectChanges();
    const trigger = fixture.nativeElement.querySelector('#form-select') as HTMLButtonElement;
    const popup = fixture.nativeElement.querySelector('[role="listbox"]') as HTMLElement;
    installPopoverMethods(popup);

    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.control.touched).toBe(false);

    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    window.dispatchEvent(new Event('resize'));
    fixture.detectChanges();
    expect(fixture.componentInstance.control.touched).toBe(false);

    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.componentInstance.control.disable();
    fixture.detectChanges();
    expect(fixture.componentInstance.control.touched).toBe(false);

    fixture.componentInstance.control.enable();
    trigger.dispatchEvent(new FocusEvent('blur'));
    fixture.detectChanges();
    expect(fixture.componentInstance.control.touched).toBe(true);
  });
});

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, SiteSelectComponent],
  template: `
    <ds-site-select
      inputId="controlled-select"
      [options]="options"
      [value]="value()"
      controlSize="default"
      appearance="default"
      [required]="false"
      [invalid]="false"
      [controlDisabled]="false"
      [formControl]="control"
    />
  `,
})
class ControlledSiteSelectFormHostComponent {
  readonly options = OPTIONS;
  readonly control = new FormControl('alpha', { nonNullable: true });
  readonly value = signal('alpha');
}

describe('SiteSelectComponent with a controlled value input', () => {
  it('keeps the supplied value authoritative until the parent accepts a selection', async () => {
    await TestBed.configureTestingModule({
      imports: [ControlledSiteSelectFormHostComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(ControlledSiteSelectFormHostComponent);
    fixture.detectChanges();
    const trigger = fixture.nativeElement.querySelector('#controlled-select') as HTMLButtonElement;
    const popup = fixture.nativeElement.querySelector('[role="listbox"]') as HTMLElement;
    installPopoverMethods(popup);

    trigger.click();
    fixture.detectChanges();
    const beta = [...popup.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (element) => element.dataset['value'] === 'beta',
    );
    beta?.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.control.value).toBe('beta');
    expect(trigger.textContent).toContain('Alpha');

    fixture.componentInstance.control.setValue('charlie');
    fixture.detectChanges();
    expect(trigger.textContent).toContain('Alpha');

    fixture.componentInstance.value.set('beta');
    fixture.detectChanges();
    expect(trigger.textContent).toContain('Beta');
  });
});

describe('SiteSelectComponent server-platform browser guard fixture', () => {
  it('renders without accessing browser-only popover APIs', async () => {
    await TestBed.configureTestingModule({
      imports: [SiteSelectComponent],
      providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
    }).compileComponents();
    const fixture = TestBed.createComponent(SiteSelectComponent);
    fixture.componentRef.setInput('inputId', 'server-select');
    fixture.componentRef.setInput('options', OPTIONS);
    fixture.componentRef.setInput('value', 'alpha');
    fixture.componentRef.setInput('controlSize', 'default');
    fixture.componentRef.setInput('appearance', 'default');
    fixture.componentRef.setInput('required', false);
    fixture.componentRef.setInput('invalid', false);
    fixture.componentRef.setInput('controlDisabled', false);

    expect(() => fixture.detectChanges()).not.toThrow();
    expect(fixture.nativeElement.querySelector('#server-select').textContent).toContain('Alpha');

    const component = fixture.componentInstance;
    const trigger = fixture.nativeElement.querySelector('#server-select') as HTMLButtonElement;
    const popup = fixture.nativeElement.querySelector('[role="listbox"]') as HTMLElement;
    Object.defineProperty(trigger, 'focus', {
      configurable: true,
      value: () => {
        throw new Error('focus');
      },
    });
    Object.defineProperty(trigger, 'scrollIntoView', {
      configurable: true,
      value: () => {
        throw new Error('scroll');
      },
    });
    Object.defineProperty(popup, 'hidePopover', {
      configurable: true,
      value: () => {
        throw new Error('hide');
      },
    });

    expect(() => {
      component.focus({ preventScroll: true });
      component.scrollIntoView({ block: 'nearest' });
      (component as unknown as { closeList(restoreFocus: boolean): void }).closeList(true);
    }).not.toThrow();
  });
});

function installPopoverMethods(popover: HTMLElement): void {
  Object.defineProperty(popover, 'showPopover', {
    configurable: true,
    value: (): void => {
      popover.setAttribute('data-popover-open', '');
      dispatchPopoverToggle(popover, 'open');
    },
  });
  Object.defineProperty(popover, 'hidePopover', {
    configurable: true,
    value: (): void => {
      popover.removeAttribute('data-popover-open');
      dispatchPopoverToggle(popover, 'closed');
    },
  });
}

function dispatchPopoverToggle(popover: HTMLElement, newState: 'open' | 'closed'): void {
  const event = new Event('toggle');
  Object.defineProperty(event, 'newState', { value: newState });
  popover.dispatchEvent(event);
}

function componentStyles(): string {
  return compile(`${__dirname}/site-select.component.scss`).css;
}

function extractCssBlock(styles: string, marker: string): string {
  const markerIndex = styles.indexOf(marker);
  expect(markerIndex).toBeGreaterThanOrEqual(0);
  const blockStart = styles.indexOf('{', markerIndex);
  expect(blockStart).toBeGreaterThan(markerIndex);
  let depth = 0;
  for (let index = blockStart; index < styles.length; index += 1) {
    if (styles[index] === '{') depth += 1;
    if (styles[index] === '}') depth -= 1;
    if (depth === 0) return styles.slice(markerIndex, index + 1);
  }
  throw new Error(`Unclosed CSS block for ${marker}`);
}
