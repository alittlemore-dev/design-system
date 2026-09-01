import assert from 'node:assert/strict';
import test from 'node:test';

import { chromium } from 'playwright';

import { startDemoServer, stopDemoServer } from './server-process.mjs';

async function waitForText(page, selector, expected) {
  await page.waitForFunction(
    ({ target, value }) => document.querySelector(target)?.textContent?.trim() === value,
    { target: selector, value: expected },
  );
  assert.equal((await page.locator(selector).textContent())?.trim(), expected);
}

test('hydrates the packed showcase and keeps its interactions CSP-clean', async (t) => {
  const server = await startDemoServer(process.cwd());
  t.after(() => stopDemoServer(server.child));
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage();
  const browserErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => browserErrors.push(`page: ${error.message}`));
  await page.addInitScript(() => {
    window.__demoCspViolations = [];
    document.addEventListener('securitypolicyviolation', (event) => {
      window.__demoCspViolations.push(`${event.violatedDirective}: ${event.blockedURI}`);
    });
  });

  await page.goto(server.url, { waitUntil: 'networkidle' });
  assert.equal(await page.locator('[data-demo-shell]').count(), 1);
  await waitForText(page, '[data-demo-localized-date]', 'Formatted date: Aug 28, 2026');

  const validationInput = page.locator('[data-demo-validation-input]');
  assert.equal(await validationInput.count(), 1);
  assert.equal(
    await validationInput.evaluate((element) => element.classList.contains('is-invalid')),
    false,
  );
  assert.equal(await validationInput.getAttribute('aria-invalid'), null);
  await validationInput.focus();
  await validationInput.blur();
  assert.equal(
    await validationInput.evaluate((element) => element.classList.contains('is-invalid')),
    true,
  );
  assert.equal(await validationInput.getAttribute('aria-invalid'), 'true');
  await validationInput.fill('Package consumer');
  assert.equal(
    await validationInput.evaluate((element) => element.classList.contains('is-invalid')),
    false,
  );
  assert.equal(await validationInput.getAttribute('aria-invalid'), null);

  await page.getByRole('button', { name: 'Retry' }).click();
  await waitForText(page, '[data-demo-retry-count]', 'Retries: 1');

  await page.getByRole('button', { name: 'Show success notification' }).click();
  const notification = page.locator('ds-notification-area [role="alert"]');
  await notification.waitFor();
  assert.match((await notification.textContent()) ?? '', /Demo notification saved/);
  await notification.getByRole('button', { name: 'Close notification' }).click();
  await notification.waitFor({ state: 'detached' });

  await page.getByRole('button', { name: 'Guides', exact: true }).click();
  await waitForText(page, '[data-demo-tree-selection]', 'Selected: guides');

  await page.locator('#demo-site').click();
  await page.locator('[role="option"][data-value="beta"]').click();
  await waitForText(page, '[data-demo-site-selection]', 'Selected: beta');

  await page.locator('[data-testid="date-picker-toggle"]').click();
  await page.locator('[data-date="2026-08-29"]').click();
  await waitForText(page, '[data-demo-date-selection]', 'Selected: 2026-08-29');

  await page.locator('[data-demo-theme="dark"]').click();
  await page.waitForFunction(
    () => document.documentElement.getAttribute('data-bs-theme') === 'dark',
  );
  assert.equal(await page.locator('html').getAttribute('data-bs-theme'), 'dark');

  await page.getByRole('button', { name: 'Open modal scroll demo' }).click();
  const modal = page.locator('[data-demo-modal]');
  await modal.waitFor();
  await page.waitForFunction(
    () => document.activeElement?.getAttribute('aria-label') === 'Close modal scroll demo',
  );
  assert.equal(
    await page
      .locator('html')
      .evaluate((element) => element.classList.contains('cdk-global-scrollblock')),
    true,
  );
  await modal.locator('[data-demo-modal-header]').hover();
  await page.mouse.wheel(0, 80);
  assert.equal(
    await modal.locator('[data-demo-modal-body]').evaluate((element) => element.scrollTop),
    80,
  );
  await page.keyboard.press('Escape');
  await modal.waitFor({ state: 'detached' });
  assert.equal(
    await page.evaluate(() => document.activeElement?.textContent?.trim()),
    'Open modal scroll demo',
  );
  assert.equal(
    await page
      .locator('html')
      .evaluate((element) => element.classList.contains('cdk-global-scrollblock')),
    false,
  );

  const markdownDemo = page.locator('#markdown-demo');
  const standaloneMarkdown = markdownDemo.locator('[data-demo-rendered-markdown]');
  assert.equal(await standaloneMarkdown.locator('code.language-ts').count(), 1);
  assert.equal(
    await standaloneMarkdown
      .getByRole('link', { name: 'the editor contract' })
      .getAttribute('href'),
    '#markdown-demo',
  );

  const editor = markdownDemo.locator('ds-markdown-editor');
  const editorContent = editor.locator('.cm-content');
  assert.equal(await editorContent.getAttribute('aria-label'), 'Demo Markdown body');
  assert.match((await editorContent.textContent()) ?? '', /Shared Markdown editor/);
  assert.equal(await editor.locator('[role="table"]').count(), 1);
  await editor.getByRole('tab', { name: 'Preview' }).click();
  const editorPreview = editor.locator('[data-testid="markdown-editor-preview-content"]');
  await editorPreview.locator('code.language-ts').waitFor();
  assert.equal(await editorPreview.locator('code.language-ts').count(), 1);
  assert.equal(
    await editorPreview.getByRole('link', { name: 'the editor contract' }).getAttribute('href'),
    '#markdown-demo',
  );
  assert.match(
    (await editorPreview.getByRole('img', { name: 'Design-system demo' }).getAttribute('src')) ??
      '',
    /\/assets\/demo-image\.svg$/,
  );
  await editor.getByRole('tab', { name: 'Edit' }).click();

  const fullscreenToggle = editor.getByRole('button', { name: 'Enter fullscreen' });
  await fullscreenToggle.click();
  await editor
    .locator('[data-testid="markdown-editor-shell"][role="dialog"]')
    .waitFor({ state: 'attached' });
  assert.equal(
    await editor.locator('[data-testid="markdown-editor-shell"]').getAttribute('role'),
    'dialog',
  );
  assert.equal(
    await page
      .locator('html')
      .evaluate((element) => element.classList.contains('cdk-global-scrollblock')),
    true,
  );
  await page.keyboard.press('Escape');
  await editor.getByRole('button', { name: 'Enter fullscreen' }).waitFor();
  assert.equal(
    await page
      .locator('html')
      .evaluate((element) => element.classList.contains('cdk-global-scrollblock')),
    false,
  );

  const fileChooserPromise = page.waitForEvent('filechooser');
  await editor.locator('[data-markdown-command="image"]').click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles({
    name: 'picked.png',
    mimeType: 'image/png',
    buffer: Buffer.from('demo image'),
  });
  await page.waitForFunction(() =>
    document.querySelector('[data-demo-markdown-value]')?.textContent?.includes('![picked.png]'),
  );
  assert.match(
    (await markdownDemo.locator('[data-demo-markdown-value]').textContent()) ?? '',
    /!\[picked\.png\]\(\/assets\/demo-image\.svg\)/,
  );

  await editorContent.evaluate((element) => {
    const file = new File(['pasted image'], 'pasted.png', { type: 'image/png' });
    const event = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', {
      value: {
        items: [{ kind: 'file', type: file.type, getAsFile: () => file }],
        getData: () => '',
      },
    });
    element.dispatchEvent(event);
  });
  await page.waitForFunction(() =>
    document.querySelector('[data-demo-markdown-value]')?.textContent?.includes('![pasted.png]'),
  );

  await editorContent.evaluate((element) => {
    const file = new File(['dropped image'], 'dropped.png', { type: 'image/png' });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    element.dispatchEvent(
      new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        clientX: 0,
        clientY: 0,
        dataTransfer: transfer,
      }),
    );
  });
  await page.waitForFunction(() =>
    document.querySelector('[data-demo-markdown-value]')?.textContent?.includes('![dropped.png]'),
  );

  assert.deepEqual(await page.evaluate(() => window.__demoCspViolations), []);
  assert.deepEqual(browserErrors, []);

  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.locator('html').getAttribute('data-bs-theme'), 'dark');

  const cspViolations = await page.evaluate(() => window.__demoCspViolations);
  assert.deepEqual(cspViolations, []);
  assert.deepEqual(browserErrors, []);
});
