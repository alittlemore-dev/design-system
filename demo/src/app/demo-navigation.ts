import { type FoldableTreeItem, type FoldableTreeSection } from '@alittlemore.dev/design-system';

export const DEMO_ROOT_ITEMS: readonly FoldableTreeItem[] = [
  { key: '/overview', label: 'Overview', badgeText: null },
];

export const DEMO_SECTIONS: readonly FoldableTreeSection[] = [
  {
    key: 'feedback',
    label: 'Feedback',
    trailingText: '4',
    items: [
      { key: '/components/empty-state', label: 'Empty state', badgeText: null },
      { key: '/components/loading-spinner', label: 'Loading spinner', badgeText: null },
      { key: '/components/error-message', label: 'Error message', badgeText: null },
      { key: '/components/notifications', label: 'Notifications', badgeText: null },
    ],
  },
  {
    key: 'forms',
    label: 'Forms',
    trailingText: '8',
    items: [
      { key: '/components/form-validation', label: 'Form validation', badgeText: null },
      { key: '/components/site-select', label: 'Site select', badgeText: null },
      { key: '/components/localized-date-picker', label: 'Localized date picker', badgeText: null },
      {
        key: '/components/localized-date-range-picker',
        label: 'Localized date range picker',
        badgeText: 'New',
      },
      {
        key: '/components/localized-time-picker',
        label: 'Localized time picker',
        badgeText: 'New',
      },
      {
        key: '/components/localized-time-range-picker',
        label: 'Localized time range picker',
        badgeText: 'New',
      },
      {
        key: '/components/localized-datetime-picker',
        label: 'Localized datetime picker',
        badgeText: 'New',
      },
      {
        key: '/components/localized-datetime-range-picker',
        label: 'Localized datetime range picker',
        badgeText: 'New',
      },
    ],
  },
  {
    key: 'navigation',
    label: 'Navigation',
    trailingText: '1',
    items: [{ key: '/components/foldable-tree', label: 'Foldable tree', badgeText: null }],
  },
  {
    key: 'overlays',
    label: 'Overlays',
    trailingText: '1',
    items: [{ key: '/components/modal-scroll', label: 'Modal scroll', badgeText: null }],
  },
  {
    key: 'markdown',
    label: 'Markdown',
    trailingText: '2',
    items: [
      { key: '/markdown/renderer', label: 'Markdown renderer', badgeText: null },
      { key: '/markdown/editor', label: 'Markdown editor', badgeText: 'New' },
    ],
  },
];

export const DEMO_EXPANDED_SECTION_KEYS = DEMO_SECTIONS.map((section) => section.key);
