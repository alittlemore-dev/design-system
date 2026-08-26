# @alittlemoron/design-system

Application-independent Angular UI and Markdown building blocks.

The package exposes these TypeScript APIs:

- `@alittlemoron/design-system` for application-independent UI;
- `@alittlemoron/design-system/markdown` for Markdown rendering;
- `@alittlemoron/design-system/markdown-editor` for the interactive Markdown editor;
- `@alittlemoron/design-system/testing` for public test utilities.

## Styles

The public SCSS entry points are:

- `styles/theme-tokens`: light and dark custom properties except Bootstrap's `--bs-*` mappings;
- `styles/bootstrap-overrides`: Bootstrap's base styles, theme mappings, button overrides, and focused
  form-control presentation;
- `styles/cdk-overlay`: the official Angular CDK overlay structural styles;
- `styles/ui`: application-independent global UI selectors;
- `styles/markdown`: `.markdown-code` and Prism token presentation.

Import tokens first, then Bootstrap, followed by only the optional capabilities an application uses:

```scss
@use '@alittlemoron/design-system/styles/theme-tokens';
@use '@alittlemoron/design-system/styles/bootstrap-overrides';
@use '@alittlemoron/design-system/styles/cdk-overlay';
@use '@alittlemoron/design-system/styles/ui';
@use '@alittlemoron/design-system/styles/markdown';
```

`bootstrap-overrides` already emits the Bootstrap base. Do not import Bootstrap separately or the
application will duplicate its global CSS.

The package deliberately excludes unused `.accent-border` and `.link-inactive` selectors. It also
excludes application-owned `.form-bordered`, `.force-display-block`, article and matrix selectors,
the cookie-consent banner, and application Markdown-wrapper selectors.

## Initial theme preload

`@alittlemoron/design-system/theme-preload` exports the classic `theme-preload.js` web asset. Copy
that file from the installed package into the application's web output, then load the self-hosted
copy synchronously in `<head>` before application code and without `async` or `defer`:

```json
{
  "glob": "theme-preload.js",
  "input": "node_modules/@alittlemoron/design-system",
  "output": "/assets/design-system"
}
```

```html
<script src="/assets/design-system/theme-preload.js" nonce="YOUR_CSP_NONCE"></script>
```

Omit `nonce` when the application's policy does not require it. Keep both the preload and compiled
CSS external under strict CSP; do not copy the script into an inline block.

The preload accepts only `light` or `dark`. It applies a valid `chosenTheme` value from
`localStorage`, otherwise a valid server-rendered `data-bs-theme`, otherwise `light`. Missing or
unavailable browser globals and storage do not throw; server execution is a no-op.
