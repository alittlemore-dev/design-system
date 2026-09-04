# Release workflows

Status: accepted on 2026-09-04.

## Current state

The local packed-archive workflow described below is available now. The stable-release workflow
becomes active only after the repository's push-to-`main` publication task is complete. Until then,
`0.1.0` remains unreleased, changes accumulate under `Unreleased` in the repository changelog, and
contributors must not publish or create release tags manually.

## Local packed-archive workflow

The supported local integration path always exercises the production package archive rather than
library sources, `npm link`, or a source symlink.

Run the package contract checks and inspect the archive shape without retaining an archive:

```sh
make verify-package
```

Run the interactive packed-package demo:

```sh
make demo
```

Run the production demo build, public testing-entry-point check, SSR smoke, and strict-CSP checks:

```sh
make check-demo
```

Install Chromium once, then include the real-browser smoke when the changed behavior needs browser
coverage:

```sh
make install-demo-browser
make check-demo-browser
```

Each `make demo`, `make check-demo`, and `make check-demo-browser` run builds the production library,
creates a `.tgz` in a temporary directory, runs `npm ci` in `demo/`, and installs the archive with
`--no-save --package-lock=false`. The runner then starts the demo or executes its checks. On exit or
interruption it restores `demo/node_modules` from the committed lock file, verifies that
`demo/package.json` and `demo/package-lock.json` did not change, and removes the temporary archive.

If cleanup is interrupted, restore the demo installation with:

```sh
npm --prefix demo ci
git diff --exit-code -- demo/package.json demo/package-lock.json
```

Generated `.tgz` files are disposable and ignored by Git. Rebuilding a local archive with the
current package version is allowed because a local archive is not a registry release.

## Version authority

`projects/design-system/package.json` is the only source of the published package version. Change
only its `version` field when preparing a release. The private workspace version in the root
`package.json` stays `0.0.0`, and neither `package-lock.json` nor `demo/package-lock.json` changes for
a package-only version bump.

All TypeScript entry points, SCSS subpaths, web assets, and testing utilities are released
atomically under that one version. CI reads the name and version from the built distributable
manifest; CI never chooses or modifies a version.

Only stable `X.Y.Z` versions are published. Development builds and prerelease identifiers such as
`-alpha`, `-beta`, and `-rc` are not supported.

## Semantic-versioning policy

Choose the highest-impact classification among all changes in a release.

| Change                                                                | Before `1.0.0` | From `1.0.0` |
| --------------------------------------------------------------------- | -------------- | ------------ |
| Incompatible public API, behavior, style, asset, or compatibility     | Minor          | Major        |
| Backward-compatible public feature or newly supported compatibility   | Patch          | Minor        |
| Backward-compatible fix, documentation, maintenance, or internal work | Patch          | Patch        |

Dependency changes follow their observable package contract:

- narrowing a peer range or raising its minimum supported version is incompatible;
- widening a peer range without dropping existing support is a backward-compatible feature;
- a runtime or development dependency update with no public contract change is a patch;
- if a dependency update changes public behavior or compatibility, use that higher-impact
  classification instead.

Every push to `main`, including a documentation-only or maintenance-only push, requires at least a
patch increment after publication is enabled. `1.0.0` is not an automatic consequence of a minor
increment: it requires an explicit decision that the package's public contract is stable.

## Changelog workflow

`CHANGELOG.md` is a manually curated repository document following the Keep a Changelog structure.
It is not generated from commit subjects, included in the npm archive, or copied verbatim from a
git log.

During development, add concise consumer- or maintainer-relevant entries under `Unreleased` using
the applicable `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, or `Security` heading. Describe
the effect of the change rather than its implementation. Every release, including a
documentation-only or internal-maintenance release, must have at least one meaningful entry.

When preparing a release:

1. choose the next version from the semantic-versioning policy;
2. change the version in `projects/design-system/package.json`;
3. move all current entries from `Unreleased` into `## [X.Y.Z] - YYYY-MM-DD` using the intended
   release date;
4. recreate an empty `Unreleased` section with all six supported category headings;
5. verify that the changelog version exactly matches the package manifest.

If another release reaches `main` first, rebase on the new `main`, move the branch's entries back
under `Unreleased`, choose the next unused version, and prepare the changelog section again.

## Stable-release workflow

Once push-to-`main` publication is enabled, prepare every change that will reach `main` as follows:

1. rebase on the current `main` and resolve any version or changelog conflict;
2. update intentional API reports with `make update-api-surface` when the public TypeScript surface
   changes;
3. choose and record the next package version and finalize its changelog section;
4. run `make check`;
5. run `make check-demo` for public API, behavior, style, or web-asset changes, and run
   `make check-demo-browser` when the changed behavior has real-browser interactions;
6. confirm that only `projects/design-system/package.json` changed for the version bump and that
   the root and demo lock files are unchanged;
7. merge the release-ready change to `main`.

The push to `main`, not a version tag, starts the release. CI must:

1. install dependencies reproducibly and run the required repository and package checks;
2. reject a non-stable version, an npm name-and-version pair that already exists, or an existing
   `vX.Y.Z` tag;
3. publish the already verified archive to the public npm registry;
4. create and push an immutable annotated `vX.Y.Z` tag on the exact `main` commit, with the message
   `@alittlemoron/design-system vX.Y.Z`.

CI is the only supported publication and release-tag principal. Contributors do not run
`npm publish`, create release tags, or use a tag to trigger publication. The repository does not
create GitHub Releases; the versioned changelog section is the release note.

## Failure recovery

If CI fails before npm confirms publication, fix the failure and retry with the same version only
after confirming that the name-and-version pair is still absent from npm.

If npm publication succeeds but tag creation fails, the npm version is already immutable and must
not be reused or republished. Run the CI-owned tag-only recovery path against the original release
commit. That path must confirm that the npm version exists, the commit's manifest and changelog both
name the same version, and the tag is absent before creating it. Never delete, move, or overwrite a
release tag.
