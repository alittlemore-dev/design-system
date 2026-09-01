import { EditorState } from '@codemirror/state';
import { ensureSyntaxTree, syntaxTreeAvailable } from '@codemirror/language';
import { markdownEditorLanguage } from './markdown-editor.extensions';
import { buildMarkdownPresentationDecorations } from './markdown-editor.presentation';
import { markdownEditorWikiLinks, setWikiLinkCompletionData } from './markdown-editor.wiki-links';

describe('Markdown editor presentation', () => {
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
