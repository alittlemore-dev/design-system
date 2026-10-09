import { type NavigationItem, type NavigationGroup } from '@alittlemore.dev/design-system';

export const DEMO_ROOT_ITEMS: readonly NavigationItem[] = [
  { key: '/overview', href: '/overview', label: 'Overview', badgeText: null },
];

export const DEMO_GROUPS: readonly NavigationGroup[] = [
  {
    key: 'calendar',
    label: 'Calendar',
    items: [
      {
        key: '/components/calendar',
        href: '/components/calendar',
        label: 'Calendar and mini calendar',
        badgeText: 'New',
      },
    ],
  },
  {
    key: 'feedback',
    label: 'Feedback',
    items: [
      {
        key: '/components/empty-state',
        href: '/components/empty-state',
        label: 'Empty state',
        badgeText: null,
      },
      {
        key: '/components/loading-spinner',
        href: '/components/loading-spinner',
        label: 'Loading spinner',
        badgeText: null,
      },
      {
        key: '/components/error-message',
        href: '/components/error-message',
        label: 'Error message',
        badgeText: null,
      },
      {
        key: '/components/notifications',
        href: '/components/notifications',
        label: 'Notifications',
        badgeText: null,
      },
    ],
  },
  {
    key: 'forms',
    label: 'Forms',
    items: [
      {
        key: '/components/form-validation',
        href: '/components/form-validation',
        label: 'Form validation',
        badgeText: null,
      },
      {
        key: '/components/site-select',
        href: '/components/site-select',
        label: 'Site select',
        badgeText: null,
      },
      {
        key: '/components/localized-date-picker',
        href: '/components/localized-date-picker',
        label: 'Localized date picker',
        badgeText: null,
      },
      {
        key: '/components/localized-date-range-picker',
        href: '/components/localized-date-range-picker',
        label: 'Localized date range picker',
        badgeText: 'New',
      },
      {
        key: '/components/localized-time-picker',
        href: '/components/localized-time-picker',
        label: 'Localized time picker',
        badgeText: 'New',
      },
      {
        key: '/components/localized-time-range-picker',
        href: '/components/localized-time-range-picker',
        label: 'Localized time range picker',
        badgeText: 'New',
      },
      {
        key: '/components/localized-datetime-picker',
        href: '/components/localized-datetime-picker',
        label: 'Localized datetime picker',
        badgeText: 'New',
      },
      {
        key: '/components/localized-datetime-range-picker',
        href: '/components/localized-datetime-range-picker',
        label: 'Localized datetime range picker',
        badgeText: 'New',
      },
    ],
  },
  {
    key: 'navigation',
    label: 'Navigation',
    items: [
      {
        key: '/components/navigation',
        href: '/components/navigation',
        label: 'Navigation and sidebar',
        badgeText: null,
      },
    ],
  },
  {
    key: 'overlays',
    label: 'Overlays',
    items: [
      {
        key: '/components/modal-scroll',
        href: '/components/modal-scroll',
        label: 'Modal scroll',
        badgeText: null,
      },
      {
        key: '/components/disclosures',
        href: '/components/disclosures',
        label: 'Disclosures and drafts',
        badgeText: 'New',
      },
    ],
  },
  {
    key: 'markdown',
    label: 'Markdown',
    items: [
      {
        key: '/markdown/renderer',
        href: '/markdown/renderer',
        label: 'Markdown renderer',
        badgeText: null,
      },
      {
        key: '/markdown/editor',
        href: '/markdown/editor',
        label: 'Markdown editor',
        badgeText: 'New',
      },
    ],
  },
];
