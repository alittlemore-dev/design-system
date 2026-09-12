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

async function navigateToDemoPage(page, name, path) {
  await page.locator('[data-testid="demo-nav-item"]').filter({ hasText: name }).click();
  await page.waitForURL(`**${path}`);
  assert.equal(await page.getByRole('heading', { name, level: 1, exact: true }).count(), 1);
}

async function readText(page, selector) {
  return (await page.locator(selector).textContent())?.trim();
}

async function setCustomTime(page, hour, minute, boundary) {
  const timeInput = boundary
    ? page.locator(
        `[data-testid="date-picker-time-panel"] [data-time-boundary="${boundary}"] [data-testid="segmented-time-input"]`,
      )
    : page.locator('[data-testid="segmented-time-input"]');
  const hourSegment = timeInput.locator('[data-segment="hour"]');
  const minuteSegment = timeInput.locator('[data-segment="minute"]');
  await hourSegment.focus();
  await hourSegment.pressSequentially(hour);
  await minuteSegment.focus();
  await minuteSegment.pressSequentially(minute);
}

async function expectCommittedUnchanged(page, selector, expected) {
  assert.equal(await readText(page, selector), expected);
}

async function assertAndResetInlineStyleViolations(page, browserErrors, expectedCount) {
  const violations = await page.evaluate(() => window.__demoCspViolations);
  assert.equal(violations.length, expectedCount);
  assert.ok(violations.every((violation) => violation === 'style-src-attr: inline'));
  assert.equal(browserErrors.length, expectedCount);
  assert.ok(
    browserErrors.every((error) => error.includes('Applying inline style violates')),
    `Unexpected browser errors:\n${browserErrors.join('\n')}`,
  );
  await page.evaluate(() => {
    window.__demoCspViolations = [];
  });
  browserErrors.splice(0);
}

test('navigates the component catalogue and applies Site select inputs live', async (t) => {
  const server = await startDemoServer(process.cwd());
  t.after(() => stopDemoServer(server.child));
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage();

  await page.goto(server.url, { waitUntil: 'networkidle' });
  assert.equal(await page.locator('[data-demo-sidebar]').count(), 1);
  await page.getByRole('button', { name: 'Site select', exact: true }).click();
  await page.waitForURL('**/components/site-select');
  assert.equal(await page.getByRole('heading', { name: 'Site select', level: 1 }).count(), 1);
  assert.equal(
    await page
      .getByRole('button', { name: 'Site select', exact: true })
      .getAttribute('aria-current'),
    'page',
  );

  await page.goBack({ waitUntil: 'networkidle' });
  assert.equal(await page.getByRole('heading', { name: 'Overview', level: 1 }).count(), 1);
  assert.equal(
    await page.getByRole('button', { name: 'Overview', exact: true }).getAttribute('aria-current'),
    'page',
  );

  await page.getByRole('button', { name: 'Site select', exact: true }).click();
  const siteSelect = page.locator('[data-testid="demo-site-select"]');
  await page.locator('[data-demo-site-appearance]').selectOption('bordered');
  await page.locator('[data-demo-site-size]').selectOption('small');
  await page.locator('[data-demo-site-invalid]').check();
  await page.locator('[data-demo-site-disabled]').check();
  await page.waitForFunction(
    () => document.querySelector('[data-testid="demo-site-select"]')?.disabled === true,
  );
  assert.equal(
    await siteSelect.evaluate((element) =>
      element.classList.contains('site-select-trigger-bordered'),
    ),
    true,
  );
  assert.equal(
    await siteSelect.evaluate((element) => element.classList.contains('site-select-trigger-small')),
    true,
  );
  assert.equal(await siteSelect.getAttribute('aria-invalid'), 'true');
  assert.equal(await siteSelect.isDisabled(), true);

  await page.locator('[data-demo-site-disabled]').uncheck();
  await siteSelect.click();
  await page.locator('[role="option"][data-value="beta"]').click();
  await waitForText(page, '[data-demo-site-selection]', 'Selected: beta');

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileNavigation = page.locator('[data-demo-sidebar-tree]');
  assert.equal(await mobileNavigation.isHidden(), true);
  await page.getByRole('button', { name: 'Browse components' }).click();
  await mobileNavigation.waitFor({ state: 'visible' });
  assert.equal(await mobileNavigation.isVisible(), true);
  assert.equal(
    await page
      .getByRole('button', { name: 'Site select', exact: true })
      .getAttribute('aria-current'),
    'page',
  );
});

test('hydrates the routed showcase, tracks the known Source-mode CSP gap, and keeps interactions CSP-clean', async (t) => {
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

  await navigateToDemoPage(page, 'Form validation', '/components/form-validation');

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

  await navigateToDemoPage(page, 'Error message', '/components/error-message');
  await page.getByRole('button', { name: 'Retry' }).click();
  await waitForText(page, '[data-demo-retry-count]', 'Retries: 1');

  await navigateToDemoPage(page, 'Notifications', '/components/notifications');
  await page.getByRole('button', { name: 'Show success notification' }).click();
  const notification = page.locator('ds-notification-area [role="alert"]');
  await notification.waitFor();
  assert.match((await notification.textContent()) ?? '', /Demo notification saved/);
  await notification.getByRole('button', { name: 'Close notification' }).click();
  await notification.waitFor({ state: 'detached' });

  await navigateToDemoPage(page, 'Foldable tree', '/components/foldable-tree');
  await page.getByRole('button', { name: 'Guides', exact: true }).click();
  await waitForText(page, '[data-demo-tree-selection]', 'Selected: guides');

  await navigateToDemoPage(page, 'Site select', '/components/site-select');
  await page.locator('#demo-site').click();
  await page.locator('[role="option"][data-value="beta"]').click();
  await waitForText(page, '[data-demo-site-selection]', 'Selected: beta');

  await page.locator('[data-demo-theme="dark"]').click();
  await page.waitForFunction(
    () => document.documentElement.getAttribute('data-bs-theme') === 'dark',
  );
  assert.equal(await page.locator('html').getAttribute('data-bs-theme'), 'dark');

  await navigateToDemoPage(page, 'Modal scroll', '/components/modal-scroll');
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

  await navigateToDemoPage(page, 'Markdown editor', '/markdown/editor');
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

  const primaryModifier = process.platform === 'darwin' ? 'Meta' : 'Control';
  assert.deepEqual(await page.evaluate(() => window.__demoCspViolations), []);
  assert.deepEqual(browserErrors, []);
  await editor.getByRole('tab', { name: 'Source' }).click();
  await editorContent.click();
  await page.keyboard.press(`${primaryModifier}+A`);
  await page.keyboard.insertText('[[docs:e|the editor contract]]');
  await editor.getByRole('tab', { name: 'Edit' }).click();
  await assertAndResetInlineStyleViolations(page, browserErrors, 1);
  for (let index = 0; index < '|the editor contract]]'.length; index += 1) {
    await editorContent.press('ArrowLeft');
  }
  await editorContent.press('Backspace');
  await editorContent.press('e');
  const completionTooltip = editor.locator('.cm-tooltip-autocomplete');
  await completionTooltip.getByRole('listbox', { name: 'Completions' }).waitFor();
  await page.keyboard.press('Enter');
  const markdownValue = markdownDemo.locator('[data-demo-markdown-value]');
  await page.waitForFunction(() =>
    document
      .querySelector('[data-demo-markdown-value]')
      ?.textContent?.includes('[[docs:editor-contract|the editor contract]]'),
  );
  assert.doesNotMatch((await markdownValue.textContent()) ?? '', /\]\]\|the editor contract/);
  await assertAndResetInlineStyleViolations(page, browserErrors, 0);

  await page.locator('#editor-wiki-links').uncheck();

  const shortTable = ['| Column A | Column B |', '| --- | --- |', '| Row 1 A | Row 1 B |'].join(
    '\n',
  );
  await editor.getByRole('tab', { name: 'Source' }).click();
  await editorContent.click();
  await page.keyboard.press(`${primaryModifier}+A`);
  await page.keyboard.insertText(shortTable);
  await editor.getByRole('tab', { name: 'Edit' }).click();
  await assertAndResetInlineStyleViolations(page, browserErrors, 0);
  const addRow = editor.getByRole('button', { name: 'Add row', exact: true });
  await addRow.scrollIntoViewIfNeeded();
  const previousLastRowCell = editor.locator(
    '[data-table-cell="true"][data-row="1"][data-column="0"]',
  );
  assert.equal(
    await previousLastRowCell.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return bounds.top >= 0 && bounds.bottom <= window.innerHeight;
    }),
    true,
  );
  const cellBeforeAddingRow = await previousLastRowCell.boundingBox();
  await addRow.click();
  await page.waitForFunction(
    () =>
      document.querySelector('[data-table-cell="true"][data-row="2"]') !== null &&
      document.querySelectorAll('[data-demo-rendered-markdown] tbody tr').length === 2,
  );
  const cellAfterAddingRow = await previousLastRowCell.boundingBox();
  assert.notEqual(cellBeforeAddingRow, null);
  assert.notEqual(cellAfterAddingRow, null);
  assert.ok(
    Math.abs(cellAfterAddingRow.y - cellBeforeAddingRow.y) <= 1,
    `Adding a table row moved the previous row from ${cellBeforeAddingRow.y} to ${cellAfterAddingRow.y}.`,
  );
  assert.deepEqual(await page.evaluate(() => window.__demoCspViolations), []);
  const newRowCell = editor.locator('[data-table-cell="true"][data-row="2"][data-column="1"]');
  await newRowCell.click();
  await page.waitForFunction(
    () =>
      document
        .querySelector('[data-table-cell="true"][data-row="2"][data-column="1"]')
        ?.getAttribute('data-active-cell') === 'true',
  );
  assert.deepEqual(await page.evaluate(() => window.__demoCspViolations), []);
  const cellBeforeTableInput = await newRowCell.boundingBox();
  await page.keyboard.type('new row');
  await page.waitForFunction(
    () =>
      document.querySelector('[data-demo-rendered-markdown]')?.textContent?.includes('new row') &&
      document.querySelector('[data-demo-markdown-value]')?.textContent?.includes('new row'),
  );
  const cellAfterTableInput = await newRowCell.boundingBox();
  assert.notEqual(cellBeforeTableInput, null);
  assert.notEqual(cellAfterTableInput, null);
  assert.ok(
    Math.abs(cellAfterTableInput.y - cellBeforeTableInput.y) <= 1,
    `Table input moved the active cell from ${cellBeforeTableInput.y} to ${cellAfterTableInput.y}.`,
  );
  for (let index = 0; index < 'new row'.length; index += 1) {
    await editorContent.press('Shift+ArrowLeft');
  }
  assert.equal(await editor.locator('.cm-markdown-table-cell-selected').count(), 0);
  const cellBeforeShiftCrossing = await newRowCell.boundingBox();
  await editorContent.press('Shift+ArrowLeft');
  await editor.locator('.cm-markdown-table-cell-selected').nth(1).waitFor();
  const cellAfterShiftCrossing = await newRowCell.boundingBox();
  assert.equal(await editor.locator('.cm-markdown-table-cell-selected').count(), 2);
  assert.notEqual(cellBeforeShiftCrossing, null);
  assert.notEqual(cellAfterShiftCrossing, null);
  assert.ok(
    Math.abs(cellAfterShiftCrossing.y - cellBeforeShiftCrossing.y) <= 1,
    `Shift selection crossing a cell moved it from ${cellBeforeShiftCrossing.y} to ${cellAfterShiftCrossing.y}.`,
  );
  await editorContent.press('ArrowRight');
  await page.waitForFunction(
    () =>
      document.querySelectorAll('.cm-markdown-table-cell-selected').length === 0 &&
      document
        .querySelector('[data-table-cell="true"][data-row="2"][data-column="1"]')
        ?.getAttribute('data-active-cell') === 'true',
  );
  assert.equal(await editor.locator('.cm-markdown-table-cell-active').count(), 1);

  const otherNewRowCell = editor.locator('[data-table-cell="true"][data-row="2"][data-column="0"]');
  await otherNewRowCell.click();
  await page.keyboard.type('other row');
  await page.waitForFunction(() =>
    document.querySelector('[data-demo-markdown-value]')?.textContent?.includes('other row'),
  );

  const expectVerticalCellSelection = async ({ column, direction, startRow, targetRow, value }) => {
    const startCell = editor.locator(
      `[data-table-cell="true"][data-row="${startRow}"][data-column="${column}"]`,
    );
    const targetCell = editor.locator(
      `[data-table-cell="true"][data-row="${targetRow}"][data-column="${column}"]`,
    );
    await startCell.selectText();
    await editorContent.press(direction === 'ArrowDown' ? 'ArrowLeft' : 'ArrowRight');
    for (let index = 0; index < value.length; index += 1) {
      await editorContent.press(direction === 'ArrowDown' ? 'Shift+ArrowRight' : 'Shift+ArrowLeft');
    }
    assert.equal(await editor.locator('.cm-markdown-table-cell-selected').count(), 0);
    await editorContent.press(`Shift+${direction}`);
    await page.waitForFunction(
      () => document.querySelectorAll('.cm-markdown-table-cell-selected').length === 2,
    );
    assert.equal(await startCell.getAttribute('aria-selected'), 'true');
    assert.equal(await targetCell.getAttribute('aria-selected'), 'true');

    const returnDirection = direction === 'ArrowDown' ? 'ArrowUp' : 'ArrowDown';
    await editorContent.press(returnDirection);
    await page.waitForFunction(
      ({ expectedColumn, expectedRow }) =>
        document.querySelectorAll('.cm-markdown-table-cell-selected').length === 0 &&
        document
          .querySelector(
            `[data-table-cell="true"][data-row="${expectedRow}"][data-column="${expectedColumn}"]`,
          )
          ?.getAttribute('data-active-cell') === 'true',
      { expectedColumn: column, expectedRow: startRow },
    );
    assert.equal(await editor.locator('.cm-markdown-table-cell-active').count(), 1);
  };

  for (const scenario of [
    { column: 0, direction: 'ArrowDown', startRow: 1, targetRow: 2, value: 'Row 1 A' },
    { column: 1, direction: 'ArrowDown', startRow: 1, targetRow: 2, value: 'Row 1 B' },
    { column: 0, direction: 'ArrowUp', startRow: 2, targetRow: 1, value: 'other row' },
    { column: 1, direction: 'ArrowUp', startRow: 2, targetRow: 1, value: 'new row' },
  ]) {
    await expectVerticalCellSelection(scenario);
  }

  await previousLastRowCell.selectText();
  await editorContent.press('ArrowRight');
  await editorContent.press('Shift+ArrowLeft');
  await editorContent.press('Shift+ArrowDown');
  await editor.locator('.cm-markdown-table-cell-selected').nth(1).waitFor();
  assert.equal(await editor.locator('.cm-markdown-table-cell-selected').count(), 2);
  assert.equal(await previousLastRowCell.getAttribute('aria-selected'), 'true');
  assert.equal(await otherNewRowCell.getAttribute('aria-selected'), 'true');
  await editorContent.press('ArrowUp');
  await page.waitForFunction(
    () => document.querySelectorAll('.cm-markdown-table-cell-selected').length === 0,
  );

  await previousLastRowCell.selectText();
  await editorContent.press('ArrowRight');
  for (let index = 0; index < 'Row 1 A'.length; index += 1) {
    await editorContent.press('Shift+ArrowLeft');
  }
  await editorContent.press('Shift+ArrowDown');
  await editor.locator('.cm-markdown-table-cell-selected').nth(1).waitFor();
  assert.equal(await editor.locator('.cm-markdown-table-cell-selected').count(), 2);
  assert.equal(await previousLastRowCell.getAttribute('aria-selected'), 'true');
  assert.equal(await otherNewRowCell.getAttribute('aria-selected'), 'true');
  await editorContent.press('ArrowUp');
  await page.waitForFunction(
    () => document.querySelectorAll('.cm-markdown-table-cell-selected').length === 0,
  );

  await newRowCell.selectText();
  await editorContent.press('ArrowLeft');
  for (let index = 0; index < 'new row'.length; index += 1) {
    await editorContent.press('Shift+ArrowRight');
  }
  await editorContent.press('Shift+ArrowUp');
  await editor.locator('.cm-markdown-table-cell-selected').nth(1).waitFor();
  assert.equal(await editor.locator('.cm-markdown-table-cell-selected').count(), 2);
  assert.equal(await newRowCell.getAttribute('aria-selected'), 'true');
  assert.equal(
    await editor
      .locator('[data-table-cell="true"][data-row="1"][data-column="1"]')
      .getAttribute('aria-selected'),
    'true',
  );
  await editorContent.press('ArrowDown');
  await page.waitForFunction(
    () => document.querySelectorAll('.cm-markdown-table-cell-selected').length === 0,
  );

  await otherNewRowCell.selectText();
  await editorContent.press('ArrowLeft');
  for (let index = 0; index < 'other row'.length; index += 1) {
    await editorContent.press('Shift+ArrowRight');
  }
  await editorContent.press('Shift+ArrowRight');
  assert.equal(await editor.locator('.cm-markdown-table-cell-selected').count(), 2);
  await editorContent.press('Shift+ArrowRight');
  assert.equal(await editor.locator('.cm-markdown-table-cell-selected').count(), 2);
  assert.deepEqual(
    await editor
      .locator('.cm-markdown-table-cell-selected')
      .evaluateAll((cells) => [...new Set(cells.map((cell) => cell.getAttribute('data-row')))]),
    ['2'],
  );
  await editorContent.press('ArrowLeft');
  await page.waitForFunction(
    () => document.querySelectorAll('.cm-markdown-table-cell-selected').length === 0,
  );

  await newRowCell.selectText();
  await editorContent.press('ArrowRight');
  for (let index = 0; index < 'new row'.length; index += 1) {
    await editorContent.press('Shift+ArrowLeft');
  }
  await editorContent.press('Shift+ArrowLeft');
  assert.equal(await editor.locator('.cm-markdown-table-cell-selected').count(), 2);
  await editorContent.press('Shift+ArrowLeft');
  assert.equal(await editor.locator('.cm-markdown-table-cell-selected').count(), 2);
  assert.deepEqual(
    await editor
      .locator('.cm-markdown-table-cell-selected')
      .evaluateAll((cells) => [...new Set(cells.map((cell) => cell.getAttribute('data-row')))]),
    ['2'],
  );

  const rapidInputTable = ['| H1 | H2 |', '| --- | --- |', '|  |  |', '|  |  |', 'after'].join(
    '\n',
  );
  for (const scenario of [
    { direction: 'ArrowDown', startRow: 1, targetRow: 2, column: 0 },
    { direction: 'ArrowUp', startRow: 2, targetRow: 1, column: 1 },
  ]) {
    await editor.getByRole('tab', { name: 'Source' }).click();
    await editorContent.click();
    await page.keyboard.press(`${primaryModifier}+A`);
    await page.keyboard.insertText(rapidInputTable);
    await editor.getByRole('tab', { name: 'Edit' }).click();
    await assertAndResetInlineStyleViolations(page, browserErrors, 1);
    const startCell = editor.locator(
      `[data-table-cell="true"][data-row="${scenario.startRow}"][data-column="${scenario.column}"]`,
    );
    const targetCell = editor.locator(
      `[data-table-cell="true"][data-row="${scenario.targetRow}"][data-column="${scenario.column}"]`,
    );
    await targetCell.evaluate((element) =>
      element.scrollIntoView({ behavior: 'instant', block: 'center' }),
    );
    await startCell.click();
    await page.keyboard.type('x');
    assert.equal(
      await targetCell.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        const viewport = window.visualViewport;
        const top = viewport?.offsetTop ?? 0;
        const bottom = top + (viewport?.height ?? window.innerHeight);
        return bounds.top >= top && bounds.bottom <= bottom;
      }),
      true,
    );
    const scrollBeforeArrow = await page.evaluate(() => window.scrollY);
    await page.keyboard.press(scenario.direction);
    const scrollFrames = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const capture = () => ({
            activeTop: document
              .querySelector('[data-table-cell="true"][data-active-cell="true"]')
              ?.getBoundingClientRect().top,
            editorScrollTop: document.querySelector('.cm-scroller')?.scrollTop,
            pageScrollTop: window.scrollY,
          });
          const frames = [capture()];
          requestAnimationFrame(() => {
            frames.push(capture());
            requestAnimationFrame(() => {
              frames.push(capture());
              resolve(frames);
            });
          });
        }),
    );

    assert.equal(await targetCell.getAttribute('data-active-cell'), 'true');
    assert.equal(
      await page.evaluate(() => window.scrollY),
      scrollBeforeArrow,
      JSON.stringify(scrollFrames),
    );
  }

  const escapedSourceTable = '| a\\|bc | `a\\*b` |\n| --- | --- |\n| wxyz | value |';
  await editor.getByRole('tab', { name: 'Source' }).click();
  await editorContent.click();
  await page.keyboard.press(`${primaryModifier}+A`);
  await page.keyboard.insertText(escapedSourceTable);
  await editor.getByRole('tab', { name: 'Edit' }).click();
  await assertAndResetInlineStyleViolations(page, browserErrors, 1);
  const escapedHeaderCell = editor.locator(
    '[data-table-cell="true"][data-row="0"][data-column="0"]',
  );
  assert.equal(await escapedHeaderCell.innerText(), 'a|bc');
  assert.equal(
    await editor.locator('[data-table-cell="true"][data-row="0"][data-column="1"]').innerText(),
    '`a\\*b`',
  );
  await escapedHeaderCell.selectText();
  await editorContent.press('ArrowLeft');
  await editorContent.press('ArrowRight');
  await editorContent.press('ArrowRight');
  await editorContent.press('ArrowDown');
  await page.keyboard.insertText('X');
  await page.waitForFunction(() =>
    document
      .querySelector('[data-demo-markdown-value]')
      ?.textContent?.includes('| wxXyz | value |'),
  );
  assert.match((await markdownValue.textContent()) ?? '', /\| a\\\|bc \| `a\\\*b` \|/);

  await escapedHeaderCell.selectText();
  await editorContent.press('ArrowLeft');
  await editorContent.press('ArrowRight');
  await editorContent.press('ArrowRight');
  await editorContent.press('Backspace');
  await page.waitForFunction(() =>
    document
      .querySelector('[data-demo-markdown-value]')
      ?.textContent?.includes('| abc | `a\\*b` |'),
  );
  assert.equal(await escapedHeaderCell.innerText(), 'abc');

  const escapedTargetTable = String.raw`| abcd | fixed |
| --- | --- |
| w\|yz | value |`;
  await editor.getByRole('tab', { name: 'Source' }).click();
  await editorContent.click();
  await page.keyboard.press(`${primaryModifier}+A`);
  await page.keyboard.insertText(escapedTargetTable);
  await editor.getByRole('tab', { name: 'Edit' }).click();
  await assertAndResetInlineStyleViolations(page, browserErrors, 1);
  const plainHeaderCell = editor.locator('[data-table-cell="true"][data-row="0"][data-column="0"]');
  await plainHeaderCell.selectText();
  await editorContent.press('ArrowLeft');
  await editorContent.press('ArrowRight');
  await editorContent.press('ArrowRight');
  await editorContent.press('ArrowDown');
  await page.keyboard.insertText('X');
  await page.waitForFunction(() =>
    document
      .querySelector('[data-demo-markdown-value]')
      ?.textContent?.includes(String.raw`| w\|Xyz | value |`),
  );
  assert.equal(
    await editor.locator('[data-table-cell="true"][data-row="1"][data-column="0"]').innerText(),
    'w|Xyz',
  );

  assert.deepEqual(await page.evaluate(() => window.__demoCspViolations), []);
  assert.deepEqual(browserErrors, []);

  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.locator('html').getAttribute('data-bs-theme'), 'dark');

  const cspViolations = await page.evaluate(() => window.__demoCspViolations);
  assert.deepEqual(cspViolations, []);
  assert.deepEqual(browserErrors, []);
});

test('hydrates closed temporal dialogs consistently across client time zones', async (t) => {
  const server = await startDemoServer(process.cwd());
  t.after(() => stopDemoServer(server.child));
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());

  for (const timezoneId of ['Pacific/Kiritimati', 'Pacific/Pago_Pago']) {
    const context = await browser.newContext({ timezoneId });
    const page = await context.newPage();
    const browserErrors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') browserErrors.push(`console: ${message.text()}`);
    });
    page.on('pageerror', (error) => browserErrors.push(`page: ${error.message}`));

    await page.goto(`${server.url}/components/localized-date-picker`, {
      waitUntil: 'networkidle',
    });
    const dialog = page.locator('[data-testid="date-picker-calendar"]');
    assert.equal(await dialog.count(), 1, timezoneId);
    assert.equal(
      await dialog.locator('.localized-date-picker-calendar-content').count(),
      0,
      timezoneId,
    );
    assert.equal(await dialog.locator('[data-date]').count(), 0, timezoneId);

    await page
      .locator('ds-localized-date-picker [data-testid="temporal-picker-field-trigger"]')
      .click();
    assert.equal(
      await dialog.locator('.localized-date-picker-calendar-content').count(),
      1,
      timezoneId,
    );
    await page.locator('[data-testid="date-picker-cancel"]').click();
    assert.equal(
      await dialog.locator('.localized-date-picker-calendar-content').count(),
      0,
      timezoneId,
    );
    assert.deepEqual(browserErrors, [], timezoneId);
    await context.close();
  }
});

test('keeps all packed temporal pickers transactional and adaptive without browser violations', async (t) => {
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
    const nativeMatchMedia = window.matchMedia.bind(window);
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: (query) => {
        if (query !== '(hover: none) and (pointer: coarse)') return nativeMatchMedia(query);
        return {
          matches: true,
          media: query,
          onchange: null,
          addEventListener() {},
          removeEventListener() {},
          addListener() {},
          removeListener() {},
          dispatchEvent: () => false,
        };
      },
    });
    window.__demoCspViolations = [];
    document.addEventListener('securitypolicyviolation', (event) => {
      window.__demoCspViolations.push(`${event.violatedDirective}: ${event.blockedURI}`);
    });
  });

  await page.goto(`${server.url}/components/localized-date-picker`, { waitUntil: 'networkidle' });
  const dateCommitted = '[data-demo-date-selection]';
  const originalDate = 'Committed: 2026-08-28';
  const dateTrigger = page.locator(
    'ds-localized-date-picker [data-testid="temporal-picker-field-trigger"]',
  );
  await waitForText(page, dateCommitted, originalDate);
  await dateTrigger.click();
  const previousMonth = page.locator('[data-testid="date-picker-previous-month"]');
  const doneButton = page.locator('[data-testid="date-picker-done"]');
  await previousMonth.focus();
  await previousMonth.press('Shift+Tab');
  assert.equal(await doneButton.evaluate((element) => document.activeElement === element), true);
  await doneButton.press('Tab');
  assert.equal(await previousMonth.evaluate((element) => document.activeElement === element), true);
  await page.locator('[data-date="2026-08-29"]').click();
  await expectCommittedUnchanged(page, dateCommitted, originalDate);
  await page.locator('[data-testid="date-picker-done"]').click();
  await waitForText(page, dateCommitted, 'Committed: 2026-08-29');
  await dateTrigger.click();
  await page.locator('[data-date="2026-08-30"]').click();
  await expectCommittedUnchanged(page, dateCommitted, 'Committed: 2026-08-29');
  await page.locator('[data-testid="date-picker-cancel"]').click();
  await expectCommittedUnchanged(page, dateCommitted, 'Committed: 2026-08-29');
  assert.equal(await dateTrigger.evaluate((element) => document.activeElement === element), true);

  await dateTrigger.click();
  await page.locator('[data-date="2026-08-30"]').click();
  await page.mouse.click(2, 2);
  assert.equal(
    await page.locator('[data-testid="date-picker-calendar"]').evaluate((element) => element.open),
    false,
  );
  await expectCommittedUnchanged(page, dateCommitted, 'Committed: 2026-08-29');
  assert.equal(await dateTrigger.evaluate((element) => document.activeElement === element), true);

  await navigateToDemoPage(
    page,
    'Localized date range picker',
    '/components/localized-date-range-picker',
  );
  const dateRangeCommitted = '[data-demo-date-range-selection]';
  const originalDateRange = 'Committed: 2026-08-28 → 2026-08-30';
  await waitForText(page, dateRangeCommitted, originalDateRange);
  await page.locator('#demo-date-range').focus();
  await page
    .locator('ds-localized-date-range-picker [data-testid="temporal-picker-field-trigger"]')
    .click();
  assert.equal(await page.locator('[data-date="2026-08-31"]').isDisabled(), true);
  await page.locator('[data-testid="date-picker-clear"]').click();
  await page.locator('[data-date="2026-08-28"]').click();
  await page.locator('[data-date="2026-08-30"]').click();
  await page.locator('[data-date="2026-08-27"]').click();
  await page.locator('[data-date="2026-08-26"]').click();
  await page.waitForFunction(
    () =>
      document
        .querySelector('[data-date="2026-08-26"]')
        ?.classList.contains('localized-date-picker-range-start') === true &&
      document
        .querySelector('[data-date="2026-08-27"]')
        ?.classList.contains('localized-date-picker-range-end') === true,
  );
  assert.equal(
    await page
      .locator('[data-date="2026-08-26"]')
      .evaluate((element) => element.classList.contains('localized-date-picker-range-start')),
    true,
  );
  assert.equal(
    await page
      .locator('[data-date="2026-08-27"]')
      .evaluate((element) => element.classList.contains('localized-date-picker-range-end')),
    true,
  );
  await page.locator('[data-testid="date-picker-cancel"]').click();
  await expectCommittedUnchanged(page, dateRangeCommitted, originalDateRange);
  await page
    .locator('ds-localized-date-range-picker [data-testid="temporal-picker-field-trigger"]')
    .click();
  await page.locator('[data-testid="date-picker-clear"]').click();
  await page.locator('[data-date="2026-08-27"]').click();
  await expectCommittedUnchanged(page, dateRangeCommitted, originalDateRange);
  await page.locator('[data-testid="date-picker-done"]').click();
  await waitForText(page, dateRangeCommitted, 'Committed: 2026-08-27 → (null)');
  await page.locator('#demo-date-range-end').focus();
  await page
    .locator('ds-localized-date-range-picker [data-testid="temporal-picker-field-trigger"]')
    .click();
  await page.locator('[data-date="2026-08-27"]').press('ArrowRight');
  const keyboardPreview = page.locator('[data-date="2026-08-28"]');
  await page.waitForFunction(() =>
    document
      .querySelector('[data-date="2026-08-28"]')
      ?.classList.contains('localized-date-picker-preview-end'),
  );
  assert.equal(await keyboardPreview.getAttribute('aria-selected'), 'false');
  assert.equal(
    await keyboardPreview.evaluate((element) =>
      element.classList.contains('localized-date-picker-preview-end'),
    ),
    true,
  );
  assert.match(
    (await page.locator('[data-testid="date-picker-status"]').textContent()) ?? '',
    /Preview from August 27, 2026 to August 28, 2026/,
  );
  const pointerPreview = page.locator('[data-date="2026-08-29"]');
  await pointerPreview.hover();
  assert.equal(await pointerPreview.getAttribute('aria-selected'), 'false');
  assert.equal(
    await pointerPreview.evaluate((element) =>
      element.classList.contains('localized-date-picker-preview-end'),
    ),
    true,
  );
  await page.locator('[data-date="2026-08-29"]').click();
  await expectCommittedUnchanged(page, dateRangeCommitted, 'Committed: 2026-08-27 → (null)');
  await page.locator('[data-testid="date-picker-cancel"]').click();
  await expectCommittedUnchanged(page, dateRangeCommitted, 'Committed: 2026-08-27 → (null)');
  await page.locator('[data-demo-date-range-require-paired]').check();
  await page.waitForFunction(
    () => document.querySelector('#demo-date-range-end')?.getAttribute('aria-invalid') === 'true',
  );
  assert.equal(await page.locator('#demo-date-range-end').getAttribute('aria-invalid'), 'true');
  assert.match(
    (await page.locator('[data-testid="date-range-validation-message"]').textContent()) ?? '',
    /both dates/i,
  );

  await navigateToDemoPage(page, 'Localized time picker', '/components/localized-time-picker');
  await page.locator('[data-demo-time-mode]').selectOption('custom');
  const timeCommitted = '[data-demo-time-selection]';
  const originalTime = 'Committed: 09:30';
  await waitForText(page, timeCommitted, originalTime);
  await page
    .locator('ds-localized-time-picker [data-testid="temporal-picker-field-trigger"]')
    .click();
  await setCustomTime(page, '14', '45');
  await expectCommittedUnchanged(page, timeCommitted, originalTime);
  await page.locator('[data-testid="date-picker-done"]').click();
  await waitForText(page, timeCommitted, 'Committed: 14:45');
  await page
    .locator('ds-localized-time-picker [data-testid="temporal-picker-field-trigger"]')
    .click();
  await setCustomTime(page, '16', '15');
  await expectCommittedUnchanged(page, timeCommitted, 'Committed: 14:45');
  await page.locator('[data-testid="date-picker-cancel"]').click();
  await expectCommittedUnchanged(page, timeCommitted, 'Committed: 14:45');
  await page.locator('[data-demo-time-mode]').selectOption('auto');
  await page
    .locator('ds-localized-time-picker [data-testid="temporal-picker-field-trigger"]')
    .click();
  assert.equal(await page.locator('[data-testid="date-picker-native-time"]').count(), 1);
  await page.locator('[data-testid="date-picker-cancel"]').click();

  await navigateToDemoPage(
    page,
    'Localized time range picker',
    '/components/localized-time-range-picker',
  );
  await page.locator('[data-demo-time-range-mode]').selectOption('custom');
  const timeRangeCommitted = '[data-demo-time-range-selection]';
  const originalTimeRange = 'Committed: 09:30 → 17:00';
  await waitForText(page, timeRangeCommitted, originalTimeRange);
  await page.locator('#demo-time-range-end').focus();
  await page
    .locator('ds-localized-time-range-picker [data-testid="temporal-picker-field-trigger"]')
    .click();
  assert.equal(await page.locator('[data-testid="segmented-time-input"]').count(), 2);
  assert.deepEqual(
    (await page.locator('[data-testid="date-picker-time-boundary-label"]').allTextContents()).map(
      (label) => label.trim(),
    ),
    ['Start time', 'End time'],
  );
  await page
    .locator('[data-time-boundary="end"] [data-adjust-segment="minute"][data-adjust="1"]')
    .click();
  await page.waitForFunction(
    () =>
      document
        .querySelector('[data-time-boundary="end"] [data-testid="segmented-time-input"]')
        ?.getAttribute('aria-label') === '17:01',
  );
  assert.equal(
    await page
      .locator('[data-time-boundary="end"] [data-testid="segmented-time-input"]')
      .getAttribute('aria-label'),
    '17:01',
  );
  await setCustomTime(page, '16', '15', 'end');
  await expectCommittedUnchanged(page, timeRangeCommitted, originalTimeRange);
  await page.locator('[data-testid="date-picker-done"]').click();
  await waitForText(page, timeRangeCommitted, 'Committed: 09:30 → 16:15');
  await page.locator('#demo-time-range-end').focus();
  await page
    .locator('ds-localized-time-range-picker [data-testid="temporal-picker-field-trigger"]')
    .click();
  await setCustomTime(page, '15', '30', 'end');
  await expectCommittedUnchanged(page, timeRangeCommitted, 'Committed: 09:30 → 16:15');
  await page.locator('[data-testid="date-picker-cancel"]').click();
  await expectCommittedUnchanged(page, timeRangeCommitted, 'Committed: 09:30 → 16:15');

  await navigateToDemoPage(
    page,
    'Localized datetime picker',
    '/components/localized-datetime-picker',
  );
  await page.locator('[data-demo-datetime-mode]').selectOption('custom');
  const dateTimeCommitted = '[data-demo-datetime-selection]';
  const originalDateTime = 'Committed: 2026-08-28T09:30';
  await waitForText(page, dateTimeCommitted, originalDateTime);
  await page
    .locator('ds-localized-datetime-picker [data-testid="temporal-picker-field-trigger"]')
    .click();
  assert.equal(await page.locator('[data-date="2026-08-31"]').isDisabled(), true);
  await page.locator('[data-date="2026-08-29"]').click();
  await expectCommittedUnchanged(page, dateTimeCommitted, originalDateTime);
  await page.locator('[data-testid="date-picker-done"]').click();
  await waitForText(page, dateTimeCommitted, 'Committed: 2026-08-29T09:30');
  await page
    .locator('ds-localized-datetime-picker [data-testid="temporal-picker-field-trigger"]')
    .click();
  await page.locator('[data-date="2026-08-30"]').click();
  await expectCommittedUnchanged(page, dateTimeCommitted, 'Committed: 2026-08-29T09:30');
  await page.locator('[data-testid="date-picker-cancel"]').click();
  await expectCommittedUnchanged(page, dateTimeCommitted, 'Committed: 2026-08-29T09:30');

  await navigateToDemoPage(
    page,
    'Localized datetime range picker',
    '/components/localized-datetime-range-picker',
  );
  await page.locator('[data-demo-datetime-range-mode]').selectOption('custom');
  const dateTimeRangeCommitted = '[data-demo-datetime-range-selection]';
  const originalDateTimeRange = 'Committed: 2026-08-28T09:30 → 2026-08-30T17:00';
  await waitForText(page, dateTimeRangeCommitted, originalDateTimeRange);
  await page.locator('#demo-datetime-range').focus();
  await page
    .locator('ds-localized-datetime-range-picker [data-testid="temporal-picker-field-trigger"]')
    .click();
  await page.locator('[data-date="2026-08-27"]').click();
  await page.locator('[data-time-boundary="start"] [data-segment="hour"]').focus();
  await page.locator('[data-date="2026-08-26"]').focus();
  await page.waitForFunction(
    () =>
      document
        .querySelector('[data-date="2026-08-26"]')
        ?.classList.contains('localized-date-picker-preview-end') === true &&
      document
        .querySelector('[data-testid="date-picker-status"]')
        ?.textContent?.includes('Choose the end date and time.'),
  );
  await page.locator('[data-date="2026-08-29"]').click();
  assert.equal(await page.locator('[data-testid="segmented-time-input"]').count(), 2);
  await setCustomTime(page, '10', '15', 'start');
  await setCustomTime(page, '16', '45', 'end');
  await expectCommittedUnchanged(page, dateTimeRangeCommitted, originalDateTimeRange);
  await page.waitForFunction(
    () =>
      document
        .querySelector('[data-time-boundary="start"] [data-testid="segmented-time-input"]')
        ?.getAttribute('aria-label') === '10:15' &&
      document
        .querySelector('[data-time-boundary="end"] [data-testid="segmented-time-input"]')
        ?.getAttribute('aria-label') === '16:45' &&
      document.querySelector('[data-date="2026-08-29"]')?.getAttribute('aria-selected') ===
        'true' &&
      !document.querySelector('[data-testid="date-picker-done"]')?.hasAttribute('disabled'),
  );
  const replacementEndState = await page.evaluate(() => ({
    activeStatus: document.querySelector('[data-testid="date-picker-status"]')?.textContent?.trim(),
    displayedTimes: [...document.querySelectorAll('[data-testid="segmented-time-input"]')].map(
      (element) => element.getAttribute('aria-label'),
    ),
    doneDisabled: document
      .querySelector('[data-testid="date-picker-done"]')
      ?.hasAttribute('disabled'),
    selectedDates: [...document.querySelectorAll('[data-date][aria-selected="true"]')].map(
      (element) => element.getAttribute('data-date'),
    ),
  }));
  assert.equal(replacementEndState.activeStatus, 'Choose the end date and time.');
  assert.deepEqual(replacementEndState.displayedTimes, ['10:15', '16:45']);
  assert.deepEqual(replacementEndState.selectedDates, ['2026-08-27', '2026-08-28', '2026-08-29']);
  assert.equal(replacementEndState.doneDisabled, false, JSON.stringify(replacementEndState));
  await page.locator('[data-testid="date-picker-done"]').click();
  await waitForText(page, dateTimeRangeCommitted, 'Committed: 2026-08-27T10:15 → 2026-08-29T16:45');
  await page.locator('#demo-datetime-range').focus();
  await page
    .locator('ds-localized-datetime-range-picker [data-testid="temporal-picker-field-trigger"]')
    .click();
  await page.locator('[data-date="2026-08-26"]').click();
  await expectCommittedUnchanged(
    page,
    dateTimeRangeCommitted,
    'Committed: 2026-08-27T10:15 → 2026-08-29T16:45',
  );
  await page.locator('[data-testid="date-picker-cancel"]').click();
  await expectCommittedUnchanged(
    page,
    dateTimeRangeCommitted,
    'Committed: 2026-08-27T10:15 → 2026-08-29T16:45',
  );

  assert.deepEqual(await page.evaluate(() => window.__demoCspViolations), []);
  assert.deepEqual(browserErrors, []);
});
