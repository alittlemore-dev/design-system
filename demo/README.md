# Design-system demo

This standalone Angular SSR application consumes the production archive of
`@alittlemoron/design-system`. Its manifest and lock file deliberately do not depend on the package:
the repository runner builds and packs the library, installs the archive temporarily with
`--no-save --package-lock=false`, runs the selected command, and restores `node_modules` from this
directory's lock file.

Run the interactive demo from the repository root:

```sh
make demo
```

Run the production SSR and CSP smoke:

```sh
make check-demo
```

Install Chromium once and run the separate browser smoke:

```sh
make install-demo-browser
make check-demo-browser
```

The demo imports only the package's documented public entry points. Extend the showcase and its
relevant smoke coverage whenever public package behavior, styles, or web assets change.
