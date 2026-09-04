export const packageName = '@alittlemore.dev/design-system';

export const typeScriptEntryPoints = [
  {
    declarationFile: 'types/alittlemore.dev-design-system.d.ts',
    exportKey: '.',
    name: 'primary',
    reportFileName: 'design-system',
    sourceRoot: 'projects/design-system/src',
    specifier: packageName,
    targets: {
      default: './fesm2022/alittlemore.dev-design-system.mjs',
      types: './types/alittlemore.dev-design-system.d.ts',
    },
  },
  {
    declarationFile: 'types/alittlemore.dev-design-system-markdown.d.ts',
    exportKey: './markdown',
    name: 'markdown',
    reportFileName: 'design-system.markdown',
    sourceRoot: 'projects/design-system/markdown/src',
    specifier: `${packageName}/markdown`,
    targets: {
      default: './fesm2022/alittlemore.dev-design-system-markdown.mjs',
      types: './types/alittlemore.dev-design-system-markdown.d.ts',
    },
  },
  {
    declarationFile: 'types/alittlemore.dev-design-system-markdown-editor.d.ts',
    exportKey: './markdown-editor',
    name: 'markdown-editor',
    reportFileName: 'design-system.markdown-editor',
    sourceRoot: 'projects/design-system/markdown-editor/src',
    specifier: `${packageName}/markdown-editor`,
    targets: {
      default: './fesm2022/alittlemore.dev-design-system-markdown-editor.mjs',
      types: './types/alittlemore.dev-design-system-markdown-editor.d.ts',
    },
  },
  {
    declarationFile: 'types/alittlemore.dev-design-system-testing.d.ts',
    exportKey: './testing',
    name: 'testing',
    reportFileName: 'design-system.testing',
    sourceRoot: 'projects/design-system/testing/src',
    specifier: `${packageName}/testing`,
    targets: {
      default: './fesm2022/alittlemore.dev-design-system-testing.mjs',
      types: './types/alittlemore.dev-design-system-testing.d.ts',
    },
  },
];

export const styleEntryPoints = [
  'theme-tokens',
  'bootstrap-overrides',
  'cdk-overlay',
  'ui',
  'markdown',
].map((name) => ({
  exportKey: `./styles/${name}`,
  specifier: `${packageName}/styles/${name}`,
  targets: {
    sass: `./styles/${name}.scss`,
  },
}));

export const webAssetEntryPoints = [
  {
    exportKey: './theme-preload',
    specifier: `${packageName}/theme-preload`,
    targets: {
      default: './theme-preload.js',
    },
  },
];

export const expectedPackageExports = Object.fromEntries([
  ...typeScriptEntryPoints.map(({ exportKey, targets }) => [exportKey, targets]),
  ...styleEntryPoints.map(({ exportKey, targets }) => [exportKey, targets]),
  ...webAssetEntryPoints.map(({ exportKey, targets }) => [exportKey, targets]),
  ['./package.json', { default: './package.json' }],
]);

export const publicSpecifiers = new Set([
  ...typeScriptEntryPoints.map(({ specifier }) => specifier),
  ...styleEntryPoints.map(({ specifier }) => specifier),
  ...webAssetEntryPoints.map(({ specifier }) => specifier),
]);
