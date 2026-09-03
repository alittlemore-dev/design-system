import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { DemoPageComponent } from '../shared/demo-page.component';

@Component({
  selector: 'demo-overview-page',
  standalone: true,
  imports: [DemoPageComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <demo-page
      title="Overview"
      description="Explore one component at a time, change its public inputs, and observe outputs in the same focused page."
      [showControls]="false"
    >
      <div demo-preview class="overview-content">
        <section>
          <h2>Built like a real consumer</h2>
          <p>
            This standalone Angular SSR app installs the production archive and imports only public
            package entry points. Every example therefore exercises the same contract an application
            consumes.
          </p>
        </section>
        <div class="overview-grid">
          <a routerLink="/components/site-select">
            <span>Forms</span>
            <strong>Configure validation, appearance, size, and state</strong>
          </a>
          <a routerLink="/components/foldable-tree">
            <span>Navigation</span>
            <strong>Inspect data-driven sections, badges, and selection</strong>
          </a>
          <a routerLink="/markdown/editor">
            <span>Markdown</span>
            <strong>Try the editor, preview, uploads, wiki links, and tables</strong>
          </a>
        </div>
      </div>
    </demo-page>
  `,
  styles: `
    .overview-content {
      display: grid;
      gap: 1.5rem;
    }

    .overview-content h2 {
      margin-top: 0;
    }

    .overview-content p {
      max-width: 48rem;
      color: var(--text-secondary);
    }

    .overview-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.75rem;
    }

    .overview-grid a {
      display: grid;
      gap: 0.5rem;
      min-height: 9rem;
      padding: 1rem;
      color: var(--text-primary);
      background: var(--surface-0);
      border: 1px solid var(--border-color-solid);
      border-radius: 0.65rem;
      text-decoration: none;
    }

    .overview-grid a:hover,
    .overview-grid a:focus-visible {
      border-color: var(--accent-color);
      box-shadow: 0 0 0 0.2rem rgba(var(--accent-color-rgb), 0.15);
      outline: 0;
    }

    .overview-grid span {
      color: var(--accent-color);
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    @media (max-width: 47.99rem) {
      .overview-grid {
        grid-template-columns: 1fr;
      }

      .overview-grid a {
        min-height: auto;
      }
    }
  `,
})
export class OverviewPageComponent {}
