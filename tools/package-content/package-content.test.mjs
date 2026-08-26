import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  aggregateDependencyContracts,
  findPackageContentViolations,
  parseNpmPackResult,
} from './package-content.mjs';
import {
  dependencyContracts,
  expectedDependencies as repositoryDependencies,
  expectedPeerDependencies as repositoryPeerDependencies,
} from './config.mjs';

const expectedExports = {
  '.': {
    types: './types/package.d.ts',
    default: './fesm2022/package.mjs',
  },
  './markdown': {
    types: './types/package-markdown.d.ts',
    default: './fesm2022/package-markdown.mjs',
  },
  './styles/ui': {
    sass: './styles/ui.scss',
  },
  './package.json': {
    default: './package.json',
  },
};

const expectedPeerDependencies = {
  '@angular/core': '>=22.1.0 <23.0.0',
  bootstrap: '>=5.3.8 <6.0.0',
};

const expectedDependencies = {
  marked: '^18.0.9',
  tslib: '^2.3.0',
};

function createValidFixture() {
  return {
    builtPackageJson: {
      name: '@scope/package',
      version: '0.1.0',
      license: 'MIT',
      publishConfig: {
        access: 'public',
        registry: 'https://registry.npmjs.org',
      },
      exports: structuredClone(expectedExports),
      peerDependencies: structuredClone(expectedPeerDependencies),
      dependencies: structuredClone(expectedDependencies),
      sideEffects: false,
    },
    sourcePackageJson: {
      name: '@scope/package',
      version: '0.1.0',
    },
    packResult: {
      name: '@scope/package',
      version: '0.1.0',
      bundled: [],
      files: [
        { path: 'LICENSE' },
        { path: 'README.md' },
        { path: 'package.json' },
        { path: 'fesm2022/package.mjs' },
        { path: 'fesm2022/package.mjs.map' },
        { path: 'fesm2022/package-markdown.mjs' },
        { path: 'fesm2022/package-markdown.mjs.map' },
        { path: 'types/package.d.ts' },
        { path: 'types/package-markdown.d.ts' },
        { path: 'styles/ui.scss' },
      ],
    },
  };
}

test('aggregates per-entry-point dependency contracts without widening ranges', () => {
  const aggregate = aggregateDependencyContracts({
    ui: {
      peerDependencies: {
        '@angular/core': '>=22.1.0 <23.0.0',
        bootstrap: '>=5.3.8 <6.0.0',
      },
    },
    markdown: {
      peerDependencies: {
        '@angular/core': '>=22.1.0 <23.0.0',
      },
      dependencies: {
        marked: '^18.0.9',
      },
    },
    infrastructure: {
      dependencies: {
        tslib: '^2.3.0',
      },
    },
  });

  assert.deepEqual(aggregate, {
    peerDependencies: expectedPeerDependencies,
    dependencies: expectedDependencies,
  });
});

test('derives the repository manifest contract from entry-point ownership', () => {
  assert.deepEqual(Object.keys(dependencyContracts), [
    'ui',
    'markdown',
    'markdownEditor',
    'testing',
    'bootstrapStyles',
    'cdkStyles',
    'infrastructure',
  ]);
  assert.deepEqual(repositoryPeerDependencies, {
    '@angular/cdk': '>=22.1.0 <23.0.0',
    '@angular/common': '>=22.1.0 <23.0.0',
    '@angular/core': '>=22.1.0 <23.0.0',
    '@angular/forms': '>=22.1.0 <23.0.0',
    bootstrap: '>=5.3.8 <6.0.0',
    rxjs: '>=7.8.2 <8.0.0',
  });
  assert.deepEqual(repositoryDependencies, {
    '@codemirror/autocomplete': '^6.20.3',
    '@codemirror/commands': '^6.10.4',
    '@codemirror/lang-markdown': '^6.5.2',
    '@codemirror/language': '^6.12.4',
    '@codemirror/search': '^6.7.1',
    '@codemirror/state': '^6.7.1',
    '@codemirror/view': '^6.43.8',
    '@lezer/common': '^1.5.2',
    '@lezer/highlight': '^1.2.3',
    dompurify: '^3.4.13',
    marked: '^18.0.9',
    prismjs: '^1.30.0',
    tslib: '^2.3.0',
  });
});

test('rejects conflicting ranges across entry-point dependency contracts', () => {
  assert.throws(
    () =>
      aggregateDependencyContracts({
        ui: {
          peerDependencies: {
            '@angular/core': '>=22.1.0 <23.0.0',
          },
        },
        editor: {
          peerDependencies: {
            '@angular/core': '>=22.2.0 <23.0.0',
          },
        },
      }),
    /Conflicting peerDependencies contract for @angular\/core/,
  );
});

test('accepts a package whose manifest and archive match the contracts', () => {
  const violations = findPackageContentViolations({
    ...createValidFixture(),
    expectedDependencies,
    expectedExports,
    expectedPeerDependencies,
  });

  assert.deepEqual(violations, []);
});

test('rejects dependency drift and bundled dependencies', () => {
  const fixture = createValidFixture();
  fixture.builtPackageJson.peerDependencies['@angular/core'] = '^22.1.0';
  fixture.builtPackageJson.dependencies.marked = '^19.0.0';
  fixture.packResult.bundled = ['marked'];

  const violations = findPackageContentViolations({
    ...fixture,
    expectedDependencies,
    expectedExports,
    expectedPeerDependencies,
  });

  assert.deepEqual(
    violations.map(({ code }) => code),
    ['manifest-field-mismatch', 'manifest-field-mismatch', 'bundled-dependencies'],
  );
});

test('rejects optional dependency and optional peer policy drift', () => {
  const fixture = createValidFixture();
  fixture.builtPackageJson.optionalDependencies = {
    marked: '^18.0.9',
  };
  fixture.builtPackageJson.peerDependenciesMeta = {
    '@angular/core': {
      optional: true,
    },
  };

  const violations = findPackageContentViolations({
    ...fixture,
    expectedDependencies,
    expectedExports,
    expectedPeerDependencies,
  });

  assert.deepEqual(
    violations.map(({ code, field }) => ({ code, field })),
    [
      {
        code: 'manifest-field-mismatch',
        field: 'optionalDependencies',
      },
      {
        code: 'manifest-field-mismatch',
        field: 'peerDependenciesMeta',
      },
    ],
  );
});

test('rejects missing export targets and files outside the structural allowlist', () => {
  const fixture = createValidFixture();
  fixture.packResult.files = fixture.packResult.files.filter(
    ({ path }) => path !== 'types/package-markdown.d.ts',
  );
  fixture.packResult.files.push(
    { path: '.api-extractor-temp/package.api.md' },
    { path: 'markdown/package.json' },
    { path: 'src/private.ts' },
  );

  const violations = findPackageContentViolations({
    ...fixture,
    expectedDependencies,
    expectedExports,
    expectedPeerDependencies,
  });

  assert.deepEqual(
    violations.map(({ code, path }) => ({ code, path })),
    [
      {
        code: 'missing-package-file',
        path: 'types/package-markdown.d.ts',
      },
      {
        code: 'unexpected-package-file',
        path: '.api-extractor-temp/package.api.md',
      },
      {
        code: 'unexpected-package-file',
        path: 'markdown/package.json',
      },
      {
        code: 'unexpected-package-file',
        path: 'src/private.ts',
      },
    ],
  );
});

test('rejects package identity, publication metadata, and export-map drift', () => {
  const fixture = createValidFixture();
  fixture.builtPackageJson.version = '0.2.0';
  fixture.builtPackageJson.publishConfig.access = 'restricted';
  fixture.builtPackageJson.sideEffects = true;
  fixture.builtPackageJson.exports['./internal'] = {
    default: './internal.mjs',
  };
  fixture.packResult.name = '@scope/other-package';

  const violations = findPackageContentViolations({
    ...fixture,
    expectedDependencies,
    expectedExports,
    expectedPeerDependencies,
  });

  assert.deepEqual(
    violations.map(({ code }) => code),
    [
      'package-identity-mismatch',
      'package-identity-mismatch',
      'manifest-field-mismatch',
      'manifest-field-mismatch',
      'manifest-field-mismatch',
    ],
  );
});

test('parses exactly one npm pack result', () => {
  assert.deepEqual(parseNpmPackResult('[{"name":"@scope/package"}]'), {
    name: '@scope/package',
  });
});

test('rejects malformed and unexpected npm pack result shapes', () => {
  assert.throws(() => parseNpmPackResult('not-json'), /valid JSON/);
  assert.throws(() => parseNpmPackResult('null'), /JSON array/);
  assert.throws(() => parseNpmPackResult('{}'), /JSON array/);
  assert.throws(() => parseNpmPackResult('[]'), /one package, received 0/);
  assert.throws(() => parseNpmPackResult('[{}, {}]'), /one package, received 2/);
  assert.throws(() => parseNpmPackResult('[null]'), /package object/);
  assert.throws(() => parseNpmPackResult('[[]]'), /package object/);
});
