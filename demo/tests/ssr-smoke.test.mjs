import assert from 'node:assert/strict';
import test from 'node:test';

import { startDemoServer, stopDemoServer } from './server-process.mjs';

test('serves the packed UI showcase through SSR with a nonce-based style policy', async (t) => {
  const server = await startDemoServer(process.cwd());
  t.after(() => stopDemoServer(server.child));

  const response = await fetch(server.url);
  assert.equal(response.status, 200);
  const policy = response.headers.get('content-security-policy');
  assert.ok(policy, 'SSR response must include Content-Security-Policy.');
  assert.doesNotMatch(policy, /unsafe-inline|unsafe-eval/);
  const nonceMatch = policy.match(/style-src 'self' 'nonce-([^']+)'/);
  assert.ok(nonceMatch, `Style policy must contain a nonce: ${policy}`);

  const html = await response.text();
  assert.match(html, /data-demo-shell/);
  assert.match(html, /data-demo-sidebar/);
  assert.match(html, /<h1[^>]*>Overview<\/h1>/);
  assert.doesNotMatch(html, /<ds-markdown-editor/);
  assert.match(html, /ngh="/);
  assert.match(html, /ngCspNonce=/i);
  assert.ok(html.includes(`nonce="${nonceMatch[1]}"`));
  assert.match(html, /assets\/design-system\/theme-preload\.js/);
  const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>/g)];
  assert.ok(inlineScripts.length > 0, 'SSR output must exercise Angular inline hydration state.');
  for (const script of inlineScripts) {
    assert.ok(script[1].includes(`nonce="${nonceMatch[1]}"`));
  }
  const inlineStyles = [...html.matchAll(/<style([^>]*)>/g)];
  assert.ok(inlineStyles.length > 0, 'SSR output must include component or critical styles.');
  for (const style of inlineStyles) {
    assert.ok(style[1].includes(`nonce="${nonceMatch[1]}"`));
  }

  const nextResponse = await fetch(server.url);
  const nextPolicy = nextResponse.headers.get('content-security-policy');
  const nextNonce = nextPolicy?.match(/style-src 'self' 'nonce-([^']+)'/)?.[1];
  assert.ok(nextNonce);
  assert.notEqual(nextNonce, nonceMatch[1], 'Every HTML response must receive a fresh nonce.');

  const generatedHtml = await fetch(`${server.url}/index.csr.html`);
  assert.equal(generatedHtml.status, 404);
  assert.ok(generatedHtml.headers.get('content-security-policy'));

  const themePreload = await fetch(`${server.url}/assets/design-system/theme-preload.js`);
  assert.equal(themePreload.status, 200);
  assert.match(await themePreload.text(), /chosenTheme/);
});

test('serves component pages directly without rendering the former all-in-one showcase', async (t) => {
  const server = await startDemoServer(process.cwd());
  t.after(() => stopDemoServer(server.child));

  for (const page of [
    { path: '/components/empty-state', heading: 'Empty state', content: /<ds-empty-state/ },
    {
      path: '/components/loading-spinner',
      heading: 'Loading spinner',
      content: /<ds-loading-spinner/,
    },
    { path: '/components/error-message', heading: 'Error message', content: /<ds-error-message/ },
    {
      path: '/components/notifications',
      heading: 'Notifications',
      content: /<ds-notification-area/,
    },
    {
      path: '/components/form-validation',
      heading: 'Form validation',
      content: /data-demo-validation-input/,
    },
    {
      path: '/components/site-select',
      heading: 'Site select',
      content: /data-demo-site-configurator/,
    },
    {
      path: '/components/localized-date-picker',
      heading: 'Localized date picker',
      content: /data-demo-localized-date/,
      picker: 'ds-localized-date-picker',
    },
    {
      path: '/components/localized-date-range-picker',
      heading: 'Localized date range picker',
      content: /data-demo-date-range-selection/,
      picker: 'ds-localized-date-range-picker',
    },
    {
      path: '/components/localized-time-picker',
      heading: 'Localized time picker',
      content: /data-demo-time-selection/,
      picker: 'ds-localized-time-picker',
    },
    {
      path: '/components/localized-time-range-picker',
      heading: 'Localized time range picker',
      content: /data-demo-time-range-selection/,
      picker: 'ds-localized-time-range-picker',
    },
    {
      path: '/components/localized-datetime-picker',
      heading: 'Localized datetime picker',
      content: /data-demo-datetime-selection/,
      picker: 'ds-localized-datetime-picker',
    },
    {
      path: '/components/localized-datetime-range-picker',
      heading: 'Localized datetime range picker',
      content: /data-demo-datetime-range-selection/,
      picker: 'ds-localized-datetime-range-picker',
    },
    {
      path: '/components/foldable-tree',
      heading: 'Foldable tree',
      content: /data-demo-tree-selection/,
    },
    {
      path: '/components/modal-scroll',
      heading: 'Modal scroll',
      content: /Open modal scroll demo/,
    },
    {
      path: '/markdown/renderer',
      heading: 'Markdown renderer',
      content: /data-demo-rendered-markdown/,
    },
    {
      path: '/markdown/editor',
      heading: 'Markdown editor',
      content: /<ds-markdown-editor/,
    },
  ]) {
    const response = await fetch(`${server.url}${page.path}`);
    assert.equal(response.status, 200, page.path);
    const html = await response.text();
    assert.match(html, /data-demo-shell/, page.path);
    assert.match(html, /data-demo-sidebar/, page.path);
    assert.match(html, new RegExp(`<h1[^>]*>${page.heading}<\\/h1>`), page.path);
    assert.match(html, page.content, page.path);
    if (page.picker !== undefined) {
      const pickerHtml = html.match(
        new RegExp(`<${page.picker}\\b[\\s\\S]*?<\\/${page.picker}>`, 'i'),
      )?.[0];
      assert.ok(pickerHtml, `${page.path} must server-render ${page.picker}.`);
      assert.doesNotMatch(pickerHtml, /\sstyle=/i, page.path);
      const closedDialogHtml = pickerHtml.match(
        /<dialog\b[^>]*data-testid="date-picker-calendar"[^>]*>[\s\S]*?<\/dialog>/i,
      )?.[0];
      assert.ok(closedDialogHtml, `${page.path} must server-render the closed dialog shell.`);
      assert.doesNotMatch(
        closedDialogHtml,
        /data-date=|date-picker-month-heading|ds-segmented-time-input|type="time"/i,
        `${page.path} closed SSR dialog must not contain clock-dependent UI.`,
      );

      const pageNonce = response.headers
        .get('content-security-policy')
        ?.match(/style-src 'self' 'nonce-([^']+)'/)?.[1];
      assert.ok(pageNonce, `${page.path} must include a style nonce.`);
      const pickerPageStyles = [...html.matchAll(/<style([^>]*)>/g)];
      assert.ok(pickerPageStyles.length > 0, `${page.path} must include Angular style tags.`);
      for (const style of pickerPageStyles) {
        assert.ok(style[1].includes(`nonce="${pageNonce}"`), page.path);
      }
    }
  }

  const siteSelectHtml = await (await fetch(`${server.url}/components/site-select`)).text();
  assert.doesNotMatch(siteSelectHtml, /<ds-markdown-editor/);
  const markdownEditorHtml = await (await fetch(`${server.url}/markdown/editor`)).text();
  assert.doesNotMatch(markdownEditorHtml, /data-demo-site-configurator/);
  for (const path of ['/components/empty-state', '/components/loading-spinner']) {
    const simpleComponentHtml = await (await fetch(`${server.url}${path}`)).text();
    assert.doesNotMatch(simpleComponentHtml, /Initialization parameters/, path);
  }
});
