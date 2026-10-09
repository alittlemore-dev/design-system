import type { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'overview' },
  {
    path: 'overview',
    loadComponent: () =>
      import('./pages/overview-page.component').then((module) => module.OverviewPageComponent),
  },
  {
    path: 'components/empty-state',
    loadComponent: () =>
      import('./pages/feedback-pages').then((module) => module.EmptyStatePageComponent),
  },
  {
    path: 'components/loading-spinner',
    loadComponent: () =>
      import('./pages/feedback-pages').then((module) => module.LoadingSpinnerPageComponent),
  },
  {
    path: 'components/error-message',
    loadComponent: () =>
      import('./pages/feedback-pages').then((module) => module.ErrorMessagePageComponent),
  },
  {
    path: 'components/notifications',
    loadComponent: () =>
      import('./pages/feedback-pages').then((module) => module.NotificationsPageComponent),
  },
  {
    path: 'components/form-validation',
    loadComponent: () =>
      import('./pages/form-pages').then((module) => module.FormValidationPageComponent),
  },
  {
    path: 'components/site-select',
    loadComponent: () =>
      import('./pages/form-pages').then((module) => module.SiteSelectPageComponent),
  },
  {
    path: 'components/localized-date-picker',
    loadComponent: () =>
      import('./pages/form-pages').then((module) => module.LocalizedDatePickerPageComponent),
  },
  {
    path: 'components/localized-date-range-picker',
    loadComponent: () =>
      import('./pages/localized-picker-pages').then(
        (module) => module.LocalizedDateRangePickerPageComponent,
      ),
  },
  {
    path: 'components/localized-time-picker',
    loadComponent: () =>
      import('./pages/localized-picker-pages').then(
        (module) => module.LocalizedTimePickerPageComponent,
      ),
  },
  {
    path: 'components/localized-time-range-picker',
    loadComponent: () =>
      import('./pages/localized-picker-pages').then(
        (module) => module.LocalizedTimeRangePickerPageComponent,
      ),
  },
  {
    path: 'components/localized-datetime-picker',
    loadComponent: () =>
      import('./pages/localized-picker-pages').then(
        (module) => module.LocalizedDateTimePickerPageComponent,
      ),
  },
  {
    path: 'components/localized-datetime-range-picker',
    loadComponent: () =>
      import('./pages/localized-picker-pages').then(
        (module) => module.LocalizedDateTimeRangePickerPageComponent,
      ),
  },
  {
    path: 'components/navigation',
    loadComponent: () =>
      import('./pages/navigation-page.component').then((module) => module.NavigationPageComponent),
  },
  {
    path: 'components/modal-scroll',
    loadComponent: () =>
      import('./pages/modal-scroll-page.component').then(
        (module) => module.ModalScrollPageComponent,
      ),
  },
  {
    path: 'markdown/renderer',
    loadComponent: () =>
      import('./pages/markdown-pages').then((module) => module.MarkdownRendererPageComponent),
  },
  {
    path: 'markdown/editor',
    loadComponent: () =>
      import('./pages/markdown-pages').then((module) => module.MarkdownEditorPageComponent),
  },
  {
    path: 'components/disclosures',
    loadComponent: () =>
      import('./pages/disclosures-page.component').then(
        (module) => module.DisclosuresPageComponent,
      ),
  },
  {
    path: 'preview/navigation',
    loadComponent: () =>
      import('./pages/navigation-preview.component').then(
        (module) => module.NavigationPreviewComponent,
      ),
  },
  {
    path: 'components/calendar',
    loadComponent: () =>
      import('./pages/calendar-page.component').then((m) => m.CalendarPageComponent),
  },
  {
    path: 'preview/calendar',
    loadComponent: () =>
      import('./pages/calendar-preview.component').then((m) => m.CalendarPreviewComponent),
  },
  {
    path: 'preview/calendar-primary',
    loadComponent: () =>
      import('./pages/calendar-primary-preview.component').then(
        (m) => m.CalendarPrimaryPreviewComponent,
      ),
  },
  { path: '**', redirectTo: 'overview' },
];
