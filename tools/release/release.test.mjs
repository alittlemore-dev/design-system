import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  EXPECTED_REPOSITORY,
  classifyRegistryLookup,
  findReleaseViolations,
  formatGithubOutput,
  packCommandArguments,
  releaseMetadata,
  registryLookupArguments,
  resolveArchivePath,
  validateRecoveryCommit,
} from './release.mjs';

const packageName = '@alittlemore.dev/design-system';
const version = '0.2.0';
const repository = {
  type: 'git',
  url: EXPECTED_REPOSITORY,
};

function validReleaseFixture(mode = 'publish') {
  return {
    mode,
    sourcePackageJson: {
      name: packageName,
      version,
      repository,
    },
    builtPackageJson:
      mode === 'publish'
        ? {
            name: packageName,
            version,
            repository,
          }
        : undefined,
    packResult:
      mode === 'publish'
        ? {
            name: packageName,
            version,
            filename: 'alittlemore.dev-design-system-0.2.0.tgz',
          }
        : undefined,
    changelog: `# Changelog\n\n## [${version}] - 2026-09-04\n\n### Added\n\n- Initial release.\n`,
    registryState: mode === 'publish' ? 'absent' : 'present',
    tagExists: false,
  };
}

test('accepts a unique stable package release with matching metadata', () => {
  assert.deepEqual(findReleaseViolations(validReleaseFixture()), []);
});

test('rejects prerelease, malformed, and leading-zero versions', () => {
  for (const invalidVersion of ['0.1.0-rc.1', 'v0.1.0', '01.2.3', '1.2', '1.2.3+build']) {
    const fixture = validReleaseFixture();
    fixture.sourcePackageJson.version = invalidVersion;
    fixture.builtPackageJson.version = invalidVersion;
    fixture.packResult.version = invalidVersion;

    assert.match(
      findReleaseViolations(fixture)
        .map(({ message }) => message)
        .join('\n'),
      /stable X\.Y\.Z/,
    );
  }
});

test('rejects package identity drift across source, build, archive, and repository metadata', () => {
  const fixture = validReleaseFixture();
  fixture.sourcePackageJson.repository = {
    type: 'git',
    url: 'https://github.com/example/design-system.git',
  };
  fixture.builtPackageJson.name = '@example/design-system';
  fixture.packResult.version = '0.3.0';

  assert.deepEqual(
    findReleaseViolations(fixture).map(({ code }) => code),
    ['repository-mismatch', 'package-identity-mismatch', 'package-identity-mismatch'],
  );
});

test('requires an exact versioned changelog heading', () => {
  const fixture = validReleaseFixture();
  fixture.changelog = '# Changelog\n\n## [0.1.0-rc.1] - 2026-09-04\n';

  assert.deepEqual(
    findReleaseViolations(fixture).map(({ code }) => code),
    ['missing-changelog-release'],
  );
});

test('publish requires an absent registry version and absent tag', () => {
  const fixture = validReleaseFixture();
  fixture.registryState = 'present';
  fixture.tagExists = true;

  assert.deepEqual(
    findReleaseViolations(fixture).map(({ code }) => code),
    ['version-already-published', 'tag-already-exists'],
  );
});

test('tag recovery requires a published version and absent tag', () => {
  const fixture = validReleaseFixture('recover-tag');
  fixture.registryState = 'absent';
  fixture.tagExists = true;

  assert.deepEqual(
    findReleaseViolations(fixture).map(({ code }) => code),
    ['version-not-published', 'tag-already-exists'],
  );
});

test('post-publish confirmation requires matching build and a published version', () => {
  const fixture = validReleaseFixture();
  fixture.mode = 'confirm-published';
  fixture.registryState = 'present';

  assert.deepEqual(findReleaseViolations(fixture), []);

  fixture.registryState = 'absent';
  assert.deepEqual(
    findReleaseViolations(fixture).map(({ code }) => code),
    ['version-not-published'],
  );
});

test('classifies a matching npm view result as present', () => {
  assert.equal(
    classifyRegistryLookup({
      code: 0,
      stdout: '"0.1.0"\n',
      stderr: '',
      expectedVersion: '0.1.0',
    }),
    'present',
  );
});

test('derives immutable tag and GitHub outputs from package metadata', () => {
  assert.deepEqual(
    releaseMetadata(
      { name: packageName, version },
      '/workspace/dist/releases/alittlemore.dev-design-system-0.2.0.tgz',
    ),
    {
      packageName,
      packageVersion: version,
      tag: 'v0.2.0',
      tagMessage: '@alittlemore.dev/design-system v0.2.0',
      archivePath: '/workspace/dist/releases/alittlemore.dev-design-system-0.2.0.tgz',
      archiveFilename: 'alittlemore.dev-design-system-0.2.0.tgz',
    },
  );

  assert.equal(
    formatGithubOutput({
      packageName,
      packageVersion: version,
      tag: 'v0.2.0',
      tagMessage: '@alittlemore.dev/design-system v0.2.0',
      archivePath: '/workspace/dist/releases/alittlemore.dev-design-system-0.2.0.tgz',
      archiveFilename: 'alittlemore.dev-design-system-0.2.0.tgz',
    }),
    [
      'package_name=@alittlemore.dev/design-system',
      'package_version=0.2.0',
      'tag=v0.2.0',
      'tag_message=@alittlemore.dev/design-system v0.2.0',
      'archive_path=/workspace/dist/releases/alittlemore.dev-design-system-0.2.0.tgz',
      'archive_filename=alittlemore.dev-design-system-0.2.0.tgz',
    ].join('\n'),
  );
});

test('resolves only a basename tarball inside the release directory', () => {
  assert.equal(
    resolveArchivePath(
      { filename: 'alittlemore.dev-design-system-0.2.0.tgz' },
      '/workspace/dist/releases',
    ),
    '/workspace/dist/releases/alittlemore.dev-design-system-0.2.0.tgz',
  );

  for (const filename of ['', '../package.tgz', 'nested/package.tgz', 'package.zip']) {
    assert.throws(
      () => resolveArchivePath({ filename }, '/workspace/dist/releases'),
      /valid tarball filename/,
    );
  }
});

test('packs with an explicit private npm cache instead of the user cache', () => {
  assert.deepEqual(packCommandArguments('/package', '/release', '/temporary/npm-cache'), [
    'pack',
    '/package',
    '--pack-destination',
    '/release',
    '--json',
    '--cache',
    '/temporary/npm-cache',
  ]);
});

test('checks the exact public registry version through a fresh online cache', () => {
  assert.deepEqual(registryLookupArguments(packageName, version, '/temporary/npm-cache'), [
    'view',
    '@alittlemore.dev/design-system@0.2.0',
    'version',
    '--json',
    '--registry=https://registry.npmjs.org',
    '--prefer-online',
    '--cache',
    '/temporary/npm-cache',
  ]);
});

test('classifies only an npm E404 lookup as absent', () => {
  assert.equal(
    classifyRegistryLookup({
      code: 1,
      stdout: '',
      stderr: 'npm error code E404\nnpm error 404 Not Found',
      expectedVersion: '0.1.0',
    }),
    'absent',
  );

  assert.throws(
    () =>
      classifyRegistryLookup({
        code: 1,
        stdout: '',
        stderr: 'npm error code ENETUNREACH',
        expectedVersion: '0.1.0',
      }),
    /registry lookup failed.*ENETUNREACH/i,
  );
});

test('rejects registry output for a different version', () => {
  assert.throws(
    () =>
      classifyRegistryLookup({
        code: 0,
        stdout: '"0.2.0"\n',
        stderr: '',
        expectedVersion: '0.1.0',
      }),
    /returned 0\.2\.0 instead of 0\.1\.0/,
  );
});

test('accepts only an exact full commit SHA resolved on main', () => {
  const commit = '0123456789abcdef0123456789abcdef01234567';

  assert.equal(
    validateRecoveryCommit({ input: commit, resolvedCommit: commit, isAncestorOfMain: true }),
    commit,
  );
});

test('rejects malformed, unresolved, substituted, and non-main recovery commits', () => {
  const commit = '0123456789abcdef0123456789abcdef01234567';

  assert.throws(
    () => validateRecoveryCommit({ input: 'main', resolvedCommit: commit, isAncestorOfMain: true }),
    /full 40-character lowercase commit SHA/,
  );
  assert.throws(
    () => validateRecoveryCommit({ input: commit, resolvedCommit: null, isAncestorOfMain: false }),
    /does not resolve to a commit/,
  );
  assert.throws(
    () =>
      validateRecoveryCommit({
        input: commit,
        resolvedCommit: 'fedcba9876543210fedcba9876543210fedcba98',
        isAncestorOfMain: true,
      }),
    /resolved to a different commit/,
  );
  assert.throws(
    () =>
      validateRecoveryCommit({ input: commit, resolvedCommit: commit, isAncestorOfMain: false }),
    /not in the origin\/main history/,
  );
});
