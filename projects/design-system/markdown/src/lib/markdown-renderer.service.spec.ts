import { DOCUMENT } from '@angular/common';
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

  it('renders safe relative, mail, telephone, and titled links while exposing unsafe links as text', () => {
    configureServerRenderer();

    const html = renderer.render(
      [
        '[relative](/guide)',
        '[mail](mailto:hello@example.com "Mail & title")',
        '[phone](tel:+123)',
        '[empty]()',
        '[unsafe](file:///private/data)',
      ].join(' '),
      { wikiLinks: null },
    );

    expect(html).toContain('<a href="/guide">relative</a>');
    expect(html).toContain('<a href="mailto:hello@example.com" title="Mail &amp; title">mail</a>');
    expect(html).toContain('<a href="tel:+123">phone</a>');
    expect(html).toContain('empty');
    expect(html).toContain('unsafe');
    expect(html).not.toContain('file:');
  });

  it('renders safe titled images and preserves escaped alt text when an image URI is rejected', () => {
    configureServerRenderer();

    const html = renderer.render(
      '![safe & image](https://example.com/image.png "Image title") ![plain](./plain.png) ![unsafe <image>](mailto:image@example.com)',
      { wikiLinks: null },
    );

    expect(html).toContain(
      '<img src="https://example.com/image.png" alt="safe &amp; image" title="Image title">',
    );
    expect(html).toContain('<img src="./plain.png" alt="plain">');
    expect(html).toContain('unsafe &lt;image&gt;');
    expect(html).not.toContain('mailto:image@example.com');
  });

  it('fails closed to authored wiki text when resolution throws or returns an unsafe URI', () => {
    configureServerRenderer();
    const throwing = renderer.render('[[articles:throwing]]', {
      wikiLinks: {
        namespaces: [{ key: 'articles', label: 'Articles' }],
        resolve: () => {
          throw new Error('registry failed');
        },
      },
    });
    const unsafe = renderer.render('[[articles:unsafe]]', {
      wikiLinks: {
        namespaces: [{ key: 'articles', label: 'Articles' }],
        resolve: () => ({ href: 'javascript:alert(1)', openIn: 'same-tab' }),
      },
    });

    expect(throwing).toContain('[[articles:throwing]]');
    expect(unsafe).toContain('[[articles:unsafe]]');
    expect(`${throwing}${unsafe}`).not.toContain('<a');
  });

  it('renders safe content in a browser-like document without a default view', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        MarkdownRendererService,
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: DOCUMENT, useValue: { defaultView: null } },
      ],
    });
    renderer = TestBed.inject(MarkdownRendererService);

    expect(renderer.render('**visible**', { wikiLinks: null })).toContain(
      '<strong>visible</strong>',
    );
  });

  it('renders safe content when the host window cannot support DOM sanitization', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        MarkdownRendererService,
        { provide: PLATFORM_ID, useValue: 'browser' },
        {
          provide: DOCUMENT,
          useValue: { defaultView: { document, Element: undefined } },
        },
      ],
    });
    renderer = TestBed.inject(MarkdownRendererService);

    expect(renderer.render('**visible**', { wikiLinks: null })).toContain(
      '<strong>visible</strong>',
    );
  });

  function configureServerRenderer(): void {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [MarkdownRendererService, { provide: PLATFORM_ID, useValue: 'server' }],
    });
    renderer = TestBed.inject(MarkdownRendererService);
  }
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

  it('ignores empty and malformed wiki targets while continuing to find later valid links', () => {
    expect(
      parseMarkdownWikiLinks(
        '[[articles: ]] [[articles:|label]] [[1bad:key]] [[articles:valid| ]] [[articles:last]]',
      ),
    ).toEqual([
      {
        namespace: 'articles',
        key: 'valid',
        label: 'valid',
        raw: '[[articles:valid| ]]',
      },
      {
        namespace: 'articles',
        key: 'last',
        label: 'last',
        raw: '[[articles:last]]',
      },
    ]);
  });

  it('treats an unmatched inline-code delimiter as protecting the rest of its line', () => {
    expect(parseMarkdownWikiLinks('before `code [[articles:hidden]]')).toEqual([]);
  });

  it('requires the same fence marker and sufficient length before wiki parsing resumes', () => {
    expect(
      parseMarkdownWikiLinks(
        [
          '~~~~md',
          '[[articles:first-hidden]]',
          '```',
          '[[articles:second-hidden]]',
          '~~~',
          '[[articles:third-hidden]]',
          '~~~~',
          '[[articles:visible]]',
        ].join('\n'),
      ),
    ).toEqual([
      {
        namespace: 'articles',
        key: 'visible',
        label: 'visible',
        raw: '[[articles:visible]]',
      },
    ]);
  });

  it('reports targets from namespaces absent from the available registry', () => {
    expect(
      findMissingMarkdownWikiLinkTargets({
        markdown: '[[people:ada]]',
        availableTargets: createMarkdownWikiLinkTargetLookup([]),
      }),
    ).toEqual(['people:ada']);
  });
});
