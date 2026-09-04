import { execFile } from 'node:child_process';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import {
  classifyRegistryLookup,
  findReleaseViolations,
  formatGithubOutput,
  releaseMetadata,
  registryLookupArguments,
  resolveArchivePath,
  validateRecoveryCommit,
  validateRecoveryCommitInput,
} from './release.mjs';

const executeFile = promisify(execFile);
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const sourcePackageJsonPath = join(repositoryRoot, 'projects/design-system/package.json');
const builtPackageJsonPath = join(repositoryRoot, 'dist/alittlemoron/design-system/package.json');
const releaseDirectory = join(repositoryRoot, 'dist/releases');
const packResultPath = join(releaseDirectory, 'pack-result.json');
const changelogPath = join(repositoryRoot, 'CHANGELOG.md');

async function main() {
  const [command, argument] = process.argv.slice(2);

  if (command === 'validate-recovery-commit') {
    await validateRecoveryCommitFromGit(argument);
    return;
  }
  if (!['prepublish', 'confirm-published', 'recover-tag'].includes(command)) {
    throw new Error(
      'Usage: node tools/release/check-release.mjs ' +
        '<prepublish|confirm-published|recover-tag|validate-recovery-commit SHA>',
    );
  }

  const sourcePackageJson = await readJson(sourcePackageJsonPath);
  const changelog = await readFile(changelogPath, 'utf8');
  const includeArchive = command !== 'recover-tag';
  let builtPackageJson;
  let packResult;
  let archivePath;

  if (includeArchive) {
    [builtPackageJson, packResult] = await Promise.all([
      readJson(builtPackageJsonPath),
      readJson(packResultPath),
    ]);
    archivePath = resolveArchivePath(packResult, releaseDirectory);
    await access(archivePath);
  }

  const metadata = releaseMetadata(sourcePackageJson, archivePath);
  const [registryState, existingTag] = await Promise.all([
    lookupRegistryVersion(metadata.packageName, metadata.packageVersion),
    findExistingTag(metadata.tag),
  ]);
  const mode = command === 'prepublish' ? 'publish' : command;
  const violations = findReleaseViolations({
    mode,
    sourcePackageJson,
    builtPackageJson,
    packResult,
    changelog,
    registryState,
    tagExists: existingTag !== null,
  });

  if (violations.length > 0) throw new Error(formatViolations(violations));
  console.log(formatGithubOutput(metadata));
}

async function validateRecoveryCommitFromGit(input) {
  validateRecoveryCommitInput(input);
  const resolved = await runCommand('git', ['rev-parse', '--verify', `${input}^{commit}`]);
  if (resolved.code !== 0) {
    validateRecoveryCommit({ input, resolvedCommit: null, isAncestorOfMain: false });
  }
  const ancestor = await runCommand('git', [
    'merge-base',
    '--is-ancestor',
    input,
    'refs/remotes/origin/main',
  ]);

  if (ancestor.code !== 0 && ancestor.code !== 1) {
    throw new Error(
      `git could not verify the origin/main ancestry for ${input}: ${ancestor.stderr.trim()}`,
    );
  }

  validateRecoveryCommit({
    input,
    resolvedCommit: resolved.code === 0 ? resolved.stdout.trim() : null,
    isAncestorOfMain: ancestor.code === 0,
  });
  console.log(`Validated recovery commit: ${input}`);
}

async function lookupRegistryVersion(packageName, version) {
  const npmExecutable = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const cacheDirectory = await mkdtemp(join(tmpdir(), 'design-system-registry-npm-'));
  try {
    const result = await runCommand(
      npmExecutable,
      registryLookupArguments(packageName, version, cacheDirectory),
    );
    return classifyRegistryLookup({ ...result, expectedVersion: version });
  } finally {
    await rm(cacheDirectory, { force: true, recursive: true });
  }
}

async function findExistingTag(tag) {
  const result = await runCommand('git', ['tag', '--list', tag]);
  if (result.code !== 0) {
    throw new Error(`git tag lookup failed with exit code ${result.code}: ${result.stderr.trim()}`);
  }
  const tags = result.stdout
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);
  return tags.length === 0 ? null : tags[0];
}

async function runCommand(command, args) {
  try {
    const { stdout, stderr } = await executeFile(command, args, {
      cwd: repositoryRoot,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    });
    return { code: 0, stdout, stderr };
  } catch (error) {
    if (typeof error?.code === 'number') {
      return {
        code: error.code,
        stdout: typeof error.stdout === 'string' ? error.stdout : '',
        stderr: typeof error.stderr === 'string' ? error.stderr : '',
      };
    }
    throw error;
  }
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function formatViolations(violations) {
  return ['Release validation failed:', ...violations.map(({ message }) => `- ${message}`)].join(
    '\n',
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
