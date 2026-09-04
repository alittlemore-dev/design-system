import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import * as packedDemo from './run-packed-demo.mjs';

test('parses the single archive emitted by npm pack', () => {
  const archivePath = packedDemo.parsePackResult(
    JSON.stringify([{ filename: 'alittlemore.dev-design-system-0.2.0.tgz' }]),
    '/tmp/packed-demo',
  );

  assert.equal(archivePath, '/tmp/packed-demo/alittlemore.dev-design-system-0.2.0.tgz');
});

test('rejects ambiguous or malformed npm pack output', () => {
  for (const output of ['', '{}', '[]', '[{}, {}]', '[{"filename":""}]']) {
    assert.throws(() => packedDemo.parsePackResult(output, '/tmp/packed-demo'));
  }
});

test('isolates packed-demo npm commands from the user cache', () => {
  const environment = { PATH: '/usr/bin' };

  assert.deepEqual(packedDemo.isolatedNpmEnvironment('/tmp/packed-demo-cache', environment), {
    PATH: '/usr/bin',
    npm_config_cache: '/tmp/packed-demo-cache',
  });
  assert.deepEqual(environment, { PATH: '/usr/bin' });
});

test('detects a changed demo manifest after a packed run', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'packed-demo-manifest-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const manifestPath = join(directory, 'package.json');
  const lockPath = join(directory, 'package-lock.json');
  await writeFile(manifestPath, '{"private":true}\n');
  await writeFile(lockPath, '{"lockfileVersion":3}\n');
  const snapshot = await packedDemo.snapshotFiles([manifestPath, lockPath]);

  await writeFile(manifestPath, '{"private":false}\n');

  await assert.rejects(
    packedDemo.assertFilesUnchanged(snapshot),
    /demo\/package\.json|package\.json/,
  );
  assert.equal(await readFile(lockPath, 'utf8'), '{"lockfileVersion":3}\n');
});

test('accepts a production module graph without the testing entry point', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'packed-demo-stats-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const statsPath = join(directory, 'stats.json');
  await writeFile(
    statsPath,
    JSON.stringify({
      inputs: {
        'node_modules/@alittlemore.dev/design-system/fesm2022/alittlemore.dev-design-system.mjs':
          {},
        'node_modules/@alittlemore.dev/design-system/fesm2022/alittlemore.dev-design-system-markdown.mjs':
          {},
        'node_modules/@alittlemore.dev/design-system/fesm2022/alittlemore.dev-design-system-markdown-editor.mjs':
          {},
      },
    }),
  );

  await assert.doesNotReject(packedDemo.assertProductionBundlesExcludeTestingEntryPoint(statsPath));
});

test('rejects a production module graph without the packed primary entry point', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'packed-demo-stats-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const statsPath = join(directory, 'stats.json');

  for (const stats of [{}, { inputs: {} }, { inputs: { 'src/main.ts': {} } }]) {
    await writeFile(statsPath, JSON.stringify(stats));
    await assert.rejects(
      packedDemo.assertProductionBundlesExcludeTestingEntryPoint(statsPath),
      /production module graph does not contain the packed primary entry point/i,
    );
  }
});

test('rejects a production module graph without either packed Markdown entry point', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'packed-demo-stats-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const statsPath = join(directory, 'stats.json');
  const inputs = {
    'node_modules/@alittlemore.dev/design-system/fesm2022/alittlemore.dev-design-system.mjs': {},
    'node_modules/@alittlemore.dev/design-system/fesm2022/alittlemore.dev-design-system-markdown.mjs':
      {},
    'node_modules/@alittlemore.dev/design-system/fesm2022/alittlemore.dev-design-system-markdown-editor.mjs':
      {},
  };

  for (const [missing, expected] of [
    ['alittlemore.dev-design-system-markdown.mjs', /packed Markdown entry point/i],
    ['alittlemore.dev-design-system-markdown-editor.mjs', /packed Markdown-editor entry point/i],
  ]) {
    const filteredInputs = Object.fromEntries(
      Object.entries(inputs).filter(([path]) => !path.endsWith(missing)),
    );
    await writeFile(statsPath, JSON.stringify({ inputs: filteredInputs }));
    await assert.rejects(
      packedDemo.assertProductionBundlesExcludeTestingEntryPoint(statsPath),
      expected,
    );
  }
});

test('rejects a production module graph containing the testing entry point', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'packed-demo-stats-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const statsPath = join(directory, 'stats.json');
  await writeFile(
    statsPath,
    JSON.stringify({
      inputs: {
        'node_modules/@alittlemore.dev/design-system/fesm2022/alittlemore.dev-design-system.mjs':
          {},
        'node_modules/@alittlemore.dev/design-system/fesm2022/alittlemore.dev-design-system-markdown.mjs':
          {},
        'node_modules/@alittlemore.dev/design-system/fesm2022/alittlemore.dev-design-system-markdown-editor.mjs':
          {},
        'node_modules/@alittlemore.dev/design-system/fesm2022/alittlemore.dev-design-system-testing.mjs':
          {},
      },
    }),
  );

  await assert.rejects(
    packedDemo.assertProductionBundlesExcludeTestingEntryPoint(statsPath),
    /production bundle includes the public testing entry point/i,
  );
});

test('forwards an interruption to the active workflow child and stops later steps', () => {
  const controller = new packedDemo.InterruptionController();
  const killedBy = [];
  controller.setActiveChild({ kill: (signal) => killedBy.push(signal) });

  controller.handle('SIGINT');

  assert.deepEqual(killedBy, ['SIGINT']);
  assert.throws(() => controller.assertWorkflowMayContinue(), packedDemo.DemoInterruptionError);
  assert.equal(controller.exitCode, 130);
});

test('does not forward an interruption to the restoring cleanup child', () => {
  const controller = new packedDemo.InterruptionController();
  const killedBy = [];
  controller.beginCleanup();
  controller.setActiveChild({ kill: (signal) => killedBy.push(signal) });

  controller.handle('SIGTERM');

  assert.deepEqual(killedBy, []);
  assert.doesNotThrow(() => controller.assertWorkflowMayContinue());
  assert.equal(controller.exitCode, 143);
});
