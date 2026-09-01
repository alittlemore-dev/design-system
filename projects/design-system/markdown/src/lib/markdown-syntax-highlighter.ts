import Prism from 'prismjs';
import 'prismjs/components/prism-bash.js';
import 'prismjs/components/prism-docker.js';
import 'prismjs/components/prism-gherkin.js';
import 'prismjs/components/prism-go.js';
import 'prismjs/components/prism-ini.js';
import 'prismjs/components/prism-json.js';
import 'prismjs/components/prism-markdown.js';
import 'prismjs/components/prism-nginx.js';
import 'prismjs/components/prism-python.js';
import 'prismjs/components/prism-scss.js';
import 'prismjs/components/prism-sql.js';
import 'prismjs/components/prism-toml.js';
import 'prismjs/components/prism-typescript.js';
import 'prismjs/components/prism-yaml.js';

export interface HighlightedMarkdownCode {
  readonly html: string;
  readonly language: string;
}

export interface MarkdownCodeToken {
  readonly from: number;
  readonly to: number;
  readonly types: readonly string[];
}

export interface TokenizedMarkdownCode {
  readonly language: string;
  readonly tokens: readonly MarkdownCodeToken[];
}

type MarkdownPrism = typeof Prism & { manual: boolean };

Prism.manual = true;

const markdownPrism = Prism as MarkdownPrism;

markdownPrism.languages['feature'] = markdownPrism.languages['gherkin'];
markdownPrism.languages['cucumber'] = markdownPrism.languages['gherkin'];

export function highlightMarkdownCode(
  code: string,
  languageInfo: string | undefined,
): HighlightedMarkdownCode | null {
  const language = normalizedLanguage(languageInfo);
  if (language === null) return null;

  const grammar = markdownPrism.languages[language];
  if (grammar === undefined) return null;

  return {
    html: markdownPrism.highlight(code, grammar, language),
    language,
  };
}

export function tokenizeMarkdownCode(
  code: string,
  languageInfo: string | undefined,
): TokenizedMarkdownCode | null {
  const language = normalizedLanguage(languageInfo);
  if (language === null) return null;

  const grammar = markdownPrism.languages[language];
  if (grammar === undefined) return null;

  const tokens: MarkdownCodeToken[] = [];
  let offset = 0;

  const visit = (stream: Prism.TokenStream, inheritedTypes: readonly string[]): void => {
    if (typeof stream === 'string') {
      const from = offset;
      offset += stream.length;
      if (from < offset && inheritedTypes.length > 0) {
        tokens.push({ from, to: offset, types: inheritedTypes });
      }
      return;
    }

    if (Array.isArray(stream)) {
      for (const token of stream) visit(token, inheritedTypes);
      return;
    }

    const aliases = typeof stream.alias === 'string' ? [stream.alias] : (stream.alias ?? []);
    const types = [...new Set([...inheritedTypes, stream.type, ...aliases])].filter(
      isSafeTokenType,
    );
    visit(stream.content, types);
  };

  visit(markdownPrism.tokenize(code, grammar), []);
  return { language, tokens };
}

function normalizedLanguage(languageInfo: string | undefined): string | null {
  const language = languageInfo?.trim().split(/\s+/, 1)[0]?.toLowerCase() ?? '';
  return /^[a-z][a-z0-9-]*$/.test(language) ? language : null;
}

function isSafeTokenType(value: string): boolean {
  return /^[a-z][a-z0-9-]*$/.test(value);
}
