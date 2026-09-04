import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const [ciWorkflow, releaseWorkflow] = await Promise.all([
  readFile(join(repositoryRoot, '.github/workflows/ci.yml'), 'utf8'),
  readFile(join(repositoryRoot, '.github/workflows/release.yml'), 'utf8'),
]);

test('all external Actions are pinned to immutable commit SHAs', () => {
  for (const workflow of [ciWorkflow, releaseWorkflow]) {
    const uses = [...workflow.matchAll(/^\s*uses:\s*(\S+)(?:\s+#\s*(\S+))?$/gm)];
    assert.ok(uses.length > 0, 'workflow must use at least one external Action');
    for (const [, action, versionComment] of uses) {
      assert.match(action, /^[^@\s]+@[0-9a-f]{40}$/);
      assert.match(versionComment, /^v\d+\.\d+\.\d+$/);
    }
  }
});

test('CI is read-only and runs the Make gate for pull requests and manual checks', () => {
  assert.match(ciWorkflow, /^ {2}pull_request:\n {4}branches:\n {6}- main$/m);
  assert.match(ciWorkflow, /^ {2}workflow_dispatch:$/m);
  assert.doesNotMatch(ciWorkflow, /^ {2}push:$/m);
  assert.match(ciWorkflow, /^permissions:\n {2}contents: read$/m);
  assert.match(ciWorkflow, /^ {8}run: make install$/m);
  assert.match(ciWorkflow, /^ {8}run: make pack$/m);
  assert.match(ciWorkflow, /node-version: 24\.16\.0/);
});

test('push releases are fully queued and isolate gate, OIDC, and tag permissions', () => {
  assert.match(
    releaseWorkflow,
    /^concurrency:\n {2}group: design-system-release\n {2}cancel-in-progress: false\n {2}queue: max$/m,
  );

  const gate = jobBlock(releaseWorkflow, 'gate');
  assert.match(gate, /permissions:\n {6}contents: read/);
  assert.doesNotMatch(gate, /id-token: write|contents: write/);
  assert.match(gate, /run: make install/);
  assert.match(gate, /run: make pack/);

  const publish = jobBlock(releaseWorkflow, 'publish');
  assert.match(publish, /permissions:\n {6}actions: read\n {6}contents: read\n {6}id-token: write/);
  assert.doesNotMatch(publish, /actions\/checkout|contents: write/);
  assert.match(publish, /npm publish "\$ARCHIVE_PATH"/);
  assert.match(publish, /sha256sum --check --strict/);

  const tag = jobBlock(releaseWorkflow, 'tag');
  assert.match(tag, /permissions:\n {6}contents: write/);
  assert.doesNotMatch(tag, /id-token: write|npm publish|make install|make pack/);
  assert.match(tag, /git tag --annotate/);
  assert.match(tag, /git push origin "refs\/tags\/\$RELEASE_TAG"/);
});

test('manual recovery validates with read access and can only create an absent tag', () => {
  const validation = jobBlock(releaseWorkflow, 'validate-recovery');
  assert.match(validation, /permissions:\n {6}contents: read/);
  assert.doesNotMatch(validation, /id-token: write|contents: write|npm publish/);
  assert.match(validation, /validate-recovery-commit/);
  assert.match(validation, /check-release\.mjs recover-tag/);

  const recovery = jobBlock(releaseWorkflow, 'recover-tag');
  assert.match(recovery, /needs: validate-recovery/);
  assert.match(recovery, /permissions:\n {6}contents: write/);
  assert.doesNotMatch(recovery, /id-token: write|npm publish|node tools\//);
  assert.match(recovery, /git tag --annotate/);
  assert.doesNotMatch(recovery, /--force/);
});

function jobBlock(workflow, jobName) {
  const lines = workflow.split('\n');
  const start = lines.findIndex((line) => line === `  ${jobName}:`);
  assert.notEqual(start, -1, `missing ${jobName} job`);

  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^ {2}[a-z][a-z0-9-]*:$/.test(lines[index])) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end).join('\n');
}
