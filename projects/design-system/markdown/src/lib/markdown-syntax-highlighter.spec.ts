import { highlightMarkdownCode, tokenizeMarkdownCode } from './markdown-syntax-highlighter';

describe('Markdown syntax highlighting', () => {
  it.each(['gherkin', 'feature', 'cucumber'])('supports the %s Gherkin alias', (language) => {
    const result = highlightMarkdownCode(
      'Feature: Authentication\n  Scenario: Sign in\n    Given a registered user',
      language,
    );

    expect(result?.language).toBe(language);
    expect(result?.html).toContain('<span class="token keyword">Feature:</span>');
    expect(result?.html).toContain('<span class="token atrule">Given</span>');
  });

  it('returns syntax ranges for CodeMirror presentation without HTML', () => {
    const result = tokenizeMarkdownCode('const answer: number = 42;', 'ts');

    expect(result?.language).toBe('ts');
    expect(result?.tokens).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ from: 0, to: 5, types: expect.arrayContaining(['keyword']) }),
      ]),
    );
  });

  it.each([undefined, '', 'unknown-language', '<script>'])(
    'returns null for unsupported language info %p',
    (language) => {
      expect(highlightMarkdownCode('value', language)).toBeNull();
      expect(tokenizeMarkdownCode('value', language)).toBeNull();
    },
  );
});
