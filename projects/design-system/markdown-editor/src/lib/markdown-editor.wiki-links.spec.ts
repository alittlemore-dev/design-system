import {
  Completion,
  CompletionContext,
  CompletionResult,
  startCompletion,
} from '@codemirror/autocomplete';
import { EditorSelection, EditorState, type SelectionRange } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { markdownEditorLanguage } from './markdown-editor.extensions';
import {
  activeWikiLinkContext,
  WikiLinkCompletionData,
  markdownEditorWikiLinks,
  setWikiLinkCompletionData,
  wikiLinkCompletionData,
  wikiLinkCompletionSource,
} from './markdown-editor.wiki-links';

const completionData: WikiLinkCompletionData = {
  namespaces: [
    { key: 'articles', label: 'Articles' },
    { key: 'matrix', label: 'Matrix' },
  ],
  groups: [
    {
      namespace: 'articles',
      targets: [
        {
          key: 'typed-articles',
          label: 'Типизированные статьи',
          description: 'Опубликовано',
          badge: null,
        },
      ],
    },
    {
      namespace: 'matrix',
      targets: [
        {
          key: 'draft-question',
          label: 'Черновой вопрос',
          description: 'Черновик',
          badge: 'Draft',
        },
        {
          key: 'known-question',
          label: 'Известный вопрос',
          description: 'Опубликовано',
          badge: null,
        },
      ],
    },
  ],
};

describe('Markdown editor wiki-link completions', () => {
  it('offers every typed domain after the opening delimiters', () => {
    const { state, cursor } = markedState('[[');
    const result = completionResult(state, cursor);

    expect(result.from).toBe(2);
    expect(result.options.map((option) => option.label)).toEqual(['articles', 'matrix']);
  });

  it('uses only the partial domain as the strict filtering range', () => {
    const { state, cursor } = markedState('Before [[ma');
    const result = completionResult(state, cursor);

    expect(state.sliceDoc(result.from, cursor)).toBe('ma');
    expect(result.options.map((option) => option.label)).toEqual(['articles', 'matrix']);
  });

  it('applies a domain minimally and immediately exposes its targets', () => {
    const { state, cursor } = markedState('Before [[ma¦]] after');
    const domainResult = completionResult(state, cursor);
    const view = new EditorView({ state });

    applyCompletion(view, domainResult, 'matrix');

    expect(view.state.doc.toString()).toBe('Before [[matrix:]] after');
    expect(view.state.selection.main.head).toBe('Before [[matrix:'.length);
    const targetResult = completionResult(view.state, view.state.selection.main.head);
    expect(targetResult.options.map((option) => option.label)).toEqual([
      'draft-question',
      'known-question',
    ]);
    view.destroy();
  });

  it('returns sorted target slugs with localized title and publication metadata', () => {
    const { state, cursor } = markedState('[[matrix:');
    const result = completionResult(state, cursor);

    expect(result.options).toEqual([
      expect.objectContaining({
        label: 'draft-question',
        wikiLinkLabel: 'Черновой вопрос',
        wikiLinkDescription: 'Черновик',
        wikiLinkBadge: 'Draft',
      }),
      expect.objectContaining({
        label: 'known-question',
        wikiLinkLabel: 'Известный вопрос',
        wikiLinkDescription: 'Опубликовано',
        wikiLinkBadge: null,
      }),
    ]);
  });

  it('uses only the partial slug as the strict filtering range', () => {
    const { state, cursor } = markedState('[[matrix:kn');
    const result = completionResult(state, cursor);

    expect(state.sliceDoc(result.from, cursor)).toBe('kn');
    expect(result.options.map((option) => option.label)).toContain('known-question');
  });

  it('preserves existing closing brackets and places the cursor before them', () => {
    const { state, cursor } = markedState('Before [[matrix:kn]] after');
    const result = completionResult(state, cursor);
    const view = new EditorView({ state });

    applyCompletion(view, result, 'known-question');

    expect(view.state.doc.toString()).toBe('Before [[matrix:known-question]] after');
    expect(view.state.selection.main.head).toBe(view.state.doc.toString().indexOf(']]'));
    view.destroy();
  });

  it('preserves an existing alias when completing the target before its separator', () => {
    const { state, cursor } = markedState('Before [[matrix:kn¦|Known alias]] after');
    const result = completionResult(state, cursor);
    const view = new EditorView({ state });

    applyCompletion(view, result, 'known-question');

    expect(view.state.doc.toString()).toBe('Before [[matrix:known-question|Known alias]] after');
    expect(view.state.selection.main.head).toBe(view.state.doc.toString().indexOf('|'));
    view.destroy();
  });

  it('preserves an existing escaped alias separator inside a Markdown table', () => {
    const { state, cursor } = markedState('| [[matrix:kn¦\\|Known alias]] |');
    const result = completionResult(state, cursor);
    const view = new EditorView({ state });

    applyCompletion(view, result, 'known-question');

    expect(view.state.doc.toString()).toBe('| [[matrix:known-question\\|Known alias]] |');
    expect(view.state.selection.main.head).toBe(view.state.doc.toString().indexOf('\\|'));
    view.destroy();
  });

  it('does not open suggestions solely because the cursor is inside an incomplete wiki-link', () => {
    const { state } = markedState('Before [[matrix:¦|Known alias]] after');
    const parent = document.createElement('div');
    document.body.append(parent);
    const view = new EditorView({ state, parent });

    expect(view.dom.querySelector('[role="listbox"]')).toBeNull();

    view.destroy();
    parent.remove();
  });

  it('renders activated suggestions through the positioned CodeMirror tooltip', async () => {
    const { state } = markedState('Before [[matrix:¦|Known alias]] after');
    const parent = document.createElement('div');
    document.body.append(parent);
    const view = new EditorView({ state, parent });

    expect(startCompletion(view)).toBe(true);
    await waitFor(() => view.dom.querySelector('.cm-tooltip-autocomplete') !== null);
    expect(view.dom.querySelector('.cm-tooltip-autocomplete [role="listbox"]')).not.toBeNull();
    expect(view.dom.querySelector('.cm-wiki-link-completion-panel')).toBeNull();
    expect(
      [...view.dom.querySelectorAll('.cm-wiki-link-completion-label')].map(
        (element) => element.textContent,
      ),
    ).toEqual(['Черновой вопрос', 'Известный вопрос']);
    expect(
      [...view.dom.querySelectorAll('.cm-wiki-link-completion-description')].map(
        (element) => element.textContent,
      ),
    ).toEqual(['Черновик', 'Опубликовано']);
    expect(view.dom.querySelector('.cm-wiki-link-completion-badge')?.textContent).toBe('Draft');
    expect(view.dom.querySelectorAll('.cm-wiki-link-completion-option')).toHaveLength(2);

    view.destroy();
    parent.remove();
  });

  it('renders domain suggestions without target-only metadata or option styling', async () => {
    const { state } = markedState('[[');
    const parent = document.createElement('div');
    document.body.append(parent);
    const view = new EditorView({ state, parent });

    expect(startCompletion(view)).toBe(true);
    await waitFor(() => view.dom.querySelector('.cm-tooltip-autocomplete') !== null);

    expect(view.dom.querySelector('.cm-wiki-link-completion-metadata')).toBeNull();
    expect(view.dom.querySelector('.cm-wiki-link-completion-option')).toBeNull();

    view.destroy();
    parent.remove();
  });

  it('closes an open suggestion list when IME composition starts', async () => {
    const { state } = markedState('[[matrix:');
    const parent = document.createElement('div');
    document.body.append(parent);
    const view = new EditorView({ state, parent });

    expect(startCompletion(view)).toBe(true);
    await waitFor(() => view.dom.querySelector('.cm-tooltip-autocomplete') !== null);

    view.contentDOM.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    await waitFor(() => view.dom.querySelector('.cm-tooltip-autocomplete') === null);

    view.destroy();
    parent.remove();
  });

  it('adds missing closing brackets without touching neighboring Markdown', () => {
    const { state, cursor } = markedState('**Before** [[matrix:kn');
    const result = completionResult(state, cursor);
    const view = new EditorView({ state });

    applyCompletion(view, result, 'known-question');

    expect(view.state.doc.toString()).toBe('**Before** [[matrix:known-question]]');
    expect(view.state.selection.main.head).toBe(view.state.doc.toString().indexOf(']]'));
    view.destroy();
  });

  it('adds only one missing closing bracket', () => {
    const { state, cursor } = markedState('[[matrix:kn]');
    const result = completionResult(state, cursor);
    const view = new EditorView({ state });

    applyCompletion(view, result, 'known-question');

    expect(view.state.doc.toString()).toBe('[[matrix:known-question]]');
    view.destroy();
  });

  it('returns an empty target list for a supported domain with no items', () => {
    const emptyMatrixData: WikiLinkCompletionData = {
      ...completionData,
      groups: [
        { namespace: 'articles', targets: [] },
        { namespace: 'matrix', targets: [] },
      ],
    };
    const { state, cursor } = markedState('[[matrix:', emptyMatrixData);

    expect(completionResult(state, cursor).options).toEqual([]);
  });

  it('returns empty suggestions when completion data or a matching target group is absent', () => {
    const domainStateWithoutData = EditorState.create({
      doc: '[[',
      selection: EditorSelection.cursor(2),
      extensions: [markdownEditorLanguage, markdownEditorWikiLinks],
    });
    const stateWithoutData = EditorState.create({
      doc: '[[matrix:',
      selection: EditorSelection.cursor('[[matrix:'.length),
      extensions: [markdownEditorLanguage, markdownEditorWikiLinks],
    });
    const stateWithoutGroup = configuredState(
      '[[missing:',
      EditorSelection.cursor('[[missing:'.length),
      completionData,
    );

    expect(wikiLinkCompletionData(EditorState.create())).toBeNull();
    expect(
      completionResult(domainStateWithoutData, domainStateWithoutData.selection.main.head).options,
    ).toEqual([]);
    expect(
      completionResult(stateWithoutData, stateWithoutData.selection.main.head).options,
    ).toEqual([]);
    expect(
      completionResult(stateWithoutGroup, stateWithoutGroup.selection.main.head).options,
    ).toEqual([]);
  });

  it('omits optional target metadata when the source explicitly has none', async () => {
    const data: WikiLinkCompletionData = {
      namespaces: [{ key: 'articles', label: 'Articles' }],
      groups: [
        {
          namespace: 'articles',
          targets: [{ key: 'plain', label: 'Plain', description: null, badge: null }],
        },
      ],
    };
    const { state } = markedState('[[articles:', data);
    const parent = document.createElement('div');
    document.body.append(parent);
    const view = new EditorView({ state, parent });

    expect(startCompletion(view)).toBe(true);
    await waitFor(() => view.dom.querySelector('.cm-wiki-link-completion-label') !== null);

    expect(view.dom.querySelector('.cm-wiki-link-completion-label')?.textContent).toBe('Plain');
    expect(view.dom.querySelector('.cm-wiki-link-completion-description')).toBeNull();
    expect(view.dom.querySelector('.cm-wiki-link-completion-badge')).toBeNull();

    view.destroy();
    parent.remove();
  });

  it.each([
    ['uppercase domain', '[[Matrix'],
    ['domain beginning with a digit', '[[1matrix'],
    ['empty domain before a colon', '[[:key'],
    ['closing bracket inside a slug', '[[matrix:key]tail'],
  ])('rejects an invalid %s', (_name, document) => {
    const { state, cursor } = markedState(document);

    expect(activeWikiLinkContext(state, cursor)).toBeNull();
  });

  it.each([
    ['an ordinary Markdown link', '[label](target)'],
    ['a complete wiki-link', '[[matrix:known-question]]¦'],
    ['wiki-link label text', '[[matrix:known-question|Label'],
    ['inline code', '`[[matrix:`'],
    ['fenced code', '```md\n[[matrix:\n```'],
  ])('does not complete inside %s', (_name, document) => {
    const { state, cursor } = markedState(document);

    expect(wikiLinkCompletionSource(new CompletionContext(state, cursor, false))).toBeNull();
  });

  it('does not complete a non-empty selection', () => {
    const state = configuredState(
      '[[matrix:',
      EditorSelection.single(2, '[[matrix:'.length),
      completionData,
    );

    expect(
      wikiLinkCompletionSource(new CompletionContext(state, state.selection.main.head, false)),
    ).toBeNull();
  });

  it('does not complete multiple selections', () => {
    const document = '[[\n[[';
    const state = configuredState(
      document,
      EditorSelection.create([EditorSelection.cursor(2), EditorSelection.cursor(document.length)]),
      completionData,
    );

    expect(
      wikiLinkCompletionSource(new CompletionContext(state, state.selection.main.head, false)),
    ).toBeNull();
  });
});

function markedState(
  document: string,
  data: WikiLinkCompletionData = completionData,
): { state: EditorState; cursor: number } {
  const marker = document.indexOf('¦');
  const cursor = marker === -1 ? cursorForDocument(document) : marker;
  const cleanDocument = marker === -1 ? document : document.replace('¦', '');
  return {
    state: configuredState(cleanDocument, EditorSelection.cursor(cursor), data),
    cursor,
  };
}

function cursorForDocument(document: string): number {
  const closing = document.indexOf(']]');
  if (closing !== -1) {
    const colon = document.lastIndexOf(':', closing);
    if (colon !== -1) {
      return closing;
    }
  }
  if (document.endsWith(']')) {
    return document.length - 1;
  }
  if (document.includes('```')) {
    const activeLine = document.indexOf('[[matrix:') + '[[matrix:'.length;
    return activeLine;
  }
  return document.length;
}

function configuredState(
  document: string,
  selection: EditorSelection | SelectionRange,
  data: WikiLinkCompletionData,
): EditorState {
  const state = EditorState.create({
    doc: document,
    selection,
    extensions: [
      EditorState.allowMultipleSelections.of(true),
      markdownEditorLanguage,
      markdownEditorWikiLinks,
    ],
  });
  return state.update({ effects: setWikiLinkCompletionData.of(data) }).state;
}

function completionResult(state: EditorState, cursor: number): CompletionResult {
  const result = wikiLinkCompletionSource(new CompletionContext(state, cursor, false));
  if (result === null) {
    throw new Error('Expected wiki-link completions');
  }
  return result;
}

function applyCompletion(view: EditorView, result: CompletionResult, label: string): void {
  const completion = result.options.find((option) => option.label === label);
  if (completion === undefined || typeof completion.apply !== 'function') {
    throw new Error(`Missing completion apply function for ${label}`);
  }
  completion.apply(
    view,
    completion as Completion,
    result.from,
    result.to ?? view.state.selection.main.head,
  );
}

async function waitFor(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (predicate()) {
      return;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('Timed out waiting for wiki-link completions');
}
