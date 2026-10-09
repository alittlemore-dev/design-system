import { BreakpointObserver } from '@angular/cdk/layout';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { map } from 'rxjs';
import {
  FoldableSectionComponent,
  DrawerComponent,
  IconComponent,
  NavigationComponent,
  SidebarComponent,
  ThemeService,
  type NavigationGroup,
  type NavigationItem,
  type NavigationSelection,
} from '@alittlemore.dev/design-system';

const WORKSPACE_ROOTS: readonly NavigationItem[] = [
  { key: 'dashboard', label: 'Dashboard', href: '#dashboard', icon: 'dashboard' },
  { key: 'calendar', label: 'Calendar', href: '#calendar', icon: 'calendar' },
];
const WORKSPACE_GROUPS: readonly NavigationGroup[] = [
  {
    key: 'work',
    label: 'Work',
    items: [{ key: 'resumes', label: 'Résumés', href: '#resumes', icon: 'document' }],
  },
  {
    key: 'knowledge',
    label: 'Knowledge base',
    items: [
      { key: 'people', label: 'People', href: '#people', icon: 'people' },
      { key: 'dates', label: 'Memorable dates', href: '#dates', icon: 'calendar' },
      { key: 'events', label: 'Events', href: '#events', icon: 'calendar' },
    ],
  },
  {
    key: 'finance',
    label: 'Finance tracker',
    items: [
      { key: 'overview', label: 'Overview', href: '#overview' },
      { key: 'statistics', label: 'Statistics', href: '#statistics' },
    ],
  },
];
const ARTICLE_GROUPS: readonly NavigationGroup[] = [
  {
    key: 'start',
    label: 'Getting started',
    collapsible: true,
    icon: 'folder',
    items: [
      {
        key: 'article-intro',
        label: 'How the knowledge base works',
        href: '#article-intro',
        icon: 'document',
      },
      {
        key: 'article-first',
        label: 'Your first article',
        href: '#article-first',
        icon: 'document',
      },
    ],
  },
  {
    key: 'practice',
    label: 'Working with content',
    collapsible: true,
    icon: 'folder',
    items: [
      {
        key: 'article-links',
        label: 'Connecting articles',
        href: '#article-links',
        icon: 'document',
      },
      {
        key: 'article-plan',
        label: 'Planning and notes',
        href: '#article-plan',
        icon: 'document',
      },
    ],
  },
  {
    key: 'archive',
    label: 'Archive',
    collapsible: true,
    icon: 'folder',
    items: [
      {
        key: 'article-review',
        label: 'Last year’s project review',
        href: '#article-review',
        icon: 'document',
      },
    ],
  },
];

@Component({
  selector: 'demo-navigation-preview',
  standalone: true,
  imports: [
    RouterLink,
    SidebarComponent,
    NavigationComponent,
    IconComponent,
    FoldableSectionComponent,
    DrawerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './navigation-preview.component.html',
  styleUrl: './navigation-preview.component.scss',
})
export class NavigationPreviewComponent {
  protected readonly theme = inject(ThemeService);
  protected readonly mode = signal<'workspace' | 'articles'>('workspace');
  protected readonly open = signal(true);
  protected readonly selected = signal('dashboard');
  protected readonly roots = computed(() => (this.mode() === 'workspace' ? WORKSPACE_ROOTS : []));
  protected readonly groups = computed(() =>
    this.mode() === 'workspace' ? WORKSPACE_GROUPS : ARTICLE_GROUPS,
  );
  protected readonly title = computed(
    () =>
      [...this.roots(), ...this.groups().flatMap((group) => group.items)].find(
        (item) => item.key === this.selected(),
      )?.label ?? 'Dashboard',
  );
  protected readonly importantExpanded = signal(true);
  protected readonly upcomingExpanded = signal(true);
  protected readonly recentExpanded = signal(true);
  protected readonly statisticsExpanded = signal(true);
  private readonly desktop = toSignal(
    inject(BreakpointObserver)
      .observe('(min-width: 768px)')
      .pipe(map((state) => state.matches)),
    { initialValue: true },
  );
  private readonly responsiveOpen = effect(() => this.open.set(this.desktop()));

  protected switchMode(mode: 'workspace' | 'articles'): void {
    this.mode.set(mode);
    this.selected.set(mode === 'workspace' ? 'dashboard' : 'article-intro');
  }
  protected select(selection: NavigationSelection): void {
    selection.event.preventDefault();
    this.selected.set(selection.item.key);
    if (!this.desktop()) this.open.set(false);
  }
  protected follow(key: string, event: MouseEvent): void {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey)
      return;
    event.preventDefault();
    this.selected.set(key);
  }
}
