import { TestBed } from '@angular/core/testing';
import { IconComponent } from './icon.component';

describe('IconComponent', () => {
  it('renders a non-focusable decorative icon at the consumer supplied size', () => {
    TestBed.configureTestingModule({ imports: [IconComponent] });
    const fixture = TestBed.createComponent(IconComponent);
    fixture.componentRef.setInput('name', 'panel-open');
    fixture.componentRef.setInput('size', 18);
    fixture.detectChanges();
    const svg = fixture.nativeElement.querySelector('svg');
    expect(fixture.nativeElement.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('focusable')).toBe('false');
    expect(svg.getAttribute('width')).toBe('18');
    expect(svg.querySelectorAll('path').length).toBeGreaterThan(0);
  });
});
