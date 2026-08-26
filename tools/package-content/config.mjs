import { aggregateDependencyContracts } from './package-content.mjs';

const angularRange = '>=22.1.0 <23.0.0';

export const dependencyContracts = {
  ui: {
    peerDependencies: {
      '@angular/cdk': angularRange,
      '@angular/common': angularRange,
      '@angular/core': angularRange,
      '@angular/forms': angularRange,
      bootstrap: '>=5.3.8 <6.0.0',
      rxjs: '>=7.8.2 <8.0.0',
    },
  },
  markdown: {
    peerDependencies: {
      '@angular/common': angularRange,
      '@angular/core': angularRange,
    },
    dependencies: {
      dompurify: '^3.4.13',
      marked: '^18.0.9',
      prismjs: '^1.30.0',
    },
  },
  markdownEditor: {
    peerDependencies: {
      '@angular/cdk': angularRange,
      '@angular/common': angularRange,
      '@angular/core': angularRange,
      '@angular/forms': angularRange,
      rxjs: '>=7.8.2 <8.0.0',
    },
    dependencies: {
      '@codemirror/autocomplete': '^6.20.3',
      '@codemirror/commands': '^6.10.4',
      '@codemirror/lang-markdown': '^6.5.2',
      '@codemirror/language': '^6.12.4',
      '@codemirror/search': '^6.7.1',
      '@codemirror/state': '^6.7.1',
      '@codemirror/view': '^6.43.8',
      '@lezer/common': '^1.5.2',
      '@lezer/highlight': '^1.2.3',
    },
  },
  testing: {
    peerDependencies: {
      '@angular/core': angularRange,
    },
  },
  bootstrapStyles: {
    peerDependencies: {
      bootstrap: '>=5.3.8 <6.0.0',
    },
  },
  cdkStyles: {
    peerDependencies: {
      '@angular/cdk': angularRange,
    },
  },
  infrastructure: {
    dependencies: {
      tslib: '^2.3.0',
    },
  },
};

const aggregate = aggregateDependencyContracts(dependencyContracts);

export const expectedPeerDependencies = aggregate.peerDependencies;
export const expectedDependencies = aggregate.dependencies;
