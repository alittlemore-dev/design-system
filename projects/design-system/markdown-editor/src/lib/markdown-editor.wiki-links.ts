import {
  autocompletion,
  closeCompletion,
  pickedCompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from '@codemirror/autocomplete';
import { syntaxTree } from '@codemirror/language';
import {
  EditorSelection,
  EditorState,
  StateEffect,
  StateField,
  Transaction,
  type Extension,
} from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import type { SyntaxNode } from '@lezer/common';
import {
  type MarkdownWikiLinkNamespace,
  type MarkdownWikiLinkTarget,
  type MarkdownWikiLinkTargetGroup,
} from '@alittlemore.dev/design-system/markdown';

export interface WikiLinkCompletionData {
  readonly namespaces: readonly MarkdownWikiLinkNamespace[];
  readonly groups: readonly MarkdownWikiLinkTargetGroup[];
}

export interface WikiLinkSourceRange {
  from: number;
  to: number;
}

export interface ActiveWikiLinkContext {
  stage: 'domain' | 'target';
  opening: WikiLinkSourceRange;
  domain: WikiLinkSourceRange;
  colon: WikiLinkSourceRange | null;
  slug: WikiLinkSourceRange | null;
  targetType: string | null;
}

interface WikiLinkCompletion extends Completion {
  wikiLinkStage: 'domain' | 'target';
  wikiLinkLabel?: string;
  wikiLinkDescription?: string | null;
  wikiLinkBadge?: string | null;
}

export const setWikiLinkCompletionData = StateEffect.define<WikiLinkCompletionData | null>();

const wikiLinkCompletionDataState = StateField.define<WikiLinkCompletionData | null>({
  create: () => null,
  update: (value, transaction) => {
    for (const effect of transaction.effects) {
      if (effect.is(setWikiLinkCompletionData)) {
        return effect.value;
      }
    }
    return value;
  },
});

export function wikiLinkCompletionData(state: EditorState): WikiLinkCompletionData | null {
  return state.field(wikiLinkCompletionDataState, false) ?? null;
}

export const wikiLinkCompletionSource = (context: CompletionContext): CompletionResult | null => {
  const activeContext = activeWikiLinkContext(context.state, context.pos);
  if (activeContext === null) {
    return null;
  }
  if (activeContext.stage === 'domain') {
    const data = wikiLinkCompletionData(context.state);
    return {
      from: activeContext.domain.from,
      to: activeContext.domain.to,
      options: (data?.namespaces ?? []).map((namespace) => domainCompletion(namespace)),
      validFor: /^(?:[a-z][a-z0-9-]*)?$/,
    };
  }

  const data = wikiLinkCompletionData(context.state);
  const group = data?.groups.find((candidate) => candidate.namespace === activeContext.targetType);
  const options = [...(group?.targets ?? [])]
    .sort((left, right) => left.key.localeCompare(right.key))
    .map((target) => targetCompletion(target));
  return {
    from: activeContext.slug!.from,
    to: activeContext.slug!.to,
    options,
    validFor: /^[^\]|\r\n]*$/,
  };
};

export const markdownEditorWikiLinks: Extension = [
  wikiLinkCompletionDataState,
  EditorView.domEventHandlers({
    compositionstart: (_event, view) => {
      closeCompletion(view);
      return false;
    },
  }),
  autocompletion({
    activateOnTyping: true,
    filterStrict: true,
    icons: false,
    selectOnOpen: true,
    override: [wikiLinkCompletionSource],
    activateOnCompletion: (completion) =>
      (completion as WikiLinkCompletion).wikiLinkStage === 'domain',
    optionClass: (completion) =>
      (completion as WikiLinkCompletion).wikiLinkStage === 'target'
        ? 'cm-wiki-link-completion-option'
        : '',
    addToOptions: [
      {
        position: 40,
        render: (completion, _state, view) =>
          renderTargetMetadata(completion as WikiLinkCompletion, view),
      },
    ],
  }),
];

export function activeWikiLinkContext(
  state: EditorState,
  position: number,
): ActiveWikiLinkContext | null {
  if (
    state.selection.ranges.length !== 1 ||
    !state.selection.main.empty ||
    state.selection.main.head !== position ||
    isInsideCode(state, position)
  ) {
    return null;
  }

  const line = state.doc.lineAt(position);
  const beforeCursor = state.sliceDoc(line.from, position);
  const openingIndex = beforeCursor.lastIndexOf('[[');
  if (openingIndex === -1) {
    return null;
  }
  const openingFrom = line.from + openingIndex;
  const candidate = beforeCursor.slice(openingIndex + 2);
  if (candidate.includes(']]') || candidate.includes('|')) {
    return null;
  }

  const candidateFrom = openingFrom + 2;
  const colonIndex = candidate.indexOf(':');
  if (colonIndex === -1) {
    if (!/^(?:[a-z][a-z0-9-]*)?$/.test(candidate)) {
      return null;
    }
    return {
      stage: 'domain',
      opening: { from: openingFrom, to: candidateFrom },
      domain: { from: candidateFrom, to: position },
      colon: null,
      slug: null,
      targetType: null,
    };
  }

  const domain = candidate.slice(0, colonIndex);
  const slug = candidate.slice(colonIndex + 1);
  if (!/^[a-z][a-z0-9-]*$/.test(domain) || !/^[^\]|\r\n]*$/.test(slug)) {
    return null;
  }
  const colonFrom = candidateFrom + colonIndex;
  return {
    stage: 'target',
    opening: { from: openingFrom, to: candidateFrom },
    domain: { from: candidateFrom, to: colonFrom },
    colon: { from: colonFrom, to: colonFrom + 1 },
    slug: { from: colonFrom + 1, to: position },
    targetType: domain,
  };
}

function domainCompletion(namespace: MarkdownWikiLinkNamespace): WikiLinkCompletion {
  const completion: WikiLinkCompletion = {
    label: namespace.key,
    detail: namespace.label,
    type: 'keyword',
    wikiLinkStage: 'domain',
  };
  completion.apply = (view, selected, from, to) => {
    const insert = `${namespace.key}:`;
    view.dispatch({
      changes: { from, to, insert },
      selection: EditorSelection.cursor(from + insert.length),
      annotations: [pickedCompletion.of(selected), Transaction.userEvent.of('input.complete')],
    });
  };
  return completion;
}

function targetCompletion(target: MarkdownWikiLinkTarget): WikiLinkCompletion {
  const completion: WikiLinkCompletion = {
    label: target.key,
    type: 'text',
    wikiLinkStage: 'target',
    wikiLinkLabel: target.label,
    wikiLinkDescription: target.description,
    wikiLinkBadge: target.badge,
  };
  completion.apply = (view, selected, from, to) => {
    const after = view.state.sliceDoc(to, Math.min(view.state.doc.length, to + 2));
    const closings =
      after.startsWith('|') || after.startsWith('\\|') || after.startsWith(']]')
        ? ''
        : after.startsWith(']')
          ? ']'
          : ']]';
    view.dispatch({
      changes: { from, to, insert: `${target.key}${closings}` },
      selection: EditorSelection.cursor(from + target.key.length),
      annotations: [pickedCompletion.of(selected), Transaction.userEvent.of('input.complete')],
    });
  };
  return completion;
}

function renderTargetMetadata(completion: WikiLinkCompletion, view: EditorView): Node | null {
  if (completion.wikiLinkStage !== 'target' || completion.wikiLinkLabel === undefined) {
    return null;
  }
  const document = view.dom.ownerDocument;
  const metadata = document.createElement('span');
  metadata.className = 'cm-wiki-link-completion-metadata';
  const label = document.createElement('span');
  label.className = 'cm-wiki-link-completion-label';
  label.textContent = completion.wikiLinkLabel;
  metadata.append(label);
  if (completion.wikiLinkDescription !== null && completion.wikiLinkDescription !== undefined) {
    const description = document.createElement('span');
    description.className = 'cm-wiki-link-completion-description';
    description.textContent = completion.wikiLinkDescription;
    metadata.append(description);
  }
  if (completion.wikiLinkBadge !== null && completion.wikiLinkBadge !== undefined) {
    const badge = document.createElement('span');
    badge.className = 'cm-wiki-link-completion-badge';
    badge.textContent = completion.wikiLinkBadge;
    metadata.append(badge);
  }
  return metadata;
}

function isInsideCode(state: EditorState, position: number): boolean {
  let node: SyntaxNode | null = syntaxTree(state).resolveInner(Math.max(0, position - 1), 1);
  while (node !== null) {
    if (node.name === 'InlineCode' || node.name === 'FencedCode') {
      return true;
    }
    node = node.parent;
  }
  return false;
}
