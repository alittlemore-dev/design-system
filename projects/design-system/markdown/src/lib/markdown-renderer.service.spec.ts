import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  MarkdownRendererService,
  createMarkdownWikiLinkTargetLookup,
  findMissingMarkdownWikiLinkTargets,
  parseMarkdownWikiLinks,
  type MarkdownWikiLinkRenderConfig,
} from './markdown-renderer.service';

describe('MarkdownRendererService', () => {
  let renderer: MarkdownRendererService;

  const wikiLinks: MarkdownWikiLinkRenderConfig = {
    namespaces: [
      { key: 'articles', label: 'Articles' },
      { key: 'people', label: 'People' },
    ],
    resolve: (reference) => ({
      href: `/content/${reference.namespace}/${reference.key}`,
      openIn: reference.namespace === 'articles' ? 'new-tab' : 'same-tab',
    }),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [MarkdownRendererService] });
    renderer = TestBed.inject(MarkdownRendererService);
  });

  it('renders highlighted fenced code and keeps unsupported languages escaped', () => {
    const html = renderer.render(
      [
        '```ts',
        'const answer: number = 42;',
        '```',
        '',
        '```unknown',
        '<script>alert(1)</script>',
        '```',
      ].join('\n'),
      { wikiLinks: null },
    );

    expect(html).toContain('<code class="language-ts">');
    expect(html).toContain('<span class="token keyword">const</span>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('sanitizes authored HTML, event attributes, and unsafe URL schemes', () => {
    const html = renderer.render(
      [
        '<img src="x" onerror="alert(1)">',
        '<script>alert(2)</script>',
        '[unsafe](javascript:alert(3))',
        '![unsafe](data:text/html,boom)',
      ].join('\n'),
      { wikiLinks: null },
    );

    expect(html).not.toContain('<script>');
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('data:text/html');
  });

  it('renders configured wiki links as isolated native anchors', () => {
    const html = renderer.render(
      'Read [[articles:typed-articles|Typed articles]] and [[people:person-1]].',
      { wikiLinks },
    );

    expect(html).toContain(
      '<a href="/content/articles/typed-articles" target="_blank" rel="noopener noreferrer">Typed articles</a>',
    );
    expect(html).toContain('<a href="/content/people/person-1">person-1</a>');
  });

  it('leaves unknown and unresolved wiki links as text', () => {
    const config: MarkdownWikiLinkRenderConfig = {
      ...wikiLinks,
      resolve: (reference) =>
        reference.key === 'missing'
          ? null
          : { href: `/content/${reference.namespace}/${reference.key}`, openIn: 'same-tab' },
    };

    const html = renderer.render('[[unknown:item]] [[articles:missing]]', {
      wikiLinks: config,
    });

    expect(html).toContain('[[unknown:item]]');
    expect(html).toContain('[[articles:missing]]');
    expect(html).not.toContain('<a');
  });

  it('does not interpret wiki syntax inside inline or fenced code', () => {
    const html = renderer.render(
      ['`[[articles:inline]]`', '', '```md', '[[articles:fenced]]', '```'].join('\n'),
      { wikiLinks },
    );

    expect(html).not.toContain('/content/articles/inline');
    expect(html).not.toContain('/content/articles/fenced');
    expect(html).toContain('[[articles:inline]]');
    expect(html).toContain('[[articles:fenced]]');
  });

  it('keeps highlighted, safe output during server rendering without browser DOMPurify', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [MarkdownRendererService, { provide: PLATFORM_ID, useValue: 'server' }],
    });
    renderer = TestBed.inject(MarkdownRendererService);

    const html = renderer.render(
      [
        '```ts',
        'const answer = 42;',
        '```',
        '<script>alert(1)</script>',
        '[bad](javascript:x)',
      ].join('\n'),
      { wikiLinks: null },
    );

    expect(html).toContain('<code class="language-ts">');
    expect(html).toContain('<span class="token keyword">const</span>');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('javascript:');
  });

  it('rejects control characters that obscure a URI scheme during server rendering', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [MarkdownRendererService, { provide: PLATFORM_ID, useValue: 'server' }],
    });
    renderer = TestBed.inject(MarkdownRendererService);

    const html = renderer.render('[[articles:unsafe]]', {
      wikiLinks: {
        namespaces: [{ key: 'articles', label: 'Articles' }],
        resolve: () => ({ href: 'java\nscript:alert(1)', openIn: 'same-tab' }),
      },
    });

    expect(html).toContain('[[articles:unsafe]]');
    expect(html).not.toContain('<a');
  });
});

describe('Markdown wiki-link helpers', () => {
  it('parses generic namespaces, keys, labels, and escaped table separators', () => {
    expect(
      parseMarkdownWikiLinks(
        '[[articles:one]] [[people:person-1|Ada]] [[people:person-2\\|Grace Hopper]]',
      ),
    ).toEqual([
      {
        namespace: 'articles',
        key: 'one',
        label: 'one',
        raw: '[[articles:one]]',
      },
      {
        namespace: 'people',
        key: 'person-1',
        label: 'Ada',
        raw: '[[people:person-1|Ada]]',
      },
      {
        namespace: 'people',
        key: 'person-2',
        label: 'Grace Hopper',
        raw: '[[people:person-2\\|Grace Hopper]]',
      },
    ]);
  });

  it('ignores wiki-like text inside Markdown code', () => {
    expect(
      parseMarkdownWikiLinks(
        ['[[articles:real]]', '`[[articles:inline]]`', '```', '[[articles:fenced]]', '```'].join(
          '\n',
        ),
      ),
    ).toEqual([
      {
        namespace: 'articles',
        key: 'real',
        label: 'real',
        raw: '[[articles:real]]',
      },
    ]);
  });

  it('keeps a fenced block open when a fence marker has trailing text', () => {
    expect(
      parseMarkdownWikiLinks(
        [
          '```md',
          '[[articles:first-inside]]',
          '```not-a-closing-fence',
          '[[articles:second-inside]]',
          '```',
          '[[articles:outside]]',
        ].join('\n'),
      ),
    ).toEqual([
      {
        namespace: 'articles',
        key: 'outside',
        label: 'outside',
        raw: '[[articles:outside]]',
      },
    ]);
  });

  it('reports each missing target once', () => {
    const availableTargets = createMarkdownWikiLinkTargetLookup([
      {
        namespace: 'articles',
        targets: [{ key: 'known', label: 'Known', description: null, badge: null }],
      },
    ]);

    expect(
      findMissingMarkdownWikiLinkTargets({
        markdown: '[[articles:known]] [[articles:missing]] [[articles:missing|again]]',
        availableTargets,
      }),
    ).toEqual(['articles:missing']);
  });
});
