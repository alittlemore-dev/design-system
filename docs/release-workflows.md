# Release workflows

Status: accepted on 2026-09-04.

## Automation

Pull requests to `main` run `.github/workflows/ci.yml`, which executes the Make-based package gate
without write permissions. Every push to `main` runs `.github/workflows/release.yml`, repeats the
same gate, publishes one unique stable npm version, and creates its annotated release tag. The
release workflow also exposes a manual tag-only recovery job; it never exposes a manual publish
path.

Release runs share one non-cancelling FIFO concurrency queue. GitHub retains at most 100 waiting
runs for a `queue: max` group, so maintainers must stop merging or pushing while that queue is full
and investigate the blocked release before accepting another `main` update. This operational limit
preserves the rule that every accepted push is released instead of allowing GitHub to evict an
older pending run.

## Local packed-archive workflow

The supported local integration path always exercises the production package archive rather than
library sources, `npm link`, or a source symlink.

Run the package contract checks and inspect the archive shape without retaining an archive:

```sh
make verify-package
```

Run the complete quality gate and retain the distributable archive under `dist/releases/`:

```sh
make pack
```

`make pack` runs `make check` before packing, uses an isolated temporary npm cache, recreates the
release-artifact directory, and records the single archive's npm metadata next to it. Generated
release artifacts remain ignored by Git.

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
3. record the checked archive's SHA-256 digest and transfer that archive to a separate OIDC-only
   publication job;
4. verify the downloaded archive digest, publish that exact archive to the public npm registry, and
   confirm its version using bounded retries with isolated npm caches;
5. create and push an immutable annotated `vX.Y.Z` tag on the exact `main` commit, with the message
   `@alittlemore.dev/design-system vX.Y.Z`.

The release guard requires the source manifest, built manifest, packed archive metadata, and
versioned changelog heading to agree. It rejects prerelease or build metadata, a repository URL
other than `https://github.com/alittlemore-dev/design-system.git`, any existing npm version, and any
existing release tag. Registry `404` is the only response treated as an absent version; registry,
authentication, and network failures stop the release.

After publication, CI gives the public registry up to 12 isolated lookups, spaced 10 seconds apart,
to expose the immutable version. An unexpected successful version response fails immediately. If
all lookups still report an error, CI stops before tagging and emits the final registry error so the
tag-only recovery path can be used after propagation completes.

CI is the only supported publication and release-tag principal. Contributors do not run
`npm publish`, create release tags, or use a tag to trigger publication. The repository does not
create GitHub Releases; the versioned changelog section is the release note.

The gate job has read-only repository access and does not receive npm OIDC. The publication job
receives npm OIDC but never checks out or executes repository code. The tag job receives repository
write access only after publication succeeds. Third-party Actions are pinned to full commit SHAs;
their adjacent version comments are review hints, not mutable selectors.

## Failure recovery

If CI fails before npm confirms publication, fix the failure and retry with the same version only
after confirming that the name-and-version pair is still absent from npm.

If npm publication succeeds but registry confirmation exhausts its bounded retries or tag creation
fails, the npm version is already immutable and must not be reused or republished. Wait until a
direct registry lookup confirms the version, then run the CI-owned tag-only recovery path against
the original release commit. That path must confirm that the npm version exists, the commit's
manifest and changelog both name the same version, and the tag is absent before creating it. Never
delete, move, or overwrite a release tag.

Start the manual `Release` workflow with the original release's full 40-character lowercase commit
SHA. Recovery accepts only a commit that resolves exactly and belongs to the `origin/main` history.
Its read-only validation job checks out that commit only after validation and confirms the package,
changelog, registry, and tag state. A separate repository-write job receives only the validated
metadata and creates the missing annotated tag without executing code from the release commit.
Neither recovery job receives npm OIDC or contains a publication command.

## Initial publication and trusted publishing

The repository originally bootstrapped `@alittlemoron/design-system@0.1.0`; its immutable
`v0.1.0` tag remains the historical record of that release. Bootstrap the replacement
`@alittlemore.dev/design-system@0.2.0` through the push workflow with a one-day granular npm token
named `design-system-scope-migration-2026-09-04`. Restrict it to read/write access for the
`alittlemore.dev` organization package, enable bypass 2FA, grant no unrelated package or
organization access, and store it only in the repository secret `NPM_TOKEN`.

After npm confirms `0.2.0` and CI creates `v0.2.0`, configure that package's GitHub Actions trusted
publisher for organization `alittlemore-dev`, repository `design-system`, workflow filename
`release.yml`, no GitHub environment, and direct `npm publish`. Then require 2FA while disallowing
traditional tokens, delete the GitHub secret, revoke the scope-migration token, and verify both are
gone. The next ordinary versioned push verifies OIDC end to end; until that release succeeds, the
trusted-publishing TODO remains open.
