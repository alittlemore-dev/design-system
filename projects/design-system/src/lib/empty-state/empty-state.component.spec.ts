import { TestBed } from '@angular/core/testing';

import { EmptyStateComponent } from './empty-state.component';

describe('EmptyStateComponent', () => {
  it('renders and updates the required message input', async () => {
    await TestBed.configureTestingModule({
      imports: [EmptyStateComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(EmptyStateComponent);
    fixture.componentRef.setInput('message', 'Nothing here yet.');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Nothing here yet.');
    fixture.componentRef.setInput('message', 'No results found.');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No results found.');
    expect(fixture.nativeElement.textContent).not.toContain('Nothing here yet.');
  });
});
