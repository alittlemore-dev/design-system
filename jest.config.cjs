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
};
