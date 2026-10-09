import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import { chromium } from 'playwright';

import { startDemoServer, stopDemoServer } from './server-process.mjs';

test('form controls use the green accent and preserve switch keyboard behavior in both themes', async (t) => {
  const server = await startDemoServer(process.cwd());
  t.after(() => stopDemoServer(server.child));
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.goto(`${server.url}/components/form-validation`, { waitUntil: 'networkidle' });

  for (const theme of ['light', 'dark']) {
    await page.locator(`[data-demo-theme="${theme}"]`).click();
    await page.waitForFunction(
      (expected) => document.documentElement.getAttribute('data-bs-theme') === expected,
      theme,
    );
    const accent = await page
      .locator('html')
      .evaluate((element) =>
        getComputedStyle(element).getPropertyValue('--main-component-color').trim(),
      );
    for (const selector of [
      '#validation-required',
      '#demo-enabled-switch',
      '#demo-mixed-checkbox',
    ]) {
      const control = page.locator(selector);
      const colors = await control.evaluate((element) => {
        const style = getComputedStyle(element);
        return { background: style.backgroundColor, border: style.borderColor };
      });
      assert.equal(colors.background, accent);
      assert.equal(colors.border, accent);
    }

    const danger = await page
      .locator('html')
      .evaluate((element) => getComputedStyle(element).getPropertyValue('--danger-color').trim());
    const checkbox = page.locator('#validation-required');
    await checkbox.evaluate((element) => element.classList.add('is-invalid'));
    await checkbox.focus();
    const invalidCheckbox = await checkbox.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        background: style.backgroundColor,
        border: style.borderColor,
        shadow: style.boxShadow,
      };
    });
    assert.equal(invalidCheckbox.background, danger);
    assert.equal(invalidCheckbox.border, danger);
    assert.ok(
      invalidCheckbox.shadow.includes(danger.replace('rgb(', 'rgba(').replace(')', ', 0.25)')),
    );
    await checkbox.evaluate((element) => element.classList.remove('is-invalid'));

    const mixedCheckbox = page.locator('#demo-mixed-checkbox');
    await mixedCheckbox.evaluate((element) => {
      element.required = true;
      element.closest('.form-check').classList.add('was-validated');
    });
    await mixedCheckbox.focus();
    assert.equal(
      await mixedCheckbox.evaluate((element) => getComputedStyle(element).borderColor),
      danger,
    );
    await mixedCheckbox.evaluate((element) => {
      element.required = false;
      element.closest('.form-check').classList.remove('was-validated');
    });

    const toggle = page.getByRole('switch', { name: 'Enable notifications' });
    await toggle.focus();
    await toggle.press('Space');
    assert.equal(await toggle.isChecked(), false);
    const focused = await toggle.evaluate((element) => {
      const style = getComputedStyle(element);
      return { image: style.backgroundImage, border: style.borderColor, shadow: style.boxShadow };
    });
    assert.equal(focused.border, accent);
    assert.ok(focused.shadow.includes(accent.replace('rgb(', 'rgba(').replace(')', ', 0.25)')));
    await page.locator('#demo-required-field').focus();
    assert.equal(
      await toggle.evaluate((element) => getComputedStyle(element).backgroundImage),
      focused.image,
    );
    await toggle.focus();
    await toggle.press('Space');
    assert.equal(await toggle.isChecked(), true);
    await page.locator('#validation-disabled').check();
    await page.waitForFunction(() => document.querySelector('#demo-enabled-switch')?.disabled);
    assert.equal(await toggle.isDisabled(), true);
    assert.equal(
      await toggle.evaluate((element) => getComputedStyle(element).backgroundColor),
      accent,
    );
    await page.locator('#validation-disabled').uncheck();
    await page.waitForFunction(
      () => document.querySelector('#demo-enabled-switch')?.disabled === false,
    );
  }
});

test('datetime error presentation can be deferred while validation stays active', async (t) => {
  const server = await startDemoServer(process.cwd());
  t.after(() => stopDemoServer(server.child));
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.goto(`${server.url}/components/localized-datetime-picker`, {
    waitUntil: 'networkidle',
  });
  await page.locator('#datetime-show-errors').uncheck();
  await page.locator('#datetime-required').check();
  const input = page.locator('#demo-datetime');
  await input.fill('unfinished');
  await input.blur();
  await page.waitForFunction(() => !document.querySelector('#demo-datetime').checkValidity());
  const error = page.locator('[data-testid="datetime-picker-validation-message"]');
  assert.equal(await error.count(), 0);
  assert.equal(await input.getAttribute('aria-invalid'), null);
  assert.equal(await input.evaluate((element) => element.checkValidity()), false);

  await page.locator('#datetime-show-errors').check();
  await error.waitFor();
  assert.equal(await input.getAttribute('aria-invalid'), 'true');
  await input.fill('08/29/2026 10:45');
  await input.blur();
  await waitForText(page, '[data-demo-datetime-selection]', 'Committed: 2026-08-29T10:45');
  assert.equal(await error.count(), 0);
  assert.equal(await input.evaluate((element) => element.checkValidity()), true);
});

async function waitForText(page, selector, expected) {
  await page.waitForFunction(
    ({ target, value }) => document.querySelector(target)?.textContent?.trim() === value,
    { target: selector, value: expected },
  );
  assert.equal((await page.locator(selector).textContent())?.trim(), expected);
}

async function navigateToDemoPage(page, name, path) {
  const label = new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s*New)?$`);
  await page.locator('[data-demo-sidebar] nav').getByRole('link', { name: label }).click();
  await page.waitForURL(`**${path}`);
  assert.equal(await page.getByRole('heading', { name, level: 1, exact: true }).count(), 1);
}

async function assertFocusInsideClip(locator, clippingSelector) {
  const ring = await locator.evaluate((element, selector) => {
    const rect = element.getBoundingClientRect();
    const clip = element.closest(selector).getBoundingClientRect();
    const style = getComputedStyle(element);
    const extension =
      Number.parseFloat(style.outlineWidth) + Number.parseFloat(style.outlineOffset);
    return {
      focused: element === document.activeElement,
      width: Number.parseFloat(style.outlineWidth),
      contained:
        rect.left - extension >= clip.left &&
        rect.right + extension <= clip.right &&
        rect.top - extension >= clip.top &&
        rect.bottom + extension <= clip.bottom,
    };
  }, clippingSelector);
  assert.equal(ring.focused, true);
  assert.ok(ring.width >= 2);
  assert.equal(ring.contained, true, 'Keyboard focus outline must fit its scrolling container.');
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
  for (const width of [390, 900, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const panel = page.locator('#catalogue-navigation-panel');
    if (await panel.isHidden())
      await page.getByRole('button', { name: 'Open catalogue', exact: true }).click();
    await panel.waitFor({ state: 'visible' });
    for (const theme of ['light', 'dark']) {
      await page.locator(`[data-demo-theme="${theme}"]`).click();
      const badges = await panel.locator('.navigation-badge').evaluateAll((elements) =>
        elements.map((element) => {
          const badge = element.getBoundingClientRect();
          const link = element.closest('a').getBoundingClientRect();
          return {
            text: element.textContent,
            height: badge.height,
            lineHeight: Number.parseFloat(getComputedStyle(element).lineHeight),
            insideLink: badge.left >= link.left && badge.right <= link.right,
          };
        }),
      );
      assert.ok(badges.length > 0);
      for (const badge of badges) {
        assert.ok(
          badge.height <= badge.lineHeight + 1 && badge.insideLink,
          `${width}px ${theme}: badge ${badge.text} must fit on one line inside its link`,
        );
      }
    }
  }
  await page.getByRole('link', { name: 'Site select', exact: true }).click();
  await page.waitForURL('**/components/site-select');
  assert.equal(await page.getByRole('heading', { name: 'Site select', level: 1 }).count(), 1);
  assert.equal(
    await page.getByRole('link', { name: 'Site select', exact: true }).getAttribute('aria-current'),
    'page',
  );

  await page.goBack({ waitUntil: 'networkidle' });
  assert.equal(await page.getByRole('heading', { name: 'Overview', level: 1 }).count(), 1);
  assert.equal(
    await page.getByRole('link', { name: 'Overview', exact: true }).getAttribute('aria-current'),
    'page',
  );

  await page.getByRole('link', { name: 'Site select', exact: true }).click();
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
  const mobileNavigation = page.locator('#catalogue-navigation-panel');
  await mobileNavigation.waitFor({ state: 'hidden' });
  assert.equal(await mobileNavigation.isHidden(), true);
  await page.getByRole('button', { name: 'Open catalogue' }).click();
  await mobileNavigation.waitFor({ state: 'visible' });
  assert.equal(await mobileNavigation.isVisible(), true);
  assert.equal(
    await page.getByRole('link', { name: 'Site select', exact: true }).getAttribute('aria-current'),
    'page',
  );
});

test('inline page navigation preserves its panel, folder state, keyboard focus and responsive geometry', async (t) => {
  const server = await startDemoServer(process.cwd());
  t.after(() => stopDemoServer(server.child));
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    window.__navigationCspViolations = [];
    document.addEventListener('securitypolicyviolation', (event) =>
      window.__navigationCspViolations.push(event.violatedDirective),
    );
  });
  for (const width of [390, 900, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`${server.url}/preview/navigation`, { waitUntil: 'networkidle' });
    for (const theme of ['light', 'dark']) {
      await page.locator(`[data-demo-theme="${theme}"]`).click();
      await page.waitForFunction(
        (expected) => document.documentElement.getAttribute('data-bs-theme') === expected,
        theme,
      );
      const panel = page.locator('#preview-sections');
      if (await panel.isHidden())
        await page.getByRole('button', { name: 'Open sections', exact: true }).click();
      await panel.waitFor({ state: 'visible' });
      const textContrast = await page
        .locator('#preview-sections h2, .entries strong')
        .evaluateAll((elements) => {
          const rgb = (value) => value.match(/[\d.]+/g).map(Number);
          const luminance = (channels) =>
            channels
              .slice(0, 3)
              .map((value) => value / 255)
              .map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4))
              .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
          const background = rgb(
            getComputedStyle(document.documentElement).getPropertyValue('--main-bg-color'),
          );
          return elements.map((element) => {
            const color = rgb(getComputedStyle(element).color);
            const alpha = color[3] ?? 1;
            const foreground = color
              .slice(0, 3)
              .map((value, index) => value * alpha + background[index] * (1 - alpha));
            const first = luminance(foreground),
              second = luminance(background);
            return {
              label: element.textContent,
              ratio: (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05),
            };
          });
        });
      for (const text of textContrast)
        assert.ok(text.ratio >= 4.5, `${theme} ${text.label} contrast is ${text.ratio}.`);
      const openPosition = await page.locator('.preview-content').boundingBox();
      await page.getByRole('button', { name: 'Collapse sections', exact: true }).press('Enter');
      await panel.waitFor({ state: 'hidden' });
      await assertFocusInsideClip(
        page.getByRole('button', { name: 'Open sections', exact: true }),
        'aside',
      );
      const closedPosition = await page.locator('.preview-content').boundingBox();
      if (width >= 768) assert.ok(openPosition.x > closedPosition.x + 100);
      else assert.ok(openPosition.y > closedPosition.y + 100);
      assert.equal(await page.locator('dialog[open]').count(), 0);
      await page.getByRole('button', { name: 'Open sections', exact: true }).press('Enter');
      await panel.waitFor({ state: 'visible' });
      await page.getByRole('button', { name: 'Collapse sections', exact: true }).press('Tab');
      await assertFocusInsideClip(
        page
          .getByRole('navigation', { name: 'Workspace sections' })
          .getByRole('link', { name: 'Dashboard', exact: true }),
        '#preview-sections',
      );
      await page
        .getByRole('navigation', { name: 'Workspace sections' })
        .getByRole('link', { name: 'Dashboard', exact: true })
        .press('Escape');
      await panel.waitFor({ state: 'hidden' });
      assert.equal(
        await page
          .getByRole('button', { name: 'Open sections', exact: true })
          .evaluate((element) => element === document.activeElement),
        true,
      );
      await page.getByRole('button', { name: 'Articles', exact: true }).click();
      await page.getByRole('button', { name: 'Open sections', exact: true }).click();
      const folder = page.getByRole('button', { name: 'Getting started', exact: true });
      await folder.press('Space');
      await page.waitForFunction(
        () => document.getElementById('preview-navigation-start')?.hidden === true,
      );
      assert.equal(await folder.getAttribute('aria-expanded'), 'false');
      await page.getByRole('button', { name: 'Collapse sections', exact: true }).click();
      await page.getByRole('button', { name: 'Open sections', exact: true }).click();
      assert.equal(await folder.getAttribute('aria-expanded'), 'false');
      await folder.press('Enter');
      await page.waitForFunction(
        () => document.getElementById('preview-navigation-start')?.hidden === false,
      );
      assert.equal(await folder.getAttribute('aria-expanded'), 'true');
      await page.getByRole('link', { name: 'Your first article', exact: true }).press('Enter');
      await page
        .getByRole('heading', { name: 'Your first article', level: 1 })
        .waitFor({ state: 'visible' });
      assert.equal(
        await page.getByRole('heading', { name: 'Your first article', level: 1 }).count(),
        1,
      );
      await page.getByRole('button', { name: 'Workspace', exact: true }).click();
      await page
        .getByRole('heading', { name: 'Dashboard', level: 1 })
        .waitFor({ state: 'visible' });
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        true,
      );
      assert.deepEqual(await page.evaluate(() => window.__navigationCspViolations), []);
    }
  }
  await page.getByRole('button', { name: 'Open services menu' }).click();
  await page.getByRole('dialog', { name: 'Services', exact: true }).waitFor({ state: 'visible' });
  assert.equal(await page.locator('#preview-sections').isVisible(), true);
  await page.getByRole('button', { name: 'Close services menu' }).press('Escape');
  await page.getByRole('dialog', { name: 'Services', exact: true }).waitFor({ state: 'hidden' });
  assert.equal(
    await page
      .getByRole('button', { name: 'Open services menu' })
      .evaluate((element) => element === document.activeElement),
    true,
  );
  assert.deepEqual(await page.evaluate(() => window.__navigationCspViolations), []);
  assert.deepEqual(errors, []);
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

  await navigateToDemoPage(page, 'Navigation and sidebar', '/components/navigation');
  assert.equal(await page.getByRole('link', { name: 'Open navigation demo' }).count(), 1);

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
  const previewCellStyle = await editorPreview
    .locator('th')
    .first()
    .evaluate((cell) => {
      const style = getComputedStyle(cell);
      return { border: style.borderTopWidth, padding: style.paddingLeft };
    });
  assert.equal(previewCellStyle.border, '1px');
  assert.ok(Number.parseFloat(previewCellStyle.padding) > 0);

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
  await editorContent.fill('');
  await editor.getByRole('tab', { name: 'Edit' }).click();
  assert.equal(
    (await markdownDemo.locator('[data-demo-markdown-value]').textContent())?.trim(),
    '',
  );
  await editorContent.click();
  await editorContent.pressSequentially('[[');
  const domainTooltip = editor.locator('.cm-tooltip-autocomplete');
  await domainTooltip.getByRole('listbox', { name: 'Completions' }).waitFor({ state: 'attached' });
  const domainTooltipBounds = await domainTooltip.boundingBox();
  assert.ok(domainTooltipBounds);
  assert.ok(
    domainTooltipBounds.y >= 0 && domainTooltipBounds.y < page.viewportSize().height,
    `Completion tooltip is outside the viewport: ${JSON.stringify(domainTooltipBounds)}`,
  );
  assert.match((await domainTooltip.textContent()) ?? '', /docs/);

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

test('disclosures preserve native keyboard, focus, mobile geometry and draft boundaries', async (t) => {
  const server = await startDemoServer(process.cwd());
  t.after(() => stopDemoServer(server.child));
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto(`${server.url}/components/disclosures`, { waitUntil: 'networkidle' });
  const trigger = page.getByRole('button', { name: 'Open actions' });
  await trigger.focus();
  await trigger.press('ArrowDown');
  await page.getByRole('button', { name: 'Choose action' }).waitFor();
  assert.equal(
    await page.evaluate(() => document.activeElement?.textContent?.trim()),
    'Choose action',
  );
  await page.keyboard.press('Escape');
  await page.waitForFunction(
    () =>
      document.querySelector('button[popovertarget]')?.getAttribute('aria-expanded') === 'false',
  );
  await trigger.click();
  await page.getByRole('checkbox', { name: 'Keep open option' }).check();
  assert.equal(await trigger.getAttribute('aria-expanded'), 'true');
  await page.getByRole('button', { name: 'Choose action' }).click();
  await waitForText(page, '[data-demo-dropdown-state]', 'Closed · Chosen');
  const drawerTrigger = page.getByRole('button', { name: 'Open drawer', exact: true });
  await drawerTrigger.click();
  assert.equal(await page.getByRole('dialog').isVisible(), true);
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('dialog').isVisible(), false);
  assert.equal(await drawerTrigger.evaluate((element) => element === document.activeElement), true);
  await page.setViewportSize({ width: 390, height: 844 });
  await trigger.click();
  const panel = await page.locator('#demo-actions-panel').boundingBox();
  assert.ok(panel.x >= 0 && panel.x + panel.width <= 390);
  await page.keyboard.press('Escape');
  await drawerTrigger.click();
  const drawer = await page.getByRole('dialog').boundingBox();
  assert.ok(drawer.x === 0 && drawer.width < 390 && drawer.height <= 844);
  await page.mouse.click(385, 200);
  assert.equal(await page.getByRole('dialog').isVisible(), false);
  const modalTrigger = page.getByRole('button', { name: 'Open required modal' });
  await modalTrigger.click();
  const requiredDialog = page.getByRole('dialog', { name: 'Required example' });
  await page.keyboard.press('Escape');
  assert.equal(await requiredDialog.isVisible(), true);
  await requiredDialog.getByRole('checkbox', { name: 'Allow modal dismissal' }).check();
  await waitForText(page, '[data-demo-modal-policy]', 'Dismissible');
  await page.keyboard.press('Escape');
  await requiredDialog.waitFor({ state: 'hidden' });
  await waitForText(page, '[data-demo-modal-dismissed]', 'Dismissed');
  assert.equal(await modalTrigger.evaluate((element) => element === document.activeElement), true);
  await page.locator('[data-demo-draft]').fill('Changed');
  await waitForText(page, '[data-demo-dirty]', 'Unsaved');
  await page.getByRole('button', { name: 'Draft details Content stays mounted' }).click();
  await page.locator('[data-demo-draft]').waitFor({ state: 'hidden' });
  assert.equal(await page.locator('[data-demo-draft]').isVisible(), false);
  await page.getByRole('button', { name: 'Discard draft', exact: true }).click();
  await waitForText(page, '[data-demo-confirmation]', 'Declined');
  await page.getByRole('checkbox', { name: 'Allow discard' }).check();
  await page.getByRole('button', { name: 'Discard draft', exact: true }).click();
  await waitForText(page, '[data-demo-dirty]', 'Saved');
  assert.deepEqual(errors, []);
});

test('packed calendars keep entry types distinct, preserve date transitions and support keyboard selection under strict CSP', async (t) => {
  const server = await startDemoServer(process.cwd());
  t.after(() => stopDemoServer(server.child));
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage();
  const errors = [];
  t.after(() => {
    if (errors.length) t.diagnostic(JSON.stringify(errors));
  });
  let context = 'initial';
  page.on('pageerror', (error) => errors.push(`${context}: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error' || /NG05/.test(message.text()))
      errors.push(`${context}: ${message.text()}`);
  });
  await page.addInitScript(() => {
    window.__calendarCspViolations = [];
    document.addEventListener('securitypolicyviolation', (event) =>
      window.__calendarCspViolations.push(event.violatedDirective),
    );
  });
  for (const width of [390, 900, 1440]) {
    context = `width ${width}`;
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`${server.url}/preview/calendar`, { waitUntil: 'networkidle' });
    for (const theme of ['light', 'dark']) {
      context = `width ${width}, theme ${theme}`;
      await page.locator(`[data-demo-theme="${theme}"]`).click();
      const full = page.locator('ds-calendar');
      const birthday = full.getByRole('button', { name: /Birthday.*Michael Orlov/ });
      const memorable = full.getByRole('button', {
        name: /Memorable date.*Project launch anniversary/,
      });
      const event = full.getByRole('button', { name: /Event.*Interface review/ });
      await birthday.waitFor();
      const backgrounds = [];
      for (const entry of [event, birthday, memorable]) {
        backgrounds.push(await entry.evaluate((e) => getComputedStyle(e).backgroundColor));
      }
      assert.equal(
        new Set(backgrounds).size,
        3,
        `${width} ${theme}: entry types must have distinct surfaces`,
      );
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        true,
      );
      const titles = await full.locator('.ds-calendar-entry-title').evaluateAll((es) =>
        es.map((e) => ({
          nowrap: getComputedStyle(e).whiteSpace,
          clipped: getComputedStyle(e).textOverflow,
        })),
      );
      assert.ok(titles.length > 0);
      assert.ok(titles.every((e) => e.nowrap === 'nowrap' && e.clipped === 'ellipsis'));
      await birthday.press('Enter');
      const details = page.getByRole('dialog', { name: 'Calendar details', exact: true });
      await details.waitFor();
      await details.getByRole('heading', { name: 'Michael Orlov' }).waitFor();
      assert.equal(await details.getByRole('heading', { name: 'Michael Orlov' }).count(), 1);
      await page.getByRole('button', { name: 'Close calendar details' }).press('Escape');
      await details.waitFor({ state: 'hidden' });
      assert.equal(await birthday.evaluate((e) => e === document.activeElement), true);
      if (width >= 768) {
        const more = full.getByRole('button', { name: '+3 more', exact: true });
        await more.press('Enter');
        await details.waitFor();
        await details.getByRole('button', { name: /Team meeting/ }).waitFor();
        assert.equal(await details.getByRole('button').count(), 7); // Six entries and dialog close.
        await details.getByRole('button', { name: /Team meeting/ }).press('Enter');
        await details.getByRole('heading', { name: 'Team meeting', exact: true }).waitFor();
        assert.equal(
          await details.evaluate((dialog) => dialog.contains(document.activeElement)),
          true,
          `${width} ${theme}: entry selection must keep focus in the dialog (${await page.evaluate(() => document.activeElement?.tagName)})`,
        );
        await page.getByRole('button', { name: 'Close calendar details' }).press('Escape');
        await details.waitFor({ state: 'hidden' });
        assert.equal(await more.evaluate((e) => e === document.activeElement), true);
        const rows = await full
          .locator('.ds-calendar-month-entry')
          .evaluateAll((es) => es.map((e) => e.getBoundingClientRect().height));
        assert.ok(rows.every((height) => height <= 26));
      }
      await full.getByRole('button', { name: 'Next period' }).press('Enter');
      await page.getByRole('heading', { name: 'November 2026', exact: true }).waitFor();
      await full.getByRole('button', { name: 'Today', exact: true }).press('Enter');
      await page.getByRole('heading', { name: 'October 2026', exact: true }).waitFor();
    }
  }
  const full = page.locator('ds-calendar');
  const mini = page.locator('ds-mini-calendar');
  await mini.getByRole('button', { name: 'Next month', exact: true }).click();
  assert.equal(await full.getByRole('heading', { name: 'October 2026', exact: true }).count(), 1);
  await mini.getByRole('button', { name: 'November 5, 2026', exact: true }).press('Enter');
  await full.getByRole('heading', { name: 'November 2026', exact: true }).waitFor();
  await full.getByRole('button', { name: 'Today', exact: true }).click();
  const today = mini.getByRole('button', { name: 'October 9, 2026', exact: true });
  await today.press('ArrowRight');
  await mini.getByRole('button', { name: 'October 10, 2026', exact: true }).press('Enter');
  await page.waitForFunction(
    () =>
      document
        .querySelector('ds-mini-calendar [aria-selected="true"] [data-date]')
        ?.getAttribute('data-date') === '2026-10-10',
  );
  assert.equal(
    await mini.locator('[aria-selected="true"] [data-date]').getAttribute('data-date'),
    '2026-10-10',
  );
  const view = full.getByRole('combobox', { name: 'Calendar view' });
  for (const mode of ['week', 'day', 'agenda', 'year', 'month']) {
    context = `view ${mode}`;
    await view.click();
    await page.locator(`[role="option"][data-value="${mode}"]`).click();
    await page.waitForFunction(
      (expected) =>
        document.querySelector('#preview-calendar-view')?.textContent.includes(expected),
      { week: 'Week', day: 'Day', agenda: 'Agenda', year: 'Year', month: 'Month' }[mode],
    );
    if (mode === 'year') {
      await full.getByRole('button', { name: '+6', exact: true }).click();
      const details = page.getByRole('dialog', { name: 'Calendar details', exact: true });
      await details.getByRole('button', { name: /Michael Orlov/ }).waitFor();
      await page.getByRole('button', { name: 'Close calendar details' }).press('Escape');
      await details.waitFor({ state: 'hidden' });
    } else {
      await full.getByRole('button', { name: /Birthday.*Michael Orlov/ }).waitFor();
    }
  }
  context = 'all-day range boundaries';
  // Last included and first excluded dates of an all-day range.
  for (const [date, hasTrip] of [
    ['2026-10-16', true],
    ['2026-10-17', false],
  ]) {
    await full
      .locator(`[data-date="${date}"][role="gridcell"]`)
      .click({ position: { x: 10, y: 10 } });
    const details = page.getByRole('dialog', { name: 'Calendar details', exact: true });
    await details.waitFor();
    await details
      .getByRole('heading', {
        name: date === '2026-10-16' ? 'October 16, 2026' : 'October 17, 2026',
      })
      .waitFor();
    assert.equal(await details.getByRole('button', { name: /Trip/ }).count(), hasTrip ? 1 : 0);
    await page.getByRole('button', { name: 'Close calendar details' }).press('Escape');
    await details.waitFor({ state: 'hidden' });
  }
  context = 'Russian presentation';
  await page.getByRole('button', { name: 'Русский', exact: true }).click();
  await full.getByRole('button', { name: /День рождения.*Михаил Орлов/ }).waitFor();
  assert.equal(await page.getByRole('heading', { name: 'Календарь', level: 1 }).count(), 1);
  await full.getByRole('button', { name: 'Следующий период' }).click();
  await full.getByRole('heading', { name: /ноябрь 2026/i }).waitFor();
  await full.getByRole('button', { name: 'Сегодня', exact: true }).click();
  await full.getByRole('heading', { name: /октябрь 2026/i }).waitFor();
  assert.deepEqual(await page.evaluate(() => window.__calendarCspViolations), []);
  assert.deepEqual(errors, []);
});

test('a calendar runtime download failure shows feedback and can be retried', async (t) => {
  const server = await startDemoServer(process.cwd());
  t.after(() => stopDemoServer(server.child));
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage();
  const stats = JSON.parse(await readFile('dist/design-system-demo/browser-stats.json', 'utf8'));
  const chunk = Object.entries(stats.outputs).find(([, output]) =>
    output.entryPoint?.replaceAll('\\', '/').endsWith('/fullcalendar/index.js'),
  )?.[0];
  assert.ok(chunk, 'The calendar engine must have a dynamic runtime chunk.');
  const pattern = `**/${chunk}`;
  await page.route(pattern, (route) => route.abort());
  await page.goto(`${server.url}/preview/calendar`, { waitUntil: 'networkidle' });
  await page.getByRole('alert').getByText('Could not load the calendar.').waitFor();
  await page.unroute(pattern);
  await page.getByRole('button', { name: 'Retry calendar', exact: true }).click();
  await page.locator('.ds-calendar-entry-title').first().waitFor();
  assert.equal(await page.getByRole('alert').count(), 0);
});
