#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const executeFile = promisify(execFile);
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const packageRoot = join(repositoryRoot, 'dist/alittlemore.dev/design-system');

const { stderr, stdout } = await executeFile(
  process.execPath,
  ['--test', 'tools/styles/style-contract.test.mjs', 'tools/styles/theme-preload.test.mjs'],
  {
    cwd: repositoryRoot,
    env: {
      ...process.env,
      STYLE_PACKAGE_ROOT: packageRoot,
    },
    maxBuffer: 10 * 1024 * 1024,
  },
);

process.stdout.write(stdout);
process.stderr.write(stderr);
