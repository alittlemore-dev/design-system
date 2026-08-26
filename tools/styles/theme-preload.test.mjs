import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';

import { JSDOM, requestInterceptor } from 'jsdom';
import * as sass from 'sass';

const repositoryRoot = resolve(import.meta.dirname, '../..');
const { Response } = globalThis;
const packageRoot = resolve(
  process.env['STYLE_PACKAGE_ROOT'] ?? join(repositoryRoot, 'projects/design-system'),
);
const themePreloadPath = join(packageRoot, 'theme-preload.js');

test('defaults the initial document to the light theme before application code runs', async () => {
  const document = createDocument();

  await runThemePreload({ document, storedTheme: null });

  assert.equal(document.documentElement.getAttribute('data-bs-theme'), 'light');
});

test('lets a stored theme override the server-rendered theme', async () => {
  const document = createDocument('light');

  await runThemePreload({ document, storedTheme: 'dark' });

  assert.equal(document.documentElement.getAttribute('data-bs-theme'), 'dark');
});

test('applies a stored theme when the server did not render one', async () => {
  const document = createDocument();

  await runThemePreload({ document, storedTheme: 'dark' });

  assert.equal(document.documentElement.getAttribute('data-bs-theme'), 'dark');
});

test('preserves a valid server-rendered theme without a valid stored preference', async () => {
  for (const storedTheme of [null, '', 'system']) {
    const document = createDocument('dark');

    await runThemePreload({ document, storedTheme });

    assert.equal(document.documentElement.getAttribute('data-bs-theme'), 'dark');
  }
});

test('preserves the server theme when browser storage is unavailable', async () => {
  const document = createDocument('dark');

  await runThemePreload({ document, storageError: new Error('Storage unavailable') });

  assert.equal(document.documentElement.getAttribute('data-bs-theme'), 'dark');
});

test('falls back to light when the server and storage themes are invalid', async () => {
  const document = createDocument('contrast');

  await runThemePreload({ document, storedTheme: 'system' });

  assert.equal(document.documentElement.getAttribute('data-bs-theme'), 'light');
});

test('uses the server theme when window is unavailable', async () => {
  const source = await readFile(themePreloadPath, 'utf8');
  const document = createDocument('dark');

  assert.doesNotThrow(() => runInNewContext(source, { document }));
  assert.equal(document.documentElement.getAttribute('data-bs-theme'), 'dark');
});

test('does not throw when document access fails', async () => {
  const source = await readFile(themePreloadPath, 'utf8');
  const document = {};
  Object.defineProperty(document, 'documentElement', {
    get: () => {
      throw new Error('Document unavailable');
    },
  });

  assert.doesNotThrow(() => runInNewContext(source, { document }));
});

test('does not access browser globals during server execution', async () => {
  const source = await readFile(themePreloadPath, 'utf8');

  assert.doesNotThrow(() => runInNewContext(source, {}));
});

test('applies external theme assets before body code under the strict CSP delivery shape', async () => {
  const themeCss = sass.compile(join(packageRoot, 'styles/theme-tokens.scss')).css;
  const themePreload = await readFile(themePreloadPath, 'utf8');
  const applicationProbe =
    'globalThis.themeObservedByApplication = document.documentElement.getAttribute("data-bs-theme");';
  const html = `<!doctype html>
<html data-bs-theme="light">
  <head>
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self'; script-src 'self'">
    <link rel="stylesheet" href="/assets/theme-tokens.css">
    <script src="/assets/theme-preload.js"></script>
  </head>
  <body>
    <script src="/assets/application-probe.js"></script>
    <app-root></app-root>
  </body>
</html>`;
  const interceptResources = requestInterceptor((request) => {
    if (request.url.endsWith('/theme-tokens.css')) {
      return new Response(themeCss, { headers: { 'Content-Type': 'text/css' } });
    }
    if (request.url.endsWith('/theme-preload.js')) {
      return new Response(themePreload, {
        headers: { 'Content-Type': 'application/javascript' },
      });
    }
    if (request.url.endsWith('/application-probe.js')) {
      return new Response(applicationProbe, {
        headers: { 'Content-Type': 'application/javascript' },
      });
    }
    return undefined;
  });
  const dom = new JSDOM(html, {
    beforeParse: (window) => window.localStorage.setItem('chosenTheme', 'dark'),
    resources: { interceptors: [interceptResources] },
    runScripts: 'dangerously',
    url: 'https://design-system.test/',
  });

  await new Promise((resolve) => dom.window.addEventListener('load', resolve, { once: true }));

  const root = dom.window.document.documentElement;
  const preloadScript = dom.window.document.querySelector('head script[src]');
  assert.equal(root.getAttribute('data-bs-theme'), 'dark');
  assert.equal(dom.window['themeObservedByApplication'], 'dark');
  assert.equal(
    dom.window.getComputedStyle(root).getPropertyValue('--main-bg-color').replaceAll(' ', ''),
    'rgb(20,24,33)',
  );
  assert.equal(dom.window.document.querySelectorAll('script:not([src]), style').length, 0);
  assert.equal(preloadScript?.hasAttribute('async'), false);
  assert.equal(preloadScript?.hasAttribute('defer'), false);
  dom.window.close();
});

async function runThemePreload({ document, storedTheme = null, storageError = null }) {
  const source = await readFile(themePreloadPath, 'utf8');
  const window = {
    localStorage: {
      getItem: () => {
        if (storageError !== null) throw storageError;
        return storedTheme;
      },
    },
  };
  runInNewContext(source, { document, window });
}

function createDocument(initialTheme = null) {
  const attributes = new Map();
  if (initialTheme !== null) attributes.set('data-bs-theme', initialTheme);
  return {
    documentElement: {
      getAttribute: (name) => attributes.get(name) ?? null,
      setAttribute: (name, value) => attributes.set(name, value),
    },
  };
}
