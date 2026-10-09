import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { IconComponent, IconName } from '../icon/icon.component';

export interface NavigationItem {
  readonly key: string;
  readonly label: string;
  readonly href: string;
  readonly icon?: IconName;
  readonly badgeText?: string | null;
}

export interface NavigationGroup {
  readonly key: string;
  readonly label: string;
  readonly items: readonly NavigationItem[];
  readonly collapsible?: boolean;
  readonly icon?: IconName;
}

export interface NavigationSelection {
  readonly item: NavigationItem;
  readonly event: MouseEvent;
}

@Component({
  selector: 'ds-navigation',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './navigation.component.html',
  styleUrl: './navigation.component.scss',
})
export class NavigationComponent {
  readonly id = input.required<string>();
  readonly label = input.required<string>();
  readonly rootItems = input<readonly NavigationItem[]>([]);
  readonly groups = input<readonly NavigationGroup[]>([]);
  readonly selectedItemKey = input<string | null>(null);
  readonly defaultExpandedGroupKeys = input<readonly string[]>([]);
  readonly emptyMessage = input.required<string>();
  readonly itemSelected = output<NavigationSelection>();

  private readonly expansionOverrides = signal<ReadonlyMap<string, boolean>>(new Map());
  private readonly expandedDefaults = computed(() => new Set(this.defaultExpandedGroupKeys()));

  /** @internal */
  protected expanded(group: NavigationGroup): boolean {
    return (
      !group.collapsible ||
      (this.expansionOverrides().get(group.key) ?? this.expandedDefaults().has(group.key))
    );
  }
  /** @internal */
  protected toggle(group: NavigationGroup): void {
    this.expansionOverrides.update((current) =>
      new Map(current).set(group.key, !this.expanded(group)),
    );
  }
  /** @internal */
  protected select(item: NavigationItem, event: MouseEvent): void {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    this.itemSelected.emit({ item, event });
  }
}
