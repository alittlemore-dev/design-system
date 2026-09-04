import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { parseNpmPackResult } from '../package-content/package-content.mjs';
import { packCommandArguments, resolveArchivePath } from './release.mjs';

const executeFile = promisify(execFile);
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const packageDirectory = join(repositoryRoot, 'dist/alittlemoron/design-system');
const releaseDirectory = join(repositoryRoot, 'dist/releases');
const packResultPath = join(releaseDirectory, 'pack-result.json');

async function main() {
  await rm(releaseDirectory, { force: true, recursive: true });
  await mkdir(releaseDirectory, { recursive: true });
  const cacheDirectory = await mkdtemp(join(tmpdir(), 'design-system-release-npm-'));

  const npmExecutable = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  let stdout;
  try {
    ({ stdout } = await executeFile(
      npmExecutable,
      packCommandArguments(packageDirectory, releaseDirectory, cacheDirectory),
      {
        cwd: repositoryRoot,
        maxBuffer: 10 * 1024 * 1024,
      },
    ));
  } finally {
    await rm(cacheDirectory, { force: true, recursive: true });
  }
  const packResult = parseNpmPackResult(stdout);
  const archivePath = resolveArchivePath(packResult, releaseDirectory);

  await writeFile(packResultPath, `${JSON.stringify(packResult, null, 2)}\n`);
  console.log(`Created distributable package archive: ${archivePath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
