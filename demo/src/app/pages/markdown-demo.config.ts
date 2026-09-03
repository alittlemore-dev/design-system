import {
  type MarkdownEditorImageConfig,
  type MarkdownEditorLabels,
  type MarkdownEditorWikiLinkConfig,
} from '@alittlemoron/design-system/markdown-editor';
import { of } from 'rxjs';

export const MARKDOWN_EDITOR_LABELS: MarkdownEditorLabels = {
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
    orderedList: 'Ordered list',
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

export const MARKDOWN_IMAGE_CONFIG: MarkdownEditorImageConfig = {
  upload: {
    sources: ['picker', 'paste', 'drop'],
    acceptedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    upload: () => of({ source: '/assets/demo-image.svg' }),
  },
  preview: { kind: 'direct' },
};

export const MARKDOWN_WIKI_LINKS: MarkdownEditorWikiLinkConfig = {
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

export const INITIAL_MARKDOWN = [
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
].join('\n');
