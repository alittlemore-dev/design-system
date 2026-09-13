import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'ds-foldable-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './foldable-section.component.html',
  styleUrl: './foldable-section.component.scss',
})
export class FoldableSectionComponent {
  readonly sectionKey = input.required<string>();
  readonly title = input.required<string>();
  readonly summary = input.required<string>();
  readonly expanded = input.required<boolean>();
  readonly expandedChange = output<boolean>();

  readonly bodyId = computed(() => `ds-section-body-${this.sectionKey()}`);

  toggle(): void {
    this.expandedChange.emit(!this.expanded());
  }
}
