# Package distribution

Status: accepted on 2026-08-25.

## Decision

The design system is distributed as the public npm package
`@alittlemoron/design-system`. It is owned by the personal npm account `alittlemoron` and published
to the public npm registry only by CI.

The package starts at version `0.1.0` under the MIT license. Once publication is enabled, every push
to `main`, including documentation-only changes, is a release event and must carry a version that
has not previously been published.

Local archive integration is exercised by a repository-owned demo application.

## Package identity and public subpaths

There is one installable and atomically versioned package. Its public TypeScript entry points are:

- `@alittlemoron/design-system` for application-independent UI;
- `@alittlemoron/design-system/markdown` for Markdown rendering;
- `@alittlemoron/design-system/markdown-editor` for the interactive Markdown editor;
- `@alittlemoron/design-system/testing` for public test utilities.

Its public SCSS subpaths are:

- `@alittlemoron/design-system/styles/theme-tokens`;
- `@alittlemoron/design-system/styles/bootstrap-overrides`;
- `@alittlemoron/design-system/styles/cdk-overlay`;
- `@alittlemoron/design-system/styles/ui`;
- `@alittlemoron/design-system/styles/markdown`.

Editor-specific styles remain scoped to or packaged with the Markdown editor. They do not receive a
global style subpath without a concrete package requirement.

## Registry, visibility, and license

The canonical registry is the public npm registry at `https://registry.npmjs.org`. The scoped
package is public and declares public access in its publish configuration.

The package and its distributed source are licensed under MIT. The license file must be included in
the published archive even while the source repository remains private.

The package name was unregistered when checked on 2026-08-25. Availability is not reserved by this
document; only the first successful publication reserves the name.

## Ownership and publishing authority

The npm user `alittlemoron` is the sole package owner and maintainer. Publishing authority belongs
only to the repository's CI workflow:

- local and manually authenticated `npm publish` commands are not a supported release path;
- CI publishes only after the required repository checks and package verification pass;
- npm registry metadata is authoritative for package ownership;
- adding another maintainer or transferring the package requires an explicit ownership decision.

The first publication is a bootstrap exception in authentication, not in publishing authority. CI
uses a temporary granular npm token with read/write access, bypass-2FA enabled, a short expiration,
and the narrowest scope npm permits. After publishing `0.1.0`, the owner configures this repository's
GitHub Actions workflow as the npm trusted publisher, switches publication to OIDC, and immediately
revokes the temporary token.

A private GitHub source repository can use npm trusted publishing, but npm provenance is unavailable
while the repository is private. Making the repository public later may enable provenance; it is not
a prerequisite for publication.

## Main-branch release rule

Once the publication workflow is enabled, every push to `main` is a package release event. CI must:

1. install dependencies reproducibly;
2. run tests, static checks, the production build, API-surface checks, and package-content
   verification;
3. read the package name and version from the distributable manifest;
4. fail with a clear version-conflict error if that name and version already exist in npm;
5. publish the verified archive with public visibility when the version is new.

CI must not silently skip publication when the version already exists. npm packages are immutable,
so an existing name-and-version pair is never overwritten or reused. A documentation-only push to
`main` also requires at least a patch version increase after this workflow is enabled.

## Local-development workflow

### Repository demo

The repository-owned Angular demo verifies the production archive and must:

- have its own manifest, lock file, and installation directory;
- import only documented package entry points and style subpaths;
- never import library source files or internal package paths;
- exercise the primary UI, Markdown rendering, Markdown editor, and public styles with neutral data;
- import the public testing entry point only from tests;
- cover browser execution, SSR, and strict CSP;
- remain excluded from the published package archive.

The demo is not an additional distributable package and is not part of the public API.

### Package-faithful iteration

The supported local loop is:

1. build the design system using its production package configuration;
2. create the same `.tgz` archive shape that CI will publish;
3. install that archive temporarily into the demo without changing the demo manifest or lock file;
4. run the relevant automated and visual checks;
5. restore the demo installation from its committed lock file.

Generated archives are disposable build artifacts and must not be committed. The workflow does not
use `npm link`, source-directory symlinks, a local registry, or continuous source-linked watch mode.
Build, pack, install, and check proves the distributable archive directly.

## Initial versioning scheme

The package begins at `0.1.0`. All public entry points and styles share this version.

Before `1.0.0`:

- an incompatible public-contract change increments the minor version;
- a backward-compatible feature or fix increments the patch version;
- development and prerelease versions are not published;
- local archives may be rebuilt with the current version because they are not registry releases.

Version `1.0.0` marks the first stable public contract after the package API, documentation, quality
gate, and publication workflow are complete.

Detailed version-bump mechanics, changelog generation, release notes, and dependency-update policy
remain part of the stable-release workflow task.

## Consequences

- The public scope makes the package installable without registry credentials.
- Every file included in the npm archive is publicly inspectable.
- CI is the only release principal, while the personal npm account remains the sole owner.
- Main represents a released version after publication is enabled.
- The repository demo provides a repeatable package-faithful local loop.
- One version covers UI, Markdown rendering, the editor, styles, and test utilities.

## Alternatives considered

### Source links or continuous watch mode

`npm link` or source symlinks can shorten the edit-and-refresh cycle, but they do not prove the
published archive and can create duplicate Angular runtime instances. They were rejected for the
archive verification workflow.

### Local registry or published development versions

A local registry and npm prereleases add infrastructure and version-management overhead. Production
archives installed into the repository demo provide the required fidelity with fewer moving parts.

### Conditional main publication or tag-triggered releases

Skipping publication when a version already exists would allow unreleased package changes to reach
`main`. Publishing only from version tags would make the tag, rather than `main`, the release event.
Both were rejected in favor of strict main-branch publication.

## Decisions deliberately deferred

This decision does not configure:

- the demo application or package build;
- dependency and peer-dependency contracts;
- CI workflow files or npm trusted-publisher settings;
- scripts and Make targets for the local archive workflow;
- API-surface, bundle-isolation, package-content, SSR, or strict-CSP checks;
- changelog and stable-release mechanics beyond the initial versioning rules.

Those remain finite implementation tasks in `docs/TODO.md`.
