# Design-system demo

This standalone Angular SSR application consumes the production archive of
`@alittlemore.dev/design-system`. Its manifest and lock file deliberately do not depend on the package:
the repository runner builds and packs the library, installs the archive temporarily with
`--no-save --package-lock=false`, runs the selected command, and restores `node_modules` from this
directory's lock file.

Run the interactive demo from the repository root:

```sh
make demo
```

The application is a routed component catalogue. Its persistent sidebar is built with the packed
`FoldableTreeComponent`; every component or behavior has a stable deep link and an isolated page.
Pages pair the live component with consumer-owned controls for public inputs that materially change
rendering, interaction, validation, content, or accessibility semantics. Observable outputs are
shown beside the example so consumers can see the complete controlled-component flow.

Run the production SSR and CSP smoke:

```sh
make check-demo
```

Install Chromium once and run the separate browser smoke:

```sh
make install-demo-browser
make check-demo-browser
```

The demo imports only the package's documented public entry points. Add or update the corresponding
routed page, meaningful input controls, observable outputs, and relevant smoke coverage whenever
public package behavior, styles, or web assets change.
