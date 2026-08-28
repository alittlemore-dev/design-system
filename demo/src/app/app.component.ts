import { isPlatformBrowser } from '@angular/common';
import {
  CSP_NONCE,
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';
import {
  EmptyStateComponent,
  ErrorMessageComponent,
  FoldableTreeComponent,
  LoadingSpinnerComponent,
  LocalizedDatePickerComponent,
  NotificationAreaComponent,
  NotificationService,
  SiteSelectComponent,
  type ErrorDisplay,
  type FoldableTreeItem,
  type FoldableTreeSection,
  type LocalizedDatePickerLabels,
  type SiteSelectOption,
} from '@alittlemoron/design-system';

type ThemeName = 'light' | 'dark';

@Component({
  selector: 'demo-root',
  standalone: true,
  imports: [
    EmptyStateComponent,
    ErrorMessageComponent,
    FoldableTreeComponent,
    LoadingSpinnerComponent,
    LocalizedDatePickerComponent,
    NotificationAreaComponent,
    SiteSelectComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.ngCspNonce]': 'cspNonce',
  },
})
export class AppComponent {
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly cspNonce = inject(CSP_NONCE);
  protected readonly notificationService = inject(NotificationService);

  protected readonly activeTheme = signal<ThemeName>(this.initialTheme());
  protected readonly retryCount = signal(0);
  protected readonly selectedTreeKey = signal('overview');
  protected readonly selectedSite = signal('alpha');
  protected readonly selectedDate = signal('2026-08-28');

  protected readonly error: ErrorDisplay = {
    message: 'The example request could not be completed.',
    location: 'showcase.request',
  };

  protected readonly rootItems: readonly FoldableTreeItem[] = [
    { key: 'overview', label: 'Overview', badgeText: null },
  ];

  protected readonly treeSections: readonly FoldableTreeSection[] = [
    {
      key: 'documentation',
      label: 'Documentation',
      trailingText: '2',
      items: [
        { key: 'components', label: 'Components', badgeText: 'New' },
        { key: 'guides', label: 'Guides', badgeText: null },
      ],
    },
  ];

  protected readonly siteOptions: readonly SiteSelectOption[] = [
    { value: 'alpha', label: 'Alpha workspace' },
    { value: 'beta', label: 'Beta workspace' },
    { value: 'gamma', label: 'Gamma workspace' },
  ];

  protected readonly dateLabels: LocalizedDatePickerLabels = {
    placeholder: 'MM/DD/YYYY',
    openCalendar: 'Open calendar',
    changeCalendar: 'Change date',
    dialog: 'Choose a date',
    previousMonth: 'Previous month',
    nextMonth: 'Next month',
    openMonthYearPicker: 'Choose month and year',
    previousYear: 'Previous year',
    nextYear: 'Next year',
    clear: 'Clear',
    close: 'Close',
    formatHint: 'Enter a date as MM/DD/YYYY',
    invalidDate: 'Enter an available date.',
    requiredDate: 'Choose a date.',
    keyboardHelp: 'Use arrow keys to move through dates.',
  };

  protected setTheme(theme: ThemeName): void {
    this.document.documentElement.setAttribute('data-bs-theme', theme);
    this.activeTheme.set(theme);
    if (!this.isBrowser) return;
    try {
      this.document.defaultView?.localStorage.setItem('chosenTheme', theme);
    } catch {
      // Theme selection still applies when browser storage is unavailable.
    }
  }

  private initialTheme(): ThemeName {
    return this.document.documentElement.getAttribute('data-bs-theme') === 'dark'
      ? 'dark'
      : 'light';
  }
}
