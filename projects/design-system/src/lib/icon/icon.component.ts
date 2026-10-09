import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type IconName =
  | 'menu'
  | 'panel-open'
  | 'panel-close'
  | 'folder'
  | 'chevron-right'
  | 'refresh'
  | 'plus'
  | 'calendar'
  | 'people'
  | 'document'
  | 'dashboard';

/** @internal */
export const ICON_PATHS: Readonly<Record<IconName, readonly string[]>> = {
  menu: ['M4 6h16', 'M4 12h16', 'M4 18h16'],
  'panel-open': [
    'M9 4v16',
    'm14 9 3 3-3 3',
    'M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z',
  ],
  'panel-close': [
    'M9 4v16',
    'm16 9-3 3 3 3',
    'M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z',
  ],
  folder: ['M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z'],
  'chevron-right': ['m9 5 7 7-7 7'],
  refresh: ['M20 7a8 8 0 1 0 0 10', 'M20 3v5h-5'],
  plus: ['M12 5v14', 'M5 12h14'],
  calendar: [
    'M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z',
    'M16 3v4',
    'M8 3v4',
    'M3 11h18',
  ],
  people: [
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2',
    'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
    'M22 21v-2a4 4 0 0 0-3-3.87',
    'M16 3.13a4 4 0 0 1 0 7.75',
  ],
  document: [
    'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z',
    'M14 2v6h6',
    'M8 13h8',
    'M8 17h8',
  ],
  dashboard: ['M3 3h7v7H3Z', 'M14 3h7v7h-7Z', 'M3 14h7v7H3Z', 'M14 14h7v7h-7Z'],
};

@Component({
  selector: 'ds-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: `<svg
    [attr.width]="size()"
    [attr.height]="size()"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    focusable="false"
  >
    @for (path of paths(); track $index) {
      <path [attr.d]="path" />
    }
  </svg>`,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      flex-shrink: 0;
      vertical-align: middle;
    }
  `,
})
export class IconComponent {
  readonly name = input.required<IconName>();
  readonly size = input(20);
  /** @internal */
  protected readonly paths = computed(() => ICON_PATHS[this.name()] ?? []);
}
