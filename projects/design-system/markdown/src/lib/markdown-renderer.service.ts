import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import createDOMPurify from 'dompurify';
import { Marked, type MarkedExtension, type RendererObject, type Tokens } from 'marked';
import { highlightMarkdownCode } from './markdown-syntax-highlighter';

export interface MarkdownWikiLinkReference {
  readonly namespace: string;
  readonly key: string;
  readonly label: string;
  readonly raw: string;
}

export interface MarkdownWikiLinkNamespace {
  readonly key: string;
  readonly label: string;
}

export interface MarkdownWikiLinkTarget {
  readonly key: string;
  readonly label: string;
  readonly description: string | null;
  readonly badge: string | null;
}

export interface MarkdownWikiLinkTargetGroup {
  readonly namespace: string;
  readonly targets: readonly MarkdownWikiLinkTarget[];
}

export interface MarkdownResolvedWikiLink {
  readonly href: string;
  readonly openIn: 'same-tab' | 'new-tab';
}

export interface MarkdownWikiLinkRenderConfig {
  readonly namespaces: readonly MarkdownWikiLinkNamespace[];
  readonly resolve: (reference: MarkdownWikiLinkReference) => MarkdownResolvedWikiLink | null;
}

export interface MarkdownRenderConfig {
  readonly wikiLinks: MarkdownWikiLinkRenderConfig | null;
}

export type MarkdownWikiLinkTargetLookup = ReadonlyMap<string, ReadonlySet<string>>;

type WikiLinkToken = Tokens.Generic & MarkdownWikiLinkReference & { readonly type: 'wikiLink' };

const WIKI_LINK_AT_START_PATTERN =
  /^\[\[([a-z][a-z0-9-]*):([^\]|\r\n]+?)(?:\\?\|([^\]\r\n]+))?\]\]/;
const URI_SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:/i;
const LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);
const IMAGE_PROTOCOLS = new Set(['http:', 'https:']);

@Injectable({ providedIn: 'root' })
export class MarkdownRendererService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);

  render(markdown: string, config: MarkdownRenderConfig): string {
    const marked = new Marked(markedExtension(config.wikiLinks));
    const rendered = marked.parse(markdown, { async: false, gfm: true });
    return this.sanitize(rendered);
  }

  private sanitize(html: string): string {
    if (!isPlatformBrowser(this.platformId)) return html;
    const browserWindow = this.document.defaultView;
    if (browserWindow === null) return html;

    const purifier = createDOMPurify(browserWindow);
    if (!purifier.isSupported) return html;

    return purifier.sanitize(html, {
      ADD_ATTR: ['target'],
      ALLOW_DATA_ATTR: false,
      FORBID_ATTR: ['style'],
      FORBID_TAGS: ['style'],
      USE_PROFILES: { html: true },
    });
  }
}

export function parseMarkdownWikiLinks(markdown: string): readonly MarkdownWikiLinkReference[] {
  const references: MarkdownWikiLinkReference[] = [];
  const lines = markdown.split('\n');
  let fencedMarker: '`' | '~' | null = null;
  let fencedLength = 0;

  for (const line of lines) {
    const fence = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    if (fence !== null) {
      const fenceText = fence[1]!;
      const marker = fenceText[0];
      const length = fenceText.length;
      if (fencedMarker === null && (marker === '`' || marker === '~')) {
        fencedMarker = marker;
        fencedLength = length;
      } else if (
        marker === fencedMarker &&
        length >= fencedLength &&
        line.slice(fence[0].length).trim() === ''
      ) {
        fencedMarker = null;
        fencedLength = 0;
      }
      continue;
    }
    if (fencedMarker !== null) continue;
    references.push(...parseWikiLinksOutsideInlineCode(line));
  }

  return references;
}

export function createMarkdownWikiLinkTargetLookup(
  groups: readonly MarkdownWikiLinkTargetGroup[],
): MarkdownWikiLinkTargetLookup {
  return new Map(
    groups.map((group) => [group.namespace, new Set(group.targets.map((target) => target.key))]),
  );
}

export function findMissingMarkdownWikiLinkTargets(params: {
  readonly markdown: string;
  readonly availableTargets: MarkdownWikiLinkTargetLookup;
}): readonly string[] {
  const missing = new Set<string>();
  for (const reference of parseMarkdownWikiLinks(params.markdown)) {
    if (!params.availableTargets.get(reference.namespace)?.has(reference.key)) {
      missing.add(`${reference.namespace}:${reference.key}`);
    }
  }
  return [...missing];
}

function markedExtension(wikiLinks: MarkdownWikiLinkRenderConfig | null): MarkedExtension {
  const renderer: RendererObject = {
    code: ({ text, lang }) => renderCode(text, lang),
    html: () => '',
    link: function ({ href, title, tokens }) {
      const label = this.parser.parseInline(tokens);
      const safeHref = safeUri(href, LINK_PROTOCOLS);
      if (safeHref === null) return label;
      const titleAttribute =
        title === null || title === undefined ? '' : ` title="${escapeAttribute(title)}"`;
      return `<a href="${escapeAttribute(safeHref)}"${titleAttribute}>${label}</a>`;
    },
    image: ({ href, title, text }) => {
      const safeHref = safeUri(href, IMAGE_PROTOCOLS);
      if (safeHref === null) return escapeHtml(text);
      const titleAttribute = title === null ? '' : ` title="${escapeAttribute(title)}"`;
      return `<img src="${escapeAttribute(safeHref)}" alt="${escapeAttribute(text)}"${titleAttribute}>`;
    },
  };
  const extension: MarkedExtension = { gfm: true, renderer };
  if (wikiLinks !== null) extension.extensions = [wikiLinkExtension(wikiLinks)];
  return extension;
}

function wikiLinkExtension(
  config: MarkdownWikiLinkRenderConfig,
): NonNullable<MarkedExtension['extensions']>[number] {
  const supportedNamespaces = new Set(config.namespaces.map((namespace) => namespace.key));
  return {
    name: 'wikiLink',
    level: 'inline',
    start: (source) => {
      const index = source.indexOf('[[');
      return index < 0 ? undefined : index;
    },
    tokenizer: (source) => {
      const reference = parseWikiLinkAtStart(source);
      if (reference === null || !supportedNamespaces.has(reference.namespace)) return undefined;
      return { type: 'wikiLink', ...reference } satisfies WikiLinkToken;
    },
    renderer: (token) => {
      const reference = token as WikiLinkToken;
      let resolved: MarkdownResolvedWikiLink | null;
      try {
        resolved = config.resolve(reference);
      } catch {
        return escapeHtml(reference.raw);
      }
      if (resolved === null) return escapeHtml(reference.raw);
      const href = safeUri(resolved.href, LINK_PROTOCOLS);
      if (href === null) return escapeHtml(reference.raw);
      const target =
        resolved.openIn === 'new-tab' ? ' target="_blank" rel="noopener noreferrer"' : '';
      return `<a href="${escapeAttribute(href)}"${target}>${escapeHtml(reference.label)}</a>`;
    },
  };
}

function parseWikiLinksOutsideInlineCode(line: string): readonly MarkdownWikiLinkReference[] {
  const references: MarkdownWikiLinkReference[] = [];
  let position = 0;
  while (position < line.length) {
    if (line[position] === '`') {
      const delimiterLength = repeatedCharacterLength(line, position, '`');
      const closing = line.indexOf('`'.repeat(delimiterLength), position + delimiterLength);
      position = closing < 0 ? line.length : closing + delimiterLength;
      continue;
    }
    if (line.startsWith('[[', position)) {
      const reference = parseWikiLinkAtStart(line.slice(position));
      if (reference !== null) {
        references.push(reference);
        position += reference.raw.length;
        continue;
      }
    }
    position += 1;
  }
  return references;
}

function parseWikiLinkAtStart(source: string): MarkdownWikiLinkReference | null {
  const match = WIKI_LINK_AT_START_PATTERN.exec(source);
  if (match === null) return null;
  const namespace = match[1]!;
  const key = match[2]!.trim();
  if (key === '') return null;
  const raw = match[0];
  return {
    namespace,
    key,
    label: match[3]?.trim() || key,
    raw,
  };
}

function renderCode(code: string, languageInfo: string | undefined): string {
  const highlighted = highlightMarkdownCode(code, languageInfo);
  if (highlighted === null) {
    return `<pre class="markdown-code"><code>${escapeHtml(code)}\n</code></pre>\n`;
  }
  return (
    `<pre class="markdown-code"><code class="language-${highlighted.language}">` +
    `${highlighted.html}\n</code></pre>\n`
  );
}

function safeUri(value: string, allowedProtocols: ReadonlySet<string>): string | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  if (containsUriControlCharacter(trimmed)) return null;
  if (!URI_SCHEME_PATTERN.test(trimmed)) return trimmed;
  const protocol = trimmed.slice(0, trimmed.indexOf(':') + 1).toLowerCase();
  return allowedProtocols.has(protocol) ? trimmed : null;
}

function containsUriControlCharacter(value: string): boolean {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0)!;
    return codePoint <= 0x1f || codePoint === 0x7f;
  });
}

function repeatedCharacterLength(value: string, from: number, character: string): number {
  let length = 0;
  while (value[from + length] === character) length += 1;
  return length;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replaceAll('`', '&#96;');
}
