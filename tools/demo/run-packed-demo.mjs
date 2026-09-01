import { spawn } from 'node:child_process';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, '../..');
const demoRoot = join(repositoryRoot, 'demo');
const packageRoot = join(repositoryRoot, 'dist/alittlemoron/design-system');
const manifestPaths = [join(demoRoot, 'package.json'), join(demoRoot, 'package-lock.json')];
const packedPackagePath = join(demoRoot, 'node_modules/@alittlemoron/design-system');
const productionStatsPath = join(demoRoot, 'dist/design-system-demo/stats.json');
const primaryEntryPointBundle =
  '/@alittlemoron/design-system/fesm2022/alittlemoron-design-system.mjs';
const testingEntryPointBundle =
  '/@alittlemoron/design-system/fesm2022/alittlemoron-design-system-testing.mjs';

const demoScripts = new Map([
  ['start', 'start'],
  ['check', 'check'],
  ['check-browser', 'check:browser'],
]);

export class DemoInterruptionError extends Error {
  constructor(signal) {
    super(`Packed demo workflow interrupted by ${signal}.`);
    this.name = 'DemoInterruptionError';
    this.signal = signal;
  }
}

export class InterruptionController {
  activeChild = null;
  cleanupInProgress = false;
  signal = null;

  setActiveChild(child) {
    this.activeChild = child;
  }

  clearActiveChild(child) {
    if (this.activeChild === child) this.activeChild = null;
  }

  handle(signal) {
    if (this.signal === null) this.signal = signal;
    if (!this.cleanupInProgress) this.activeChild?.kill(signal);
  }

  assertWorkflowMayContinue() {
    if (this.signal !== null && !this.cleanupInProgress) {
      throw new DemoInterruptionError(this.signal);
    }
  }

  beginCleanup() {
    this.cleanupInProgress = true;
  }

  get exitCode() {
    if (this.signal === 'SIGINT') return 130;
    if (this.signal === 'SIGTERM') return 143;
    return null;
  }
}

const interruption = new InterruptionController();

export function parsePackResult(output, archiveDirectory) {
  let result;
  try {
    result = JSON.parse(output);
  } catch (error) {
    throw new Error('npm pack did not return valid JSON.', { cause: error });
  }
  if (!Array.isArray(result) || result.length !== 1) {
    throw new Error('npm pack must describe exactly one archive.');
  }
  const filename = result[0]?.filename;
  if (typeof filename !== 'string' || filename === '' || basename(filename) !== filename) {
    throw new Error('npm pack returned an invalid archive filename.');
  }
  return resolve(archiveDirectory, filename);
}

export async function snapshotFiles(paths) {
  return new Map(
    await Promise.all(paths.map(async (path) => [path, await readFile(path, 'utf8')])),
  );
}

export async function assertFilesUnchanged(snapshot) {
  for (const [path, expected] of snapshot) {
    const actual = await readFile(path, 'utf8');
    if (actual !== expected) throw new Error(`${path} changed during the packed demo run.`);
  }
}

export async function assertProductionBundlesExcludeTestingEntryPoint(statsPath) {
  const stats = JSON.parse(await readFile(statsPath, 'utf8'));
  const inputs =
    stats.inputs !== null && typeof stats.inputs === 'object' && !Array.isArray(stats.inputs)
      ? Object.keys(stats.inputs).map((inputPath) => inputPath.replaceAll('\\', '/'))
      : [];
  if (!inputs.some((inputPath) => inputPath.endsWith(primaryEntryPointBundle))) {
    throw new Error('The production module graph does not contain the packed primary entry point.');
  }
  const testingInput = inputs.find((inputPath) => inputPath.endsWith(testingEntryPointBundle));
  if (testingInput !== undefined) {
    throw new Error(
      `The production bundle includes the public testing entry point: ${testingInput}`,
    );
  }
}

function formatCommand(command, args) {
  return [command, ...args].join(' ');
}

async function runCommand(command, args, { cwd, captureOutput = false }) {
  interruption.assertWorkflowMayContinue();
  const output = [];
  const child = spawn(command, args, {
    cwd,
    env: process.env,
    stdio: captureOutput ? ['ignore', 'pipe', 'inherit'] : 'inherit',
  });
  interruption.setActiveChild(child);
  if (captureOutput) child.stdout.on('data', (chunk) => output.push(chunk.toString()));
  try {
    return await new Promise((resolvePromise, rejectPromise) => {
      child.once('error', rejectPromise);
      child.once('close', (code, signal) => {
        if (code === 0) {
          resolvePromise(output.join(''));
          return;
        }
        const reason = signal === null ? `exit code ${code}` : `signal ${signal}`;
        rejectPromise(new Error(`${formatCommand(command, args)} failed with ${reason}.`));
      });
    });
  } finally {
    interruption.clearActiveChild(child);
  }
}

async function assertPackedPackageRemoved() {
  try {
    await access(packedPackagePath);
  } catch (error) {
    if (error?.code === 'ENOENT') return;
    throw error;
  }
  throw new Error('The packed design-system remained in demo/node_modules after restoration.');
}

async function installBrowser() {
  await runCommand('npm', ['ci'], { cwd: demoRoot });
  await runCommand('npm', ['exec', '--', 'playwright', 'install', 'chromium'], { cwd: demoRoot });
}

async function runPackedDemo(scriptName) {
  const manifestSnapshot = await snapshotFiles(manifestPaths);
  const archiveDirectory = await mkdtemp(join(tmpdir(), 'design-system-demo-'));
  let installationStarted = false;
  let workflowError = null;
  const cleanupErrors = [];
  try {
    await runCommand('npm', ['run', 'build'], { cwd: repositoryRoot });
    const packOutput = await runCommand(
      'npm',
      ['pack', packageRoot, '--pack-destination', archiveDirectory, '--json'],
      { cwd: repositoryRoot, captureOutput: true },
    );
    const archivePath = parsePackResult(packOutput, archiveDirectory);
    installationStarted = true;
    await runCommand('npm', ['ci'], { cwd: demoRoot });
    await runCommand('npm', ['install', '--no-save', '--package-lock=false', archivePath], {
      cwd: demoRoot,
    });
    await runCommand('npm', ['run', scriptName], { cwd: demoRoot });
    if (scriptName !== 'start') {
      await assertProductionBundlesExcludeTestingEntryPoint(productionStatsPath);
    }
  } catch (error) {
    workflowError = error;
  } finally {
    interruption.beginCleanup();
    if (installationStarted) {
      try {
        await runCommand('npm', ['ci'], { cwd: demoRoot });
        await assertPackedPackageRemoved();
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
    try {
      await assertFilesUnchanged(manifestSnapshot);
    } catch (error) {
      cleanupErrors.push(error);
    }
    try {
      await rm(archiveDirectory, { recursive: true, force: true });
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  if (cleanupErrors.length > 0) {
    throw new AggregateError(
      workflowError === null ? cleanupErrors : [workflowError, ...cleanupErrors],
      'Packed demo workflow cleanup failed.',
    );
  }
  if (interruption.signal !== null) throw new DemoInterruptionError(interruption.signal);
  if (workflowError !== null) throw workflowError;
}

async function main() {
  const action = process.argv[2];
  if (action === 'install-browser') {
    await installBrowser();
    return;
  }
  const scriptName = demoScripts.get(action);
  if (scriptName === undefined) {
    throw new Error(
      'Usage: node tools/demo/run-packed-demo.mjs <start|check|install-browser|check-browser>',
    );
  }
  process.once('SIGINT', () => interruption.handle('SIGINT'));
  process.once('SIGTERM', () => interruption.handle('SIGTERM'));
  await runPackedDemo(scriptName);
}

const invokedPath = process.argv[1] === undefined ? null : resolve(process.argv[1]);
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    if (error instanceof DemoInterruptionError) {
      process.exitCode = interruption.exitCode;
      return;
    }
    console.error(error);
    process.exitCode = interruption.exitCode ?? 1;
  });
}
