import { isDeepStrictEqual } from 'node:util';

const PUBLICATION_METADATA = {
  license: 'MIT',
  publishConfig: {
    access: 'public',
    registry: 'https://registry.npmjs.org',
  },
  sideEffects: false,
};

export function aggregateDependencyContracts(contracts) {
  const aggregate = {
    peerDependencies: {},
    dependencies: {},
  };

  for (const contract of Object.values(contracts)) {
    mergeDependencySection(
      aggregate.peerDependencies,
      contract.peerDependencies ?? {},
      'peerDependencies',
    );
    mergeDependencySection(aggregate.dependencies, contract.dependencies ?? {}, 'dependencies');
  }

  for (const packageName of Object.keys(aggregate.peerDependencies)) {
    if (Object.hasOwn(aggregate.dependencies, packageName)) {
      throw new Error(`${packageName} cannot be both a peerDependency and a dependency.`);
    }
  }

  return {
    peerDependencies: sortObject(aggregate.peerDependencies),
    dependencies: sortObject(aggregate.dependencies),
  };
}

export function findPackageContentViolations({
  builtPackageJson,
  sourcePackageJson,
  packResult,
  expectedDependencies,
  expectedExports,
  expectedPeerDependencies,
}) {
  const violations = [];

  compareIdentity(violations, 'built manifest name', builtPackageJson.name, sourcePackageJson.name);
  compareIdentity(
    violations,
    'built manifest version',
    builtPackageJson.version,
    sourcePackageJson.version,
  );
  compareIdentity(violations, 'packed package name', packResult.name, sourcePackageJson.name);
  compareIdentity(
    violations,
    'packed package version',
    packResult.version,
    sourcePackageJson.version,
  );

  compareManifestField(
    violations,
    'license',
    builtPackageJson.license,
    PUBLICATION_METADATA.license,
  );
  compareManifestField(
    violations,
    'publishConfig',
    builtPackageJson.publishConfig,
    PUBLICATION_METADATA.publishConfig,
  );
  compareManifestField(
    violations,
    'sideEffects',
    builtPackageJson.sideEffects,
    PUBLICATION_METADATA.sideEffects,
  );
  compareManifestField(violations, 'exports', builtPackageJson.exports, expectedExports);
  compareManifestField(
    violations,
    'peerDependencies',
    builtPackageJson.peerDependencies ?? {},
    expectedPeerDependencies,
  );
  compareManifestField(
    violations,
    'dependencies',
    builtPackageJson.dependencies ?? {},
    expectedDependencies,
  );
  compareManifestField(
    violations,
    'optionalDependencies',
    builtPackageJson.optionalDependencies ?? {},
    {},
  );
  compareManifestField(
    violations,
    'peerDependenciesMeta',
    builtPackageJson.peerDependenciesMeta ?? {},
    {},
  );

  if ((packResult.bundled ?? []).length > 0) {
    violations.push({
      code: 'bundled-dependencies',
      dependencies: [...packResult.bundled],
    });
  }

  const requiredFiles = collectRequiredPackageFiles(expectedExports);
  const allowedFiles = new Set(requiredFiles);

  for (const target of collectExportTargets(expectedExports)) {
    if (target.endsWith('.mjs')) {
      allowedFiles.add(`${target}.map`);
    }
  }

  const packedFiles = new Set(
    (packResult.files ?? []).map(({ path }) => normalizePackagePath(path)),
  );

  for (const path of [...requiredFiles].sort()) {
    if (!packedFiles.has(path)) {
      violations.push({ code: 'missing-package-file', path });
    }
  }

  for (const { path: rawPath } of packResult.files ?? []) {
    const path = normalizePackagePath(rawPath);
    if (!allowedFiles.has(path)) {
      violations.push({ code: 'unexpected-package-file', path });
    }
  }

  return violations;
}

export function parseNpmPackResult(output) {
  let results;

  try {
    results = JSON.parse(output);
  } catch (error) {
    throw new Error('npm pack did not return valid JSON.', { cause: error });
  }

  if (!Array.isArray(results)) {
    throw new Error('Expected npm pack to return a JSON array.');
  }
  if (results.length !== 1) {
    throw new Error(`Expected npm pack to describe one package, received ${results.length}.`);
  }

  const [result] = results;
  if (result === null || typeof result !== 'object' || Array.isArray(result)) {
    throw new Error('Expected npm pack result to contain one package object.');
  }

  return result;
}

function mergeDependencySection(target, source, section) {
  for (const [packageName, range] of Object.entries(source)) {
    const existingRange = target[packageName];
    if (existingRange !== undefined && existingRange !== range) {
      throw new Error(
        `Conflicting ${section} contract for ${packageName}: ` +
          `${existingRange} versus ${range}.`,
      );
    }
    target[packageName] = range;
  }
}

function compareIdentity(violations, field, actual, expected) {
  if (actual !== expected) {
    violations.push({
      code: 'package-identity-mismatch',
      field,
      actual,
      expected,
    });
  }
}

function compareManifestField(violations, field, actual, expected) {
  if (!isDeepStrictEqual(actual, expected)) {
    violations.push({
      code: 'manifest-field-mismatch',
      field,
      actual,
      expected,
    });
  }
}

function collectRequiredPackageFiles(expectedExports) {
  return new Set([
    'LICENSE',
    'README.md',
    'package.json',
    ...collectExportTargets(expectedExports),
  ]);
}

function collectExportTargets(expectedExports) {
  return Object.values(expectedExports)
    .flatMap((conditions) => Object.values(conditions))
    .map(normalizePackagePath);
}

function normalizePackagePath(path) {
  return path.startsWith('./') ? path.slice(2) : path;
}

function sortObject(value) {
  return Object.fromEntries(
    Object.entries(value).sort(([left], [right]) => left.localeCompare(right)),
  );
}
