import { readFile, readdir } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';

import ts from 'typescript';

const SOURCE_EXTENSIONS = new Set(['.cjs', '.cts', '.js', '.jsx', '.mjs', '.mts', '.ts', '.tsx']);

const EXCLUDED_DIRECTORIES = new Set([
  '.angular',
  '.git',
  '__generated__',
  'coverage',
  'dist',
  'generated',
  'node_modules',
  'out-tsc',
]);

export async function findImportViolations({
  entryPoints,
  packageName,
  publicSpecifiers,
  repositoryRoot,
}) {
  const absoluteEntryPoints = entryPoints.map((entryPoint) => ({
    ...entryPoint,
    sourceRoot: resolve(repositoryRoot, entryPoint.sourceRoot),
  }));
  const sourceFiles = await collectSourceFiles(repositoryRoot);
  const violations = [];

  for (const sourceFilePath of sourceFiles) {
    const sourceText = await readFile(sourceFilePath, 'utf8');
    const sourceFile = ts.createSourceFile(
      sourceFilePath,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      scriptKindFor(sourceFilePath),
    );
    const importer = toRepositoryPath(repositoryRoot, sourceFilePath);

    for (const moduleReference of collectModuleReferences(sourceFile)) {
      const { node, specifier } = moduleReference;
      const location = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      const commonFields = {
        column: location.character + 1,
        importer,
        line: location.line + 1,
        specifier,
      };

      if (
        (specifier === packageName || specifier.startsWith(`${packageName}/`)) &&
        !publicSpecifiers.has(specifier)
      ) {
        violations.push({
          code: 'internal-package-path',
          ...commonFields,
        });
        continue;
      }

      if (!specifier.startsWith('.')) {
        continue;
      }

      const resolvedModule = ts.resolveModuleName(
        specifier,
        sourceFilePath,
        {
          allowJs: true,
          module: ts.ModuleKind.ESNext,
          moduleResolution: ts.ModuleResolutionKind.Bundler,
        },
        ts.sys,
      ).resolvedModule;

      if (!resolvedModule) {
        continue;
      }

      const importerEntryPoint = findOwningEntryPoint(sourceFilePath, absoluteEntryPoints);
      const importedEntryPoint = findOwningEntryPoint(
        resolvedModule.resolvedFileName,
        absoluteEntryPoints,
      );

      if (!importedEntryPoint || importerEntryPoint?.name === importedEntryPoint.name) {
        continue;
      }

      violations.push({
        code: importerEntryPoint ? 'cross-entry-point-relative-import' : 'external-relative-import',
        ...commonFields,
      });
    }
  }

  return violations;
}

export function findPackageExportViolations({ actualExports, expectedExports }) {
  const violations = [];

  for (const exportKey of Object.keys(expectedExports).sort()) {
    if (!Object.hasOwn(actualExports, exportKey)) {
      violations.push({ code: 'missing-package-export', exportKey });
      continue;
    }

    const actualConditions = actualExports[exportKey];
    const expectedConditions = expectedExports[exportKey];

    for (const condition of Object.keys(expectedConditions).sort()) {
      if (!Object.hasOwn(actualConditions, condition)) {
        violations.push({
          code: 'missing-package-export-condition',
          exportKey,
          condition,
        });
        continue;
      }

      if (actualConditions[condition] !== expectedConditions[condition]) {
        violations.push({
          actual: actualConditions[condition],
          code: 'package-export-target-mismatch',
          expected: expectedConditions[condition],
          exportKey,
          condition,
        });
      }
    }

    for (const condition of Object.keys(actualConditions).sort()) {
      if (!Object.hasOwn(expectedConditions, condition)) {
        violations.push({
          code: 'unexpected-package-export-condition',
          exportKey,
          condition,
        });
      }
    }
  }

  for (const exportKey of Object.keys(actualExports).sort()) {
    if (!Object.hasOwn(expectedExports, exportKey)) {
      violations.push({ code: 'unexpected-package-export', exportKey });
    }
  }

  return violations;
}

async function collectSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = [];

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const entryPath = resolve(directory, entry.name);

    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRECTORIES.has(entry.name)) {
        paths.push(...(await collectSourceFiles(entryPath)));
      }
      continue;
    }

    const extensionStart = entry.name.lastIndexOf('.');
    const extension = extensionStart === -1 ? '' : entry.name.slice(extensionStart);
    if (entry.isFile() && SOURCE_EXTENSIONS.has(extension)) {
      paths.push(entryPath);
    }
  }

  return paths;
}

function collectModuleReferences(sourceFile) {
  const references = [];

  function addStringLiteral(node) {
    if (node && ts.isStringLiteralLike(node)) {
      references.push({ node, specifier: node.text });
    }
  }

  function visit(node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      addStringLiteral(node.moduleSpecifier);
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)
    ) {
      addStringLiteral(node.moduleReference.expression);
    } else if (ts.isCallExpression(node) && node.arguments.length === 1) {
      if (
        node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === 'require')
      ) {
        addStringLiteral(node.arguments[0]);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return references;
}

function findOwningEntryPoint(filePath, entryPoints) {
  const normalizedPath = resolve(filePath);

  return entryPoints.find(
    ({ sourceRoot }) =>
      normalizedPath === sourceRoot || normalizedPath.startsWith(`${sourceRoot}${sep}`),
  );
}

function scriptKindFor(filePath) {
  if (filePath.endsWith('.js') || filePath.endsWith('.mjs') || filePath.endsWith('.cjs')) {
    return ts.ScriptKind.JS;
  }
  if (filePath.endsWith('.jsx')) {
    return ts.ScriptKind.JSX;
  }
  if (filePath.endsWith('.tsx')) {
    return ts.ScriptKind.TSX;
  }
  return ts.ScriptKind.TS;
}

function toRepositoryPath(repositoryRoot, filePath) {
  return relative(repositoryRoot, filePath).split(sep).join('/');
}
