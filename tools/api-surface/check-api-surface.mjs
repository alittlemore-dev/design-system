#!/usr/bin/env node

import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Extractor, ExtractorConfig } from '@microsoft/api-extractor';

import {
  findImportViolations,
  findPackageExportViolations,
} from './api-surface.mjs';
import {
  expectedPackageExports,
  packageName,
  publicSpecifiers,
  typeScriptEntryPoints,
} from './config.mjs';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const packageFolder = join(repositoryRoot, 'dist/alittlemoron/design-system');
const packageJsonPath = join(packageFolder, 'package.json');
const reportFolder = join(repositoryRoot, 'etc/api');

async function main() {
  const update = parseArguments(process.argv.slice(2));
  const importViolations = await findImportViolations({
    entryPoints: typeScriptEntryPoints,
    packageName,
    publicSpecifiers,
    repositoryRoot,
  });

  if (importViolations.length > 0) {
    throw new Error(formatImportViolations(importViolations));
  }

  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
  const exportViolations = findPackageExportViolations({
    actualExports: packageJson.exports ?? {},
    expectedExports: expectedPackageExports,
  });

  if (exportViolations.length > 0) {
    throw new Error(formatExportViolations(exportViolations));
  }

  await mkdir(reportFolder, { recursive: true });

  for (const entryPoint of typeScriptEntryPoints) {
    runApiExtractor(entryPoint, update);
  }

  console.log(
    update
      ? 'API surface reports updated successfully.'
      : 'API surface check completed successfully.',
  );
}

function parseArguments(arguments_) {
  if (arguments_.length === 0) {
    return false;
  }
  if (arguments_.length === 1 && arguments_[0] === '--update') {
    return true;
  }
  throw new Error(`Unknown arguments: ${arguments_.join(' ')}`);
}

function runApiExtractor(entryPoint, update) {
  const extractorConfig = ExtractorConfig.prepare({
    configObject: {
      apiReport: {
        enabled: true,
        reportFileName: entryPoint.reportFileName,
        reportFolder,
        reportTempFolder: join(packageFolder, '.api-extractor-temp'),
      },
      compiler: {
        tsconfigFilePath: join(repositoryRoot, 'tsconfig.json'),
      },
      docModel: { enabled: false },
      dtsRollup: { enabled: false },
      mainEntryPointFilePath: join(packageFolder, entryPoint.declarationFile),
      newlineKind: 'lf',
      projectFolder: repositoryRoot,
      tsdocMetadata: { enabled: false },
    },
    configObjectFullPath: undefined,
    packageJsonFullPath: packageJsonPath,
  });
  const result = Extractor.invoke(extractorConfig, {
    localBuild: update,
    printApiReportDiff: true,
    showVerboseMessages: false,
    typescriptCompilerFolder: join(repositoryRoot, 'node_modules/typescript'),
  });

  if (!result.succeeded) {
    throw new Error(
      `API Extractor failed for ${entryPoint.specifier} with ` +
        `${result.errorCount} error(s) and ${result.warningCount} warning(s).`,
    );
  }
}

function formatImportViolations(violations) {
  const messages = violations.map((violation) => {
    const location = `${violation.importer}:${violation.line}:${violation.column}`;

    if (violation.code === 'internal-package-path') {
      return `${location} imports internal package path "${violation.specifier}".`;
    }
    if (violation.code === 'cross-entry-point-relative-import') {
      return `${location} crosses an entry-point boundary via "${violation.specifier}".`;
    }
    return `${location} reaches library internals via "${violation.specifier}".`;
  });

  return ['Internal package import violations:', ...messages.map((message) => `- ${message}`)].join(
    '\n',
  );
}

function formatExportViolations(violations) {
  return [
    'Built package export-map violations:',
    ...violations.map((violation) => `- ${JSON.stringify(violation)}`),
  ].join('\n');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
