import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, test } from 'node:test';

import { findImportViolations, findPackageExportViolations } from './api-surface.mjs';

const temporaryDirectories = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

async function createFixture(files) {
  const repositoryRoot = await mkdtemp(join(tmpdir(), 'api-surface-test-'));
  temporaryDirectories.push(repositoryRoot);

  await Promise.all(
    Object.entries(files).map(async ([relativePath, contents]) => {
      const absolutePath = join(repositoryRoot, relativePath);
      await mkdir(dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, contents);
    }),
  );

  return repositoryRoot;
}

const fixtureConfiguration = {
  entryPoints: [
    { name: 'ui', sourceRoot: 'library/ui' },
    { name: 'markdown', sourceRoot: 'library/markdown' },
  ],
  packageName: '@scope/package',
  publicSpecifiers: new Set([
    '@scope/package',
    '@scope/package/markdown',
    '@scope/package/styles/ui',
  ]),
};

test('allows documented package entry points and relative imports within one entry point', async () => {
  const repositoryRoot = await createFixture({
    'library/markdown/public.ts': 'export const markdown = true;\n',
    'library/ui/index.ts': [
      "import { local } from './local';",
      "import { markdown } from '@scope/package/markdown';",
      "import '@scope/package/styles/ui';",
      'export { local, markdown };',
      '',
    ].join('\n'),
    'library/ui/local.ts': 'export const local = true;\n',
  });

  const violations = await findImportViolations({
    ...fixtureConfiguration,
    repositoryRoot,
  });

  assert.deepEqual(violations, []);
});

test('rejects package imports below documented entry points', async () => {
  const repositoryRoot = await createFixture({
    'application/main.ts': [
      "import type { Hidden } from '@scope/package/markdown/internal';",
      "export { privateValue } from '@scope/package/src/private';",
      '',
    ].join('\n'),
  });

  const violations = await findImportViolations({
    ...fixtureConfiguration,
    repositoryRoot,
  });

  assert.deepEqual(
    violations.map(({ code, specifier }) => ({ code, specifier })),
    [
      {
        code: 'internal-package-path',
        specifier: '@scope/package/markdown/internal',
      },
      {
        code: 'internal-package-path',
        specifier: '@scope/package/src/private',
      },
    ],
  );
});

test('rejects relative imports and re-exports that cross entry-point roots', async () => {
  const repositoryRoot = await createFixture({
    'library/markdown/private.ts': 'export const hidden = true;\n',
    'library/ui/index.ts': "export { hidden } from '../markdown/private';\n",
  });

  const violations = await findImportViolations({
    ...fixtureConfiguration,
    repositoryRoot,
  });

  assert.deepEqual(
    violations.map(({ code, importer, specifier }) => ({ code, importer, specifier })),
    [
      {
        code: 'cross-entry-point-relative-import',
        importer: 'library/ui/index.ts',
        specifier: '../markdown/private',
      },
    ],
  );
});

test('rejects relative imports from workspace code into library internals', async () => {
  const repositoryRoot = await createFixture({
    'application/main.ts': "import { hidden } from '../library/ui/private';\n",
    'library/ui/private.ts': 'export const hidden = true;\n',
  });

  const violations = await findImportViolations({
    ...fixtureConfiguration,
    repositoryRoot,
  });

  assert.deepEqual(
    violations.map(({ code, importer, specifier }) => ({ code, importer, specifier })),
    [
      {
        code: 'external-relative-import',
        importer: 'application/main.ts',
        specifier: '../library/ui/private',
      },
    ],
  );
});

test('checks dynamic imports, require calls, and import-equals declarations', async () => {
  const repositoryRoot = await createFixture({
    'application/main.ts': [
      "const dynamicModule = import('@scope/package/markdown/private');",
      "const requiredModule = require('@scope/package/testing/private');",
      "import assignedModule = require('@scope/package/ui/private');",
      'export { assignedModule, dynamicModule, requiredModule };',
      '',
    ].join('\n'),
  });

  const violations = await findImportViolations({
    ...fixtureConfiguration,
    repositoryRoot,
  });

  assert.deepEqual(
    violations.map(({ specifier }) => specifier),
    [
      '@scope/package/markdown/private',
      '@scope/package/testing/private',
      '@scope/package/ui/private',
    ],
  );
});

test('accepts an exact package export map', () => {
  const expectedExports = {
    '.': {
      default: './fesm2022/package.mjs',
      types: './types/package.d.ts',
    },
    './styles/ui': {
      sass: './styles/ui.scss',
    },
  };

  assert.deepEqual(
    findPackageExportViolations({
      actualExports: structuredClone(expectedExports),
      expectedExports,
    }),
    [],
  );
});

test('rejects unexpected package exports and changed export targets', () => {
  const violations = findPackageExportViolations({
    actualExports: {
      '.': {
        default: './fesm2022/wrong.mjs',
        types: './types/package.d.ts',
      },
      './internal': {
        default: './internal.mjs',
      },
    },
    expectedExports: {
      '.': {
        default: './fesm2022/package.mjs',
        types: './types/package.d.ts',
      },
    },
  });

  assert.deepEqual(violations, [
    {
      actual: './fesm2022/wrong.mjs',
      code: 'package-export-target-mismatch',
      expected: './fesm2022/package.mjs',
      exportKey: '.',
      condition: 'default',
    },
    {
      code: 'unexpected-package-export',
      exportKey: './internal',
    },
  ]);
});
