import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FoldableSectionComponent } from './foldable-section.component';

describe('FoldableSectionComponent', () => {
  let fixture: ComponentFixture<FoldableSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FoldableSectionComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FoldableSectionComponent);
    fixture.componentRef.setInput('sectionKey', 'details');
    fixture.componentRef.setInput('title', 'Details');
    fixture.componentRef.setInput('summary', 'Two items');
    fixture.componentRef.setInput('expanded', true);
    fixture.detectChanges();
  });

  it('renders an accessible toggle, summary, chevron, and controlled body', () => {
    const toggle = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    const body = fixture.nativeElement.querySelector(
      '[data-testid="ds-section-body-details"]',
    ) as HTMLElement;

    expect(toggle.textContent).toContain('Details');
    expect(toggle.textContent).toContain('Two items');
    expect(toggle.querySelector('[data-testid="ds-section-chevron"]')).not.toBeNull();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.getAttribute('aria-controls')).toBe(body.id);
    expect(body.hidden).toBe(false);
  });

  it('emits the next expanded state and hides collapsed content', () => {
    const expandedChanges: boolean[] = [];
    fixture.componentInstance.expandedChange.subscribe((value) => expandedChanges.push(value));

    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    fixture.componentRef.setInput('expanded', false);
    fixture.detectChanges();

    expect(expandedChanges).toEqual([false]);
    expect(
      (
        fixture.nativeElement.querySelector(
          '[data-testid="ds-section-body-details"]',
        ) as HTMLElement
      ).hidden,
    ).toBe(true);
  });
});
