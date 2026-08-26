# Angular compatibility

Status: accepted on 2026-08-26.

## Selected baseline

The design system is compiled with Angular framework and compiler version 22.1.0 in partial-Ivy
mode. Its Angular and Angular CDK peer dependency range is `>=22.1.0 <23.0.0`.

The workspace pins TypeScript 6.0.3, RxJS 7.8.2, and Node.js 24.16.0 as its repository toolchain
baseline. Angular CLI and build tooling may use newer compatible patches within Angular 22.1 as
long as the published compiler baseline and peer range remain unchanged.

## Upgrade rule

Raising the Angular framework, compiler, or CDK baseline requires all of the following:

- confirmation that the selected TypeScript, RxJS, and Node.js versions satisfy Angular's official
  compatibility ranges;
- an intentional update to the published peer range;
- successful repository tests, type checks, partial-Ivy production build, API-surface checks, and
  package-content verification;
- a version change appropriate for the resulting public compatibility contract.

## Verification

The repository verifies this baseline by installing the exact peer floors in the workspace and
running the complete `make check` quality gate. The production package must compile in partial-Ivy
mode and retain the documented dependency ranges in its generated manifest.

## References

- [Angular version compatibility](https://angular.dev/reference/versions)
- [Creating Angular libraries](https://angular.dev/tools/libraries/creating-libraries)
- [Angular Package Format](https://angular.dev/tools/libraries/angular-package-format)
