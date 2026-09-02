import { CSP_NONCE, PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { redo, undo } from '@codemirror/commands';
import { EditorSelection, Transaction } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
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

  it('synchronizes changed value and accessibility inputs without emitting or rebuilding the editor', () => {
    const emitted: string[] = [];
    createFixture({ value: 'first' });
    const editor = query('.cm-editor');
    fixture.componentInstance.valueChange.subscribe((value) => emitted.push(value));
    const changedLabels: MarkdownEditorLabels = {
      ...LABELS,
      toolbar: { aria: 'Updated formatting toolbar' },
      search: { ...LABELS.search, find: 'Locate' },
    };

    fixture.componentRef.setInput('value', 'second');
    fixture.componentRef.setInput('accessibleLabel', 'Updated article body');
    fixture.componentRef.setInput('labels', changedLabels);
    fixture.detectChanges();

    expect(editorView().state.doc.toString()).toBe('second');
    expect(query('.cm-editor')).toBe(editor);
    expect(editorContent().getAttribute('aria-label')).toBe('Updated article body');
    expect(query('[role="toolbar"]').getAttribute('aria-label')).toBe('Updated formatting toolbar');
    expect(emitted).toEqual([]);

    fixture.componentRef.setInput('value', 'second');
    fixture.detectChanges();
    expect(editorView().state.doc.toString()).toBe('second');

    editorView().dispatch({ changes: { from: 6, insert: '!' }, userEvent: 'input' });
    fixture.componentRef.setInput('value', 'second!');
    fixture.detectChanges();
    expect(editorView().state.doc.toString()).toBe('second!');
  });

  it('honors focus requested before CodeMirror is mounted', () => {
    fixture = TestBed.createComponent(MarkdownEditorComponent);
    setRequiredInputs(fixture, { value: 'focus me' });

    fixture.componentInstance.focus();
    fixture.detectChanges();

    expect(document.activeElement).toBe(editorContent());
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

  it('implements wraparound keyboard navigation for mode tabs', () => {
    createFixture();
    const tabs = [
      ...query<HTMLElement>(
        '[data-testid="markdown-editor-shell"]',
      ).querySelectorAll<HTMLButtonElement>('[role="tab"]'),
    ];

    tabs[0]!.focus();
    expect(key(tabs[0]!, 'ArrowLeft').defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(tabs[2]);
    expect(key(tabs[2]!, 'ArrowRight').defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(tabs[0]);
    expect(key(tabs[0]!, 'End').defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(tabs[2]);
    expect(key(tabs[2]!, 'Home').defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(tabs[0]);
    expect(key(tabs[0]!, 'Unidentified').defaultPrevented).toBe(false);

    tabs[0]!.click();
    fixture.detectChanges();
    expect(tabs[0]!.getAttribute('aria-selected')).toBe('true');
  });

  it('implements roving keyboard focus across enabled toolbar commands', () => {
    createFixture({
      imageConfig: {
        upload: { sources: ['picker'], acceptedMimeTypes: ['image/png'], upload: () => EMPTY },
        preview: { kind: 'direct' },
      },
    });
    const buttons = [
      ...query('[role="toolbar"]').querySelectorAll<HTMLButtonElement>(
        '[data-markdown-command]:not(:disabled)',
      ),
    ];

    buttons[0]!.focus();
    expect(key(buttons[0]!, 'ArrowLeft').defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(buttons.at(-1));
    expect(key(document.activeElement as HTMLElement, 'ArrowRight').defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(buttons[0]);
    expect(key(buttons[0]!, 'End').defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(buttons.at(-1));
    expect(key(document.activeElement as HTMLElement, 'Home').defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(buttons[0]);
    expect(buttons.filter((button) => button.tabIndex === 0)).toEqual([buttons[0]]);
    expect(key(buttons[0]!, 'ArrowDown').defaultPrevented).toBe(false);
  });

  it('closes the shortcut reference with Escape and consumes its matching keyup', () => {
    createFixture();
    const details = query<HTMLDetailsElement>('[data-testid="markdown-editor-shortcuts"]');
    const summary = query<HTMLElement>('[data-testid="markdown-editor-shortcuts-summary"]');
    expect(key(summary, 'ArrowDown').defaultPrevented).toBe(false);
    expect(key(summary, 'Escape').defaultPrevented).toBe(false);
    details.open = true;
    summary.focus();

    const down = key(summary, 'Escape');
    const up = key(summary, 'Escape', {}, 'keyup');

    expect(down.defaultPrevented).toBe(true);
    expect(up.defaultPrevented).toBe(true);
    expect(details.open).toBe(false);
    expect(document.activeElement).toBe(summary);
    expect(key(summary, 'Escape', {}, 'keyup').defaultPrevented).toBe(false);
  });

  it('toggles preview and source from component shortcuts and consumes IME variants', () => {
    createFixture({ value: 'content' });
    const shell = query<HTMLElement>('[data-testid="markdown-editor-shell"]');
    const modifier = /Mac|iPhone|iPad/.test(navigator.platform)
      ? { metaKey: true }
      : { ctrlKey: true };

    expect(key(shell, 'e', { ...modifier, code: 'KeyE' }).defaultPrevented).toBe(true);
    fixture.detectChanges();
    expect(query('[data-testid="markdown-editor-preview-tab"]').getAttribute('aria-selected')).toBe(
      'true',
    );
    expect(key(shell, 'e', { ...modifier, shiftKey: true, code: 'KeyE' }).defaultPrevented).toBe(
      true,
    );
    fixture.detectChanges();
    expect(query('[data-testid="markdown-editor-source-tab"]').getAttribute('aria-selected')).toBe(
      'true',
    );

    const composing = key(shell, 'e', {
      ...modifier,
      code: 'KeyE',
      isComposing: true,
    });
    expect(composing.defaultPrevented).toBe(true);
    expect(key(shell, 'x', { code: 'KeyX', isComposing: true }).defaultPrevented).toBe(false);

    expect(key(shell, 'e', { ...modifier, shiftKey: true, code: 'KeyE' }).defaultPrevented).toBe(
      true,
    );
    fixture.detectChanges();
    expect(query('[data-testid="markdown-editor-edit-tab"]').getAttribute('aria-selected')).toBe(
      'true',
    );
    expect(key(shell, 'x', { code: 'KeyX' }).defaultPrevented).toBe(false);
  });

  it('renders macOS shortcut names and modifier guidance when the browser reports a Mac', () => {
    const platform = jest.spyOn(window.navigator, 'platform', 'get').mockReturnValue('MacIntel');
    createFixture();

    expect(query('[data-testid="markdown-editor-shortcuts"]').textContent).toContain(
      LABELS.shortcuts.modifierHintMac,
    );
    expect(
      query<HTMLButtonElement>('[data-markdown-command="bold"]').getAttribute('aria-label'),
    ).toContain('Command');

    platform.mockRestore();
  });

  it('consumes composing editor commands and leaves unrelated composing keys untouched', () => {
    createFixture({ value: 'content' });
    editorContent().focus();
    const modifier = /Mac|iPhone|iPad/.test(navigator.platform)
      ? { metaKey: true }
      : { ctrlKey: true };

    const command = key(editorContent(), 'b', {
      ...modifier,
      code: 'KeyB',
      isComposing: true,
    });
    const ordinary = key(editorContent(), 'x', { code: 'KeyX', isComposing: true });

    expect(command.defaultPrevented).toBe(true);
    expect(ordinary.defaultPrevented).toBe(false);
    expect(editorView().state.doc.toString()).toBe('content');
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

  it.each([
    'heading1',
    'heading2',
    'heading3',
    'heading4',
    'heading5',
    'heading6',
    'bold',
    'italic',
    'strikethrough',
    'quote',
    'unorderedList',
    'orderedList',
    'taskList',
    'horizontalRule',
    'inlineCode',
    'codeBlock',
  ])('executes the visible %s toolbar command and restores editor focus', (command) => {
    createFixture({ value: 'value' });
    const before = editorView().state.doc.toString();

    query<HTMLButtonElement>(`[data-markdown-command="${command}"]`).click();

    expect(editorView().state.doc.toString()).not.toBe(before);
    expect(document.activeElement).toBe(editorContent());
  });

  it('opens and focuses the localized search panel from the toolbar', () => {
    createFixture({ value: 'needle' });

    query<HTMLButtonElement>('[data-markdown-command="search"]').click();

    const search = query<HTMLInputElement>('.cm-search input[main-field]');
    expect(search.getAttribute('placeholder')).toBe('Locate'.replace('Locate', LABELS.search.find));
    expect(document.activeElement).toBe(search);
  });

  it('uses snippets for an empty table and an escaped selected link label', () => {
    createFixture({ value: 'a[b]${c}\\tail' });
    const view = editorView();
    view.dispatch({ selection: EditorSelection.range(0, view.state.doc.length) });

    query<HTMLButtonElement>('[data-markdown-command="link"]').click();
    expect(view.state.doc.toString()).toContain('[a\\[b\\]\\${c}\\\\tail](');

    fixture.componentRef.setInput('value', '');
    fixture.detectChanges();
    query<HTMLButtonElement>('[data-markdown-command="table"]').click();
    expect(view.state.doc.toString()).toContain('|  |  |\n| --- | --- |');
  });

  it('falls back to transactional link and table insertion for multiple or selected ranges', () => {
    createFixture({ value: 'one two' });
    const view = editorView();
    view.dispatch({
      selection: EditorSelection.create([
        EditorSelection.cursor(0),
        EditorSelection.cursor(view.state.doc.length),
      ]),
    });

    query<HTMLButtonElement>('[data-markdown-command="link"]').click();
    expect(view.state.doc.toString()).toBe('[text](https://)one two[text](https://)');

    fixture.componentRef.setInput('value', 'a,b\nc,d');
    fixture.detectChanges();
    view.dispatch({ selection: EditorSelection.range(0, view.state.doc.length) });
    query<HTMLButtonElement>('[data-markdown-command="table"]').click();
    expect(view.state.doc.toString()).toContain('| a | b |');
  });

  it('continues blocks, indents lines, and auto-closes fences through editor keyboard behavior', () => {
    createFixture({ value: '- item' });
    const view = editorView();
    view.dispatch({ selection: EditorSelection.cursor(view.state.doc.length) });
    editorContent().focus();

    expect(key(editorContent(), 'Enter').defaultPrevented).toBe(true);
    expect(view.state.doc.toString()).toBe('- item\n- ');
    view.dispatch({ selection: EditorSelection.range(0, view.state.doc.length) });
    expect(key(editorContent(), 'Tab').defaultPrevented).toBe(true);
    expect(view.state.doc.toString()).toContain('  - item');
    expect(key(editorContent(), 'Tab', { shiftKey: true }).defaultPrevented).toBe(true);

    fixture.componentRef.setInput('value', '```');
    fixture.detectChanges();
    view.dispatch({ selection: EditorSelection.cursor(3) });
    expect(key(editorContent(), '`', {}, 'keyup').defaultPrevented).toBe(true);
    expect(view.state.doc.toString()).toBe('```\n```');
    fixture.componentRef.setInput('value', 'plain');
    fixture.detectChanges();
    view.dispatch({ selection: EditorSelection.cursor(view.state.doc.length) });
    expect(key(editorContent(), '`', {}, 'keyup').defaultPrevented).toBe(false);
    expect(key(editorContent(), 'x', {}, 'keyup').defaultPrevented).toBe(false);
  });

  it('leaves an unindented line unchanged when Shift-Tab has nothing to remove', () => {
    createFixture({ value: 'plain' });
    const view = editorView();
    view.dispatch({ selection: EditorSelection.cursor(view.state.doc.length) });
    editorContent().focus();

    expect(key(editorContent(), 'Tab', { shiftKey: true }).defaultPrevented).toBe(true);
    expect(view.state.doc.toString()).toBe('plain');
  });

  it('auto-closes tilde fences and ignores composing fence keyups', () => {
    createFixture({ value: '~~~' });
    const view = editorView();
    view.dispatch({ selection: EditorSelection.cursor(3) });

    expect(key(editorContent(), '~', {}, 'keyup').defaultPrevented).toBe(true);
    expect(view.state.doc.toString()).toBe('~~~\n~~~');
    expect(key(editorContent(), '~', { isComposing: true }, 'keyup').defaultPrevented).toBe(false);
  });

  it('runs view shortcuts originating inside CodeMirror before they bubble to the shell', () => {
    createFixture({ value: 'content' });
    editorContent().focus();
    const modifier = /Mac|iPhone|iPad/.test(navigator.platform)
      ? { metaKey: true }
      : { ctrlKey: true };

    expect(key(editorContent(), 'e', { ...modifier, code: 'KeyE' }).defaultPrevented).toBe(true);
    fixture.detectChanges();
    expect(query('[data-testid="markdown-editor-preview-tab"]').getAttribute('aria-selected')).toBe(
      'true',
    );

    expect(
      key(query('[data-testid="markdown-editor-shell"]'), 'e', {
        ...modifier,
        code: 'KeyE',
      }).defaultPrevented,
    ).toBe(true);
    fixture.detectChanges();
    expect(query('[data-testid="markdown-editor-edit-tab"]').getAttribute('aria-selected')).toBe(
      'true',
    );

    editorContent().focus();
    expect(
      key(editorContent(), 'e', { ...modifier, shiftKey: true, code: 'KeyE' }).defaultPrevented,
    ).toBe(true);
    fixture.detectChanges();
    expect(query('[data-testid="markdown-editor-source-tab"]').getAttribute('aria-selected')).toBe(
      'true',
    );

    expect(
      key(editorContent(), 'e', { ...modifier, shiftKey: true, code: 'KeyE' }).defaultPrevented,
    ).toBe(true);
    fixture.detectChanges();
    expect(query('[data-testid="markdown-editor-edit-tab"]').getAttribute('aria-selected')).toBe(
      'true',
    );
  });

  it('inserts the empty link snippet and ignores the image shortcut when picker upload is absent', () => {
    createFixture();
    editorContent().focus();
    query<HTMLButtonElement>('[data-markdown-command="link"]').click();
    expect(editorView().state.doc.toString()).toBe('[]()');

    fixture.componentRef.setInput('value', 'content');
    fixture.detectChanges();
    const modifier = /Mac|iPhone|iPad/.test(navigator.platform)
      ? { metaKey: true }
      : { ctrlKey: true };
    key(editorContent(), 'm', {
      ...modifier,
      shiftKey: true,
      code: 'KeyM',
    });
    expect(editorView().state.doc.toString()).toBe('content');
  });

  it('uses configured sticky header and footer offsets as editor scroll margins', () => {
    createFixture();
    const header = query<HTMLElement>('[data-testid="markdown-editor-header"]');
    const footer = query<HTMLElement>('[data-testid="markdown-editor-footer"]');
    Object.defineProperty(header, 'offsetHeight', { configurable: true, value: 30 });
    Object.defineProperty(footer, 'offsetHeight', { configurable: true, value: 20 });
    header.style.top = '12px';
    footer.style.bottom = '8px';
    const view = editorView();

    expect(view.state.facet(EditorView.scrollMargins).map((margin) => margin(view))).toContainEqual(
      {
        top: 42,
        bottom: 28,
      },
    );

    header.style.top = 'auto';
    footer.style.bottom = '-2px';
    expect(view.state.facet(EditorView.scrollMargins).map((margin) => margin(view))).toContainEqual(
      {
        top: 30,
        bottom: 20,
      },
    );
  });

  it('places the caret at document end when the user clicks below the final editor line', () => {
    createFixture({ value: 'content' });
    const view = editorView();
    jest.spyOn(view, 'coordsAtPos').mockReturnValue(rectangle({ bottom: 20 }));

    const clickBelow = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      button: 0,
      clientY: 60,
    });
    view.scrollDOM.dispatchEvent(clickBelow);

    expect(clickBelow.defaultPrevented).toBe(true);
    expect(view.state.selection.main.head).toBe(view.state.doc.length);
    expect(document.activeElement).toBe(editorContent());

    const modified = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      button: 1,
      clientY: 60,
    });
    view.scrollDOM.dispatchEvent(modified);
    expect(modified.defaultPrevented).toBe(false);

    jest.spyOn(view, 'coordsAtPos').mockReturnValue(null);
    const withoutGeometry = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      button: 0,
      clientY: 60,
    });
    view.scrollDOM.dispatchEvent(withoutGeometry);
    expect(withoutGeometry.defaultPrevented).toBe(false);

    view.dispatch({ selection: EditorSelection.cursor(0) });
    const nestedClick = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      button: 0,
      clientY: 60,
    });
    editorContent().dispatchEvent(nestedClick);
    expect(nestedClick.defaultPrevented).toBe(true);
  });

  it('restores the owning page scroll after browser input changes a table cell', () => {
    const source = '| H | V |\n| --- | --- |\n|  | value |';
    createFixture({ value: source });
    const view = editorView();
    const emptyCell = query<HTMLElement>('[data-table-cell="true"][data-row="1"][data-column="0"]');
    const position = Number(emptyCell.dataset['cellFrom']);
    view.dispatch({ selection: EditorSelection.cursor(position), userEvent: 'select.pointer' });

    const pageScroller = document.createElement('div');
    pageScroller.scrollTop = 640;
    pageScroller.scrollLeft = 12;
    const scrollingElementDescriptor = Object.getOwnPropertyDescriptor(
      document,
      'scrollingElement',
    );
    Object.defineProperty(document, 'scrollingElement', {
      configurable: true,
      value: pageScroller,
    });
    mockTableCellDocumentBounds(pageScroller, () => 900);
    const animationFrames: FrameRequestCallback[] = [];
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      animationFrames.push(callback);
      return animationFrames.length;
    });

    try {
      editorContent().dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          code: 'KeyT',
          key: 't',
        }),
      );
      pageScroller.scrollTop = 100;
      pageScroller.scrollLeft = 3;
      view.dispatch({
        changes: { from: position, insert: 'typed' },
        selection: EditorSelection.cursor(position + 'typed'.length),
        annotations: Transaction.userEvent.of('input.type'),
        scrollIntoView: true,
      });

      expect(pageScroller.scrollTop).toBe(640);
      expect(pageScroller.scrollLeft).toBe(12);
      pageScroller.scrollTop = 100;
      pageScroller.scrollLeft = 3;
      flushAnimationFrames(animationFrames);

      expect(pageScroller.scrollTop).toBe(640);
      expect(pageScroller.scrollLeft).toBe(12);
    } finally {
      if (scrollingElementDescriptor === undefined) {
        Reflect.deleteProperty(document, 'scrollingElement');
      } else {
        Object.defineProperty(document, 'scrollingElement', scrollingElementDescriptor);
      }
    }
  });

  it.each([
    {
      bounds: { bottom: window.innerHeight + 100, top: -100 },
      name: 'the editor is taller than the viewport',
    },
    {
      bounds: { bottom: Math.min(window.innerHeight, 500), top: 0 },
      name: 'the editor has reached the viewport boundary',
    },
  ])('does not override caret-following scroll when $name', ({ bounds }) => {
    const source = '| H | V |\n| --- | --- |\n|  | value |';
    createFixture({ value: source });
    const view = editorView();
    const emptyCell = query<HTMLElement>('[data-table-cell="true"][data-row="1"][data-column="0"]');
    const position = Number(emptyCell.dataset['cellFrom']);
    view.dispatch({ selection: EditorSelection.cursor(position), userEvent: 'select.pointer' });
    jest
      .spyOn(query<HTMLElement>('[data-testid="markdown-editor-shell"]'), 'getBoundingClientRect')
      .mockReturnValue(rectangle(bounds));
    const pageScroller = document.createElement('div');
    pageScroller.scrollTop = 640;
    const scrollingElementDescriptor = Object.getOwnPropertyDescriptor(
      document,
      'scrollingElement',
    );
    Object.defineProperty(document, 'scrollingElement', {
      configurable: true,
      value: pageScroller,
    });
    mockTableCellDocumentBounds(pageScroller, () => 900);
    const animationFrames: FrameRequestCallback[] = [];
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      animationFrames.push(callback);
      return animationFrames.length;
    });

    try {
      editorContent().dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 't' }));
      pageScroller.scrollTop = 100;
      view.dispatch({
        changes: { from: position, insert: 'typed' },
        selection: EditorSelection.cursor(position + 'typed'.length),
        annotations: Transaction.userEvent.of('input.type'),
        scrollIntoView: true,
      });
      flushAnimationFrames(animationFrames);

      expect(pageScroller.scrollTop).toBe(100);
    } finally {
      if (scrollingElementDescriptor === undefined) {
        Reflect.deleteProperty(document, 'scrollingElement');
      } else {
        Object.defineProperty(document, 'scrollingElement', scrollingElementDescriptor);
      }
    }
  });

  it('cancels a queued table-scroll restore when a newer keyboard interaction starts', () => {
    const source = '| H | V |\n| --- | --- |\n|  | value |';
    createFixture({ value: source });
    const view = editorView();
    const emptyCell = query<HTMLElement>('[data-table-cell="true"][data-row="1"][data-column="0"]');
    const position = Number(emptyCell.dataset['cellFrom']);
    view.dispatch({ selection: EditorSelection.cursor(position), userEvent: 'select.pointer' });
    const pageScroller = document.createElement('div');
    pageScroller.scrollTop = 640;
    const scrollingElementDescriptor = Object.getOwnPropertyDescriptor(
      document,
      'scrollingElement',
    );
    Object.defineProperty(document, 'scrollingElement', {
      configurable: true,
      value: pageScroller,
    });
    mockTableCellDocumentBounds(pageScroller, () => 900);
    const animationFrames: FrameRequestCallback[] = [];
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      animationFrames.push(callback);
      return animationFrames.length;
    });

    try {
      editorContent().dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 't' }));
      view.dispatch({
        changes: { from: position, insert: 'typed' },
        selection: EditorSelection.cursor(position + 'typed'.length),
        annotations: Transaction.userEvent.of('input.type'),
        scrollIntoView: true,
      });
      editorContent().dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Shift' }));
      editorContent().dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'Shift' }));
      pageScroller.scrollTop = 100;
      flushAnimationFrames(animationFrames);

      expect(pageScroller.scrollTop).toBe(100);
    } finally {
      if (scrollingElementDescriptor === undefined) {
        Reflect.deleteProperty(document, 'scrollingElement');
      } else {
        Object.defineProperty(document, 'scrollingElement', scrollingElementDescriptor);
      }
    }
  });

  it('keeps the editor at the same viewport position after a value consumer renders above it', () => {
    const source = '| H | V |\n| --- | --- |\n| value | value |';
    createFixture({ value: source });
    const pageScroller = document.createElement('div');
    pageScroller.scrollTop = 640;
    const scrollTo = jest.fn((options: ScrollToOptions) => {
      pageScroller.scrollTop = options.top ?? pageScroller.scrollTop;
      pageScroller.scrollLeft = options.left ?? pageScroller.scrollLeft;
    });
    Object.defineProperty(pageScroller, 'scrollTo', { configurable: true, value: scrollTo });
    const scrollingElementDescriptor = Object.getOwnPropertyDescriptor(
      document,
      'scrollingElement',
    );
    Object.defineProperty(document, 'scrollingElement', {
      configurable: true,
      value: pageScroller,
    });
    let documentOffset = 900;
    mockTableCellDocumentBounds(
      pageScroller,
      () => documentOffset,
      () => (document.querySelector('[data-table-cell="true"][data-row="2"]') === null ? 0 : 2),
    );
    const animationFrames: FrameRequestCallback[] = [];
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      animationFrames.push(callback);
      return animationFrames.length;
    });

    try {
      query<HTMLButtonElement>('[data-table-action="add-row"]').click();
      flushAnimationFrames(animationFrames);

      documentOffset += 40;
      fixture.detectChanges();

      expect(pageScroller.scrollTop).toBe(682);
      expect(
        query<HTMLElement>(
          '[data-table-cell="true"][data-row="1"][data-column="0"]',
        ).getBoundingClientRect().top,
      ).toBe(260);
      expect(scrollTo).toHaveBeenCalledWith(
        expect.objectContaining({ behavior: 'instant', top: 682 }),
      );

      flushAnimationFrames(animationFrames);
      expect(undo(editorView())).toBe(true);
      documentOffset -= 40;
      fixture.detectChanges();
      expect(pageScroller.scrollTop).toBe(642);
      flushAnimationFrames(animationFrames);

      expect(redo(editorView())).toBe(true);
      documentOffset += 40;
      fixture.detectChanges();
      expect(pageScroller.scrollTop).toBe(682);
    } finally {
      if (scrollingElementDescriptor === undefined) {
        Reflect.deleteProperty(document, 'scrollingElement');
      } else {
        Object.defineProperty(document, 'scrollingElement', scrollingElementDescriptor);
      }
    }
  });

  it('preserves external scroll through table-cell undo and redo reflow', () => {
    const source = '| H | V |\n| --- | --- |\n| value | value |';
    createFixture({ value: source });
    const view = editorView();
    const targetCell = query<HTMLElement>(
      '[data-table-cell="true"][data-row="1"][data-column="0"]',
    );
    const position = Number(targetCell.dataset['cellFrom']);
    view.dispatch({ selection: EditorSelection.cursor(position), userEvent: 'select.pointer' });
    view.dispatch({
      changes: { from: position, insert: 'x' },
      selection: EditorSelection.cursor(position + 1),
      annotations: Transaction.userEvent.of('input.type'),
    });

    const pageScroller = document.createElement('div');
    pageScroller.scrollTop = 640;
    const scrollTo = jest.fn((options: ScrollToOptions) => {
      pageScroller.scrollTop = options.top ?? pageScroller.scrollTop;
      pageScroller.scrollLeft = options.left ?? pageScroller.scrollLeft;
    });
    Object.defineProperty(pageScroller, 'scrollTo', { configurable: true, value: scrollTo });
    const scrollingElementDescriptor = Object.getOwnPropertyDescriptor(
      document,
      'scrollingElement',
    );
    Object.defineProperty(document, 'scrollingElement', {
      configurable: true,
      value: pageScroller,
    });
    let documentOffset = 900;
    mockTableCellDocumentBounds(pageScroller, () => documentOffset);
    const animationFrames: FrameRequestCallback[] = [];
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      animationFrames.push(callback);
      return animationFrames.length;
    });

    try {
      expect(undo(view)).toBe(true);
      documentOffset += 40;
      fixture.detectChanges();
      expect(pageScroller.scrollTop).toBe(680);
      flushAnimationFrames(animationFrames);

      expect(redo(view)).toBe(true);
      documentOffset += 30;
      fixture.detectChanges();
      expect(pageScroller.scrollTop).toBe(710);
      flushAnimationFrames(animationFrames);
      expect(scrollTo).toHaveBeenCalledWith(
        expect.objectContaining({ behavior: 'instant', top: 710 }),
      );
    } finally {
      if (scrollingElementDescriptor === undefined) {
        Reflect.deleteProperty(document, 'scrollingElement');
      } else {
        Object.defineProperty(document, 'scrollingElement', scrollingElementDescriptor);
      }
    }
  });

  it('preserves the nearest scrollable ancestor while switching editor modes', () => {
    const frames: FrameRequestCallback[] = [];
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });
    createFixture({ value: 'content' });
    const scroller = document.createElement('div');
    scroller.style.overflowY = 'auto';
    Object.defineProperty(scroller, 'scrollHeight', { configurable: true, value: 500 });
    Object.defineProperty(scroller, 'clientHeight', { configurable: true, value: 100 });
    scroller.scrollTop = 75;
    scroller.scrollLeft = 9;
    scroller.append(fixture.nativeElement);
    document.body.append(scroller);

    query<HTMLButtonElement>('[data-testid="markdown-editor-preview-tab"]').click();
    fixture.detectChanges();
    scroller.scrollTop = 1;
    scroller.scrollLeft = 2;
    flushAnimationFrames(frames);

    expect(scroller.scrollTop).toBe(75);
    expect(scroller.scrollLeft).toBe(9);
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

  it('exits fullscreen with Escape, consumes keyup, and restores the previously focused control', () => {
    const frames: FrameRequestCallback[] = [];
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });
    const outside = document.createElement('button');
    document.body.append(outside);
    outside.focus();
    createFixture({ value: 'content' });
    const shell = query<HTMLElement>('[data-testid="markdown-editor-shell"]');
    const toggle = query<HTMLButtonElement>('[data-testid="markdown-editor-fullscreen-toggle"]');

    toggle.click();
    fixture.detectChanges();
    flushAnimationFrames(frames);
    expect(document.activeElement).toBe(toggle);

    const down = key(shell, 'Escape');
    fixture.detectChanges();
    expect(key(document, 'x', {}, 'keyup').defaultPrevented).toBe(false);
    const up = key(document, 'Escape', {}, 'keyup');
    flushAnimationFrames(frames);

    expect(down.defaultPrevented).toBe(true);
    expect(up.defaultPrevented).toBe(true);
    expect(releasePageScrollLock).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(outside);
    expect(key(document, 'Escape', {}, 'keyup').defaultPrevented).toBe(false);
  });

  it('falls back to the fullscreen toggle when the previous focus target was removed', () => {
    const frames: FrameRequestCallback[] = [];
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });
    const outside = document.createElement('button');
    document.body.append(outside);
    outside.focus();
    createFixture();
    const toggle = query<HTMLButtonElement>('[data-testid="markdown-editor-fullscreen-toggle"]');

    toggle.click();
    fixture.detectChanges();
    flushAnimationFrames(frames);
    outside.remove();
    toggle.click();
    fixture.detectChanges();
    flushAnimationFrames(frames);

    expect(document.activeElement).toBe(toggle);
  });

  it('keeps fullscreen geometry work safe when preview is active or the component is destroyed', () => {
    const frames: FrameRequestCallback[] = [];
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });
    createFixture({ value: 'preview' });
    query<HTMLButtonElement>('[data-testid="markdown-editor-preview-tab"]').click();
    fixture.detectChanges();
    query<HTMLButtonElement>('[data-testid="markdown-editor-fullscreen-toggle"]').click();
    fixture.detectChanges();
    flushAnimationFrames(frames);

    query<HTMLButtonElement>('[data-testid="markdown-editor-fullscreen-toggle"]').click();
    fixture.detectChanges();
    fixture.destroy();
    flushAnimationFrames(frames);

    expect(releasePageScrollLock).toHaveBeenCalledTimes(1);
  });

  it('skips a queued fullscreen-enter frame after the component is destroyed', () => {
    const frames: FrameRequestCallback[] = [];
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });
    createFixture();

    query<HTMLButtonElement>('[data-testid="markdown-editor-fullscreen-toggle"]').click();
    fixture.detectChanges();
    fixture.destroy();
    flushAnimationFrames(frames);

    expect(releasePageScrollLock).toHaveBeenCalledTimes(1);
  });

  it('retries editor focus on the next frame after returning from preview', () => {
    const frames: FrameRequestCallback[] = [];
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });
    createFixture({ value: 'content' });
    editorContent().focus();
    query<HTMLButtonElement>('[data-testid="markdown-editor-preview-tab"]').click();
    fixture.detectChanges();
    query<HTMLButtonElement>('[data-testid="markdown-editor-edit-tab"]').click();
    fixture.detectChanges();
    query<HTMLButtonElement>('[data-testid="markdown-editor-fullscreen-toggle"]').focus();

    flushAnimationFrames(frames);

    expect(document.activeElement).toBe(editorContent());
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

  it('keeps picker acceptance and disabled interaction state visible in native controls', () => {
    const upload = jest.fn(() => of({ source: IMAGE_SOURCE }));
    createFixture({
      imageConfig: {
        upload: {
          sources: ['picker'],
          acceptedMimeTypes: ['image/png', 'application/pdf', 'image/jpeg'],
          upload,
        },
        preview: { kind: 'direct' },
      },
    });
    const input = query<HTMLInputElement>('input[type="file"]');
    expect(input.accept).toBe('image/png,image/jpeg');

    query<HTMLButtonElement>('[data-markdown-command="image"]').click();
    setInputFiles(input, []);
    input.dispatchEvent(new Event('change'));
    expect(upload).not.toHaveBeenCalled();
    expect(input.value).toBe('');

    fixture.componentRef.setInput('imageInteractionsDisabled', true);
    fixture.detectChanges();
    expect(input.disabled).toBe(true);
    expect(query<HTMLButtonElement>('[data-markdown-command="image"]').disabled).toBe(true);

    setInputFiles(input, [new File(['blocked'], 'blocked.png', { type: 'image/png' })]);
    input.dispatchEvent(new Event('change'));
    expect(upload).not.toHaveBeenCalled();
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

  it('dismisses failed and unsupported files without changing editor content', () => {
    const upload = jest.fn(() => throwError(() => new Error('offline')));
    createFixture({
      value: 'content',
      imageConfig: {
        upload: { sources: ['picker'], acceptedMimeTypes: ['image/png'], upload },
        preview: { kind: 'direct' },
      },
    });
    const input = query<HTMLInputElement>('input[type="file"]');
    setInputFiles(input, [
      new File(['bad'], 'broken.png', { type: 'image/png' }),
      new File(['bad'], 'wrong.gif', { type: 'image/gif' }),
    ]);
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    query<HTMLButtonElement>('[data-testid="markdown-editor-upload-dismiss"]').click();
    query<HTMLButtonElement>('[data-testid="markdown-editor-unsupported-dismiss"]').click();
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[data-testid="markdown-editor-upload-error"]'),
    ).toBeNull();
    expect(
      fixture.nativeElement.querySelector('[data-testid="markdown-editor-unsupported-image"]'),
    ).toBeNull();
    expect(editorView().state.doc.toString()).toBe('content');
  });

  it('keeps retry disabled after upload configuration is removed from a failed item', () => {
    createFixture({
      imageConfig: {
        upload: {
          sources: ['picker'],
          acceptedMimeTypes: ['image/png'],
          upload: () => throwError(() => new Error('offline')),
        },
        preview: { kind: 'direct' },
      },
    });
    const input = query<HTMLInputElement>('input[type="file"]');
    setInputFiles(input, [new File(['bad'], 'broken.png', { type: 'image/png' })]);
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    fixture.componentRef.setInput('imageConfig', {
      upload: null,
      preview: { kind: 'direct' },
    } satisfies MarkdownEditorImageConfig);
    fixture.detectChanges();
    const retry = query<HTMLButtonElement>('[data-testid="markdown-editor-upload-retry"]');
    retry.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(retry.disabled).toBe(false);
    expect(query('[data-testid="markdown-editor-upload-error"]')).not.toBeNull();
  });

  it('dismisses one unsupported file without removing its siblings', () => {
    createFixture({
      imageConfig: {
        upload: { sources: ['picker'], acceptedMimeTypes: ['image/png'], upload: () => EMPTY },
        preview: { kind: 'direct' },
      },
    });
    const input = query<HTMLInputElement>('input[type="file"]');
    setInputFiles(input, [
      new File(['one'], 'one.gif', { type: 'image/gif' }),
      new File(['two'], 'two.webp', { type: 'image/webp' }),
    ]);
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    query<HTMLButtonElement>('[data-testid="markdown-editor-unsupported-dismiss"]').click();
    fixture.detectChanges();

    const remaining = fixture.nativeElement.querySelectorAll(
      '[data-testid="markdown-editor-unsupported-image"]',
    );
    expect(remaining).toHaveLength(1);
    expect(remaining[0].textContent).toContain('two.webp');
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

  it('keeps newly selected files queued behind an active upload', () => {
    const first = new Subject<{ source: string }>();
    const upload = jest
      .fn()
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(of({ source: '/second.png' }));
    createFixture({
      imageConfig: {
        upload: { sources: ['picker'], acceptedMimeTypes: ['image/png'], upload },
        preview: { kind: 'direct' },
      },
    });
    const input = query<HTMLInputElement>('input[type="file"]');
    setInputFiles(input, [new File(['one'], 'one.png', { type: 'image/png' })]);
    input.dispatchEvent(new Event('change'));
    setInputFiles(input, [new File(['two'], 'two.png', { type: 'image/png' })]);
    input.dispatchEvent(new Event('change'));

    expect(upload).toHaveBeenCalledTimes(1);
    first.next({ source: '/first.png' });
    expect(upload).toHaveBeenCalledTimes(2);
    expect(editorView().state.doc.toString()).toBe('![one.png](/first.png)![two.png](/second.png)');
  });

  it('keeps a later queued file pending when upload configuration is removed mid-flight', () => {
    const first = new Subject<{ source: string }>();
    const upload = jest.fn(() => first);
    createFixture({
      imageConfig: {
        upload: { sources: ['picker'], acceptedMimeTypes: ['image/png'], upload },
        preview: { kind: 'direct' },
      },
    });
    const input = query<HTMLInputElement>('input[type="file"]');
    setInputFiles(input, [
      new File(['one'], 'one.png', { type: 'image/png' }),
      new File(['two'], 'two.png', { type: 'image/png' }),
    ]);
    input.dispatchEvent(new Event('change'));
    fixture.componentRef.setInput('imageConfig', {
      upload: null,
      preview: { kind: 'direct' },
    } satisfies MarkdownEditorImageConfig);
    fixture.detectChanges();

    first.next({ source: '/first.png' });

    expect(upload).toHaveBeenCalledTimes(1);
    expect(editorView().state.doc.toString()).toBe('![one.png](/first.png)');
  });

  it('does not start later files while an earlier upload error remains unresolved', () => {
    const upload = jest.fn(() => throwError(() => new Error('offline')));
    createFixture({
      imageConfig: {
        upload: { sources: ['picker'], acceptedMimeTypes: ['image/png'], upload },
        preview: { kind: 'direct' },
      },
    });
    const input = query<HTMLInputElement>('input[type="file"]');
    setInputFiles(input, [new File(['one'], 'one.png', { type: 'image/png' })]);
    input.dispatchEvent(new Event('change'));
    setInputFiles(input, [new File(['two'], 'two.png', { type: 'image/png' })]);
    input.dispatchEvent(new Event('change'));

    expect(upload).toHaveBeenCalledTimes(1);
    fixture.detectChanges();
    expect(query('[data-testid="markdown-editor-upload-error"]').textContent).toContain('one.png');
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

  it('advertises copy drop feedback only for enabled image drags', () => {
    const upload = jest.fn(() => of({ source: IMAGE_SOURCE }));
    createFixture({
      imageConfig: {
        upload: { sources: ['drop'], acceptedMimeTypes: ['image/png'], upload },
        preview: { kind: 'direct' },
      },
    });
    const image = new File(['image'], 'image.png', { type: 'image/png' });
    const imageDrag = imageDragEvent(image);
    editorContent().dispatchEvent(imageDrag);
    expect(imageDrag.defaultPrevented).toBe(true);
    expect(imageDrag.dataTransfer?.dropEffect).toBe('copy');

    const textDrag = imageDragEvent(new File(['text'], 'note.txt', { type: 'text/plain' }));
    editorContent().dispatchEvent(textDrag);
    expect(textDrag.defaultPrevented).toBe(false);

    const emptyDrop = imageDropEvent(new File(['text'], 'note.txt', { type: 'text/plain' }));
    editorContent().dispatchEvent(emptyDrop);
    expect(upload).not.toHaveBeenCalled();
  });

  it('leaves drop and dragover events untouched when drop uploads are disabled', () => {
    const upload = jest.fn(() => of({ source: IMAGE_SOURCE }));
    createFixture({
      imageConfig: {
        upload: { sources: ['picker'], acceptedMimeTypes: ['image/png'], upload },
        preview: { kind: 'direct' },
      },
    });
    const file = new File(['image'], 'image.png', { type: 'image/png' });
    const drag = imageDragEvent(file);
    const drop = imageDropEvent(file);

    editorContent().dispatchEvent(drag);
    editorContent().dispatchEvent(drop);

    expect(drag.defaultPrevented).toBe(false);
    expect(upload).not.toHaveBeenCalled();
    expect(editorView().state.doc.toString()).toBe('');
  });

  it('ignores clipboard file items that no longer expose a File', () => {
    const upload = jest.fn(() => of({ source: IMAGE_SOURCE }));
    createFixture({
      imageConfig: {
        upload: { sources: ['paste'], acceptedMimeTypes: ['image/png'], upload },
        preview: { kind: 'direct' },
      },
    });
    const paste = new Event('paste', { bubbles: true, cancelable: true }) as ClipboardEvent;
    Object.defineProperty(paste, 'clipboardData', {
      value: {
        items: [{ kind: 'file', type: 'image/png', getAsFile: () => null }],
        getData: () => '',
      },
    });

    editorContent().dispatchEvent(paste);

    expect(upload).not.toHaveBeenCalled();
    expect(editorView().state.doc.toString()).toBe('');
  });

  it('handles missing clipboard and drag data as empty external input', () => {
    createFixture({
      imageConfig: {
        upload: {
          sources: ['paste', 'drop'],
          acceptedMimeTypes: ['image/png'],
          upload: () => of({ source: IMAGE_SOURCE }),
        },
        preview: { kind: 'direct' },
      },
    });
    const paste = new Event('paste', { bubbles: true, cancelable: true });
    const drop = new Event('drop', { bubbles: true, cancelable: true });
    const drag = new Event('dragover', { bubbles: true, cancelable: true });

    editorContent().dispatchEvent(paste);
    editorContent().dispatchEvent(drop);
    editorContent().dispatchEvent(drag);

    expect(editorView().state.doc.toString()).toBe('');
  });

  it('remaps a queued upload anchor after the user edits before it', () => {
    const pending = new Subject<{ source: string }>();
    createFixture({
      value: 'tail',
      imageConfig: {
        upload: { sources: ['picker'], acceptedMimeTypes: ['image/png'], upload: () => pending },
        preview: { kind: 'direct' },
      },
    });
    const input = query<HTMLInputElement>('input[type="file"]');
    editorView().dispatch({ selection: EditorSelection.cursor(4) });
    setInputFiles(input, [new File(['image'], 'image.png', { type: 'image/png' })]);
    input.dispatchEvent(new Event('change'));
    editorView().dispatch({ changes: { from: 0, insert: 'prefix-' }, userEvent: 'input' });

    pending.next({ source: IMAGE_SOURCE });

    expect(editorView().state.doc.toString()).toBe(`prefix-tail![image.png](${IMAGE_SOURCE})`);
  });

  it('escapes uploaded image alt text and URL syntax before insertion', () => {
    const upload = jest.fn(() => of({ source: '/image(1)\\raw.png' }));
    createFixture({
      imageConfig: {
        upload: { sources: ['picker'], acceptedMimeTypes: ['image/png'], upload },
        preview: { kind: 'direct' },
      },
    });
    const input = query<HTMLInputElement>('input[type="file"]');
    setInputFiles(input, [new File(['image'], 'a[b]\\name\n.png', { type: 'image/png' })]);

    input.dispatchEvent(new Event('change'));

    expect(editorView().state.doc.toString()).toBe(
      '![a\\[b\\]\\\\name .png](/image\\(1\\)\\\\raw.png)',
    );
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

  it('renders the localized empty-preview state and returns to the last authoring mode on focus', () => {
    createFixture();
    query<HTMLButtonElement>('[data-testid="markdown-editor-source-tab"]').click();
    query<HTMLButtonElement>('[data-testid="markdown-editor-preview-tab"]').click();
    fixture.detectChanges();

    expect(query('[data-testid="markdown-editor-preview-panel"]').textContent).toContain(
      LABELS.preview.empty,
    );

    fixture.componentInstance.focus();
    fixture.detectChanges();
    expect(query('[data-testid="markdown-editor-source-tab"]').getAttribute('aria-selected')).toBe(
      'true',
    );
    expect(document.activeElement).toBe(editorContent());
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

    image.dispatchEvent(new Event('load'));
    image.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="markdown-editor-preview-image-error"]'),
    ).toBeNull();

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

  it('loads every protected preview image and releases all object URLs on leaving preview', () => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: jest.fn().mockReturnValueOnce('blob:first').mockReturnValueOnce('blob:second'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: jest.fn() });
    const load = jest.fn((source: string) => of(new Blob([source], { type: 'image/png' })));
    createFixture({
      value: '![first](/first.png) ![second](/second.png)',
      imageConfig: { upload: null, preview: { kind: 'blob', revision: 1, load } },
    });

    query<HTMLButtonElement>('[data-testid="markdown-editor-preview-tab"]').click();
    fixture.detectChanges();
    expect(load.mock.calls.map(([source]) => source)).toEqual(['/first.png', '/second.png']);
    expect(
      [
        ...query<HTMLElement>(
          '[data-testid="markdown-editor-preview-content"]',
        ).querySelectorAll<HTMLImageElement>('img'),
      ].map((image) => image.getAttribute('src')),
    ).toEqual(['blob:first', 'blob:second']);

    query<HTMLButtonElement>('[data-testid="markdown-editor-edit-tab"]').click();
    fixture.detectChanges();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:first');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:second');
  });

  it('ignores a stale preview result after its rendered image is disconnected', () => {
    const preview = new Subject<Blob>();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: jest.fn().mockReturnValue('blob:stale'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: jest.fn() });
    createFixture({
      value: `![image](${IMAGE_SOURCE})`,
      imageConfig: { upload: null, preview: { kind: 'blob', revision: 1, load: () => preview } },
    });
    query<HTMLButtonElement>('[data-testid="markdown-editor-preview-tab"]').click();
    fixture.detectChanges();
    const image = query<HTMLImageElement>('[data-testid="markdown-editor-preview-content"] img');
    image.remove();

    preview.next(new Blob(['image'], { type: 'image/png' }));

    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });

  it('revokes a Blob URL created while preview teardown disconnects its image', () => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: jest.fn(() => {
        fixture.destroy();
        return 'blob:late';
      }),
    });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: jest.fn() });
    createFixture({
      value: `![image](${IMAGE_SOURCE})`,
      imageConfig: {
        upload: null,
        preview: {
          kind: 'blob',
          revision: 1,
          load: () => of(new Blob(['image'], { type: 'image/png' })),
        },
      },
    });

    query<HTMLButtonElement>('[data-testid="markdown-editor-preview-tab"]').click();
    fixture.detectChanges();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:late');
  });

  it('does not report a loader failure for a preview image already removed from the DOM', () => {
    const preview = new Subject<Blob>();
    createFixture({
      value: `![image](${IMAGE_SOURCE})`,
      imageConfig: { upload: null, preview: { kind: 'blob', revision: 1, load: () => preview } },
    });
    query<HTMLButtonElement>('[data-testid="markdown-editor-preview-tab"]').click();
    fixture.detectChanges();
    query<HTMLImageElement>('[data-testid="markdown-editor-preview-content"] img').remove();

    preview.error(new Error('late failure'));
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[data-testid="markdown-editor-preview-image-error"]'),
    ).toBeNull();
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

  it('ignores a stale preview retry after Blob preview has been disabled', () => {
    const load = jest.fn(() => throwError(() => new Error('offline')));
    createFixture({
      value: `![image](${IMAGE_SOURCE})`,
      imageConfig: { upload: null, preview: { kind: 'blob', revision: 1, load } },
    });
    query<HTMLButtonElement>('[data-testid="markdown-editor-preview-tab"]').click();
    fixture.detectChanges();
    const retry = query<HTMLButtonElement>('[data-testid="markdown-editor-preview-image-retry"]');

    fixture.componentRef.setInput('imageConfig', {
      upload: null,
      preview: { kind: 'direct' },
    } satisfies MarkdownEditorImageConfig);
    retry.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(load).toHaveBeenCalledTimes(1);
  });

  it('does not remove a replacement image source when an older Blob decode fails', () => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: jest.fn().mockReturnValue('blob:preview'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: jest.fn() });
    createFixture({
      value: `![image](${IMAGE_SOURCE})`,
      imageConfig: {
        upload: null,
        preview: {
          kind: 'blob',
          revision: 1,
          load: () => of(new Blob(['image'], { type: 'image/png' })),
        },
      },
    });
    query<HTMLButtonElement>('[data-testid="markdown-editor-preview-tab"]').click();
    fixture.detectChanges();
    const image = query<HTMLImageElement>('[data-testid="markdown-editor-preview-content"] img');
    image.setAttribute('src', '/replacement.png');

    image.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(image.getAttribute('src')).toBe('/replacement.png');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
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

  it('treats an empty wiki registry as unavailable', () => {
    createFixture({
      wikiLinks: {
        namespaces: [{ key: 'docs', label: 'Docs' }],
        loadTargets: () => EMPTY,
        resolve: () => null,
      },
    });
    fixture.detectChanges();

    expect(query('[data-testid="markdown-editor-wiki-link-registry-error"]').textContent).toContain(
      LABELS.wikiLinks.registryUnavailable,
    );
  });

  it('ignores a registry snapshot from a wiki configuration that has already been replaced', () => {
    const oldRegistry = new Subject<readonly { namespace: string; targets: never[] }[]>();
    const replacement: MarkdownEditorWikiLinkConfig = {
      namespaces: [{ key: 'new', label: 'New' }],
      loadTargets: () => of([]),
      resolve: () => null,
    };
    createFixture({
      wikiLinks: {
        namespaces: [{ key: 'old', label: 'Old' }],
        loadTargets: () => oldRegistry,
        resolve: () => null,
      },
    });

    fixture.componentRef.setInput('wikiLinks', replacement);
    fixture.detectChanges();
    oldRegistry.next([]);

    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="markdown-editor-wiki-link-registry-error"]',
      ),
    ).toBeNull();
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

    const load = jest.fn(() => of(new Blob(['image'], { type: 'image/png' })));
    createFixture({
      value: `![server](${IMAGE_SOURCE})`,
      imageConfig: { upload: null, preview: { kind: 'blob', revision: 1, load } },
    });

    query<HTMLButtonElement>('[data-testid="markdown-editor-preview-tab"]').click();
    query<HTMLButtonElement>('[data-testid="markdown-editor-fullscreen-toggle"]').click();
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[data-testid="markdown-editor-shell"]'),
    ).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.cm-editor')).toBeNull();
    expect(load).not.toHaveBeenCalled();
    expect(query('[data-testid="markdown-editor-shell"]').getAttribute('role')).toBeNull();
  });

  function createFixture(
    options: {
      value?: string;
      imageConfig?: MarkdownEditorImageConfig | null;
      wikiLinks?: MarkdownEditorWikiLinkConfig | null;
    } = {},
  ): void {
    fixture = TestBed.createComponent(MarkdownEditorComponent);
    setRequiredInputs(fixture, options);
    fixture.detectChanges();
  }

  function editorContent(): HTMLElement {
    return query('.cm-content');
  }

  function editorView(): EditorView {
    const view = EditorView.findFromDOM(editorContent());
    if (view === null) {
      throw new Error('Missing CodeMirror editor view');
    }
    return view;
  }

  function query<T extends Element = HTMLElement>(selector: string): T {
    const element = fixture.nativeElement.querySelector(selector) as T | null;
    if (element === null) {
      throw new Error(`Missing test element: ${selector}`);
    }
    return element;
  }
});

function setRequiredInputs(
  fixture: ComponentFixture<MarkdownEditorComponent>,
  options: {
    value?: string;
    imageConfig?: MarkdownEditorImageConfig | null;
    wikiLinks?: MarkdownEditorWikiLinkConfig | null;
  } = {},
): void {
  fixture.componentRef.setInput('value', options.value ?? '');
  fixture.componentRef.setInput('accessibleLabel', 'Article body');
  fixture.componentRef.setInput('labels', LABELS);
  fixture.componentRef.setInput('imageConfig', options.imageConfig ?? null);
  fixture.componentRef.setInput('imageInteractionsDisabled', false);
  fixture.componentRef.setInput('wikiLinks', options.wikiLinks ?? null);
}

function key(
  target: EventTarget,
  keyValue: string,
  options: KeyboardEventInit = {},
  type: 'keydown' | 'keyup' = 'keydown',
): KeyboardEvent {
  const event = new KeyboardEvent(type, {
    bubbles: true,
    cancelable: true,
    key: keyValue,
    ...options,
  });
  if (options.isComposing === true && !event.isComposing) {
    Object.defineProperty(event, 'isComposing', { value: true });
  }
  target.dispatchEvent(event);
  return event;
}

function flushAnimationFrames(frames: FrameRequestCallback[]): void {
  let guard = 0;
  while (frames.length > 0) {
    const frame = frames.shift();
    frame?.(performance.now());
    guard += 1;
    if (guard > 20) {
      throw new Error('Animation frame queue did not settle');
    }
  }
}

function mockTableCellDocumentBounds(
  scroller: HTMLElement,
  documentOffset: () => number,
  tableLayoutShift: () => number = () => 0,
): void {
  const original = HTMLElement.prototype.getBoundingClientRect;
  jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    if (this.matches('[data-testid="markdown-editor-shell"]')) {
      return rectangle({ bottom: Math.min(window.innerHeight - 100, 500), top: 100 });
    }
    if (this.matches('[data-table-cell="true"]')) {
      const top = documentOffset() + tableLayoutShift() - scroller.scrollTop;
      const left = 100 - scroller.scrollLeft;
      return {
        bottom: top + 40,
        height: 40,
        left,
        right: left + 300,
        top,
        width: 300,
        x: left,
        y: top,
        toJSON: () => ({}),
      } satisfies DOMRect;
    }
    return original.call(this);
  });
}

function rectangle(overrides: Partial<DOMRect> = {}): DOMRect {
  return {
    bottom: 40,
    height: 40,
    left: 0,
    right: 320,
    top: 0,
    width: 320,
    x: 0,
    y: 0,
    toJSON: () => ({}),
    ...overrides,
  };
}

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

function imageDragEvent(file: File): DragEvent {
  const event = new Event('dragover', { bubbles: true, cancelable: true }) as DragEvent;
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
