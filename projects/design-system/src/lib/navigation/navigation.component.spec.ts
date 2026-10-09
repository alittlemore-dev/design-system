import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavigationComponent, NavigationGroup, NavigationSelection } from './navigation.component';

describe('NavigationComponent', () => {
  let fixture: ComponentFixture<NavigationComponent>;
  const groups: readonly NavigationGroup[] = [
    {
      key: 'work',
      label: 'Workspace',
      items: [
        { key: 'resume', label: 'Résumés', href: '/resumes', icon: 'document', badgeText: '7' },
      ],
    },
    {
      key: 'guides',
      label: 'Guides',
      collapsible: true,
      icon: 'folder',
      items: [{ key: 'start', label: 'Getting started', href: '/guides/start' }],
    },
  ];
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [NavigationComponent] });
    fixture = TestBed.createComponent(NavigationComponent);
    fixture.componentRef.setInput('id', 'navigation');
    fixture.componentRef.setInput('label', 'Sections');
    fixture.componentRef.setInput('emptyMessage', 'No sections');
    fixture.componentRef.setInput('rootItems', [
      { key: 'home', label: 'Dashboard', href: '/home' },
    ]);
    fixture.componentRef.setInput('groups', groups);
  });
  const link = (key: string): HTMLAnchorElement =>
    fixture.nativeElement.querySelector(`a[href="${key}"]`);

  it('renders real links, static group headings and a labeled navigation landmark', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('nav').getAttribute('aria-label')).toBe('Sections');
    expect(link('/home').textContent.trim()).toBe('Dashboard');
    expect(link('/resumes').textContent).toContain('Résumés');
    expect(link('/resumes').querySelector('ds-icon')?.getAttribute('aria-hidden')).toBe('true');
    expect(fixture.nativeElement.querySelector('h2').textContent).toBe('Workspace');
  });
  it('keeps folders collapsed until activated and exposes the disclosure relationship', () => {
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    const children = fixture.nativeElement.querySelector('#navigation-guides') as HTMLElement;
    expect(button.getAttribute('aria-controls')).toBe(children.id);
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(children.hidden).toBe(true);
    button.click();
    fixture.detectChanges();
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(children.hidden).toBe(false);
  });
  it('retains a user disclosure choice when defaults change', () => {
    fixture.componentRef.setInput('defaultExpandedGroupKeys', ['guides']);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();
    fixture.componentRef.setInput('defaultExpandedGroupKeys', []);
    fixture.detectChanges();
    fixture.componentRef.setInput('defaultExpandedGroupKeys', ['guides']);
    fixture.detectChanges();
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });
  it('marks only the externally selected link as the current page', () => {
    fixture.componentRef.setInput('selectedItemKey', 'resume');
    fixture.detectChanges();
    expect(link('/resumes').getAttribute('aria-current')).toBe('page');
    expect(link('/home').getAttribute('aria-current')).toBeNull();
    fixture.componentRef.setInput('selectedItemKey', 'home');
    fixture.detectChanges();
    expect(link('/resumes').getAttribute('aria-current')).toBeNull();
    expect(link('/home').getAttribute('aria-current')).toBe('page');
  });
  it('lets the consumer intercept ordinary link activation', () => {
    fixture.detectChanges();
    const selections: NavigationSelection[] = [];
    fixture.componentInstance.itemSelected.subscribe((selection) => {
      selection.event.preventDefault();
      selections.push(selection);
    });
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    link('/resumes').dispatchEvent(event);
    expect(selections[0].item.key).toBe('resume');
    expect(event.defaultPrevented).toBe(true);
    expect(link('/resumes').getAttribute('aria-current')).toBeNull();
  });
  it.each([
    { ctrlKey: true },
    { metaKey: true },
    { shiftKey: true },
    { altKey: true },
    { button: 1 },
  ])('preserves native modified clicks: %p', (modifiers) => {
    fixture.detectChanges();
    const selection = jest.fn();
    fixture.componentInstance.itemSelected.subscribe(selection);
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, ...modifiers });
    link('/resumes').dispatchEvent(event);
    expect(selection).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });
  it('renders a consumer supplied empty state', () => {
    fixture.componentRef.setInput('rootItems', []);
    fixture.componentRef.setInput('groups', []);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No sections');
    expect(fixture.nativeElement.querySelector('a')).toBeNull();
  });
});
