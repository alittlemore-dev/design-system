const { createCjsPreset } = require('jest-preset-angular/presets');

const angularPreset = createCjsPreset();

/** @type {import('jest').Config} */
module.exports = {
  ...angularPreset,
  roots: ['<rootDir>/projects/design-system'],
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testMatch: ['<rootDir>/projects/design-system/**/src/**/*.spec.ts'],
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  moduleNameMapper: {
    '^@alittlemoron/design-system$': '<rootDir>/projects/design-system/src/public-api.ts',
    '^@alittlemoron/design-system/markdown$':
      '<rootDir>/projects/design-system/markdown/src/public-api.ts',
    '^@alittlemoron/design-system/markdown-editor$':
      '<rootDir>/projects/design-system/markdown-editor/src/public-api.ts',
    '^@alittlemoron/design-system/testing$':
      '<rootDir>/projects/design-system/testing/src/public-api.ts',
  },
  transform: {
    ...angularPreset.transform,
    '^.+\\.(ts|js|mjs|html|svg)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$',
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@angular/common/locales/.*\\.js$|marked|dompurify))',
  ],
  collectCoverageFrom: [
    'projects/design-system/**/src/**/*.ts',
    '!projects/design-system/**/src/**/*.spec.ts',
    '!projects/design-system/**/src/public-api.ts',
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'cobertura'],
  coverageThreshold: {
    'projects/design-system/markdown-editor/src/lib/markdown-editor.commands.ts': {
      branches: 95,
      functions: 100,
      lines: 98,
      statements: 98,
    },
    'projects/design-system/markdown-editor/src/lib/markdown-editor.component.ts': {
      branches: 96,
      functions: 98,
      lines: 98,
      statements: 98,
    },
    'projects/design-system/markdown-editor/src/lib/markdown-editor.extensions.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    'projects/design-system/markdown-editor/src/lib/markdown-editor.presentation.ts': {
      branches: 98,
      functions: 100,
      lines: 99,
      statements: 98,
    },
    'projects/design-system/markdown-editor/src/lib/markdown-editor.sticky-bottom-inset.directive.ts':
      {
        branches: 95,
        functions: 100,
        lines: 100,
        statements: 100,
      },
    'projects/design-system/markdown-editor/src/lib/markdown-editor.tables.ts': {
      branches: 95,
      functions: 99,
      lines: 97,
      statements: 97,
    },
    'projects/design-system/markdown-editor/src/lib/markdown-editor.wiki-links.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    'projects/design-system/markdown-editor/src/lib/markdown-table.ts': {
      branches: 98,
      functions: 100,
      lines: 99,
      statements: 99,
    },
    'projects/design-system/markdown/src/lib/markdown-renderer.service.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    'projects/design-system/markdown/src/lib/markdown-syntax-highlighter.ts': {
      branches: 95,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
};
