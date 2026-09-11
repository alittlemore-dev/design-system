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
    path: 'components/foldable-tree',
    loadComponent: () =>
      import('./pages/foldable-tree-page.component').then(
        (module) => module.FoldableTreePageComponent,
      ),
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
  { path: '**', redirectTo: 'overview' },
];
