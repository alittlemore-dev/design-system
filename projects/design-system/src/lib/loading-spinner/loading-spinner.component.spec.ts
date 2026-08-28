import { TestBed } from '@angular/core/testing';

import { LoadingSpinnerComponent } from './loading-spinner.component';

describe('LoadingSpinnerComponent', () => {
  it('renders and updates a named status region', async () => {
    await TestBed.configureTestingModule({
      imports: [LoadingSpinnerComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(LoadingSpinnerComponent);
    fixture.componentRef.setInput('ariaLabel', 'Loading articles');
    fixture.detectChanges();

    const status = fixture.nativeElement.querySelector('[role="status"]');
    expect(status?.getAttribute('aria-label')).toBe('Loading articles');
    expect(status?.querySelector('[aria-hidden="true"]')).not.toBeNull();
    fixture.componentRef.setInput('ariaLabel', 'Loading comments');
    fixture.detectChanges();

    expect(status?.getAttribute('aria-label')).toBe('Loading comments');
  });
});
