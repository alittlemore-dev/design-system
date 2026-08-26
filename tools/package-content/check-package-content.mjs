#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

import { expectedPackageExports } from '../api-surface/config.mjs';
import { expectedDependencies, expectedPeerDependencies } from './config.mjs';
import { findPackageContentViolations, parseNpmPackResult } from './package-content.mjs';

const executeFile = promisify(execFile);
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const sourcePackageJsonPath = join(repositoryRoot, 'projects/design-system/package.json');
const packageFolder = join(repositoryRoot, 'dist/alittlemoron/design-system');
const builtPackageJsonPath = join(packageFolder, 'package.json');

async function main() {
  const [sourcePackageJson, builtPackageJson, packResult] = await Promise.all([
    readJson(sourcePackageJsonPath),
    readJson(builtPackageJsonPath),
    inspectPackedPackage(packageFolder),
  ]);

  const violations = findPackageContentViolations({
    builtPackageJson,
    sourcePackageJson,
    packResult,
    expectedDependencies,
    expectedExports: expectedPackageExports,
    expectedPeerDependencies,
  });

  if (violations.length > 0) {
    throw new Error(formatViolations(violations));
  }

  console.log(
    `Package content verification completed successfully ` + `(${packResult.files.length} files).`,
  );
}

async function inspectPackedPackage(folder) {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'design-system-package-content-'));

  try {
    const npmExecutable = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const { stdout } = await executeFile(
      npmExecutable,
      ['pack', '--dry-run', '--json', '--cache', join(temporaryDirectory, 'npm-cache'), folder],
      {
        cwd: repositoryRoot,
        maxBuffer: 10 * 1024 * 1024,
      },
    );
    return parseNpmPackResult(stdout);
  } finally {
    await rm(temporaryDirectory, { force: true, recursive: true });
  }
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function formatViolations(violations) {
  return [
    'Package content violations:',
    ...violations.map((violation) => `- ${JSON.stringify(violation)}`),
  ].join('\n');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
