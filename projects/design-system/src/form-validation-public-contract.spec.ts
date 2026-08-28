import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { ControlValidationStateDirective } from '@alittlemoron/design-system';

@Component({
  selector: 'ds-public-control-validation-state-host',
  standalone: true,
  imports: [ControlValidationStateDirective, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formGroup]="form">
      <input data-testid="public-control" formControlName="value" />
    </form>
  `,
})
class PublicControlValidationStateHostComponent {
  readonly form = new FormGroup({
    value: new FormControl('', { nonNullable: true, validators: Validators.required }),
  });
}

describe('form validation public contract', () => {
  it('renders the native-control validation directive through the primary entry point', async () => {
    await TestBed.configureTestingModule({
      imports: [PublicControlValidationStateHostComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(PublicControlValidationStateHostComponent);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector(
      '[data-testid="public-control"]',
    ) as HTMLInputElement;

    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(input.classList).toContain('is-invalid');
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });
});
