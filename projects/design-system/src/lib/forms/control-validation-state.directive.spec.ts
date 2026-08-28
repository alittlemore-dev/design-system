import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { ControlValidationStateDirective } from './control-validation-state.directive';

@Component({
  selector: 'ds-control-validation-state-test-host',
  standalone: true,
  imports: [ControlValidationStateDirective, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formGroup]="form">
      <input data-testid="input" formControlName="input" />
      <textarea data-testid="textarea" formControlName="textarea"></textarea>
      <select data-testid="select" formControlName="select">
        <option value="">Choose one</option>
      </select>
    </form>
  `,
})
class ControlValidationStateTestHostComponent {
  readonly form = new FormGroup({
    input: new FormControl('', { nonNullable: true, validators: Validators.required }),
    textarea: new FormControl('', { nonNullable: true, validators: Validators.required }),
    select: new FormControl('', { nonNullable: true, validators: Validators.required }),
  });
}

describe('ControlValidationStateDirective', () => {
  let fixture: ComponentFixture<ControlValidationStateTestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ControlValidationStateTestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ControlValidationStateTestHostComponent);
    fixture.detectChanges();
  });

  it('keeps invalid untouched controls visually neutral', () => {
    expect(fixture.componentInstance.form.controls.input.invalid).toBe(true);
    expect(fixture.componentInstance.form.controls.input.touched).toBe(false);
    expect(element('input').classList).not.toContain('is-invalid');
    expect(element('input').getAttribute('aria-invalid')).toBeNull();
  });

  it('adds the invalid class and accessibility state after Angular Forms marks a control touched', () => {
    element('input').dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(fixture.componentInstance.form.controls.input.touched).toBe(true);
    expect(element('input').classList).toContain('is-invalid');
    expect(element('input').getAttribute('aria-invalid')).toBe('true');
  });

  it('removes the invalid state when Angular Forms makes the touched control valid', () => {
    const input = element('input') as HTMLInputElement;
    input.dispatchEvent(new Event('blur'));
    input.value = 'Ready';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.componentInstance.form.controls.input.valid).toBe(true);
    expect(fixture.componentInstance.form.controls.input.touched).toBe(true);
    expect(input.classList).not.toContain('is-invalid');
    expect(input.getAttribute('aria-invalid')).toBeNull();
  });

  it('targets native input and textarea formControlName elements but not native selects', () => {
    const directiveHosts = fixture.debugElement
      .queryAll(By.directive(ControlValidationStateDirective))
      .map((debugElement) => (debugElement.nativeElement as HTMLElement).tagName);

    expect(directiveHosts).toEqual(['INPUT', 'TEXTAREA']);

    element('textarea').dispatchEvent(new Event('blur'));
    element('select').dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(element('textarea').classList).toContain('is-invalid');
    expect(element('textarea').getAttribute('aria-invalid')).toBe('true');
    expect(fixture.componentInstance.form.controls.select.touched).toBe(true);
    expect(element('select').classList).not.toContain('is-invalid');
    expect(element('select').getAttribute('aria-invalid')).toBeNull();
  });

  function element(testId: string): HTMLElement {
    const result = fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);
    if (!(result instanceof HTMLElement)) {
      throw new Error(`Missing test element: ${testId}`);
    }
    return result;
  }
});
