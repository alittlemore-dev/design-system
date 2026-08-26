# Angular compatibility

Status: accepted on 2026-08-26.

## Selected baseline

The design system is compiled with Angular framework and compiler version 22.1.0 in partial-Ivy
mode. Its Angular peer dependency range is `>=22.1.0 <23.0.0`.

Angular requires an application to build with the same or a newer Angular version than each of its
dependent libraries. Version 22.1.0 is therefore the newest baseline that supports the current
locked versions of both initial consumers without changing either application.

The workspace uses the shared consumer baseline of TypeScript 6.0.3, RxJS 7.8.2, and Node.js
24.16.0. Angular CLI and build tooling may use newer patches within Angular 22.1 because they do not
raise the Angular compiler version embedded in the published library.

## Consumer matrix

| Consumer | Angular core/compiler | TypeScript | RxJS | Node.js |
| --- | --- | --- | --- | --- |
| `my-site` | 22.1.2 | 6.0.3 | 7.8.2 | 24.16.0 |
| `personal-workspace` | 22.1.0 | 6.0.3 | 7.8.2 | 24.16.0 |

The versions above come from each consumer's committed frontend lock file and `.nvmrc` as inspected
on 2026-08-26.

## Upgrade rule

Do not raise the design system's Angular framework or compiler baseline above the oldest supported
consumer. Upgrade both consumers first, verify the packed package in both applications, and only
then raise the library baseline and peer dependency floor.

Consumer verification uses a production package archive installed into disposable copies. The
copies must keep their committed Angular versions, import the package through its public entry
point, and pass their existing type-check and production-build Make targets without forced or
legacy peer resolution.

## Verification evidence

On 2026-08-26, the production partial-Ivy build was packed as
`@alittlemoron/design-system@0.1.0` and installed without saving into disposable frontend copies.
The consumer manifests and lock files remained byte-identical after installation.

- `my-site` retained Angular 22.1.2 and passed `make -C frontend typecheck` and
  `make -C frontend ssr-smoke`, including its browser build, server build, and SSR runtime probe.
- `personal-workspace` retained Angular 22.1.0 and passed `make -C frontend typecheck` and
  `make -C frontend build`.

The verification host used Node.js 26.0.0, which is also supported by Angular 22. Both consumer
repositories continue to declare Node.js 24.16.0 as their shared runtime baseline.

## References

- [Angular version compatibility](https://angular.dev/reference/versions)
- [Creating Angular libraries](https://angular.dev/tools/libraries/creating-libraries)
- [Angular Package Format](https://angular.dev/tools/libraries/angular-package-format)
