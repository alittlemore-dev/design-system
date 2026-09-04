# Angular compatibility

Status: accepted on 2026-08-26.

## Selected baseline

The design system is compiled with Angular framework and compiler version 22.1.0 in partial-Ivy
mode. Its Angular and Angular CDK peer dependency range is `>=22.1.0 <23.0.0`.

The root workspace is the floor lane: it pins the published Angular, CDK, RxJS, and Bootstrap peer
floors exactly while using TypeScript 6.0.3 and Node.js 24.16.0 as its repository toolchain baseline.
The independent demo is the current lane: Dependabot keeps its consumer dependencies current within
the supported line, and CI installs the packed library into that application before building it.

## Upgrade rule

Raising the Angular framework, compiler, or CDK baseline requires all of the following:

- confirmation that the selected TypeScript, RxJS, and Node.js versions satisfy Angular's official
  compatibility ranges;
- an intentional update to the published peer range;
- successful repository tests, type checks, partial-Ivy production build, API-surface checks, and
  package-content verification;
- a version change appropriate for the resulting public compatibility contract.

## Verification

The package-content contract derives every lower peer bound and requires the root workspace to
install that exact version. The production package must compile in partial-Ivy mode at those floors
and retain the documented ranges in its generated manifest. Every pull-request and release gate
also runs the production demo build, public testing-entry-point check, SSR smoke, and strict-CSP
checks after installing a fresh packed archive into the current lane.

Routine Dependabot version updates do not move Angular, RxJS, or Bootstrap in the floor lane;
security updates remain visible and require an intentional baseline decision. Related Angular
consumer updates are grouped in the demo, while changes to Angular peer contracts are grouped in
the published manifest.

## References

- [Angular version compatibility](https://angular.dev/reference/versions)
- [Creating Angular libraries](https://angular.dev/tools/libraries/creating-libraries)
- [Angular Package Format](https://angular.dev/tools/libraries/angular-package-format)
