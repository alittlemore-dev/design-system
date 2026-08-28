import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

export interface FoldableTreeItem {
  readonly key: string;
  readonly label: string;
  readonly badgeText: string | null;
}

export interface FoldableTreeSection {
  readonly key: string;
  readonly label: string;
  readonly trailingText: string | null;
  readonly items: readonly FoldableTreeItem[];
}

/** @internal */
interface FoldableTreeTitleTarget {
  readonly kind: 'section' | 'rootItem' | 'item';
  readonly key: string;
  readonly label: string;
}

@Component({
  selector: 'ds-foldable-tree',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './foldable-tree.component.html',
  styleUrl: './foldable-tree.component.scss',
})
export class FoldableTreeComponent {
  readonly rootItems = input.required<readonly FoldableTreeItem[]>();
  readonly sections = input.required<readonly FoldableTreeSection[]>();
  readonly emptyMessage = input.required<string>();
  readonly selectedItemKey = input.required<string | null>();
  readonly defaultExpandedSectionKeys = input.required<readonly string[]>();
  readonly sectionTestId = input.required<string>();
  readonly itemTestId = input.required<string>();
  readonly itemSelected = output<string>();

  private readonly defaultExpandedSectionKeySet = computed(
    () => new Set(this.defaultExpandedSectionKeys()),
  );

  /** @internal */
  protected readonly sectionExpansionOverrides = signal<ReadonlyMap<string, boolean>>(
    new Map<string, boolean>(),
  );

  /** @internal */
  protected readonly truncatedTitleTarget = signal<FoldableTreeTitleTarget | null>(null);

  /** @internal */
  protected isExpanded(sectionKey: string): boolean {
    return (
      this.sectionExpansionOverrides().get(sectionKey) ??
      this.defaultExpandedSectionKeySet().has(sectionKey)
    );
  }

  /** @internal */
  protected toggleSection(sectionKey: string): void {
    const expanded = !this.isExpanded(sectionKey);
    this.sectionExpansionOverrides.update((current) => {
      const next = new Map(current);
      next.set(sectionKey, expanded);
      return next;
    });
  }

  /** @internal */
  protected showConditionalTitle(
    kind: FoldableTreeTitleTarget['kind'],
    key: string,
    label: string,
    labelElement: HTMLElement,
  ): void {
    if (!this.isTextTruncated(labelElement)) {
      this.clearConditionalTitle(kind, key);
      return;
    }
    this.truncatedTitleTarget.set({ kind, key, label });
  }

  /** @internal */
  protected clearConditionalTitle(kind: FoldableTreeTitleTarget['kind'], key: string): void {
    const current = this.truncatedTitleTarget();
    if (current?.kind === kind && current.key === key) {
      this.truncatedTitleTarget.set(null);
    }
  }

  /** @internal */
  protected conditionalTitleFor(kind: FoldableTreeTitleTarget['kind'], key: string): string | null {
    const current = this.truncatedTitleTarget();
    return current?.kind === kind && current.key === key ? current.label : null;
  }

  private isTextTruncated(element: HTMLElement): boolean {
    return element.scrollWidth > element.clientWidth;
  }
}
