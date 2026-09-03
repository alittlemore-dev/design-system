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

test('hydrates the packed showcase, tracks the known Source-mode CSP gap, and keeps other interactions CSP-clean', async (t) => {
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
  const shellBeforeAddingRow = await editor
    .locator('[data-testid="markdown-editor-shell"]')
    .boundingBox();
  assert.notEqual(shellBeforeAddingRow, null);
  assert.ok(shellBeforeAddingRow.y > 0);
  assert.ok(shellBeforeAddingRow.y + shellBeforeAddingRow.height <= page.viewportSize().height);
  const previousLastRowCell = editor.locator(
    '[data-table-cell="true"][data-row="1"][data-column="0"]',
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
