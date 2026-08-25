# Package distribution

Status: accepted on 2026-08-25.

## Decision

The design system will be distributed as the public npm package
`@alittlemoron/design-system`. It is owned by the personal npm account `alittlemoron` and published
to the public npm registry only by CI.

The package starts at version `0.1.0` under the MIT license. Once package publishing is enabled,
every push to `main`, including documentation-only changes, is a release event and must carry a
version that has not previously been published.

Local development uses a repository-owned demo application. The demo installs the production
package archive and exercises documented entry points without depending on either consumer
repository.

## Package identity and public subpaths

There is one installable and atomically versioned package. Its public TypeScript entry points are:

- `@alittlemoron/design-system` for application-independent UI;
- `@alittlemoron/design-system/markdown` for Markdown rendering;
- `@alittlemoron/design-system/markdown-editor` for the interactive Markdown editor;
- `@alittlemoron/design-system/testing` for supported consumer test utilities.

Its public SCSS subpaths are:

- `@alittlemoron/design-system/styles/theme-tokens`;
- `@alittlemoron/design-system/styles/bootstrap-overrides`;
- `@alittlemoron/design-system/styles/cdk-overlay`;
- `@alittlemoron/design-system/styles/ui`;
- `@alittlemoron/design-system/styles/markdown`.

Editor-specific styles remain scoped to or packaged with the Markdown editor. They do not receive a
global style subpath unless a later concrete requirement demonstrates that one is necessary.

These names refine the capability boundaries accepted in
[Package topology](package-topology.md). They do not change the dependency direction or ownership
of those capabilities.

## Registry, visibility, and license

The canonical registry is the public npm registry at `https://registry.npmjs.org`. The scoped
package is public and must declare public access in its publish configuration so that the initial
publish cannot accidentally use the private default for scoped packages.

The package and its distributed source are licensed under MIT. The repository itself is not
required to be public. The license file must be included in the published archive even when the
source repository remains private.

The package name was unregistered when checked on 2026-08-25. Availability is not reserved by this
document; only the first successful publication reserves the name.

## Ownership and publishing authority

The npm user `alittlemoron` is the sole package owner and maintainer. No additional code-owner file
or package collaborators are required initially.

Publishing authority belongs only to the repository's CI workflow:

- local and manually authenticated `npm publish` commands are not a supported release path;
- CI publishes directly to npm only after the required repository checks and package verification
  pass;
- npm registry owner and maintainer metadata is authoritative for publishing ownership, while the
  package manifest records package identity and authorship;
- adding another maintainer or transferring the package requires an explicit ownership decision.

The first publication is a bootstrap exception in authentication, not in publishing authority. CI
uses a temporary granular npm token with read/write access, bypass-2FA enabled, a short expiration,
and the narrowest scope npm permits for creating the package under the personal account. The token
is stored only as an encrypted CI secret and publishes `0.1.0`, because npm trusted-publisher
configuration requires the package to exist. After the package exists, the owner configures this
repository's GitHub Actions workflow as the npm trusted publisher, switches publication to OIDC,
and immediately revokes the temporary token. The package continues to be published only by CI
throughout this transition.

A private GitHub source repository can use npm trusted publishing, but npm provenance is unavailable
while the repository is private. Making the repository public later may enable provenance; it is not
a prerequisite for package publication.

## Main-branch release rule

Once the publication workflow is enabled, every push to `main` is a package release event. CI must:

1. install dependencies reproducibly;
2. run the required tests, static checks, production build, API-surface checks, and package-content
   verification configured by later repository-foundation work;
3. read the package name and version from the distributable manifest;
4. fail with a clear version-conflict error if that name and version already exist in npm;
5. publish the verified archive with public visibility when the version is new.

CI must not silently skip publication when the version already exists. npm packages are immutable,
so an existing name-and-version pair is never overwritten or reused. A documentation-only push to
`main` also requires at least a patch version increase after this workflow is enabled.

The workflow publishes directly rather than staging a release for manual approval. Workflow names,
commands, permissions, and other CI mechanics belong to the later CI and release-workflow tasks.

## Local-development workflow

### Demo consumer

Local package integration is verified in a repository-owned Angular demo application rather than in
`my-site` or `personal-workspace`. The demo is a neutral consumer fixture and must:

- have its own consumer manifest, lock file, and installation directory;
- import only the documented package entry points and style subpaths;
- never import library source files or internal package paths;
- exercise the primary UI, Markdown rendering, Markdown editor, and public styles with neutral
  runtime data;
- import the supported testing entry point only from the demo's tests;
- cover browser execution and the SSR and strict-CSP constraints shared by the real consumers;
- remain excluded from the published package archive.

The demo is not an additional distributable package and is not part of the design system's public
API. Its Angular workspace structure and concrete scenarios are selected during scaffolding.

### Package-faithful iteration

The supported local loop is deliberately discrete:

1. build the design system using its production package configuration;
2. create the same `.tgz` archive shape that CI will publish;
3. install that archive temporarily into the demo without saving a dependency or changing the
   demo lock file;
4. run or build the demo and perform the relevant automated and visual checks;
5. restore the demo installation from its committed lock file when the packaged check is complete.

Temporary installation may change the demo's `node_modules`; it must not change tracked manifests
or lock files. Generated archives are disposable build artifacts and must not be committed.

The initial workflow does not use `npm link`, source-directory symlinks, a local registry, or a
continuous source-linked watch mode. Repeating build, pack, install, and check is simpler and proves
that the distributable archive works. Later scripts and thin Make targets may automate that sequence
without changing the workflow.

The local loop does not locate, mutate, build, or test either consumer repository. The dedicated
consumer-migration tasks in `docs/TODO.md` retain responsibility for validating `my-site` and
`personal-workspace` against published package entry points.

## Initial versioning scheme

The package begins at `0.1.0`. All public entry points and styles share this version.

Before `1.0.0`:

- an incompatible public-contract change increments the minor version, for example `0.1.0` to
  `0.2.0`;
- a backward-compatible feature or fix increments the patch version;
- no development or prerelease versions are published;
- local package archives may be rebuilt with the current version because they are not registry
  releases.

Version `1.0.0` marks the first stable public contract and is released only after both initial
consumers have migrated and passed their required integration checks.

Whether a consumer declares an exact version, a caret range, or a tilde range is a consumer-owned
dependency-policy decision. The design-system package does not prescribe that choice.

Detailed version-bump mechanics, changelog generation, release notes, and dependency-update policy
remain part of the later stable-release and changelog workflow task.

## Consequences

- The public scope makes the package installable without registry credentials.
- A private source repository does not prevent public package use, but consumers can inspect all
  files included in the npm archive.
- CI is the only release principal, while the personal npm account remains the sole owner.
- Main always represents a released version after publishing is enabled; every main-branch change
  therefore carries release-version responsibility.
- The demo provides a repeatable package-faithful local loop without coupling this repository to
  the location or working state of either consumer.
- Real consumer behavior is still verified during migration and release; the demo does not replace
  those later integration checks.
- One version continues to cover UI, Markdown rendering, the editor, styles, and test utilities.

## Alternatives considered

### Consumer repositories as the local integration harness

Installing each local archive into `my-site` and `personal-workspace` would exercise the real
applications, but it would couple ordinary design-system work to two external checkouts and their
working state. It was rejected for the supported local loop in favor of the repository-owned demo.
The consumers remain mandatory integration targets during their dedicated migration tasks.

### Source links or continuous watch mode

`npm link` or source symlinks can shorten the edit-and-refresh cycle, but they do not prove the
published archive and can produce dependency-resolution differences, including duplicate Angular
runtime instances. They were rejected for the initial workflow.

### Local registry or published development versions

A local registry and npm prereleases support more elaborate multi-repository development, but add
infrastructure and version-management overhead that the initial workflow does not need. Production
archives installed into the demo provide the required fidelity with fewer moving parts.

### Conditional main publication or tag-triggered releases

Skipping publication when a version already exists would allow unreleased package changes to reach
`main`. Publishing only from version tags would make the tag, rather than `main`, the release event.
Both were rejected in favor of strict main-branch publication.

## Decisions deliberately deferred

This decision does not configure:

- the Angular workspace, demo application, or package build;
- dependency and peer-dependency contracts;
- CI workflow files or npm trusted-publisher settings;
- scripts and Make targets for the local archive workflow;
- API-surface, bundle-isolation, package-content, SSR, or strict-CSP checks;
- changelog and stable-release mechanics beyond the initial versioning rules above.

Those remain finite implementation tasks in `docs/TODO.md`.
