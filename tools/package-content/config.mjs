import { aggregateDependencyContracts } from './package-content.mjs';

const angularRange = '>=22.1.1 <23.0.0';

export const dependencyContracts = {
  ui: {
    dependencies: {
      fullcalendar: '7.1.5',
      'temporal-polyfill': '^1.0.8',
    },
    peerDependencies: {
      '@angular/cdk': '>=22.1.0 <23.0.0',
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
      dompurify: '^3.5.0',
      marked: '^18.3.0',
      prismjs: '^1.30.0',
    },
  },
  markdownEditor: {
    peerDependencies: {
      '@angular/cdk': '>=22.1.0 <23.0.0',
      '@angular/common': angularRange,
      '@angular/core': angularRange,
      '@angular/forms': angularRange,
      rxjs: '>=7.8.2 <8.0.0',
    },
    dependencies: {
      '@codemirror/autocomplete': '^6.20.4',
      '@codemirror/commands': '^6.11.2',
      '@codemirror/lang-markdown': '^6.5.2',
      '@codemirror/language': '^6.13.1',
      '@codemirror/search': '^6.7.3',
      '@codemirror/state': '^6.7.6',
      '@codemirror/view': '^6.44.0',
      '@lezer/common': '^1.5.7',
      '@lezer/highlight': '^1.2.5',
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
      '@angular/cdk': '>=22.1.0 <23.0.0',
    },
  },
  infrastructure: {
    dependencies: {
      tslib: '^2.9.1',
    },
  },
};

const aggregate = aggregateDependencyContracts(dependencyContracts);

export const expectedPeerDependencies = aggregate.peerDependencies;
export const expectedDependencies = aggregate.dependencies;
