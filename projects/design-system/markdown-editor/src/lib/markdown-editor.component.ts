import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import {
  AfterViewInit,
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  CSP_NONCE,
  DestroyRef,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  ViewEncapsulation,
  ViewChild,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subscription, defer, take, throwIfEmpty } from 'rxjs';
import {
  closeBracketsKeymap,
  nextSnippetField,
  prevSnippetField,
  snippet,
} from '@codemirror/autocomplete';
import { defaultKeymap, historyKeymap, indentLess, indentMore } from '@codemirror/commands';
import { openSearchPanel, searchKeymap } from '@codemirror/search';
import {
  Compartment,
  EditorSelection,
  EditorState,
  Transaction,
  type Extension,
} from '@codemirror/state';
import {
  EditorView,
  drawSelection,
  keymap,
  panels,
  type Rect,
  type ViewUpdate,
} from '@codemirror/view';
import { ModalPageScrollLockService } from '@alittlemore.dev/design-system';
import {
  MarkdownRendererService,
  type MarkdownWikiLinkRenderConfig,
  type MarkdownWikiLinkTargetGroup,
} from '@alittlemore.dev/design-system/markdown';
import {
  MARKDOWN_EDITOR_COMMANDS,
  MARKDOWN_EDITOR_SHORTCUT_GROUPS,
  MarkdownEditorCommandDefinition,
  MarkdownEditorCommandId,
  MarkdownKeyboardEvent,
  MarkdownSelection,
  MarkdownTransactionResult,
  applyMarkdownCommandTransaction,
  autoCloseMarkdownFenceTransaction,
  findMarkdownEditorCommand,
  formatMarkdownShortcut,
  indentMarkdownLinesTransaction,
} from './markdown-editor.commands';
import {
  markdownEditorCspExtension,
  markdownEditorFoundationExtensions,
} from './markdown-editor.extensions';
import { markdownPresentation } from './markdown-editor.presentation';
import {
  markdownTableEditor,
  markdownTableInputPreservesExternalScroll,
  markdownTableUpdatePreservesExternalScroll,
  type MarkdownTableEditorPhrases,
} from './markdown-editor.tables';
import { WikiLinkCompletionData, setWikiLinkCompletionData } from './markdown-editor.wiki-links';

type AuthoringMode = 'edit' | 'source';
type EditorMode = AuthoringMode | 'preview';
type UploadStatus = 'queued' | 'uploading' | 'error';

export type MarkdownEditorImageInputSource = 'picker' | 'paste' | 'drop';

export interface MarkdownEditorImageUploadResult {
  readonly source: string;
}

export interface MarkdownEditorImageUploadConfig {
  readonly sources: readonly MarkdownEditorImageInputSource[];
  readonly acceptedMimeTypes: readonly string[];
  readonly upload: (file: File) => Observable<MarkdownEditorImageUploadResult>;
}

export interface MarkdownEditorDirectImagePreviewConfig {
  readonly kind: 'direct';
}

export interface MarkdownEditorBlobImagePreviewConfig {
  readonly kind: 'blob';
  readonly revision: string | number;
  readonly load: (source: string) => Observable<Blob>;
}

export type MarkdownEditorImagePreviewConfig =
  MarkdownEditorDirectImagePreviewConfig | MarkdownEditorBlobImagePreviewConfig;

export interface MarkdownEditorImageConfig {
  readonly upload: MarkdownEditorImageUploadConfig | null;
  readonly preview: MarkdownEditorImagePreviewConfig;
}

export interface MarkdownEditorWikiLinkConfig extends MarkdownWikiLinkRenderConfig {
  readonly loadTargets: () => Observable<readonly MarkdownWikiLinkTargetGroup[]>;
}

export interface MarkdownEditorLabels {
  readonly mode: {
    readonly aria: string;
    readonly edit: string;
    readonly source: string;
    readonly preview: string;
  };
  readonly fullscreen: { readonly enter: string; readonly exit: string };
  readonly toolbar: { readonly aria: string };
  readonly commands: {
    readonly togglePreview: string;
    readonly toggleSource: string;
    readonly heading1: string;
    readonly heading2: string;
    readonly heading3: string;
    readonly heading4: string;
    readonly heading5: string;
    readonly heading6: string;
    readonly bold: string;
    readonly italic: string;
    readonly strikethrough: string;
    readonly quote: string;
    readonly unorderedList: string;
    readonly orderedList: string;
    readonly taskList: string;
    readonly horizontalRule: string;
    readonly link: string;
    readonly image: string;
    readonly inlineCode: string;
    readonly codeBlock: string;
    readonly table: string;
    readonly search: string;
  };
  readonly shortcutGroups: Readonly<
    Record<'view' | 'headings' | 'inline' | 'blocks' | 'media', string>
  >;
  readonly shortcuts: {
    readonly summary: string;
    readonly modifierHintMac: string;
    readonly modifierHintOther: string;
    readonly tabEscape: string;
  };
  readonly completions: string;
  readonly search: {
    readonly find: string;
    readonly replace: string;
    readonly next: string;
    readonly previous: string;
    readonly all: string;
    readonly matchCase: string;
    readonly byWord: string;
    readonly regexp: string;
    readonly replaceAll: string;
    readonly close: string;
    readonly goToLine: string;
    readonly go: string;
    readonly currentMatch: string;
    readonly onLine: string;
    readonly replacedMatches: string;
    readonly replacedMatchOnLine: string;
  };
  readonly preview: { readonly empty: string; readonly imageFailed: string };
  readonly upload: {
    readonly uploading: string;
    readonly retry: string;
    readonly dismiss: string;
    readonly failed: (fileName: string) => string;
    readonly unsupported: (fileName: string) => string;
  };
  readonly wikiLinks: { readonly registryUnavailable: string };
  readonly table: MarkdownTableEditorPhrases;
}

interface ImageUpload {
  id: number;
  file: File;
  anchor: number;
  status: UploadStatus;
}

interface UnsupportedImage {
  id: number;
  file: File;
}

interface PreviewImageError {
  index: number;
  source: string;
}

interface ResolvedShortcutGroup {
  id: 'view' | 'headings' | 'inline' | 'blocks' | 'media';
  commands: readonly MarkdownEditorCommandDefinition[];
}

interface ExternalScrollSnapshot {
  container: Element;
  top: number;
  left: number;
}

interface TableScrollSnapshot {
  external: ExternalScrollSnapshot;
  anchor: TableScrollAnchor;
  anchorTop: number;
  anchorLeft: number;
}

interface TableScrollAnchor {
  tableFrom: string;
  row: string;
  column: string;
}

interface FullscreenSnapshot {
  focusedElement: Element | null;
  externalScroll: ExternalScrollSnapshot | null;
}

const MARKDOWN_EDITOR_FULLSCREEN_ICON_PATHS = {
  enter: 'M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5',
  exit: 'M4 9h5V4M20 9h-5V4M4 15h5v5M20 15h-5v5',
} as const;

const MARKDOWN_EDITOR_TOOLBAR_ICON_PATHS = {
  togglePreview: 'M4 5h7v14H4zM15 5h5v14h-5z',
  toggleSource: 'M8 8 4 12l4 4M16 8l4 4-4 4',
  search: 'M17 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0M16 16l4 4',
  heading1: 'M4 5v14M12 5v14M4 12h8M16 11l2-2v10M16 19h4',
  heading2: 'M4 5v14M12 5v14M4 12h8M16 11a2 2 0 1 1 4 0c0 1.5-4 4.5-4 8h4',
  heading3: 'M4 5v14M12 5v14M4 12h8M16 10a2.5 2.5 0 1 1 2 4 2.5 2.5 0 1 1-2 4',
  heading4: 'M4 5v14M12 5v14M4 12h8M20 19V9l-4 6h5',
  heading5: 'M4 5v14M12 5v14M4 12h8M20 9h-4v4h2a3 3 0 1 1-2 5',
  heading6: 'M4 5v14M12 5v14M4 12h8M20 9h-1c-2 0-3 2-3 5v2a3 3 0 1 0 3-3h-3',
  bold: 'M7 4h6a4 4 0 0 1 0 8H7zm0 8h7a4 4 0 0 1 0 8H7z',
  italic: 'M10 4h8M6 20h8M15 4 9 20',
  strikethrough:
    'M7 5h10M6 12h12M9 19h6M16 8c0-2-1.5-3-4-3S8 6 8 8c0 1.7 1.3 2.6 4 3.3 2.7.7 4 1.6 4 3.7 0 2-1.5 4-4 4s-4-1.5-4-3',
  quote: 'M5 7h6v6H7c0 2 1 3 3 4M14 7h6v6h-4c0 2 1 3 3 4',
  unorderedList: 'M5 6h.01M5 12h.01M5 18h.01M9 6h11M9 12h11M9 18h11',
  orderedList: 'M4 5h1v3M4 8h2M4 11h2l-2 3h2M4 17h2l-2 3h2M10 6h10M10 12h10M10 18h10',
  taskList: 'M3 4h5v5H3zM3 15h5v5H3zM4.5 6.5l1 1L8 5M11 6.5h10M11 17.5h10',
  horizontalRule: 'M4 12h16',
  link: 'M10 13a5 5 0 0 0 7.1.1l2-2A5 5 0 0 0 12 4l-1.1 1.1M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1',
  image:
    'M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2M11 9a2 2 0 1 1-4 0 2 2 0 0 1 4 0M4 17l5-5 4 4 2-2 5 5',
  inlineCode: 'M8 8 4 12l4 4M16 8l4 4-4 4M14 4l-4 16',
  codeBlock: 'M8 8 4 12l4 4M16 8l4 4-4 4M13 5l-2 14',
  table:
    'M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1M3 9h18M3 15h18M9 4v16M15 4v16',
} satisfies Readonly<Record<MarkdownEditorCommandId, string>>;

let editorInstanceId = 0;

@Component({
  selector: 'ds-markdown-editor',
  standalone: true,
  imports: [CdkTrapFocus],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './markdown-editor.component.html',
  styleUrls: [
    './markdown-editor.component.scss',
    './markdown-editor.theme-shell.scss',
    './markdown-editor.theme-foundation.scss',
    './markdown-editor.theme-selection.scss',
    './markdown-editor.theme-presentation.scss',
    './markdown-editor.theme-highlighting.scss',
  ],
})
export class MarkdownEditorComponent implements AfterViewInit, AfterViewChecked, OnDestroy {
  private readonly markdownRenderer = inject(MarkdownRendererService);
  private readonly pageScrollLock = inject(ModalPageScrollLockService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly cspNonce = inject(CSP_NONCE);
  private readonly contentAttributesCompartment = new Compartment();
  private readonly phrasesCompartment = new Compartment();
  private readonly presentationCompartment = new Compartment();
  private readonly instanceId = ++editorInstanceId;
  protected readonly sourcePanelId = `markdown-editor-source-${this.instanceId}`;
  protected readonly previewPanelId = `markdown-editor-preview-${this.instanceId}`;
  private lastAuthoringMode: AuthoringMode = 'edit';
  private editorView: EditorView | null = null;
  private syncingInput = false;
  private focusPending = false;
  private restoreEditorFocus = false;
  private consumeShortcutsEscapeKeyup = false;
  private pendingImageInsertionPosition: number | null = null;
  private nextUploadId = 0;
  private currentWikiLinkCompletionData: WikiLinkCompletionData | null = null;
  private fullscreenSnapshot: FullscreenSnapshot | null = null;
  private releaseFullscreenPageScroll: (() => void) | null = null;
  private consumeFullscreenEscapeKeyup = false;
  private previewGeneration = 0;
  private previewSubscriptions: Subscription | null = null;
  private readonly previewObjectUrls = new Map<HTMLImageElement, string>();
  private readonly previewImageSources = new Map<number, string>();
  private renderedPreviewConfig: MarkdownEditorImagePreviewConfig | null = null;
  private renderedPreviewRevision: string | number | null = null;
  private renderedPreviewValue = '';
  private renderedPreviewDocument = '';
  private renderedPreviewActive = false;
  private tableInputScrollSnapshot: TableScrollSnapshot | null = null;
  private pendingTableScrollSnapshot: TableScrollSnapshot | null = null;
  private tableScrollRestoreGeneration = 0;
  private readonly editorScrollMouseDownListener = (event: MouseEvent): void => {
    const view = this.editorView!;
    if (event.target !== view.scrollDOM) {
      return;
    }
    this.handleEditorMouseDown(event, view);
  };
  private readonly fullscreenEscapeKeyupListener = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || !this.consumeFullscreenEscapeKeyup) {
      return;
    }
    this.disarmFullscreenEscapeKeyup();
    this.consumeKeyboardEvent(event);
  };

  @ViewChild('editorHeader', { static: true })
  private readonly editorHeader!: ElementRef<HTMLElement>;
  @ViewChild('editorTopPanels', { static: true })
  private readonly editorTopPanels!: ElementRef<HTMLElement>;
  @ViewChild('editorHost', { static: true }) private readonly editorHost!: ElementRef<HTMLElement>;
  @ViewChild('editorShell', { static: true })
  private readonly editorShell!: ElementRef<HTMLElement>;
  @ViewChild('editorFooter', { static: true })
  private readonly editorFooter!: ElementRef<HTMLElement>;
  @ViewChild('imageInput')
  private readonly imageInput?: ElementRef<HTMLInputElement>;
  @ViewChild('previewTab', { static: true })
  private readonly previewTab!: ElementRef<HTMLButtonElement>;
  @ViewChild('fullscreenToggle', { static: true })
  private readonly fullscreenToggle!: ElementRef<HTMLButtonElement>;

  readonly value = input.required<string>();
  readonly accessibleLabel = input.required<string>();
  readonly labels = input.required<MarkdownEditorLabels>();
  readonly imageConfig = input.required<MarkdownEditorImageConfig | null>();
  readonly imageInteractionsDisabled = input.required<boolean>();
  readonly wikiLinks = input.required<MarkdownEditorWikiLinkConfig | null>();
  readonly valueChange = output<string>();
  readonly imageUploadPendingChange = output<boolean>();

  protected readonly mode = signal<EditorMode>('edit');
  protected readonly fullscreen = signal(false);
  protected readonly fullscreenLabel = computed(() =>
    this.fullscreen() ? this.labels().fullscreen.exit : this.labels().fullscreen.enter,
  );
  protected readonly fullscreenIconPath = computed(() =>
    this.fullscreen()
      ? MARKDOWN_EDITOR_FULLSCREEN_ICON_PATHS.exit
      : MARKDOWN_EDITOR_FULLSCREEN_ICON_PATHS.enter,
  );
  protected readonly internalValue = signal('');
  protected readonly uploads = signal<readonly ImageUpload[]>([]);
  protected readonly unsupportedImages = signal<readonly UnsupportedImage[]>([]);
  protected readonly previewImageErrors = signal<readonly PreviewImageError[]>([]);
  protected readonly imageUploadPending = computed(() =>
    this.uploads().some((upload) => upload.status === 'queued' || upload.status === 'uploading'),
  );
  protected readonly uploading = computed(() =>
    this.uploads().some((upload) => upload.status === 'uploading'),
  );
  protected readonly uploadErrors = computed(() =>
    this.uploads().filter((upload) => upload.status === 'error'),
  );
  protected readonly wikiLinkRegistryUnavailable = signal(false);
  protected readonly imagePickerEnabled = computed(
    () => this.imageConfig()?.upload?.sources.includes('picker') ?? false,
  );
  protected readonly imageUploadInteractionsEnabled = computed(
    () => (this.imageConfig()?.upload ?? null) !== null && !this.imageInteractionsDisabled(),
  );
  protected readonly imagePickerInteractionsEnabled = computed(
    () => this.imagePickerEnabled() && !this.imageInteractionsDisabled(),
  );
  protected readonly acceptedImageMimeTypes = computed(() =>
    this.imageConfig()!
      .upload!.acceptedMimeTypes.filter((mimeType) => mimeType.startsWith('image/'))
      .join(','),
  );
  protected readonly previewHtml = computed(() => {
    const rendered = this.markdownRenderer.render(this.internalValue(), {
      wikiLinks: this.wikiLinks(),
    });
    return this.preparePreviewHtml(rendered);
  });
  protected readonly previewEmpty = computed(() => this.internalValue().trim() === '');
  protected readonly shortcutGroups = computed(() =>
    filterImageCommands(resolveShortcutGroups(), this.imagePickerEnabled()),
  );
  protected readonly toolbarGroups = computed(() => resolveToolbarGroups(this.shortcutGroups()));
  protected readonly shortcutModifierHint = computed(() =>
    this.editorPlatform() === 'mac'
      ? this.labels().shortcuts.modifierHintMac
      : this.labels().shortcuts.modifierHintOther,
  );
  protected readonly editTabId = `markdown-editor-edit-tab-${this.instanceId}`;
  protected readonly sourceTabId = `markdown-editor-source-tab-${this.instanceId}`;
  protected readonly previewTabId = `markdown-editor-preview-tab-${this.instanceId}`;

  constructor() {
    effect(() => {
      const value = this.value();
      const view = this.editorView;
      if (view === null) {
        this.internalValue.set(value);
        return;
      }
      if (view.state.doc.toString() === value) {
        return;
      }

      this.syncingInput = true;
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
        annotations: Transaction.addToHistory.of(false),
      });
      this.internalValue.set(value);
      this.syncingInput = false;
    });
    effect(() => {
      const contentAttributes = this.editorContentAttributes();
      const phrases = this.searchPhrases();
      const presentation = this.authoringPresentationExtensions(this.lastAuthoringMode);
      const view = this.editorView;
      if (view === null) {
        return;
      }
      view.dispatch({
        effects: [
          this.contentAttributesCompartment.reconfigure(
            EditorView.contentAttributes.of(contentAttributes),
          ),
          this.phrasesCompartment.reconfigure(EditorState.phrases.of(phrases)),
          this.presentationCompartment.reconfigure(presentation),
        ],
      });
    });
    effect(() => {
      const interactionsDisabled = this.imageInteractionsDisabled();
      const uploadConfig = this.imageConfig()?.upload ?? null;
      if (!interactionsDisabled && uploadConfig !== null) {
        this.processNextUpload();
      }
    });
    effect((onCleanup) => {
      const wikiLinks = this.wikiLinks();
      if (!isPlatformBrowser(this.platformId)) {
        return;
      }

      this.wikiLinkRegistryUnavailable.set(false);
      this.updateWikiLinkCompletionData(null);
      if (wikiLinks === null) {
        return;
      }
      const subscription = defer(() => wikiLinks.loadTargets())
        .pipe(
          take(1),
          throwIfEmpty(() => new Error('The wiki-link registry returned no snapshot.')),
        )
        .subscribe({
          next: (groups) => {
            this.updateWikiLinkCompletionData({
              namespaces: wikiLinks.namespaces,
              groups,
            });
          },
          error: () => this.wikiLinkRegistryUnavailable.set(true),
        });
      onCleanup(() => subscription.unsubscribe());
    });
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.editorView = new EditorView({
      parent: this.editorHost.nativeElement,
      state: EditorState.create({
        doc: this.value(),
        extensions: this.editorExtensions(),
      }),
    });
    this.editorView.scrollDOM.addEventListener('mousedown', this.editorScrollMouseDownListener);
    this.internalValue.set(this.value());
    this.editorView.dispatch({
      effects: setWikiLinkCompletionData.of(this.currentWikiLinkCompletionData),
    });
    if (this.focusPending) {
      this.focusPending = false;
      this.focusEditor(this.editorView);
    }
  }

  ngAfterViewChecked(): void {
    const pendingTableScrollSnapshot = this.pendingTableScrollSnapshot;
    this.pendingTableScrollSnapshot = null;
    this.restoreTableScroll(pendingTableScrollSnapshot);

    const previewConfig = this.imageConfig()?.preview ?? null;
    const previewRevision = previewConfig?.kind === 'blob' ? previewConfig.revision : null;
    const value = this.internalValue();
    const active = this.mode() === 'preview' && previewConfig?.kind === 'blob';
    const previewDocument = active ? this.previewHtml() : '';
    if (
      active === this.renderedPreviewActive &&
      previewConfig === this.renderedPreviewConfig &&
      previewRevision === this.renderedPreviewRevision &&
      value === this.renderedPreviewValue &&
      previewDocument === this.renderedPreviewDocument
    ) {
      return;
    }

    this.renderedPreviewActive = active;
    this.renderedPreviewConfig = previewConfig;
    this.renderedPreviewRevision = previewRevision;
    this.renderedPreviewValue = value;
    this.renderedPreviewDocument = previewDocument;
    this.clearPreviewResources();
    if (!active || previewConfig?.kind !== 'blob' || !isPlatformBrowser(this.platformId)) {
      return;
    }
    this.loadPreviewImages(previewConfig);
  }

  ngOnDestroy(): void {
    this.clearPreviewResources();
    this.disarmFullscreenEscapeKeyup();
    this.releaseFullscreenPageScroll?.();
    this.releaseFullscreenPageScroll = null;
    this.fullscreenSnapshot = null;
    this.editorView?.scrollDOM.removeEventListener('mousedown', this.editorScrollMouseDownListener);
    this.editorView?.destroy();
  }

  focus(): void {
    if (this.mode() === 'preview') {
      this.selectMode(this.lastAuthoringMode);
    }
    const view = this.editorView;
    if (view === null) {
      this.focusPending = true;
      return;
    }
    this.restoreFocus(true);
  }

  protected selectMode(mode: EditorMode): void {
    if (mode === this.mode()) {
      return;
    }
    this.cancelTableScrollRestore();
    const externalScroll = this.captureExternalScroll();
    if (mode === 'preview') {
      this.restoreEditorFocus = this.editorView?.hasFocus ?? false;
      this.mode.set('preview');
      if (this.restoreEditorFocus) {
        this.previewTab.nativeElement.focus({ preventScroll: true });
      }
      this.restoreExternalScroll(externalScroll);
      return;
    }

    const restoreEditorFocus = this.restoreEditorFocus;
    this.lastAuthoringMode = mode;
    this.reconfigureAuthoringPresentation(mode);
    this.mode.set(mode);
    this.restoreFocus(restoreEditorFocus);
    this.restoreEditorFocus = false;
    this.restoreExternalScroll(externalScroll);
  }

  protected onModeTabKeydown(event: KeyboardEvent): void {
    const target = event.currentTarget as HTMLButtonElement;
    const tablist = target.parentElement!;
    const tabs = Array.from(tablist.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    const currentIndex = tabs.indexOf(target);
    const nextIndex = modeTabIndex(event.key, currentIndex, tabs.length);
    if (nextIndex === null) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    tabs[nextIndex]!.focus();
  }

  protected onContainerKeydown(event: KeyboardEvent): void {
    if (
      this.fullscreen() &&
      event.key === 'Escape' &&
      !event.isComposing &&
      !event.defaultPrevented
    ) {
      this.consumeKeyboardEvent(event);
      this.armFullscreenEscapeKeyup();
      this.exitFullscreen();
      return;
    }
    if (this.consumeComposingEditorShortcut(event)) {
      return;
    }
    const command = findMarkdownEditorCommand(event, this.editorPlatform());
    if (command !== 'togglePreview' && command !== 'toggleSource') {
      return;
    }
    this.consumeKeyboardEvent(event);
    if (command === 'togglePreview') {
      this.selectMode(this.mode() === 'preview' ? this.lastAuthoringMode : 'preview');
      return;
    }
    const currentAuthoring = this.mode() === 'preview' ? this.lastAuthoringMode : this.mode();
    this.selectMode(currentAuthoring === 'edit' ? 'source' : 'edit');
  }

  protected toggleFullscreen(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    if (this.fullscreen()) {
      this.exitFullscreen();
      return;
    }
    this.enterFullscreen();
  }

  protected onToolbarKeydown(event: KeyboardEvent): void {
    const target = event.currentTarget as HTMLButtonElement;
    const toolbar = target.closest<HTMLElement>('[role="toolbar"]')!;
    const buttons = Array.from(
      toolbar.querySelectorAll<HTMLButtonElement>('[data-markdown-command]:not(:disabled)'),
    );
    const currentIndex = buttons.indexOf(target);
    const nextIndex = toolbarButtonIndex(event.key, currentIndex, buttons.length);
    if (nextIndex === null) {
      return;
    }
    event.preventDefault();
    buttons.forEach((button, index) => {
      button.tabIndex = index === nextIndex ? 0 : -1;
    });
    buttons[nextIndex]!.focus();
  }

  protected executeToolbarCommand(command: MarkdownEditorCommandDefinition): void {
    const view = this.editorView!;
    const handled = this.executeCommand(command.id, view);
    if (handled && command.id !== 'search' && command.id !== 'image') {
      this.focusEditor(view);
    }
  }

  protected toolbarCommandLabel(command: MarkdownEditorCommandDefinition): string {
    return `${this.labels().commands[command.id]} (${this.shortcutLabel(command)})`;
  }

  protected shortcutGroupLabel(group: ResolvedShortcutGroup): string {
    return this.labels().shortcutGroups[group.id];
  }

  protected toolbarIconPath(commandId: MarkdownEditorCommandId): string {
    return MARKDOWN_EDITOR_TOOLBAR_ICON_PATHS[commandId];
  }

  protected onShortcutsKeydown(event: KeyboardEvent): void {
    const summary = event.currentTarget as HTMLElement;
    const details = summary.parentElement as HTMLDetailsElement;
    if (event.key !== 'Escape' || !details.open) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.consumeShortcutsEscapeKeyup = true;
    details.open = false;
    summary.focus({ preventScroll: true });
  }

  protected onShortcutsKeyup(event: KeyboardEvent): void {
    if (event.key !== 'Escape' || !this.consumeShortcutsEscapeKeyup) {
      return;
    }
    this.consumeShortcutsEscapeKeyup = false;
    this.consumeKeyboardEvent(event);
  }

  protected onImageInput(event: Event): void {
    if (!this.imagePickerInteractionsEnabled()) {
      return;
    }
    const input = event.currentTarget as HTMLInputElement;
    const insertionPosition = this.pendingImageInsertionPosition ?? this.currentCursor();
    this.pendingImageInsertionPosition = null;
    this.queueImageUploads(Array.from(input.files ?? []), insertionPosition);
    input.value = '';
  }

  protected retryUpload(id: number): void {
    if (!this.imageUploadInteractionsEnabled()) {
      return;
    }
    this.uploads.update((uploads) =>
      uploads.map((upload) => (upload.id === id ? { ...upload, status: 'queued' } : upload)),
    );
    this.emitImageUploadPending();
    this.processNextUpload();
  }

  protected dismissUpload(id: number): void {
    this.uploads.update((uploads) => uploads.filter((upload) => upload.id !== id));
    this.processNextUpload();
    this.emitImageUploadPending();
  }

  protected dismissUnsupportedImage(id: number): void {
    this.unsupportedImages.update((images) => images.filter((image) => image.id !== id));
  }

  protected retryPreviewImage(index: number): void {
    const error = this.previewImageErrors().find((value) => value.index === index);
    const previewConfig = this.imageConfig()?.preview ?? null;
    const subscriptions = this.previewSubscriptions;
    const preview = this.editorShell.nativeElement.querySelector<HTMLElement>(
      '[data-testid="markdown-editor-preview-content"]',
    );
    const image = preview?.querySelectorAll<HTMLImageElement>('img').item(index) ?? null;
    if (
      error === undefined ||
      previewConfig?.kind !== 'blob' ||
      subscriptions === null ||
      image === null ||
      this.mode() !== 'preview'
    ) {
      return;
    }
    this.previewImageErrors.update((errors) => errors.filter((value) => value.index !== index));
    this.loadPreviewImage(
      previewConfig,
      index,
      error.source,
      image,
      this.previewGeneration,
      subscriptions,
    );
  }

  protected shortcutParts(command: MarkdownEditorCommandDefinition): readonly string[] {
    return formatMarkdownShortcut(command, this.editorPlatform());
  }

  protected shortcutLabel(command: MarkdownEditorCommandDefinition): string {
    return this.shortcutParts(command)
      .map((part) => (part === '⌘' ? 'Command' : part))
      .join(' + ');
  }

  private editorExtensions(): readonly Extension[] {
    return [
      ...markdownEditorFoundationExtensions,
      markdownEditorCspExtension(this.cspNonce),
      this.presentationCompartment.of(this.authoringPresentationExtensions('edit')),
      this.phrasesCompartment.of(EditorState.phrases.of(this.searchPhrases())),
      this.contentAttributesCompartment.of(
        EditorView.contentAttributes.of(this.editorContentAttributes()),
      ),
      panels({ topContainer: this.editorTopPanels.nativeElement }),
      EditorView.scrollMargins.of(() => this.editorScrollMargins()),
      keymap.of([
        {
          key: 'Tab',
          run: (view) => nextSnippetField(view) || this.indentSelection(view, 'more'),
        },
        {
          key: 'Shift-Tab',
          run: (view) => prevSnippetField(view) || this.indentSelection(view, 'less'),
        },
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...historyKeymap,
        ...searchKeymap,
      ]),
      EditorView.domEventHandlers({
        mousedown: (event, view) => this.handleEditorMouseDown(event, view),
        beforeinput: (_event, view) => this.prepareTableInputScroll(view),
        keydown: (event, view) => this.handleEditorKeydown(event, view),
        keyup: (event, view) => this.handleEditorKeyup(event, view),
        paste: (event, view) => this.handlePaste(event, view),
        drop: (event, view) => this.handleDrop(event, view),
        dragover: (event) => this.handleDragOver(event),
      }),
      EditorView.updateListener.of((update) => this.handleEditorUpdate(update)),
    ];
  }

  private editorScrollMargins(): Pick<Rect, 'top' | 'bottom'> {
    const browserWindow = this.editorShell.nativeElement.ownerDocument.defaultView!;
    const resolvedTop = Number.parseFloat(
      browserWindow.getComputedStyle(this.editorHeader.nativeElement).top,
    );
    const resolvedBottom = Number.parseFloat(
      browserWindow.getComputedStyle(this.editorFooter.nativeElement).bottom,
    );
    const topDisplacement = Number.isFinite(resolvedTop) && resolvedTop > 0 ? resolvedTop : 0;
    const bottomDisplacement =
      Number.isFinite(resolvedBottom) && resolvedBottom > 0 ? resolvedBottom : 0;
    return {
      top: this.editorHeader.nativeElement.offsetHeight + topDisplacement,
      bottom: this.editorFooter.nativeElement.offsetHeight + bottomDisplacement,
    };
  }

  private handleEditorUpdate(update: ViewUpdate): void {
    const tableInputScrollSnapshot = this.tableInputScrollSnapshot;
    this.tableInputScrollSnapshot = null;
    if (!update.changes.empty && this.uploads().length > 0) {
      this.uploads.update((uploads) =>
        uploads.map((upload) => ({
          ...upload,
          anchor: update.changes.mapPos(upload.anchor, 1),
        })),
      );
    }
    if (!update.docChanged || this.syncingInput) {
      return;
    }
    const externalScroll = markdownTableUpdatePreservesExternalScroll(update)
      ? (tableInputScrollSnapshot ?? this.captureTableScroll(update.view))
      : null;
    if (externalScroll === null) {
      this.cancelTableScrollRestore();
    }
    this.pendingTableScrollSnapshot = externalScroll;
    const value = update.state.doc.toString();
    this.internalValue.set(value);
    this.valueChange.emit(value);
    this.restoreTableScroll(externalScroll);
  }

  private captureTableInputScroll(view: EditorView, anchor?: HTMLElement): boolean {
    if (anchor === undefined && !markdownTableInputPreservesExternalScroll(view.state)) {
      this.tableInputScrollSnapshot = null;
    } else if (this.tableInputScrollSnapshot === null) {
      this.tableInputScrollSnapshot = this.captureTableScroll(view, anchor);
    }
    return false;
  }

  private prepareTableInputScroll(view: EditorView, anchor?: HTMLElement): boolean {
    this.cancelTableScrollRestore();
    return this.captureTableInputScroll(view, anchor);
  }

  private handleEditorMouseDown(event: MouseEvent, view: EditorView): boolean {
    this.cancelTableScrollRestore();
    if (event.button !== 0 || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) {
      return false;
    }
    const documentEnd = view.state.doc.length;
    const documentEndCoordinates = view.coordsAtPos(documentEnd, -1);
    if (documentEndCoordinates === null || event.clientY <= documentEndCoordinates.bottom) {
      return false;
    }

    event.preventDefault();
    view.dispatch({
      selection: EditorSelection.cursor(documentEnd),
      userEvent: 'select.pointer',
    });
    this.focusEditor(view);
    return true;
  }

  private handleEditorKeydown(event: KeyboardEvent, view: EditorView): boolean {
    this.prepareTableInputScroll(view);
    const verticalTableNavigationScroll =
      !event.isComposing &&
      !event.shiftKey &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      (event.key === 'ArrowUp' || event.key === 'ArrowDown')
        ? this.tableInputScrollSnapshot
        : null;
    if (this.consumeComposingEditorShortcut(event)) {
      return true;
    }
    const command = findMarkdownEditorCommand(event, this.editorPlatform());
    if (command === null) {
      this.restoreTableScroll(verticalTableNavigationScroll);
      return false;
    }

    const handled = this.executeCommand(command, view);
    if (handled) {
      this.consumeKeyboardEvent(event);
    }
    return handled;
  }

  private handleEditorKeyup(event: KeyboardEvent, view: EditorView): boolean {
    this.tableInputScrollSnapshot = null;
    if (event.isComposing || (event.key !== '`' && event.key !== '~')) {
      return false;
    }
    const result = autoCloseMarkdownFenceTransaction(
      view.state.doc.toString(),
      editorSelections(view),
      event.key,
    );
    if (result === null) {
      return false;
    }
    this.dispatchTransaction(view, result);
    return true;
  }

  private executeCommand(command: MarkdownEditorCommandId, view: EditorView): boolean {
    if (command === 'togglePreview') {
      this.selectMode('preview');
      return true;
    }
    if (command === 'toggleSource') {
      this.selectMode(this.mode() === 'source' ? 'edit' : 'source');
      return true;
    }
    if (command === 'search') {
      openSearchPanel(view);
      this.editorTopPanels.nativeElement
        .querySelector<HTMLInputElement>('.cm-search input[main-field]')
        ?.focus({ preventScroll: true });
      return true;
    }
    if (command === 'image') {
      if (!this.imagePickerInteractionsEnabled()) {
        return false;
      }
      this.pendingImageInsertionPosition = view.state.selection.main.head;
      this.imageInput?.nativeElement.click();
      return true;
    }
    if (command === 'link' || command === 'table') {
      return this.applySnippet(command, view);
    }

    const result = applyMarkdownCommandTransaction(
      command,
      view.state.doc.toString(),
      editorSelections(view),
    )!;
    this.dispatchTransaction(view, result);
    return true;
  }

  private applySnippet(command: 'link' | 'table', view: EditorView): boolean {
    if (view.state.selection.ranges.length !== 1) {
      const result = applyMarkdownCommandTransaction(
        command,
        view.state.doc.toString(),
        editorSelections(view),
      )!;
      this.dispatchTransaction(view, result);
      return true;
    }

    const selection = view.state.selection.main;
    const selectedText = view.state.sliceDoc(selection.from, selection.to);
    if (command === 'table' && selectedText.length > 0) {
      const result = applyMarkdownCommandTransaction(
        command,
        view.state.doc.toString(),
        editorSelections(view),
      )!;
      this.dispatchTransaction(view, result);
      return true;
    }
    const template =
      command === 'link'
        ? linkSnippet(selectedText)
        : '| ${1} | ${2} |\n| --- | --- |\n| ${3} | ${4} |\n${0}';
    snippet(template)(view, null, selection.from, selection.to);
    return true;
  }

  private indentSelection(view: EditorView, direction: 'more' | 'less'): boolean {
    const result = indentMarkdownLinesTransaction(
      view.state.doc.toString(),
      editorSelections(view),
      direction,
    );
    if (result !== null) {
      this.dispatchTransaction(view, result);
      return true;
    }
    return direction === 'more' ? indentMore(view) : indentLess(view);
  }

  private dispatchTransaction(view: EditorView, transaction: MarkdownTransactionResult): void {
    view.dispatch({
      changes: transaction.changes,
      selection: EditorSelection.create(
        transaction.selections.map((selection) =>
          EditorSelection.range(selection.anchor, selection.head),
        ),
      ),
      userEvent: 'input',
    });
  }

  private handlePaste(event: ClipboardEvent, view: EditorView): boolean {
    if (!this.imageSourceEnabled('paste')) {
      return false;
    }
    const files = Array.from(event.clipboardData?.items ?? [])
      .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null);
    if (files.length === 0) {
      return false;
    }
    event.preventDefault();
    event.stopPropagation();
    this.queueImageUploads(files, view.state.selection.main.head);
    return true;
  }

  private handleDrop(event: DragEvent, view: EditorView): boolean {
    if (!this.imageSourceEnabled('drop')) {
      return false;
    }
    const files = Array.from(event.dataTransfer?.files ?? []).filter((file) =>
      file.type.startsWith('image/'),
    );
    if (files.length === 0) {
      return false;
    }
    event.preventDefault();
    event.stopPropagation();
    const position = view.posAtCoords({ x: event.clientX, y: event.clientY });
    this.queueImageUploads(files, position ?? view.state.selection.main.head);
    return true;
  }

  private handleDragOver(event: DragEvent): boolean {
    if (!this.imageSourceEnabled('drop')) {
      return false;
    }
    const hasImage = Array.from(event.dataTransfer?.items ?? []).some(
      (item) => item.kind === 'file' && item.type.startsWith('image/'),
    );
    if (!hasImage) {
      return false;
    }
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'copy';
    return true;
  }

  private queueImageUploads(files: readonly File[], anchor: number): void {
    const uploadConfig = this.imageConfig()!.upload!;
    const acceptedMimeTypes = new Set(uploadConfig.acceptedMimeTypes);
    const images = files.filter(
      (file) => file.type.startsWith('image/') && acceptedMimeTypes.has(file.type),
    );
    const unsupported = files.filter(
      (file) => !file.type.startsWith('image/') || !acceptedMimeTypes.has(file.type),
    );
    if (unsupported.length > 0) {
      this.unsupportedImages.update((current) => [
        ...current,
        ...unsupported.map((file) => ({ id: ++this.nextUploadId, file })),
      ]);
    }
    if (images.length === 0) {
      return;
    }
    const queued = images.map((file) => ({
      id: ++this.nextUploadId,
      file,
      anchor,
      status: 'queued' as const,
    }));
    this.uploads.update((uploads) => [...uploads, ...queued]);
    this.emitImageUploadPending();
    this.processNextUpload();
  }

  private processNextUpload(): void {
    if (this.imageInteractionsDisabled()) {
      return;
    }
    if (this.uploads().some((upload) => upload.status === 'uploading')) {
      return;
    }
    if (this.uploads().some((upload) => upload.status === 'error')) {
      return;
    }
    const next = this.uploads().find((upload) => upload.status === 'queued');
    if (next === undefined) {
      return;
    }
    const uploadConfig = this.imageConfig()?.upload ?? null;
    if (uploadConfig === null) {
      return;
    }
    this.updateUploadStatus(next.id, 'uploading');
    defer(() => uploadConfig.upload(next.file))
      .pipe(
        take(1),
        throwIfEmpty(() => new Error('The image upload returned no result.')),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (result) => {
          const current = this.uploads().find((upload) => upload.id === next.id)!;
          const view = this.editorView!;
          view.dispatch({
            changes: {
              from: current.anchor,
              to: current.anchor,
              insert: markdownImage(next.file.name, result.source),
            },
            userEvent: 'input',
          });
          this.uploads.update((uploads) => uploads.filter((upload) => upload.id !== next.id));
          this.processNextUpload();
          this.emitImageUploadPending();
        },
        error: () => {
          this.updateUploadStatus(next.id, 'error');
          this.emitImageUploadPending();
        },
      });
  }

  private preparePreviewHtml(rendered: string): string {
    const previewConfig = this.imageConfig()?.preview ?? null;
    this.previewImageSources.clear();
    if (previewConfig?.kind !== 'blob') {
      return rendered;
    }
    if (!isPlatformBrowser(this.platformId)) {
      return '';
    }

    const template = this.document.createElement('template');
    template.innerHTML = rendered;
    let index = 0;
    for (const image of template.content.querySelectorAll<HTMLImageElement>('img')) {
      const source = image.getAttribute('src');
      if (source === null) {
        index += 1;
        continue;
      }
      image.removeAttribute('src');
      this.previewImageSources.set(index, source);
      index += 1;
    }
    return template.innerHTML;
  }

  private loadPreviewImages(previewConfig: MarkdownEditorBlobImagePreviewConfig): void {
    const preview = this.editorShell.nativeElement.querySelector<HTMLElement>(
      '[data-testid="markdown-editor-preview-content"]',
    )!;

    const generation = this.previewGeneration;
    const subscriptions = new Subscription();
    this.previewSubscriptions = subscriptions;
    const images = preview.querySelectorAll<HTMLImageElement>('img');
    for (const [index, source] of this.previewImageSources) {
      const image = images.item(index)!;
      this.loadPreviewImage(previewConfig, index, source, image, generation, subscriptions);
    }
  }

  private loadPreviewImage(
    previewConfig: MarkdownEditorBlobImagePreviewConfig,
    index: number,
    source: string,
    image: HTMLImageElement,
    generation: number,
    subscriptions: Subscription,
  ): void {
    const browserUrl = this.document.defaultView!.URL;
    subscriptions.add(
      defer(() => previewConfig.load(source))
        .pipe(
          take(1),
          throwIfEmpty(() => new Error('The image preview loader returned no Blob.')),
        )
        .subscribe({
          next: (blob) => {
            if (generation !== this.previewGeneration || !image.isConnected) {
              return;
            }
            if (!blob.type.startsWith('image/')) {
              this.reportPreviewImageError(index, source, image, generation);
              return;
            }
            const objectUrl = browserUrl.createObjectURL(blob);
            if (generation !== this.previewGeneration || !image.isConnected) {
              browserUrl.revokeObjectURL(objectUrl);
              return;
            }
            this.previewObjectUrls.set(image, objectUrl);
            const onLoad = (): void => image.removeEventListener('error', onError);
            const onError = (): void => {
              image.removeEventListener('load', onLoad);
              this.reportPreviewImageError(index, source, image, generation);
            };
            image.addEventListener('load', onLoad, { once: true });
            image.addEventListener('error', onError, { once: true });
            subscriptions.add(() => {
              image.removeEventListener('load', onLoad);
              image.removeEventListener('error', onError);
            });
            image.setAttribute('src', objectUrl);
            this.previewImageErrors.update((errors) =>
              errors.filter((error) => error.index !== index),
            );
          },
          error: () => this.reportPreviewImageError(index, source, image, generation),
        }),
    );
  }

  private reportPreviewImageError(
    index: number,
    source: string,
    image: HTMLImageElement,
    generation: number,
  ): void {
    if (generation !== this.previewGeneration || !image.isConnected) {
      return;
    }
    const objectUrl = this.previewObjectUrls.get(image);
    if (objectUrl !== undefined) {
      if (image.getAttribute('src') === objectUrl) {
        image.removeAttribute('src');
      }
      this.document.defaultView?.URL.revokeObjectURL(objectUrl);
      this.previewObjectUrls.delete(image);
    }
    this.previewImageErrors.update((errors) => [
      ...errors.filter((error) => error.index !== index),
      { index, source },
    ]);
  }

  private clearPreviewResources(): void {
    this.previewGeneration += 1;
    this.previewSubscriptions?.unsubscribe();
    this.previewSubscriptions = null;
    this.previewImageErrors.set([]);
    const browserUrl = this.document.defaultView?.URL;
    for (const [image, objectUrl] of this.previewObjectUrls) {
      if (image.getAttribute('src') === objectUrl) {
        image.removeAttribute('src');
      }
      browserUrl?.revokeObjectURL(objectUrl);
    }
    this.previewObjectUrls.clear();
  }

  private imageSourceEnabled(source: MarkdownEditorImageInputSource): boolean {
    return (
      !this.imageInteractionsDisabled() &&
      (this.imageConfig()?.upload?.sources.includes(source) ?? false)
    );
  }

  private updateUploadStatus(id: number, status: UploadStatus): void {
    this.uploads.update((uploads) =>
      uploads.map((upload) => (upload.id === id ? { ...upload, status } : upload)),
    );
  }

  private emitImageUploadPending(): void {
    this.imageUploadPendingChange.emit(this.imageUploadPending());
  }

  private currentCursor(): number {
    return this.editorView!.state.selection.main.head;
  }

  private enterFullscreen(): void {
    const browserWindow = this.document.defaultView!;

    this.fullscreenSnapshot = {
      focusedElement: this.document.activeElement,
      externalScroll: this.captureExternalScroll(),
    };
    this.releaseFullscreenPageScroll = this.pageScrollLock.acquire();
    this.fullscreen.set(true);
    browserWindow.requestAnimationFrame(() => {
      if (this.destroyRef.destroyed || !this.fullscreen()) {
        return;
      }
      const view = this.editorView;
      view?.requestMeasure();
      this.fullscreenToggle.nativeElement.focus({ preventScroll: true });
      if (view !== null && this.mode() !== 'preview') {
        view.dispatch({
          effects: EditorView.scrollIntoView(view.state.selection.main, { y: 'center' }),
        });
      }
    });
  }

  private armFullscreenEscapeKeyup(): void {
    this.consumeFullscreenEscapeKeyup = true;
    this.document.addEventListener('keyup', this.fullscreenEscapeKeyupListener, true);
  }

  private disarmFullscreenEscapeKeyup(): void {
    if (!this.consumeFullscreenEscapeKeyup) {
      return;
    }
    this.consumeFullscreenEscapeKeyup = false;
    this.document.removeEventListener('keyup', this.fullscreenEscapeKeyupListener, true);
  }

  private exitFullscreen(): void {
    const snapshot = this.fullscreenSnapshot!;
    const browserWindow = this.document.defaultView!;

    this.fullscreen.set(false);
    this.fullscreenSnapshot = null;
    this.releaseFullscreenPageScroll?.();
    this.releaseFullscreenPageScroll = null;
    browserWindow.requestAnimationFrame(() => {
      if (this.destroyRef.destroyed) {
        return;
      }
      this.editorView?.requestMeasure();
      this.restoreFullscreenFocus(snapshot.focusedElement);
    });
    this.restoreExternalScroll(snapshot.externalScroll);
  }

  private restoreFullscreenFocus(focusedElement: Element | null): void {
    const browserWindow = this.document.defaultView;
    if (
      browserWindow !== null &&
      focusedElement instanceof browserWindow.HTMLElement &&
      focusedElement.isConnected
    ) {
      focusedElement.focus({ preventScroll: true });
      return;
    }
    this.fullscreenToggle.nativeElement.focus({ preventScroll: true });
  }

  private restoreFocus(shouldFocus: boolean): void {
    const view = this.editorView!;
    if (shouldFocus) {
      this.focusEditor(view);
      this.document.defaultView?.requestAnimationFrame(() => {
        if (
          !this.destroyRef.destroyed &&
          this.editorView === view &&
          this.mode() !== 'preview' &&
          !view.hasFocus
        ) {
          this.focusEditor(view);
        }
      });
    }
  }

  private focusEditor(view: EditorView): void {
    view.contentDOM.focus({ preventScroll: true });
  }

  private captureExternalScroll(): ExternalScrollSnapshot | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    const browserWindow = this.document.defaultView!;

    let container = this.editorHost.nativeElement.parentElement;
    while (container !== null) {
      const overflowY = browserWindow.getComputedStyle(container).overflowY;
      if (
        (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
        container.scrollHeight > container.clientHeight
      ) {
        return {
          container,
          top: container.scrollTop,
          left: container.scrollLeft,
        };
      }
      container = container.parentElement;
    }

    const pageScroller = this.document.scrollingElement;
    if (!pageScroller) {
      return null;
    }
    return {
      container: pageScroller,
      top: pageScroller.scrollTop,
      left: pageScroller.scrollLeft,
    };
  }

  private restoreExternalScroll(snapshot: ExternalScrollSnapshot | null): void {
    if (snapshot === null) {
      return;
    }
    const browserWindow = this.document.defaultView!;
    const restore = (): void => {
      if (this.destroyRef.destroyed) {
        return;
      }
      snapshot.container.scrollTop = snapshot.top;
      snapshot.container.scrollLeft = snapshot.left;
    };
    restore();
    browserWindow.requestAnimationFrame(() => {
      restore();
      browserWindow.requestAnimationFrame(restore);
    });
  }

  private captureTableScroll(view: EditorView, anchor?: HTMLElement): TableScrollSnapshot | null {
    const external = this.captureExternalScroll();
    if (external === null || !this.tableEditorFitsViewport(external.container)) {
      return null;
    }
    const element =
      anchor ??
      view.dom.querySelector<HTMLElement>('[data-table-cell="true"][data-active-cell="true"]') ??
      view.dom.querySelector<HTMLElement>('[data-table-cell="true"]');
    const tableFrom = element?.dataset['tableFrom'];
    const row = element?.dataset['row'];
    const column = element?.dataset['column'];
    if (element === null || tableFrom === undefined || row === undefined || column === undefined) {
      return null;
    }
    const anchorBounds = element.getBoundingClientRect();
    return {
      external,
      anchor: { tableFrom, row, column },
      anchorTop: anchorBounds.top,
      anchorLeft: anchorBounds.left,
    };
  }

  private restoreTableScroll(snapshot: TableScrollSnapshot | null): void {
    const browserWindow = this.document.defaultView;
    if (snapshot === null || browserWindow === null) {
      return;
    }
    const generation = ++this.tableScrollRestoreGeneration;
    const restore = (): void => {
      if (this.destroyRef.destroyed || generation !== this.tableScrollRestoreGeneration) {
        return;
      }
      const { tableFrom, row, column } = snapshot.anchor;
      const element = this.editorHost.nativeElement.querySelector<HTMLElement>(
        `[data-table-cell="true"][data-table-from="${tableFrom}"][data-row="${row}"][data-column="${column}"]`,
      );
      if (element === null) {
        this.scrollElementInstantly(
          snapshot.external.container,
          snapshot.external.top,
          snapshot.external.left,
        );
        return;
      }
      const anchorBounds = element.getBoundingClientRect();
      this.scrollElementInstantly(
        snapshot.external.container,
        snapshot.external.container.scrollTop + anchorBounds.top - snapshot.anchorTop,
        snapshot.external.container.scrollLeft + anchorBounds.left - snapshot.anchorLeft,
      );
    };
    restore();
    browserWindow.requestAnimationFrame(() => {
      restore();
      browserWindow.requestAnimationFrame(restore);
    });
  }

  private tableEditorFitsViewport(container: Element): boolean {
    const browserWindow = this.document.defaultView!;
    const editorBounds = this.editorShell.nativeElement.getBoundingClientRect();
    const viewportBounds =
      container === this.document.scrollingElement
        ? { bottom: browserWindow.innerHeight, top: 0 }
        : container.getBoundingClientRect();
    return editorBounds.top > viewportBounds.top && editorBounds.bottom <= viewportBounds.bottom;
  }

  private cancelTableScrollRestore(): void {
    this.tableScrollRestoreGeneration += 1;
    this.pendingTableScrollSnapshot = null;
  }

  private scrollElementInstantly(container: Element, top: number, left: number): void {
    if (typeof container.scrollTo === 'function') {
      container.scrollTo({ behavior: 'instant', left, top });
      return;
    }
    container.scrollTop = top;
    container.scrollLeft = left;
  }

  private consumeKeyboardEvent(event: KeyboardEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  private consumeComposingEditorShortcut(event: KeyboardEvent): boolean {
    if (
      !event.isComposing ||
      findMarkdownEditorCommand(keyboardEventWithoutComposition(event), this.editorPlatform()) ===
        null
    ) {
      return false;
    }
    this.consumeKeyboardEvent(event);
    return true;
  }

  private editorPlatform(): 'mac' | 'other' {
    const navigator = this.document.defaultView?.navigator;
    return navigator !== undefined && /Mac|iPhone|iPad/.test(navigator.platform) ? 'mac' : 'other';
  }

  private searchPhrases(): Record<string, string> {
    const labels = this.labels();
    return {
      Completions: labels.completions,
      Find: labels.search.find,
      Replace: labels.search.replace,
      next: labels.search.next,
      previous: labels.search.previous,
      all: labels.search.all,
      'match case': labels.search.matchCase,
      'by word': labels.search.byWord,
      regexp: labels.search.regexp,
      replace: labels.search.replace,
      'replace all': labels.search.replaceAll,
      close: labels.search.close,
      'Go to line': labels.search.goToLine,
      go: labels.search.go,
      'current match': labels.search.currentMatch,
      'on line': labels.search.onLine,
      'replaced $ matches': labels.search.replacedMatches,
      'replaced match on line $': labels.search.replacedMatchOnLine,
    };
  }

  private editorContentAttributes(): Record<string, string> {
    return {
      'aria-label': this.accessibleLabel(),
      spellcheck: 'true',
    };
  }

  private authoringPresentationExtensions(mode: AuthoringMode): Extension {
    if (mode === 'source') {
      return [
        EditorView.editorAttributes.of({ class: 'cm-markdown-editor-selection-drawn' }),
        drawSelection(),
      ];
    }
    return [
      EditorView.editorAttributes.of({ class: 'cm-markdown-editor-selection-native' }),
      markdownPresentation,
      markdownTableEditor({
        locale: this.document.documentElement.lang || 'en',
        phrases: this.labels().table,
        captureScrollAnchor: (view, element) => {
          this.prepareTableInputScroll(view, element);
        },
      }),
    ];
  }

  private reconfigureAuthoringPresentation(mode: AuthoringMode): void {
    this.editorView?.dispatch({
      effects: this.presentationCompartment.reconfigure(this.authoringPresentationExtensions(mode)),
    });
  }

  private updateWikiLinkCompletionData(data: WikiLinkCompletionData | null): void {
    this.currentWikiLinkCompletionData = data;
    this.editorView?.dispatch({ effects: setWikiLinkCompletionData.of(data) });
  }
}

function resolveShortcutGroups(): readonly ResolvedShortcutGroup[] {
  const commandsById = new Map(
    MARKDOWN_EDITOR_COMMANDS.map((command) => [command.id, command] as const),
  );
  return MARKDOWN_EDITOR_SHORTCUT_GROUPS.map((group) => ({
    id: group.id,
    commands: group.commandIds.map((commandId) => {
      return commandsById.get(commandId)!;
    }),
  }));
}

function resolveToolbarGroups(
  shortcutGroups: readonly ResolvedShortcutGroup[],
): readonly ResolvedShortcutGroup[] {
  return shortcutGroups
    .map((group) => ({
      ...group,
      commands: group.commands.filter(
        (command) => command.id !== 'togglePreview' && command.id !== 'toggleSource',
      ),
    }))
    .filter((group) => group.commands.length > 0);
}

function filterImageCommands(
  shortcutGroups: readonly ResolvedShortcutGroup[],
  imageUploadsEnabled: boolean,
): readonly ResolvedShortcutGroup[] {
  if (imageUploadsEnabled) {
    return shortcutGroups;
  }
  return shortcutGroups
    .map((group) => ({
      ...group,
      commands: group.commands.filter((command) => command.id !== 'image'),
    }))
    .filter((group) => group.commands.length > 0);
}

function editorSelections(view: EditorView): readonly MarkdownSelection[] {
  return view.state.selection.ranges.map((selection) => ({
    anchor: selection.anchor,
    head: selection.head,
  }));
}

function modeTabIndex(key: string, currentIndex: number, tabCount: number): number | null {
  if (key === 'Home') return 0;
  if (key === 'End') return tabCount - 1;
  if (key === 'ArrowRight' || key === 'ArrowDown') return (currentIndex + 1) % tabCount;
  if (key === 'ArrowLeft' || key === 'ArrowUp') return (currentIndex - 1 + tabCount) % tabCount;
  return null;
}

function toolbarButtonIndex(key: string, currentIndex: number, buttonCount: number): number | null {
  if (key === 'Home') return 0;
  if (key === 'End') return buttonCount - 1;
  if (key === 'ArrowRight') return (currentIndex + 1) % buttonCount;
  if (key === 'ArrowLeft') return (currentIndex - 1 + buttonCount) % buttonCount;
  return null;
}

function linkSnippet(selectedText: string): string {
  if (selectedText === '') {
    return '[${1}](${2})${0}';
  }
  return `[${escapeSnippetText(selectedText)}](${'${1}'})${'${0}'}`;
}

function escapeSnippetText(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('[', '\\[')
    .replaceAll(']', '\\]')
    .replaceAll('$', '\\$')
    .replaceAll('{', '\\{')
    .replaceAll('}', '\\}');
}

function markdownImage(fileName: string, source: string): string {
  const alt = fileName
    .replaceAll('\\', '\\\\')
    .replaceAll('[', '\\[')
    .replaceAll(']', '\\]')
    .replaceAll(/\r?\n/g, ' ');
  const url = source.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)');
  return `![${alt}](${url})`;
}

function keyboardEventWithoutComposition(event: KeyboardEvent): MarkdownKeyboardEvent {
  return {
    code: event.code,
    key: event.key,
    altKey: event.altKey,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
    shiftKey: event.shiftKey,
    isComposing: false,
  };
}
