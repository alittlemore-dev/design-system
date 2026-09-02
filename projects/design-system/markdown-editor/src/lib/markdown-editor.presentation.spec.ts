import { EditorState } from '@codemirror/state';
import { ensureSyntaxTree, syntaxTreeAvailable } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { markdownEditorLanguage } from './markdown-editor.extensions';
import {
  buildMarkdownPresentationDecorations,
  markdownPresentation,
} from './markdown-editor.presentation';
import { markdownEditorWikiLinks, setWikiLinkCompletionData } from './markdown-editor.wiki-links';

describe('Markdown editor presentation', () => {
  const views: EditorView[] = [];

  afterEach(() => {
    for (const view of views.splice(0)) view.destroy();
  });

  it('decorates configured generic wiki-link namespaces and keys', () => {
    const document = 'Read [[people:person-1|Ada Lovelace]].';
    const initial = EditorState.create({
      doc: document,
      extensions: [markdownEditorLanguage, markdownEditorWikiLinks],
    });
    const state = initial.update({
      effects: setWikiLinkCompletionData.of({
        namespaces: [{ key: 'people', label: 'People' }],
        groups: [],
      }),
    }).state;
    const decorations = buildMarkdownPresentationDecorations(state, [
      { from: 0, to: document.length },
    ]);
    const classes: string[] = [];

    decorations.between(0, document.length, (_from, _to, decoration) => {
      const className = decoration.spec.class as string | undefined;
      if (className !== undefined) classes.push(className);
    });

    expect(classes).toEqual(
      expect.arrayContaining([
        expect.stringContaining('cm-wiki-link-namespace'),
        expect.stringContaining('cm-wiki-link-key'),
        expect.stringContaining('cm-wiki-link-label'),
      ]),
    );
  });

  it('builds semantic decorations only for visible document ranges', () => {
    const document = ['# Outside viewport', '', 'plain', '', '## Visible heading'].join('\n');
    const visibleFrom = document.indexOf('## Visible');
    const state = completelyParsedMarkdownState(document);
    const decorations = buildMarkdownPresentationDecorations(state, [
      { from: visibleFrom, to: document.length },
    ]);
    const classes: { from: number; className: string }[] = [];

    decorations.between(0, state.doc.length, (from, _to, decoration) => {
      const className = decoration.spec.class as string | undefined;
      if (className !== undefined) {
        classes.push({ from, className });
      }
    });

    expect(classes.length).toBeGreaterThan(0);
    expect(classes.every(({ from }) => from >= visibleFrom)).toBe(true);
    expect(classes.some(({ className }) => className.includes('cm-markdown-heading-2'))).toBe(true);
    expect(classes.some(({ className }) => className.includes('cm-markdown-heading-1'))).toBe(
      false,
    );
  });

  it.each([
    '[ordinary](https://example.com)',
    '[[unprefixed-link]]',
    '[[unknown:target]]',
    '[[articles:Invalid]]',
    '[[articles:typed-articles]]',
    '[[matrix:known-question|Custom label]]',
    '`[[matrix:inline-code]]`',
    '```md\n[[matrix:fenced-code]]\n```',
  ])('does not decorate unsupported or code-contained syntax: %s', (document) => {
    expect(wikiLinkClasses(document)).toEqual([]);
  });

  it('presents every supported block and inline construct with its visible semantic class', () => {
    const document = [
      '# H1',
      '## H2',
      '### H3',
      '#### H4',
      '##### H5',
      '###### H6',
      'Setext one',
      '===',
      'Setext two',
      '---',
      '',
      '***',
      '> quote',
      '> [!NOTE] callout',
      '- item',
      '- [x] task',
      '',
      '| A | B |',
      '| --- | --- |',
      '| 1 | 2 |',
      '',
      '`inline`',
      '',
      '```ts',
      'const answer = 42;',
      '```',
    ].join('\n');

    const classes = decorationClasses(completelyParsedMarkdownState(document));
    const classNames = classes.map(({ className }) => className);

    for (let level = 1; level <= 6; level += 1) {
      expect(classNames).toContainEqual(expect.stringContaining(`cm-markdown-heading-${level}`));
    }
    expect(classNames.filter((value) => value.includes('cm-markdown-heading-1'))).toHaveLength(3);
    expect(classNames.filter((value) => value.includes('cm-markdown-heading-2'))).toHaveLength(3);
    expect(classNames).toContainEqual(expect.stringContaining('cm-markdown-quote'));
    expect(classNames).toContainEqual(expect.stringContaining('cm-markdown-callout'));
    expect(classNames).toContainEqual(expect.stringContaining('cm-markdown-list'));
    expect(classNames).toContainEqual(expect.stringContaining('cm-markdown-task'));
    expect(classNames).toContainEqual(expect.stringContaining('cm-markdown-table'));
    expect(classNames).toContainEqual(expect.stringContaining('cm-markdown-horizontal-rule'));
    expect(classNames).toContainEqual(expect.stringContaining('cm-markdown-inline-code'));
    expect(classNames).toContainEqual(expect.stringContaining('cm-markdown-code-fence-start'));
    expect(classNames).toContainEqual(expect.stringContaining('cm-markdown-code-fence-end'));
    expect(classNames).toContainEqual(expect.stringContaining('cm-prism-keyword'));
    expect(classNames).toContainEqual(expect.stringContaining('tok-number'));
  });

  it('does not present an unclosed fenced block as having a closing fence', () => {
    const document = '~~~ts\nconst value = 1;';
    const classes = decorationClasses(completelyParsedMarkdownState(document));

    expect(
      classes.some(({ className }) => className.includes('cm-markdown-code-fence-start')),
    ).toBe(true);
    expect(classes.some(({ className }) => className.includes('cm-markdown-code-fence-end'))).toBe(
      false,
    );
  });

  it('clips inline presentation to the visible range without duplicating overlapping ranges', () => {
    const document = '`visible code`';
    const state = completelyParsedMarkdownState(document);
    const decorations = buildMarkdownPresentationDecorations(state, [
      { from: 1, to: 8 },
      { from: 1, to: 8 },
    ]);
    const ranges: { from: number; to: number; className: string }[] = [];

    decorations.between(0, document.length, (from, to, decoration) => {
      ranges.push({ from, to, className: decoration.spec.class as string });
    });

    expect(ranges).toEqual([{ from: 1, to: 8, className: 'cm-markdown-inline-code' }]);
  });

  it('presents a configured incomplete wiki link as active editable parts', () => {
    const document = '[[people:ad';
    const initial = EditorState.create({
      doc: document,
      selection: { anchor: document.length },
      extensions: [markdownEditorLanguage, markdownEditorWikiLinks],
    });
    const state = initial.update({
      effects: setWikiLinkCompletionData.of({
        namespaces: [{ key: 'people', label: 'People' }],
        groups: [],
      }),
    }).state;

    const classes = decorationClasses(state).filter(({ className }) =>
      className.includes('cm-wiki-link-'),
    );

    expect(classes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ text: '[[', className: expect.stringContaining('active') }),
        expect.objectContaining({
          text: 'people',
          className: expect.stringContaining('namespace'),
        }),
        expect.objectContaining({ text: ':', className: expect.stringContaining('colon') }),
        expect.objectContaining({ text: 'ad', className: expect.stringContaining('key') }),
      ]),
    );
  });

  it('keeps active wiki presentation disabled until its namespace is configured', () => {
    const document = '[[unknown:target';
    const initial = EditorState.create({
      doc: document,
      selection: { anchor: document.length },
      extensions: [markdownEditorLanguage, markdownEditorWikiLinks],
    });
    const state = initial.update({
      effects: setWikiLinkCompletionData.of({
        namespaces: [{ key: 'people', label: 'People' }],
        groups: [],
      }),
    }).state;

    expect(decorationClasses(state).some(({ className }) => className.includes('active'))).toBe(
      false,
    );
  });

  it.each([
    {
      document: '[[people:ada]]',
      expected: [
        { text: 'people', semanticClass: 'namespace' },
        { text: 'ada', semanticClass: 'key' },
      ],
    },
    {
      document: '[[people:ada\\|Alias]]',
      expected: [
        { text: '\\|', semanticClass: 'label-separator' },
        { text: 'Alias', semanticClass: 'label' },
      ],
    },
  ])('presents completed wiki-link form $document', ({ document, expected }) => {
    const initial = EditorState.create({
      doc: document,
      extensions: [markdownEditorLanguage, markdownEditorWikiLinks],
    });
    const state = initial.update({
      effects: setWikiLinkCompletionData.of({
        namespaces: [{ key: 'people', label: 'People' }],
        groups: [],
      }),
    }).state;
    const classes = decorationClasses(state);

    for (const item of expected) {
      expect(classes).toContainEqual(
        expect.objectContaining({
          text: item.text,
          className: expect.stringContaining(`cm-wiki-link-${item.semanticClass}`),
        }),
      );
    }
  });

  it('presents the opening namespace fragment before an active wiki link has a colon', () => {
    const document = '[[peo';
    const initial = EditorState.create({
      doc: document,
      selection: { anchor: document.length },
      extensions: [markdownEditorLanguage, markdownEditorWikiLinks],
    });
    const state = initial.update({
      effects: setWikiLinkCompletionData.of({
        namespaces: [{ key: 'people', label: 'People' }],
        groups: [],
      }),
    }).state;
    const classes = decorationClasses(state).filter(({ className }) =>
      className.includes('cm-wiki-link-active'),
    );

    expect(classes).toEqual([
      expect.objectContaining({ text: '[[', className: expect.stringContaining('delimiter') }),
      expect.objectContaining({ text: 'peo', className: expect.stringContaining('namespace') }),
    ]);
  });

  it.each([
    { document: '```ts\n```', name: 'an empty code block' },
    { document: '```\nplain text\n```', name: 'a code block without a language' },
  ])('keeps $name visibly fenced without inventing syntax tokens', ({ document }) => {
    const classes = decorationClasses(completelyParsedMarkdownState(document));

    expect(
      classes.some(({ className }) => className.includes('cm-markdown-code-fence-start')),
    ).toBe(true);
    expect(classes.some(({ className }) => className.includes('cm-markdown-code-fence-end'))).toBe(
      true,
    );
    expect(classes.some(({ className }) => className.includes('cm-prism-'))).toBe(false);
  });

  it('keeps Prism token types even when the editor has no shared highlight-class alias', () => {
    const document = '```ts\nfunction demo() {}\n```';
    const classes = decorationClasses(completelyParsedMarkdownState(document));

    expect(classes).toContainEqual(
      expect.objectContaining({
        text: 'demo',
        className: expect.stringContaining('cm-prism-function'),
      }),
    );
  });

  it('returns no line presentation for an empty visible interval', () => {
    const document = '# Heading';
    const state = completelyParsedMarkdownState(document);

    expect(buildMarkdownPresentationDecorations(state, [{ from: 4, to: 4 }]).size).toBe(0);
  });

  it('updates rendered presentation after an observable editor document change', () => {
    const parent = document.createElement('div');
    document.body.append(parent);
    const view = new EditorView({
      parent,
      state: EditorState.create({
        doc: '# Heading',
        extensions: [markdownEditorLanguage, markdownPresentation],
      }),
    });
    views.push(view);
    expect(view.dom.querySelector('.cm-markdown-heading-1')).not.toBeNull();

    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: '> quote' } });

    expect(view.dom.querySelector('.cm-markdown-heading-1')).toBeNull();
    expect(view.dom.querySelector('.cm-markdown-quote')).not.toBeNull();
    view.dispatch({ selection: { anchor: 1 } });
    expect(view.dom.querySelector('.cm-markdown-quote')).not.toBeNull();
    view.dispatch({});
    expect(view.dom.querySelector('.cm-markdown-quote')).not.toBeNull();
    parent.remove();
  });
});

interface DecorationClass {
  from: number;
  text: string;
  className: string;
}

function wikiLinkClasses(
  document: string,
  visibleRanges: readonly { from: number; to: number }[] = [{ from: 0, to: document.length }],
  cursor: number = document.length,
): DecorationClass[] {
  const state = completelyParsedMarkdownState(document, cursor);
  const decorations = buildMarkdownPresentationDecorations(state, visibleRanges);
  const classes: DecorationClass[] = [];

  decorations.between(0, state.doc.length, (from, to, decoration) => {
    const className = decoration.spec.class as string | undefined;
    if (className?.includes('cm-wiki-link-')) {
      classes.push({
        from,
        text: state.sliceDoc(from, to),
        className,
      });
    }
  });
  return classes;
}

function decorationClasses(state: EditorState): DecorationClass[] {
  const decorations = buildMarkdownPresentationDecorations(state, [
    { from: 0, to: state.doc.length },
  ]);
  const classes: DecorationClass[] = [];
  decorations.between(0, state.doc.length, (from, to, decoration) => {
    const className = decoration.spec.class as string | undefined;
    if (className !== undefined) {
      classes.push({ from, text: state.sliceDoc(from, to), className });
    }
  });
  return classes;
}

function completelyParsedMarkdownState(
  document: string,
  cursor: number = document.length,
): EditorState {
  const state = EditorState.create({
    doc: document,
    selection: { anchor: cursor },
    extensions: [markdownEditorLanguage],
  });
  if (ensureSyntaxTree(state, state.doc.length, 1000) === null) {
    throw new Error('Markdown syntax tree did not finish parsing');
  }
  const parsedState = state.update().state;
  if (!syntaxTreeAvailable(parsedState, parsedState.doc.length)) {
    throw new Error('Markdown syntax tree was not committed to editor state');
  }
  return parsedState;
}
