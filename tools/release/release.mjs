import { isDeepStrictEqual } from 'node:util';
import { basename, resolve } from 'node:path';

export const EXPECTED_PACKAGE_NAME = '@alittlemoron/design-system';
export const EXPECTED_REPOSITORY = 'https://github.com/alittlemore-dev/design-system.git';
export const EXPECTED_REGISTRY = 'https://registry.npmjs.org';

const stableVersionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const fullCommitPattern = /^[0-9a-f]{40}$/;

export function findReleaseViolations({
  mode,
  sourcePackageJson,
  builtPackageJson,
  packResult,
  changelog,
  registryState,
  tagExists,
}) {
  if (mode !== 'publish' && mode !== 'confirm-published' && mode !== 'recover-tag') {
    throw new Error(`Unsupported release validation mode: ${mode}.`);
  }

  const violations = [];
  const version = sourcePackageJson.version;
  const expectedRepository = {
    type: 'git',
    url: EXPECTED_REPOSITORY,
  };

  compare(
    violations,
    'package-identity-mismatch',
    'source package name',
    sourcePackageJson.name,
    EXPECTED_PACKAGE_NAME,
  );

  if (typeof version !== 'string' || !stableVersionPattern.test(version)) {
    violations.push({
      code: 'invalid-version',
      message: `Package version must be a stable X.Y.Z version; received ${JSON.stringify(version)}.`,
    });
  }

  if (!isDeepStrictEqual(sourcePackageJson.repository, expectedRepository)) {
    violations.push({
      code: 'repository-mismatch',
      message:
        `Source package repository must be ${JSON.stringify(expectedRepository)}; ` +
        `received ${JSON.stringify(sourcePackageJson.repository)}.`,
    });
  }

  if (mode === 'publish' || mode === 'confirm-published') {
    if (builtPackageJson === undefined) {
      violations.push({
        code: 'missing-built-manifest',
        message: 'The distributable package manifest is missing.',
      });
    } else {
      compare(
        violations,
        'package-identity-mismatch',
        'built package name',
        builtPackageJson.name,
        EXPECTED_PACKAGE_NAME,
      );
      compare(
        violations,
        'package-identity-mismatch',
        'built package version',
        builtPackageJson.version,
        version,
      );
      if (!isDeepStrictEqual(builtPackageJson.repository, expectedRepository)) {
        violations.push({
          code: 'repository-mismatch',
          message:
            `Built package repository must be ${JSON.stringify(expectedRepository)}; ` +
            `received ${JSON.stringify(builtPackageJson.repository)}.`,
        });
      }
    }

    if (packResult === undefined) {
      violations.push({
        code: 'missing-package-archive',
        message: 'The distributable package archive metadata is missing.',
      });
    } else {
      compare(
        violations,
        'package-identity-mismatch',
        'packed package name',
        packResult.name,
        EXPECTED_PACKAGE_NAME,
      );
      compare(
        violations,
        'package-identity-mismatch',
        'packed package version',
        packResult.version,
        version,
      );
    }
  }

  if (typeof version === 'string' && !hasChangelogRelease(changelog, version)) {
    violations.push({
      code: 'missing-changelog-release',
      message: `CHANGELOG.md must contain an exact release heading for ${version}.`,
    });
  }

  if (mode === 'publish' && registryState === 'present') {
    violations.push({
      code: 'version-already-published',
      message: `${EXPECTED_PACKAGE_NAME}@${version} is already published and cannot be reused.`,
    });
  }
  if ((mode === 'confirm-published' || mode === 'recover-tag') && registryState === 'absent') {
    violations.push({
      code: 'version-not-published',
      message: `${EXPECTED_PACKAGE_NAME}@${version} is not published; tag recovery is forbidden.`,
    });
  }
  if (registryState !== 'present' && registryState !== 'absent') {
    violations.push({
      code: 'unknown-registry-state',
      message: `Unexpected npm registry state: ${JSON.stringify(registryState)}.`,
    });
  }

  if (tagExists) {
    violations.push({
      code: 'tag-already-exists',
      message: `Release tag v${version} already exists and must not be moved or replaced.`,
    });
  }

  return violations;
}

export function classifyRegistryLookup({ code, stdout, stderr, expectedVersion }) {
  if (code === 0) {
    let registryVersion;
    try {
      registryVersion = JSON.parse(stdout);
    } catch (error) {
      throw new Error('npm registry lookup returned invalid JSON.', { cause: error });
    }
    if (registryVersion !== expectedVersion) {
      throw new Error(
        `npm registry returned ${String(registryVersion)} instead of ${expectedVersion}.`,
      );
    }
    return 'present';
  }

  if (/\bE404\b/.test(`${stdout}\n${stderr}`)) return 'absent';

  const detail = `${stderr || stdout}`.trim() || 'no diagnostic output';
  throw new Error(`npm registry lookup failed with exit code ${code}: ${detail}`);
}

export function validateRecoveryCommit({ input, resolvedCommit, isAncestorOfMain }) {
  validateRecoveryCommitInput(input);
  if (resolvedCommit === null) {
    throw new Error(`Recovery commit ${input} does not resolve to a commit.`);
  }
  if (resolvedCommit !== input) {
    throw new Error(`Recovery commit ${input} resolved to a different commit: ${resolvedCommit}.`);
  }
  if (!isAncestorOfMain) {
    throw new Error(`Recovery commit ${input} is not in the origin/main history.`);
  }
  return input;
}

export function validateRecoveryCommitInput(input) {
  if (!fullCommitPattern.test(input)) {
    throw new Error('Recovery commit must be a full 40-character lowercase commit SHA.');
  }
  return input;
}

export function releaseMetadata(sourcePackageJson, archivePath = undefined) {
  const version = sourcePackageJson.version;
  return {
    packageName: sourcePackageJson.name,
    packageVersion: version,
    tag: `v${version}`,
    tagMessage: `${sourcePackageJson.name} v${version}`,
    ...(archivePath === undefined
      ? {}
      : {
          archivePath,
          archiveFilename: basename(archivePath),
        }),
  };
}

export function formatGithubOutput(metadata) {
  return [
    `package_name=${metadata.packageName}`,
    `package_version=${metadata.packageVersion}`,
    `tag=${metadata.tag}`,
    `tag_message=${metadata.tagMessage}`,
    ...(metadata.archivePath === undefined ? [] : [`archive_path=${metadata.archivePath}`]),
    ...(metadata.archiveFilename === undefined
      ? []
      : [`archive_filename=${metadata.archiveFilename}`]),
  ].join('\n');
}

export function resolveArchivePath(packResult, releaseDirectory) {
  const filename = packResult.filename;
  if (
    typeof filename !== 'string' ||
    filename === '' ||
    basename(filename) !== filename ||
    !filename.endsWith('.tgz')
  ) {
    throw new Error('npm pack must return a valid tarball filename.');
  }
  return resolve(releaseDirectory, filename);
}

export function packCommandArguments(packageDirectory, releaseDirectory, cacheDirectory) {
  return [
    'pack',
    packageDirectory,
    '--pack-destination',
    releaseDirectory,
    '--json',
    '--cache',
    cacheDirectory,
  ];
}

export function registryLookupArguments(packageName, version, cacheDirectory) {
  return [
    'view',
    `${packageName}@${version}`,
    'version',
    '--json',
    `--registry=${EXPECTED_REGISTRY}`,
    '--prefer-online',
    '--cache',
    cacheDirectory,
  ];
}

function compare(violations, code, field, actual, expected) {
  if (actual === expected) return;
  violations.push({
    code,
    message: `${field} must be ${JSON.stringify(expected)}; received ${JSON.stringify(actual)}.`,
  });
}

function hasChangelogRelease(changelog, version) {
  const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^## \\[${escapedVersion}\\] - \\d{4}-\\d{2}-\\d{2}$`, 'm').test(changelog);
}
