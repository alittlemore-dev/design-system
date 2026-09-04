import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const [ciWorkflow, releaseWorkflow, dependabotConfig] = await Promise.all([
  readFile(join(repositoryRoot, '.github/workflows/ci.yml'), 'utf8'),
  readFile(join(repositoryRoot, '.github/workflows/release.yml'), 'utf8'),
  readFile(join(repositoryRoot, '.github/dependabot.yml'), 'utf8').catch(() => ''),
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

test('CI is read-only and runs one Make gate per pushed or pull-request commit', () => {
  assert.match(ciWorkflow, /^ {2}push:$/m);
  assert.match(ciWorkflow, /^ {2}pull_request:\n {4}branches:\n {6}- main$/m);
  assert.match(ciWorkflow, /^ {2}workflow_dispatch:$/m);
  assert.match(
    ciWorkflow,
    /^concurrency:\n {2}group: design-system-ci-\$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}\n {2}cancel-in-progress: true$/m,
  );
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
  assert.match(gate, /release_required: \$\{\{ steps\.version.outputs\.release_required \}\}/);
  assert.match(gate, /check-release\.mjs classify-push "\$PREVIOUS_COMMIT"/);
  assert.match(gate, /run: make install/);
  assert.match(gate, /run: make pack/);
  assert.match(
    gate,
    /- name: Validate unique release\n {8}if: steps\.version\.outputs\.release_required == 'true'/,
  );
  assert.match(
    gate,
    /- name: Preserve verified archive\n {8}if: steps\.version\.outputs\.release_required == 'true'/,
  );

  const publish = jobBlock(releaseWorkflow, 'publish');
  assert.match(
    publish,
    /if: github\.event_name == 'push' && needs\.gate\.outputs\.release_required == 'true'/,
  );
  assert.match(publish, /permissions:\n {6}actions: read\n {6}contents: read\n {6}id-token: write/);
  assert.doesNotMatch(publish, /actions\/checkout|contents: write/);
  assert.doesNotMatch(publish, /NODE_AUTH_TOKEN|NPM_TOKEN/);
  assert.match(publish, /npm publish "\$ARCHIVE_PATH"/);
  assert.match(publish, /sha256sum --check --strict/);
  assert.match(publish, /for attempt in \{1\.\.12\}/);
  assert.match(publish, /sleep 10/);
  assert.match(publish, /npm-confirm-error\.log/);

  const tag = jobBlock(releaseWorkflow, 'tag');
  assert.match(
    tag,
    /if: github\.event_name == 'push' && needs\.gate\.outputs\.release_required == 'true'/,
  );
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

test('Dependabot checks npm and GitHub Actions dependencies weekly', () => {
  assert.match(dependabotConfig, /^version: 2$/m);

  const npmUpdate = dependabotUpdateBlock(dependabotConfig, 'npm');
  assert.match(
    npmUpdate,
    /^ {4}directories:\n {6}- ['"]?\/['"]?\n {6}- ['"]?\/projects\/design-system['"]?\n {6}- ['"]?\/demo['"]?$/m,
  );

  const actionsUpdate = dependabotUpdateBlock(dependabotConfig, 'github-actions');
  assert.match(actionsUpdate, /^ {4}directory: ['"]?\/['"]?$/m);

  for (const update of [npmUpdate, actionsUpdate]) {
    assert.match(update, /^ {4}schedule:\n {6}interval: ['"]?weekly['"]?$/m);
  }
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

function dependabotUpdateBlock(config, ecosystem) {
  const lines = config.split('\n');
  const ecosystemDeclaration = new RegExp(`^ {2}- package-ecosystem: ['"]?${ecosystem}['"]?$`);
  const start = lines.findIndex((line) => ecosystemDeclaration.test(line));
  assert.notEqual(start, -1, `missing ${ecosystem} Dependabot update`);

  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^ {2}- package-ecosystem:/.test(lines[index])) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end).join('\n');
}
