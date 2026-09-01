import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { ensureSyntaxTree } from '@codemirror/language';
import {
  markdownEditorFoundationExtensions,
  markdownEditorLanguage,
  markdownEditorCspExtension,
} from './markdown-editor.extensions';

describe('Markdown editor extensions', () => {
  it('parses the extended Markdown structures used by the editor', () => {
    const state = EditorState.create({
      doc: [
        '| Name | Value |',
        '| --- | --- |',
        '| answer | 42 |',
        '',
        '- [ ] task',
        '',
        '~~removed~~',
      ].join('\n'),
      extensions: [markdownEditorLanguage],
    });
    const tree = ensureSyntaxTree(state, state.doc.length, 1_000)?.toString();

    expect(tree).toBeDefined();
    expect(tree).toContain('Table');
    expect(tree).toContain('Task');
    expect(tree).toContain('Strikethrough');
  });

  it('includes wiki-link completion in the shared editor foundation', () => {
    const state = EditorState.create({
      doc: '[[',
      extensions: markdownEditorFoundationExtensions,
    });

    expect(state.selection.main.head).toBe(0);
  });

  it('passes the Angular CSP nonce into CodeMirror runtime styles', () => {
    const state = EditorState.create({
      extensions: [markdownEditorCspExtension('editor-nonce')],
    });

    expect(state.facet(EditorView.cspNonce)).toBe('editor-nonce');
  });
});
