import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SidebarComponent } from './sidebar.component';

@Component({
  standalone: true,
  imports: [SidebarComponent],
  template: `<ds-sidebar
    panelId="sections"
    label="Sections"
    openLabel="Open sections"
    closeLabel="Close sections"
    [open]="open()"
    (openChange)="open.set($event)"
    ><nav dsSidebarNavigation><a href="#page">Page</a></nav>
    <h1>Content</h1></ds-sidebar
  >`,
})
class HostComponent {
  readonly open = signal(true);
}

describe('SidebarComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  const toggle = (): HTMLButtonElement => fixture.nativeElement.querySelector('button');
  const panel = (): HTMLElement => fixture.nativeElement.querySelector('#sections');
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });
  it('projects navigation separately from visible page content', () => {
    expect(panel().querySelector('nav')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('#sections')).toHaveLength(1);
    expect(panel().querySelector('h1')).toBeNull();
    expect(fixture.nativeElement.querySelector('h1').textContent).toBe('Content');
    expect(toggle().getAttribute('aria-controls')).toBe('sections');
    expect(toggle().getAttribute('aria-label')).toBe('Close sections');
  });
  it('reopens the same projected navigation with one accessible icon toggle', () => {
    const navigation = panel().querySelector('nav');
    toggle().click();
    fixture.detectChanges();
    expect(panel().hidden).toBe(true);
    expect(panel().hasAttribute('inert')).toBe(true);
    expect(toggle().getAttribute('aria-expanded')).toBe('false');
    expect(toggle().getAttribute('aria-label')).toBe('Open sections');
    toggle().click();
    fixture.detectChanges();
    expect(panel().hidden).toBe(false);
    expect(panel().hasAttribute('inert')).toBe(false);
    expect(panel().querySelector('nav')).toBe(navigation);
  });
  it('closes on Escape and returns focus to the toggle', () => {
    const link = panel().querySelector('a') as HTMLAnchorElement;
    link.focus();
    link.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(panel().hidden).toBe(true);
    expect(document.activeElement).toBe(toggle());
  });
  it('restores focus when the consumer hides focused navigation', () => {
    (panel().querySelector('a') as HTMLAnchorElement).focus();
    fixture.componentInstance.open.set(false);
    fixture.detectChanges();
    expect(document.activeElement).toBe(toggle());
  });
  it('does not move focus away from page content on external collapse', () => {
    const heading = fixture.nativeElement.querySelector('h1') as HTMLElement;
    heading.tabIndex = -1;
    heading.focus();
    fixture.componentInstance.open.set(false);
    fixture.detectChanges();
    expect(document.activeElement).toBe(heading);
  });
});
