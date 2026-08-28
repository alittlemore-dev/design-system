import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';

import * as sass from 'sass';

const repositoryRoot = resolve(import.meta.dirname, '../..');
const sourcePackageRoot = resolve(
  process.env['STYLE_PACKAGE_ROOT'] ?? join(repositoryRoot, 'projects/design-system'),
);
const knownBootstrapDeprecations = new Set([
  'color-functions',
  'global-builtin',
  'if-function',
  'import',
]);

test('publishes separate light and dark custom tokens and Bootstrap mappings', async () => {
  const themeTokens = await compileStyle(sourcePackageRoot, 'theme-tokens');
  const bootstrapOverrides = await compileStyle(sourcePackageRoot, 'bootstrap-overrides');

  for (const theme of ['light', 'dark']) {
    const tokenBlock = extractThemeBlock(themeTokens, theme);
    const bootstrapBlock = extractThemeBlock(bootstrapOverrides, theme);

    assert.match(tokenBlock, /--main-bg-color:\s*rgb\(/);
    assert.match(tokenBlock, /--syntax-keyword-color:\s*rgb\(/);
    assert.doesNotMatch(tokenBlock, /--bs-/);
    assert.match(bootstrapBlock, /--bs-body-bg:\s*var\(--surface-0\)/);
    assert.match(bootstrapBlock, /--bs-primary:\s*var\(--accent-color\)/);

    const tokenProperties = readCustomPropertyNames(tokenBlock);
    const bootstrapProperties = readCustomPropertyNames(bootstrapBlock);
    assert.ok(tokenProperties.length > 0);
    assert.ok(bootstrapProperties.length > 0);
    assert.ok(tokenProperties.every((name) => !name.startsWith('--bs-')));
    assert.ok(bootstrapProperties.every((name) => name.startsWith('--bs-')));
  }
});

test('compiles the documented entry-point composition', async () => {
  const styles = sass.compileString(
    [
      "@use 'theme-tokens';",
      "@use 'bootstrap-overrides';",
      "@use 'cdk-overlay';",
      "@use 'ui';",
      "@use 'markdown';",
    ].join('\n'),
    {
      loadPaths: [join(sourcePackageRoot, 'styles'), join(repositoryRoot, 'node_modules')],
      logger: createSassLogger(),
      verbose: true,
    },
  ).css;

  assert.match(styles, /:root\[data-bs-theme=light\]/);
  assert.match(styles, /\.btn-primary\s*\{/);
  assert.match(styles, /\.cdk-overlay-container/);
  assert.match(styles, /\.gradient-body\s*\{/);
  assert.match(styles, /\.markdown-code\s*\{/);
});

test('emits reusable UI, Markdown, Bootstrap, and CDK styles only from their owners', async () => {
  const bootstrapOverrides = await compileStyle(sourcePackageRoot, 'bootstrap-overrides');
  const cdkOverlay = await compileStyle(sourcePackageRoot, 'cdk-overlay');
  const ui = await compileStyle(sourcePackageRoot, 'ui');
  const markdown = await compileStyle(sourcePackageRoot, 'markdown');

  assert.match(bootstrapOverrides, /\.btn-primary\s*\{/);
  assert.match(bootstrapOverrides, /\.btn-outline-secondary\s*\{/);
  assert.match(bootstrapOverrides, /\.form-control:focus\s*\{/);
  assert.match(cdkOverlay, /\.cdk-overlay-container/);
  assert.match(ui, /body\s*\{[^}]*min-height:\s*100vh/s);
  assert.match(ui, /\.gradient-body\s*\{/);
  assert.doesNotMatch(ui, /\.alerts-section\s*\{/);
  assert.match(markdown, /\.markdown-code\s*\{/);
  assert.match(markdown, /\.markdown-code \.token\.comment/);

  const outputs = {
    bootstrapOverrides,
    cdkOverlay,
    markdown,
    ui,
  };
  for (const [owner, selector] of [
    ['bootstrapOverrides', '.btn-outline-primary'],
    ['cdkOverlay', '.cdk-overlay-container'],
    ['markdown', '.markdown-code'],
    ['ui', '.gradient-body'],
  ]) {
    const selectorPattern = new RegExp(escapeRegularExpression(selector));
    for (const [entryPoint, styles] of Object.entries(outputs)) {
      if (entryPoint === owner) assert.match(styles, selectorPattern);
      else assert.doesNotMatch(styles, selectorPattern);
    }
  }

  const publicStyles = [bootstrapOverrides, cdkOverlay, ui, markdown].join('\n');
  for (const selector of [
    '.accent-border',
    '.link-inactive',
    '.form-bordered',
    '.force-display-block',
    '.articles-title-button',
    '.matrix-question-link',
    '.cookie-consent-banner',
    '.competency-matrix-table-container',
    '.competency-matrix-table',
    '.competency-matrix-header',
    '.competency-matrix-section-cell',
    '.competency-matrix-subsection-cell',
    '.competency-matrix-grade-cell',
    '.question-detail',
    '.articles-markdown',
  ]) {
    assert.doesNotMatch(publicStyles, new RegExp(escapeRegularExpression(selector)));
  }
});

test('keeps the notification area responsive placement and enter and exit transitions', async () => {
  const styles = await readNotificationAreaStyles();

  assert.match(
    styles,
    /\.alerts-section\s*\{[^}]*z-index:\s*1080;[^}]*inline-size:\s*min\(24rem,\s*100vw\s*-\s*2rem\);[^}]*inset-block-start:\s*4rem;/s,
  );
  assert.match(
    styles,
    /\.notification-alert\s*\{[^}]*animation:\s*notification-alert-enter (?:160ms|\.16s) ease-out;[^}]*transition:\s*opacity (?:200ms|\.2s) ease,\s*transform (?:200ms|\.2s) ease;?/s,
  );
  assert.match(
    styles,
    /\.notification-alert-dismissing\s*\{[^}]*opacity:\s*0;[^}]*pointer-events:\s*none;[^}]*transform:\s*translateY\(-0?\.5rem\);?/s,
  );
  assert.match(styles, /@keyframes notification-alert-enter\s*\{/);
});

test('keeps shared interactive colors at WCAG AA contrast in both themes', async () => {
  const themeTokens = await compileStyle(sourcePackageRoot, 'theme-tokens');

  for (const theme of ['light', 'dark']) {
    const themeBlock = extractThemeBlock(themeTokens, theme);
    const surface = readCssVariable(themeBlock, 'main-bg-color');
    const pairs = [
      ['button-primary-color', 'button-primary-bg'],
      ['link-readable-color', 'main-bg-color'],
      ['outline-secondary-color', 'main-bg-color'],
    ];

    for (const [foregroundName, backgroundName] of pairs) {
      const foreground = readCssVariable(themeBlock, foregroundName);
      const background =
        backgroundName === 'main-bg-color' ? surface : readCssVariable(themeBlock, backgroundName);
      assert.ok(
        contrastRatio(foreground, background) >= 4.5,
        `${theme} ${foregroundName} must have at least 4.5:1 contrast against ${backgroundName}.`,
      );
    }
  }
});

async function compileStyle(packageRoot, entryPoint) {
  const path = join(packageRoot, 'styles', `${entryPoint}.scss`);
  const source = await readFile(path, 'utf8');
  return sass.compileString(source, {
    loadPaths: [join(repositoryRoot, 'node_modules')],
    logger: createSassLogger(),
    url: pathToFileURL(path),
    verbose: true,
  }).css;
}

async function readNotificationAreaStyles() {
  if (process.env['STYLE_PACKAGE_ROOT'] !== undefined) {
    return readFile(join(sourcePackageRoot, 'fesm2022/alittlemoron-design-system.mjs'), 'utf8');
  }
  return sass.compile(
    join(sourcePackageRoot, 'src/lib/notifications/notification-area.component.scss'),
    {
      loadPaths: [join(repositoryRoot, 'node_modules')],
      logger: createSassLogger(),
      verbose: true,
    },
  ).css;
}

function createSassLogger() {
  return {
    debug: () => {},
    warn: (message, options) => {
      const deprecationId = options.deprecationType?.id;
      const warningUrl = options.span?.url?.toString() ?? '';
      if (
        knownBootstrapDeprecations.has(deprecationId) &&
        warningUrl.includes('/node_modules/bootstrap/scss/')
      ) {
        return;
      }

      assert.fail(`Unexpected Sass warning (${deprecationId ?? 'general'}): ${message}`);
    },
  };
}

function extractThemeBlock(styles, theme) {
  const selector = `:root[data-bs-theme=${theme}]`;
  const start = styles.indexOf(selector);
  assert.notEqual(start, -1, `Missing ${theme} theme block.`);
  const blockStart = styles.indexOf('{', start);
  const blockEnd = styles.indexOf('}', blockStart);
  assert.notEqual(blockEnd, -1, `Unterminated ${theme} theme block.`);
  return styles.slice(blockStart + 1, blockEnd);
}

function escapeRegularExpression(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function readCustomPropertyNames(styles) {
  return [...styles.matchAll(/^\s*(--[\w-]+):/gm)].map((match) => match[1]);
}

function readCssVariable(themeBlock, name) {
  const match = themeBlock.match(new RegExp(`--${name}:\\s*(rgb\\([^)]+\\));`));
  assert.notEqual(match, null, `Missing --${name}.`);
  return match[1];
}

function contrastRatio(foreground, background) {
  const foregroundLuminance = relativeLuminance(parseRgb(foreground));
  const backgroundLuminance = relativeLuminance(parseRgb(background));
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function parseRgb(value) {
  const match = value.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  assert.notEqual(match, null, `Expected rgb() color, received ${value}.`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function relativeLuminance([red, green, blue]) {
  const [linearRed, linearGreen, linearBlue] = [red, green, blue].map(linearizeColor);
  return 0.2126 * linearRed + 0.7152 * linearGreen + 0.0722 * linearBlue;
}

function linearizeColor(value) {
  const channel = value / 255;
  return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}
