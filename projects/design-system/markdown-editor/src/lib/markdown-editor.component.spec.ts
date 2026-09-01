import { CSP_NONCE, PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EMPTY, of, Subject, throwError } from 'rxjs';
import { ModalPageScrollLockService } from '@alittlemoron/design-system';
import {
  MarkdownEditorComponent,
  type MarkdownEditorImageConfig,
  type MarkdownEditorLabels,
  type MarkdownEditorWikiLinkConfig,
} from './markdown-editor.component';

const IMAGE_SOURCE = '/content/image.png';

const LABELS: MarkdownEditorLabels = {
  mode: { aria: 'Editor mode', edit: 'Edit', source: 'Source', preview: 'Preview' },
  fullscreen: { enter: 'Enter fullscreen', exit: 'Exit fullscreen' },
  toolbar: { aria: 'Formatting' },
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
    image: 'Image',
    inlineCode: 'Inline code',
    codeBlock: 'Code block',
    table: 'Table',
    search: 'Search',
  },
  shortcutGroups: {
    view: 'View',
    headings: 'Headings',
    inline: 'Inline',
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
  preview: { empty: 'Nothing to preview', imageFailed: 'Could not load image preview.' },
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

describe('MarkdownEditorComponent', () => {
  let fixture: ComponentFixture<MarkdownEditorComponent>;
  let createObjectUrlDescriptor: PropertyDescriptor | undefined;
  let revokeObjectUrlDescriptor: PropertyDescriptor | undefined;
  let acquirePageScrollLock: jest.Mock;
  let releasePageScrollLock: jest.Mock;

  beforeEach(async () => {
    createObjectUrlDescriptor = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
    revokeObjectUrlDescriptor = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');
    releasePageScrollLock = jest.fn();
    acquirePageScrollLock = jest.fn(() => releasePageScrollLock);
    await TestBed.configureTestingModule({
      imports: [MarkdownEditorComponent],
      providers: [
        { provide: CSP_NONCE, useValue: null },
        { provide: ModalPageScrollLockService, useValue: { acquire: acquirePageScrollLock } },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    fixture?.destroy();
    restoreUrlMethod('createObjectURL', createObjectUrlDescriptor);
    restoreUrlMethod('revokeObjectURL', revokeObjectUrlDescriptor);
    jest.restoreAllMocks();
  });

  it('renders an accessible editor and uses caller-provided labels', () => {
    createFixture({ value: '# Hello' });

    expect(editorContent().getAttribute('aria-label')).toBe('Article body');
    expect(editorContent().textContent).toContain('Hello');
    expect(query('[role="tablist"]').getAttribute('aria-label')).toBe('Editor mode');
    expect(query('[data-testid="markdown-editor-preview-tab"]').textContent).toContain('Preview');
  });

  it('switches edit, source, and preview modes without rebuilding CodeMirror', () => {
    createFixture({ value: '# Heading' });
    const editor = query('.cm-editor');

    query<HTMLButtonElement>('[data-testid="markdown-editor-source-tab"]').click();
    fixture.detectChanges();
    expect(query('.cm-editor')).toBe(editor);
    expect(editor.classList).toContain('cm-markdown-editor-selection-drawn');

    query<HTMLButtonElement>('[data-testid="markdown-editor-preview-tab"]').click();
    fixture.detectChanges();
    expect(query<HTMLElement>('[data-testid="markdown-editor-source-panel"]').hidden).toBe(true);
    expect(query<HTMLElement>('[data-testid="markdown-editor-preview-panel"]').hidden).toBe(false);

    fixture.componentInstance.focus();
    fixture.detectChanges();
    expect(query<HTMLElement>('[data-testid="markdown-editor-source-panel"]').hidden).toBe(false);
    expect(document.activeElement).toBe(editorContent());
  });

  it('applies toolbar formatting through minimal editor transactions', () => {
    const values: string[] = [];
    createFixture({ value: 'Hello world' });
    fixture.componentInstance.valueChange.subscribe((value) => values.push(value));
    const view = query('.cm-editor');
    editorContent().focus();
    editorContent().dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        code: 'KeyB',
        key: 'b',
        metaKey: /Mac|iPhone|iPad/.test(navigator.platform),
        ctrlKey: !/Mac|iPhone|iPad/.test(navigator.platform),
      }),
    );

    expect(values.at(-1)).toBe('****Hello world');
    expect(query('.cm-editor')).toBe(view);
  });

  it('uses modal semantics and the shared page lock in fullscreen', () => {
    createFixture();
    const shell = query<HTMLElement>('[data-testid="markdown-editor-shell"]');
    const toggle = query<HTMLButtonElement>('[data-testid="markdown-editor-fullscreen-toggle"]');

    toggle.click();
    fixture.detectChanges();
    expect(acquirePageScrollLock).toHaveBeenCalledTimes(1);
    expect(shell.getAttribute('role')).toBe('dialog');
    expect(shell.getAttribute('aria-modal')).toBe('true');
    expect(toggle.getAttribute('aria-label')).toBe(LABELS.fullscreen.exit);

    toggle.click();
    fixture.detectChanges();
    expect(releasePageScrollLock).toHaveBeenCalledTimes(1);
    expect(shell.getAttribute('role')).toBeNull();
  });

  it('keeps image input sources independent and inserts an uploaded pasted image', () => {
    const upload = jest.fn(() => of({ source: IMAGE_SOURCE }));
    const imageConfig: MarkdownEditorImageConfig = {
      upload: {
        sources: ['paste'],
        acceptedMimeTypes: ['image/png'],
        upload,
      },
      preview: { kind: 'direct' },
    };
    const values: string[] = [];
    const pending: boolean[] = [];
    createFixture({ imageConfig });
    fixture.componentInstance.valueChange.subscribe((value) => values.push(value));
    fixture.componentInstance.imageUploadPendingChange.subscribe((value) => pending.push(value));
    const file = new File(['image'], 'pasted.png', { type: 'image/png' });
    const paste = imagePasteEvent(file);

    editorContent().dispatchEvent(paste);
    fixture.detectChanges();

    expect(paste.defaultPrevented).toBe(true);
    expect(upload).toHaveBeenCalledWith(file);
    expect(values.at(-1)).toBe(`![pasted.png](${IMAGE_SOURCE})`);
    expect(pending).toEqual([true, false]);
    expect(fixture.nativeElement.querySelector('input[type="file"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-markdown-command="image"]')).toBeNull();
  });

  it('does not consume image sources that were not enabled', () => {
    const upload = jest.fn(() => of({ source: IMAGE_SOURCE }));
    createFixture({
      imageConfig: {
        upload: { sources: ['picker'], acceptedMimeTypes: ['image/png'], upload },
        preview: { kind: 'direct' },
      },
    });
    const paste = imagePasteEvent(new File(['image'], 'pasted.png', { type: 'image/png' }));

    editorContent().dispatchEvent(paste);

    expect(upload).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('input[type="file"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-markdown-command="image"]')).not.toBeNull();
  });

  it('queues picker files sequentially and preserves their insertion order', () => {
    const firstUpload = new Subject<{ source: string }>();
    const secondUpload = new Subject<{ source: string }>();
    const upload = jest.fn().mockReturnValueOnce(firstUpload).mockReturnValueOnce(secondUpload);
    const values: string[] = [];
    createFixture({
      value: 'tail',
      imageConfig: {
        upload: { sources: ['picker'], acceptedMimeTypes: ['image/png'], upload },
        preview: { kind: 'direct' },
      },
    });
    fixture.componentInstance.valueChange.subscribe((value) => values.push(value));
    const input = query<HTMLInputElement>('input[type="file"]');
    const first = new File(['first'], 'first.png', { type: 'image/png' });
    const second = new File(['second'], 'second.png', { type: 'image/png' });

    query<HTMLButtonElement>('[data-markdown-command="image"]').click();
    setInputFiles(input, [first, second]);
    input.dispatchEvent(new Event('change'));

    expect(upload).toHaveBeenCalledTimes(1);
    expect(upload).toHaveBeenNthCalledWith(1, first);
    firstUpload.next({ source: '/first.png' });
    expect(upload).toHaveBeenCalledTimes(2);
    expect(upload).toHaveBeenNthCalledWith(2, second);
    secondUpload.next({ source: '/second.png' });

    expect(values.at(-1)).toBe('![first.png](/first.png)![second.png](/second.png)tail');
  });

  it('stops a failed queue until retry and then resumes later files', () => {
    const upload = jest
      .fn()
      .mockReturnValueOnce(throwError(() => new Error('offline')))
      .mockReturnValueOnce(of({ source: '/first.png' }))
      .mockReturnValueOnce(of({ source: '/second.png' }));
    const values: string[] = [];
    createFixture({
      imageConfig: {
        upload: { sources: ['picker'], acceptedMimeTypes: ['image/png'], upload },
        preview: { kind: 'direct' },
      },
    });
    fixture.componentInstance.valueChange.subscribe((value) => values.push(value));
    const input = query<HTMLInputElement>('input[type="file"]');
    setInputFiles(input, [
      new File(['first'], 'first.png', { type: 'image/png' }),
      new File(['second'], 'second.png', { type: 'image/png' }),
    ]);

    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(upload).toHaveBeenCalledTimes(1);
    expect(query('[data-testid="markdown-editor-upload-error"]').textContent).toContain(
      'first.png',
    );

    query<HTMLButtonElement>('[data-testid="markdown-editor-upload-retry"]').click();
    fixture.detectChanges();
    expect(upload).toHaveBeenCalledTimes(3);
    expect(values.at(-1)).toBe('![first.png](/first.png)![second.png](/second.png)');
  });

  it('pauses a queued upload while interactions are disabled and resumes it afterward', () => {
    const firstUpload = new Subject<{ source: string }>();
    const upload = jest
      .fn()
      .mockReturnValueOnce(firstUpload)
      .mockReturnValueOnce(of({ source: '/second.png' }));
    createFixture({
      imageConfig: {
        upload: { sources: ['picker'], acceptedMimeTypes: ['image/png'], upload },
        preview: { kind: 'direct' },
      },
    });
    const input = query<HTMLInputElement>('input[type="file"]');
    setInputFiles(input, [
      new File(['first'], 'first.png', { type: 'image/png' }),
      new File(['second'], 'second.png', { type: 'image/png' }),
    ]);

    input.dispatchEvent(new Event('change'));
    fixture.componentRef.setInput('imageInteractionsDisabled', true);
    fixture.detectChanges();
    firstUpload.next({ source: '/first.png' });
    expect(upload).toHaveBeenCalledTimes(1);

    fixture.componentRef.setInput('imageInteractionsDisabled', false);
    fixture.detectChanges();
    expect(upload).toHaveBeenCalledTimes(2);
  });

  it('handles dropped images only when the drop source is enabled', () => {
    const upload = jest.fn(() => of({ source: IMAGE_SOURCE }));
    createFixture({
      imageConfig: {
        upload: { sources: ['drop'], acceptedMimeTypes: ['image/png'], upload },
        preview: { kind: 'direct' },
      },
    });
    const file = new File(['drop'], 'dropped.png', { type: 'image/png' });
    const drop = imageDropEvent(file);

    editorContent().dispatchEvent(drop);

    expect(drop.defaultPrevented).toBe(true);
    expect(upload).toHaveBeenCalledWith(file);
  });

  it('rejects an exact MIME mismatch without calling upload', () => {
    const upload = jest.fn(() => of({ source: IMAGE_SOURCE }));
    createFixture({
      imageConfig: {
        upload: { sources: ['paste'], acceptedMimeTypes: ['image/png'], upload },
        preview: { kind: 'direct' },
      },
    });
    const paste = imagePasteEvent(new File(['gif'], 'animated.gif', { type: 'image/gif' }));

    editorContent().dispatchEvent(paste);
    fixture.detectChanges();

    expect(paste.defaultPrevented).toBe(true);
    expect(upload).not.toHaveBeenCalled();
    expect(query('[data-testid="markdown-editor-unsupported-image"]').textContent).toContain(
      'animated.gif',
    );
  });

  it('rejects non-image files even when an upload configuration lists their MIME type', () => {
    const upload = jest.fn(() => of({ source: '/document.pdf' }));
    createFixture({
      imageConfig: {
        upload: { sources: ['picker'], acceptedMimeTypes: ['application/pdf'], upload },
        preview: { kind: 'direct' },
      },
    });
    const input = query<HTMLInputElement>('input[type="file"]');
    setInputFiles(input, [new File(['pdf'], 'document.pdf', { type: 'application/pdf' })]);

    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(upload).not.toHaveBeenCalled();
    expect(query('[data-testid="markdown-editor-unsupported-image"]').textContent).toContain(
      'document.pdf',
    );
  });

  it('turns a synchronous upload exception into a retryable queue error', () => {
    const upload = jest.fn(() => {
      throw new Error('offline');
    });
    createFixture({
      imageConfig: {
        upload: { sources: ['picker'], acceptedMimeTypes: ['image/png'], upload },
        preview: { kind: 'direct' },
      },
    });
    const input = query<HTMLInputElement>('input[type="file"]');
    setInputFiles(input, [new File(['image'], 'broken.png', { type: 'image/png' })]);

    expect(() => input.dispatchEvent(new Event('change'))).not.toThrow();
    fixture.detectChanges();

    expect(query('[data-testid="markdown-editor-upload-error"]').textContent).toContain(
      'broken.png',
    );
  });

  it('turns an upload that completes without a result into a retryable queue error', () => {
    const upload = jest.fn(() => EMPTY);
    createFixture({
      imageConfig: {
        upload: { sources: ['picker'], acceptedMimeTypes: ['image/png'], upload },
        preview: { kind: 'direct' },
      },
    });
    const pending: boolean[] = [];
    fixture.componentInstance.imageUploadPendingChange.subscribe((value) => pending.push(value));
    const input = query<HTMLInputElement>('input[type="file"]');
    setInputFiles(input, [new File(['image'], 'empty.png', { type: 'image/png' })]);

    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(query('[data-testid="markdown-editor-upload-error"]').textContent).toContain(
      'empty.png',
    );
    expect(pending).toEqual([true, false]);
  });

  it('renders direct image sources without calling a loader', () => {
    createFixture({
      value: `![image](${IMAGE_SOURCE})`,
      imageConfig: { upload: null, preview: { kind: 'direct' } },
    });

    query<HTMLButtonElement>('[data-testid="markdown-editor-preview-tab"]').click();
    fixture.detectChanges();

    expect(
      query<HTMLImageElement>('[data-testid="markdown-editor-preview-content"] img').src,
    ).toContain(IMAGE_SOURCE);
  });

  it('keeps protected image sources out of the DOM until Blob preview resolves', () => {
    const preview = new Subject<Blob>();
    const load = jest.fn(() => preview);
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: jest.fn() });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: jest.fn() });
    const createObjectURL = jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview');
    const revokeObjectURL = jest.spyOn(URL, 'revokeObjectURL').mockImplementation();
    createFixture({
      value: `![image](${IMAGE_SOURCE})`,
      imageConfig: { upload: null, preview: { kind: 'blob', revision: 1, load } },
    });

    query<HTMLButtonElement>('[data-testid="markdown-editor-preview-tab"]').click();
    fixture.detectChanges();
    const image = query<HTMLImageElement>('[data-testid="markdown-editor-preview-content"] img');
    expect(image.hasAttribute('src')).toBe(false);
    expect(load).toHaveBeenCalledWith(IMAGE_SOURCE);

    preview.next(new Blob(['image'], { type: 'image/png' }));
    expect(createObjectURL).toHaveBeenCalled();
    expect(image.getAttribute('src')).toBe('blob:preview');

    fixture.destroy();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:preview');
  });

  it('revokes and reloads Blob previews when the caller revision changes', () => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: jest.fn().mockReturnValueOnce('blob:first').mockReturnValueOnce('blob:second'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: jest.fn() });
    const load = jest.fn(() => of(new Blob(['image'], { type: 'image/png' })));
    createFixture({
      value: `![image](${IMAGE_SOURCE})`,
      imageConfig: { upload: null, preview: { kind: 'blob', revision: 1, load } },
    });
    query<HTMLButtonElement>('[data-testid="markdown-editor-preview-tab"]').click();
    fixture.detectChanges();
    expect(
      query<HTMLImageElement>('[data-testid="markdown-editor-preview-content"] img').src,
    ).toContain('blob:first');

    fixture.componentRef.setInput('imageConfig', {
      upload: null,
      preview: { kind: 'blob', revision: 2, load },
    } satisfies MarkdownEditorImageConfig);
    fixture.detectChanges();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:first');
    expect(load).toHaveBeenCalledTimes(2);
    expect(
      query<HTMLImageElement>('[data-testid="markdown-editor-preview-content"] img').src,
    ).toContain('blob:second');
  });

  it('turns synchronous and empty Blob loaders into retryable preview errors', () => {
    const load = jest
      .fn()
      .mockImplementationOnce(() => {
        throw new Error('offline');
      })
      .mockReturnValueOnce(EMPTY);
    createFixture({
      value: `![image](${IMAGE_SOURCE})`,
      imageConfig: { upload: null, preview: { kind: 'blob', revision: 1, load } },
    });

    expect(() =>
      query<HTMLButtonElement>('[data-testid="markdown-editor-preview-tab"]').click(),
    ).not.toThrow();
    fixture.detectChanges();
    expect(query('[data-testid="markdown-editor-preview-image-error"]')).not.toBeNull();

    query<HTMLButtonElement>('[data-testid="markdown-editor-preview-image-retry"]').click();
    fixture.detectChanges();
    expect(load).toHaveBeenCalledTimes(2);
    expect(query('[data-testid="markdown-editor-preview-image-error"]')).not.toBeNull();
  });

  it('rejects non-image Blobs and reports browser image decode failures as retryable errors', () => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: jest.fn().mockReturnValue('blob:preview'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: jest.fn() });
    const load = jest
      .fn()
      .mockReturnValueOnce(of(new Blob(['text'], { type: 'text/plain' })))
      .mockReturnValueOnce(of(new Blob(['invalid image'], { type: 'image/png' })));
    createFixture({
      value: `![image](${IMAGE_SOURCE})`,
      imageConfig: { upload: null, preview: { kind: 'blob', revision: 1, load } },
    });

    query<HTMLButtonElement>('[data-testid="markdown-editor-preview-tab"]').click();
    fixture.detectChanges();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(query('[data-testid="markdown-editor-preview-image-error"]')).not.toBeNull();

    query<HTMLButtonElement>('[data-testid="markdown-editor-preview-image-retry"]').click();
    fixture.detectChanges();
    const image = query<HTMLImageElement>('[data-testid="markdown-editor-preview-content"] img');
    expect(image.getAttribute('src')).toBe('blob:preview');

    image.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
    expect(image.hasAttribute('src')).toBe(false);
    expect(query('[data-testid="markdown-editor-preview-image-error"]')).not.toBeNull();
  });

  it('loads a generic wiki registry and renders resolved native anchors', () => {
    const wikiLinks: MarkdownEditorWikiLinkConfig = {
      namespaces: [{ key: 'people', label: 'People' }],
      loadTargets: () =>
        of([
          {
            namespace: 'people',
            targets: [{ key: 'ada', label: 'Ada', description: null, badge: null }],
          },
        ]),
      resolve: (reference) =>
        reference.namespace === 'people' && reference.key === 'ada'
          ? { href: `/people/${reference.key}`, openIn: 'same-tab' }
          : null,
    };
    createFixture({ value: 'Hello [[people:ada|Ada Lovelace]]', wikiLinks });

    query<HTMLButtonElement>('[data-testid="markdown-editor-preview-tab"]').click();
    fixture.detectChanges();

    const anchor = query<HTMLAnchorElement>('[data-testid="markdown-editor-preview-content"] a');
    expect(anchor.getAttribute('href')).toBe('/people/ada');
    expect(anchor.textContent).toBe('Ada Lovelace');
  });

  it('reports a wiki registry failure without blocking editing or preview', () => {
    createFixture({
      value: 'Still editable',
      wikiLinks: {
        namespaces: [{ key: 'docs', label: 'Docs' }],
        loadTargets: () => throwError(() => new Error('offline')),
        resolve: () => null,
      },
    });
    fixture.detectChanges();

    expect(query('[data-testid="markdown-editor-wiki-link-registry-error"]').textContent).toContain(
      LABELS.wikiLinks.registryUnavailable,
    );
    expect(editorContent().textContent).toContain('Still editable');
  });

  it('reports a synchronous wiki registry exception without breaking the editor', () => {
    expect(() =>
      createFixture({
        value: 'Still editable',
        wikiLinks: {
          namespaces: [{ key: 'docs', label: 'Docs' }],
          loadTargets: () => {
            throw new Error('offline');
          },
          resolve: () => null,
        },
      }),
    ).not.toThrow();
    fixture.detectChanges();

    expect(query('[data-testid="markdown-editor-wiki-link-registry-error"]').textContent).toContain(
      LABELS.wikiLinks.registryUnavailable,
    );
    expect(editorContent().textContent).toContain('Still editable');
  });

  it('renders its accessible shell without browser-only editor work during SSR', async () => {
    fixture.destroy();
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [MarkdownEditorComponent],
      providers: [
        { provide: CSP_NONCE, useValue: 'server-nonce' },
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: ModalPageScrollLockService, useValue: { acquire: () => (): void => undefined } },
      ],
    }).compileComponents();

    createFixture({ value: '# Server content' });

    expect(
      fixture.nativeElement.querySelector('[data-testid="markdown-editor-shell"]'),
    ).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.cm-editor')).toBeNull();
  });

  function createFixture(
    options: {
      value?: string;
      imageConfig?: MarkdownEditorImageConfig | null;
      wikiLinks?: MarkdownEditorWikiLinkConfig | null;
    } = {},
  ): void {
    fixture = TestBed.createComponent(MarkdownEditorComponent);
    fixture.componentRef.setInput('value', options.value ?? '');
    fixture.componentRef.setInput('accessibleLabel', 'Article body');
    fixture.componentRef.setInput('labels', LABELS);
    fixture.componentRef.setInput('imageConfig', options.imageConfig ?? null);
    fixture.componentRef.setInput('imageInteractionsDisabled', false);
    fixture.componentRef.setInput('wikiLinks', options.wikiLinks ?? null);
    fixture.detectChanges();
  }

  function editorContent(): HTMLElement {
    return query('.cm-content');
  }

  function query<T extends Element = HTMLElement>(selector: string): T {
    const element = fixture.nativeElement.querySelector(selector) as T | null;
    if (element === null) {
      throw new Error(`Missing test element: ${selector}`);
    }
    return element;
  }
});

function imagePasteEvent(file: File): ClipboardEvent {
  const event = new Event('paste', { bubbles: true, cancelable: true }) as ClipboardEvent;
  Object.defineProperty(event, 'clipboardData', {
    value: {
      items: [{ kind: 'file', type: file.type, getAsFile: () => file }],
      getData: () => '',
    },
  });
  return event;
}

function imageDropEvent(file: File): DragEvent {
  const event = new Event('drop', { bubbles: true, cancelable: true }) as DragEvent;
  Object.defineProperty(event, 'dataTransfer', {
    value: {
      files: [file],
      items: [{ kind: 'file', type: file.type }],
      dropEffect: 'none',
    },
  });
  return event;
}

function setInputFiles(input: HTMLInputElement, files: readonly File[]): void {
  Object.defineProperty(input, 'files', { configurable: true, value: files });
}

function restoreUrlMethod(
  method: 'createObjectURL' | 'revokeObjectURL',
  descriptor: PropertyDescriptor | undefined,
): void {
  if (descriptor === undefined) {
    delete (URL as unknown as Record<string, unknown>)[method];
    return;
  }
  Object.defineProperty(URL, method, descriptor);
}
