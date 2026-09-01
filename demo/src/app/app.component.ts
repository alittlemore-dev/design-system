import { CdkTrapFocus } from '@angular/cdk/a11y';
import {
  CSP_NONCE,
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  computed,
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
  formatLocalizedDate,
  type ErrorDisplay,
  type FoldableTreeItem,
  type FoldableTreeSection,
  type LocalizedDatePickerLabels,
  type SiteSelectOption,
} from '@alittlemoron/design-system';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MarkdownRendererService } from '@alittlemoron/design-system/markdown';
import {
  MarkdownEditorComponent,
  type MarkdownEditorImageConfig,
  type MarkdownEditorLabels,
  type MarkdownEditorWikiLinkConfig,
} from '@alittlemoron/design-system/markdown-editor';
import { of } from 'rxjs';

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
    MarkdownEditorComponent,
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
  private readonly markdownRenderer = inject(MarkdownRendererService);
  private modalTrigger: HTMLButtonElement | null = null;

  protected readonly cspNonce = inject(CSP_NONCE);
  protected readonly notificationService = inject(NotificationService);
  protected readonly themeService = inject(ThemeService);

  protected readonly modalOpen = signal(false);
  protected readonly retryCount = signal(0);
  protected readonly selectedTreeKey = signal('overview');
  protected readonly selectedSite = signal('alpha');
  protected readonly selectedDate = signal('2026-08-28');
  protected readonly markdownValue = signal(
    [
      '# Shared Markdown editor',
      '',
      'Open [[docs:editor-contract|the editor contract]].',
      '',
      '| Mode | Source |',
      '| --- | --- |',
      '| Direct preview | picker, paste, drop |',
      '',
      '```ts',
      "const imageMode = 'direct';",
      '```',
      '',
      '![Design-system demo](/assets/demo-image.svg)',
    ].join('\n'),
  );
  protected readonly formattedDate = formatLocalizedDate(
    '2026-08-28T12:34:56+00:00',
    'en-US',
    'date',
  );
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

  protected readonly markdownEditorLabels: MarkdownEditorLabels = {
    mode: { aria: 'Editor mode', edit: 'Edit', source: 'Source', preview: 'Preview' },
    fullscreen: { enter: 'Enter fullscreen', exit: 'Exit fullscreen' },
    toolbar: { aria: 'Markdown formatting' },
    commands: {
      togglePreview: 'Toggle preview',
      toggleSource: 'Toggle source',
      heading1: 'Heading 1',
      heading2: 'Heading 2',
      heading3: 'Heading 3',
      heading4: 'Heading 4',
      heading5: 'Heading 5',
      heading6: 'Heading 6',
      bold: 'Bold',
      italic: 'Italic',
      strikethrough: 'Strikethrough',
      quote: 'Quote',
      unorderedList: 'Bulleted list',
      orderedList: 'Numbered list',
      taskList: 'Task list',
      horizontalRule: 'Horizontal rule',
      link: 'Link',
      image: 'Upload image',
      inlineCode: 'Inline code',
      codeBlock: 'Code block',
      table: 'Table',
      search: 'Search',
    },
    shortcutGroups: {
      view: 'View',
      headings: 'Headings',
      inline: 'Inline formatting',
      blocks: 'Blocks',
      media: 'Media',
    },
    shortcuts: {
      summary: 'Keyboard shortcuts',
      modifierHintMac: 'Use Command for Mod.',
      modifierHintOther: 'Use Ctrl for Mod.',
      tabEscape: 'Press Escape and then Tab to leave the editor.',
    },
    completions: 'Completions',
    search: {
      find: 'Find',
      replace: 'Replace',
      next: 'Next',
      previous: 'Previous',
      all: 'All',
      matchCase: 'Match case',
      byWord: 'By word',
      regexp: 'Regular expression',
      replaceAll: 'Replace all',
      close: 'Close',
      goToLine: 'Go to line',
      go: 'Go',
      currentMatch: 'Current match',
      onLine: 'On line',
      replacedMatches: 'Replaced $ matches',
      replacedMatchOnLine: 'Replaced match on line $',
    },
    preview: { empty: 'Nothing to preview.', imageFailed: 'Could not load image preview.' },
    upload: {
      uploading: 'Uploading image…',
      retry: 'Retry',
      dismiss: 'Dismiss',
      failed: (fileName) => `Could not upload ${fileName}.`,
      unsupported: (fileName) => `${fileName} is not a supported image.`,
    },
    wikiLinks: { registryUnavailable: 'Wiki suggestions are temporarily unavailable.' },
    table: {
      table: 'Table',
      row: 'Row',
      column: 'Column',
      range: 'Range',
      menu: 'Menu',
      addRow: 'Add row',
      addColumn: 'Add column',
      moveRow: 'Move row',
      moveColumn: 'Move column',
      insertBefore: 'Insert before',
      insertAfter: 'Insert after',
      duplicate: 'Duplicate',
      clear: 'Clear',
      copy: 'Copy',
      cut: 'Cut',
      delete: 'Delete',
      moveBefore: 'Move before',
      moveAfter: 'Move after',
      sortAscending: 'Sort ascending',
      sortDescending: 'Sort descending',
      alignLeft: 'Align left',
      alignCenter: 'Align center',
      alignRight: 'Align right',
      format: 'Format',
      deleteTable: 'Delete table',
      clipboardFailed: 'Clipboard operation failed.',
    },
  };

  protected readonly markdownImageConfig: MarkdownEditorImageConfig = {
    upload: {
      sources: ['picker', 'paste', 'drop'],
      acceptedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
      upload: () => of({ source: '/assets/demo-image.svg' }),
    },
    preview: { kind: 'direct' },
  };

  protected readonly markdownWikiLinks: MarkdownEditorWikiLinkConfig = {
    namespaces: [{ key: 'docs', label: 'Documentation' }],
    loadTargets: () =>
      of([
        {
          namespace: 'docs',
          targets: [
            {
              key: 'editor-contract',
              label: 'Editor contract',
              description: 'Public package API',
              badge: 'Docs',
            },
          ],
        },
      ]),
    resolve: (reference) =>
      reference.namespace === 'docs' && reference.key === 'editor-contract'
        ? { href: '#markdown-demo', openIn: 'same-tab' }
        : null,
  };

  protected readonly renderedMarkdown = computed(() =>
    this.markdownRenderer.render(this.markdownValue(), { wikiLinks: this.markdownWikiLinks }),
  );

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
