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
  assert.match(html, /<ds-notification-area/);
  assert.match(html, /Show success notification/);
  assert.match(html, /Open modal scroll demo/);
  assert.match(html, /data-demo-validation-input/);
  assert.match(html, /data-demo-localized-date[^>]*>\s*Formatted date: Aug 28, 2026\s*<\/p>/);
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
