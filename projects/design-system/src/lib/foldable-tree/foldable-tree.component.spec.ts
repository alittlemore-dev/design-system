import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import {
  FoldableTreeComponent,
  FoldableTreeItem,
  FoldableTreeSection,
} from './foldable-tree.component';

describe('FoldableTreeComponent', () => {
  const rootItems: readonly FoldableTreeItem[] = [
    { key: 'overview', label: 'Overview', badgeText: null },
  ];
  const sections: readonly FoldableTreeSection[] = [
    {
      key: 'guides',
      label: 'Guides',
      trailingText: '2',
      items: [
        { key: 'start', label: 'Getting started', badgeText: null },
        { key: 'advanced', label: 'Advanced guide', badgeText: 'New' },
      ],
    },
  ];
  let fixture: ComponentFixture<FoldableTreeComponent>;
  let component: FoldableTreeComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FoldableTreeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FoldableTreeComponent);
    component = fixture.componentInstance;
  });

  function render(
    overrides: {
      readonly rootItems?: readonly FoldableTreeItem[];
      readonly sections?: readonly FoldableTreeSection[];
      readonly emptyMessage?: string;
      readonly selectedItemKey?: string | null;
      readonly defaultExpandedSectionKeys?: readonly string[];
    } = {},
  ): void {
    fixture.componentRef.setInput('rootItems', overrides.rootItems ?? rootItems);
    fixture.componentRef.setInput('sections', overrides.sections ?? sections);
    fixture.componentRef.setInput('emptyMessage', overrides.emptyMessage ?? 'Nothing here yet');
    fixture.componentRef.setInput('selectedItemKey', overrides.selectedItemKey ?? null);
    fixture.componentRef.setInput(
      'defaultExpandedSectionKeys',
      overrides.defaultExpandedSectionKeys ?? [],
    );
    fixture.componentRef.setInput('sectionTestId', 'foldable-tree-section');
    fixture.componentRef.setInput('itemTestId', 'foldable-tree-item');
    fixture.detectChanges();
  }

  it('renders root items and sections as native top-level list items', () => {
    render({ defaultExpandedSectionKeys: ['guides'] });

    const rootList = fixture.nativeElement.querySelector('ul.foldable-tree') as HTMLUListElement;
    expect(rootList).not.toBeNull();

    const topLevelItems = Array.from(rootList.children) as HTMLLIElement[];
    const overview = fixture.nativeElement.querySelector(
      '[data-testid="foldable-tree-item"]',
    ) as HTMLButtonElement;
    const section = fixture.nativeElement.querySelector(
      '[data-testid="foldable-tree-section"]',
    ) as HTMLButtonElement;

    expect(topLevelItems).toHaveLength(2);
    expect(topLevelItems.every((item) => item.tagName === 'LI')).toBe(true);
    expect(overview.parentElement).toBe(topLevelItems[0]);
    expect(section.parentElement).toBe(topLevelItems[1]);
    expect(fixture.nativeElement.querySelector('[role="tree"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[role="treeitem"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[role="group"]')).toBeNull();
  });

  it('nests an expanded section list within the section list item', () => {
    render({ defaultExpandedSectionKeys: ['guides'] });

    const section = fixture.nativeElement.querySelector(
      '[data-testid="foldable-tree-section"]',
    ) as HTMLButtonElement;
    const sectionListItem = section.parentElement as HTMLLIElement;
    expect(sectionListItem.tagName).toBe('LI');

    const childList = Array.from(sectionListItem.children).find((child) =>
      child.matches('ul.foldable-tree-items'),
    ) as HTMLUListElement;
    expect(childList).toBeDefined();

    const childListItems = Array.from(childList.children) as HTMLLIElement[];
    const sectionItems = Array.from(
      childList.querySelectorAll('[data-testid="foldable-tree-item"]'),
    );

    expect(section.getAttribute('aria-expanded')).toBe('true');
    expect(childList.parentElement).toBe(sectionListItem);
    expect(childListItems).toHaveLength(2);
    expect(childListItems.every((item) => item.tagName === 'LI')).toBe(true);
    expect(sectionItems.map((item) => item.parentElement)).toEqual(childListItems);
  });

  it('starts configured sections expanded and allows overriding their expansion', () => {
    render({ defaultExpandedSectionKeys: ['guides'] });

    const section = fixture.nativeElement.querySelector('[data-testid="foldable-tree-section"]');
    expect(section.getAttribute('aria-expanded')).toBe('true');
    expect(
      fixture.nativeElement.querySelectorAll('[data-testid="foldable-tree-item"]'),
    ).toHaveLength(3);

    section.click();
    fixture.detectChanges();

    expect(section.getAttribute('aria-expanded')).toBe('false');
    expect(
      fixture.nativeElement.querySelectorAll('[data-testid="foldable-tree-item"]'),
    ).toHaveLength(1);
  });

  it('marks the externally selected item current without changing selection locally', () => {
    render({ selectedItemKey: 'start', defaultExpandedSectionKeys: ['guides'] });

    const selected = fixture.nativeElement.querySelectorAll(
      '[data-testid="foldable-tree-item"]',
    )[1];
    expect(selected.getAttribute('aria-current')).toBe('page');

    fixture.nativeElement.querySelectorAll('[data-testid="foldable-tree-item"]')[2].click();
    fixture.detectChanges();

    expect(selected.getAttribute('aria-current')).toBe('page');
  });

  it('emits the selected item key when a root or section item is activated', () => {
    render({ defaultExpandedSectionKeys: ['guides'] });
    const selectedKeys: string[] = [];
    component.itemSelected.subscribe((key) => selectedKeys.push(key));

    fixture.nativeElement.querySelectorAll('[data-testid="foldable-tree-item"]')[0].click();
    fixture.nativeElement.querySelectorAll('[data-testid="foldable-tree-item"]')[1].click();

    expect(selectedKeys).toEqual(['overview', 'start']);
  });

  it('keeps every control in the ordinary native button tab order', () => {
    render({ defaultExpandedSectionKeys: ['guides'] });

    const controls = Array.from(
      fixture.nativeElement.querySelectorAll(
        '[data-testid="foldable-tree-section"], [data-testid="foldable-tree-item"]',
      ),
    ) as HTMLButtonElement[];

    expect(controls).toHaveLength(4);
    expect(controls.every((control) => control.tagName === 'BUTTON')).toBe(true);
    expect(controls.every((control) => control.type === 'button')).toBe(true);
    expect(controls.every((control) => !control.disabled)).toBe(true);
    expect(controls.every((control) => control.tabIndex === 0)).toBe(true);
    expect(controls.every((control) => !control.hasAttribute('tabindex'))).toBe(true);
  });

  it('sets a title only for a truncated item label', () => {
    render({ defaultExpandedSectionKeys: ['guides'] });
    const item = fixture.nativeElement.querySelectorAll(
      '[data-testid="foldable-tree-item"]',
    )[1] as HTMLButtonElement;
    const label = item.querySelector('.foldable-tree-item-label') as HTMLElement;
    Object.defineProperty(label, 'clientWidth', { configurable: true, value: 80 });
    Object.defineProperty(label, 'scrollWidth', { configurable: true, value: 160 });
    item.dispatchEvent(new Event('mouseenter'));
    fixture.detectChanges();

    expect(item.getAttribute('title')).toBe('Getting started');
  });

  it('renders the empty message when it has no root items or sections', () => {
    render({ rootItems: [], sections: [], emptyMessage: 'No items available' });

    expect(fixture.nativeElement.textContent).toContain('No items available');
    expect(fixture.debugElement.queryAll(By.css('ul.foldable-tree'))).toHaveLength(0);
    expect(fixture.debugElement.queryAll(By.css('button'))).toHaveLength(0);
  });
});
