import { CdkTrapFocus } from '@angular/cdk/a11y';
import {
  CSP_NONCE,
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  inject,
  signal,
} from '@angular/core';
import {
  ControlValidationStateDirective,
  EmptyStateComponent,
  ErrorMessageComponent,
  FoldableTreeComponent,
  LoadingSpinnerComponent,
  LocalizedDatePickerComponent,
  ModalScrollDirective,
  NotificationAreaComponent,
  NotificationService,
  SiteSelectComponent,
  ThemeService,
  type ErrorDisplay,
  type FoldableTreeItem,
  type FoldableTreeSection,
  type LocalizedDatePickerLabels,
  type SiteSelectOption,
} from '@alittlemoron/design-system';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'demo-root',
  standalone: true,
  imports: [
    EmptyStateComponent,
    CdkTrapFocus,
    ControlValidationStateDirective,
    ErrorMessageComponent,
    FoldableTreeComponent,
    LoadingSpinnerComponent,
    LocalizedDatePickerComponent,
    ModalScrollDirective,
    NotificationAreaComponent,
    ReactiveFormsModule,
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
  private modalTrigger: HTMLButtonElement | null = null;

  protected readonly cspNonce = inject(CSP_NONCE);
  protected readonly notificationService = inject(NotificationService);
  protected readonly themeService = inject(ThemeService);

  protected readonly modalOpen = signal(false);
  protected readonly retryCount = signal(0);
  protected readonly selectedTreeKey = signal('overview');
  protected readonly selectedSite = signal('alpha');
  protected readonly selectedDate = signal('2026-08-28');
  protected readonly validationForm = new FormGroup({
    requiredField: new FormControl('', {
      nonNullable: true,
      validators: Validators.required,
    }),
  });

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

  protected openModal(trigger: HTMLButtonElement): void {
    this.modalTrigger = trigger;
    this.modalOpen.set(true);
  }

  protected closeModal(): void {
    const trigger = this.modalTrigger;
    this.modalOpen.set(false);
    this.modalTrigger = null;
    this.document.defaultView?.setTimeout(() => trigger?.focus());
  }
}
