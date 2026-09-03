import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  FoldableTreeComponent,
  type FoldableTreeItem,
  type FoldableTreeSection,
} from '@alittlemoron/design-system';

import { DemoPageComponent } from '../shared/demo-page.component';

@Component({
  selector: 'demo-foldable-tree-page',
  standalone: true,
  imports: [DemoPageComponent, FoldableTreeComponent, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <demo-page
      title="Foldable tree"
      description="Renders application-owned root items and collapsible sections while exposing selection as a neutral output."
    >
      <div demo-preview class="tree-preview">
        <ds-foldable-tree
          [rootItems]="rootItems()"
          [sections]="sections()"
          [emptyMessage]="emptyMessage()"
          [selectedItemKey]="selectedKey()"
          [defaultExpandedSectionKeys]="expandedByDefault() ? ['documentation'] : []"
          sectionTestId="demo-tree-section"
          itemTestId="demo-tree-item"
          (itemSelected)="selectedKey.set($event)"
        />
        <p class="demo-output" data-demo-tree-selection>Selected: {{ selectedKey() ?? 'none' }}</p>
      </div>
      <div demo-controls class="demo-form-stack">
        <div>
          <label class="form-label" for="tree-empty-message">emptyMessage</label>
          <input
            id="tree-empty-message"
            class="form-control"
            [ngModel]="emptyMessage()"
            (ngModelChange)="emptyMessage.set($event)"
          />
        </div>
        <div class="form-check">
          <input
            id="tree-show-items"
            class="form-check-input"
            type="checkbox"
            [ngModel]="showItems()"
            (ngModelChange)="showItems.set($event)"
          />
          <label class="form-check-label" for="tree-show-items">Provide items</label>
        </div>
        <div class="form-check">
          <input
            id="tree-show-badges"
            class="form-check-input"
            type="checkbox"
            [ngModel]="showBadges()"
            (ngModelChange)="showBadges.set($event)"
          />
          <label class="form-check-label" for="tree-show-badges">Badge and trailing text</label>
        </div>
        <div class="form-check">
          <input
            id="tree-expanded"
            class="form-check-input"
            type="checkbox"
            [ngModel]="expandedByDefault()"
            (ngModelChange)="expandedByDefault.set($event)"
          />
          <label class="form-check-label" for="tree-expanded">Expand section by default</label>
        </div>
      </div>
    </demo-page>
  `,
  styles: `
    .tree-preview {
      width: min(24rem, 100%);
    }
  `,
})
export class FoldableTreePageComponent {
  protected readonly selectedKey = signal<string | null>('overview');
  protected readonly emptyMessage = signal('No navigation items');
  protected readonly showItems = signal(true);
  protected readonly showBadges = signal(true);
  protected readonly expandedByDefault = signal(true);

  protected readonly rootItems = computed<readonly FoldableTreeItem[]>(() =>
    this.showItems()
      ? [{ key: 'overview', label: 'Overview', badgeText: this.showBadges() ? 'Home' : null }]
      : [],
  );

  protected readonly sections = computed<readonly FoldableTreeSection[]>(() =>
    this.showItems()
      ? [
          {
            key: 'documentation',
            label: 'Documentation',
            trailingText: this.showBadges() ? '2' : null,
            items: [
              {
                key: 'components',
                label: 'Components',
                badgeText: this.showBadges() ? 'New' : null,
              },
              { key: 'guides', label: 'Guides', badgeText: null },
            ],
          },
        ]
      : [],
  );
}
