import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  MarkdownRendererService,
  type MarkdownWikiLinkRenderConfig,
} from '@alittlemore.dev/design-system/markdown';
import { MarkdownEditorComponent } from '@alittlemore.dev/design-system/markdown-editor';

import { DemoPageComponent } from '../shared/demo-page.component';
import {
  INITIAL_MARKDOWN,
  MARKDOWN_EDITOR_LABELS,
  MARKDOWN_IMAGE_CONFIG,
  MARKDOWN_WIKI_LINKS,
} from './markdown-demo.config';

const RENDERER_WIKI_LINKS: MarkdownWikiLinkRenderConfig = {
  namespaces: MARKDOWN_WIKI_LINKS.namespaces,
  resolve: (reference) => MARKDOWN_WIKI_LINKS.resolve(reference),
};

@Component({
  selector: 'demo-markdown-renderer-page',
  standalone: true,
  imports: [DemoPageComponent, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <demo-page
      title="Markdown renderer"
      description="Renders and sanitizes GitHub-flavored Markdown with syntax highlighting and optional application-defined wiki links."
    >
      <div
        demo-preview
        class="rendered-markdown markdown-preview"
        data-demo-rendered-markdown
        [innerHTML]="renderedMarkdown()"
      ></div>
      <div demo-controls class="demo-form-stack">
        <div>
          <label class="form-label" for="renderer-source">markdown</label>
          <textarea
            id="renderer-source"
            class="form-control font-monospace"
            rows="14"
            [ngModel]="markdown()"
            (ngModelChange)="markdown.set($event)"
          ></textarea>
        </div>
        <div class="form-check">
          <input
            id="renderer-wiki-links"
            class="form-check-input"
            type="checkbox"
            [ngModel]="wikiLinksEnabled()"
            (ngModelChange)="wikiLinksEnabled.set($event)"
          />
          <label class="form-check-label" for="renderer-wiki-links">wikiLinks config</label>
        </div>
      </div>
    </demo-page>
  `,
  styles: `
    .markdown-preview {
      min-height: 16rem;
      padding: 1rem;
      background: var(--surface-0);
      border: 1px dashed var(--border-color-solid);
      border-radius: 0.5rem;
    }
  `,
})
export class MarkdownRendererPageComponent {
  private readonly markdownRenderer = inject(MarkdownRendererService);

  protected readonly markdown = signal(INITIAL_MARKDOWN);
  protected readonly wikiLinksEnabled = signal(true);
  protected readonly renderedMarkdown = computed(() =>
    this.markdownRenderer.render(this.markdown(), {
      wikiLinks: this.wikiLinksEnabled() ? RENDERER_WIKI_LINKS : null,
    }),
  );
}

@Component({
  selector: 'demo-markdown-editor-page',
  standalone: true,
  imports: [DemoPageComponent, FormsModule, MarkdownEditorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <demo-page
      title="Markdown editor"
      description="A configurable CodeMirror editor with rich and source modes, preview, tables, image workflows, wiki-link completion, and fullscreen behavior."
      [stacked]="true"
    >
      <div id="markdown-demo" demo-preview>
        <div
          class="rendered-markdown synchronized-renderer"
          data-demo-rendered-markdown
          [innerHTML]="renderedMarkdown()"
        ></div>
        <ds-markdown-editor
          [value]="markdownValue()"
          accessibleLabel="Demo Markdown body"
          [labels]="labels"
          [imageConfig]="imageConfig()"
          [imageInteractionsDisabled]="imageInteractionsDisabled()"
          [wikiLinks]="wikiLinks()"
          (valueChange)="markdownValue.set($event)"
          (imageUploadPendingChange)="uploadPending.set($event)"
        />
        <p class="demo-output">Image upload pending: {{ uploadPending() }}</p>
        <pre class="markdown-value" data-demo-markdown-value>{{ markdownValue() }}</pre>
      </div>
      <div demo-controls class="demo-form-stack">
        <div class="form-check">
          <input
            id="editor-images"
            class="form-check-input"
            type="checkbox"
            [ngModel]="imagesEnabled()"
            (ngModelChange)="imagesEnabled.set($event)"
          />
          <label class="form-check-label" for="editor-images">imageConfig</label>
        </div>
        <div class="form-check">
          <input
            id="editor-image-disabled"
            class="form-check-input"
            type="checkbox"
            [ngModel]="imageInteractionsDisabled()"
            (ngModelChange)="imageInteractionsDisabled.set($event)"
          />
          <label class="form-check-label" for="editor-image-disabled">
            imageInteractionsDisabled
          </label>
        </div>
        <div class="form-check">
          <input
            id="editor-wiki-links"
            class="form-check-input"
            type="checkbox"
            [ngModel]="wikiLinksEnabled()"
            (ngModelChange)="wikiLinksEnabled.set($event)"
          />
          <label class="form-check-label" for="editor-wiki-links">wikiLinks config</label>
        </div>
        <p class="form-text">
          The editor content itself controls the public value/valueChange pair.
        </p>
      </div>
    </demo-page>
  `,
  styles: `
    .synchronized-renderer {
      margin-bottom: 1rem;
      padding: 1rem;
      background: var(--surface-0);
      border: 1px dashed var(--border-color-solid);
      border-radius: 0.5rem;
    }

    .markdown-value {
      max-height: 10rem;
      margin: 1rem 0 0;
      padding: 0.75rem;
      overflow: auto;
      color: var(--text-secondary);
      background: var(--surface-0);
      border-radius: 0.5rem;
      font-size: 0.75rem;
      white-space: pre-wrap;
    }
  `,
})
export class MarkdownEditorPageComponent {
  private readonly markdownRenderer = inject(MarkdownRendererService);

  protected readonly labels = MARKDOWN_EDITOR_LABELS;
  protected readonly markdownValue = signal(INITIAL_MARKDOWN);
  protected readonly imagesEnabled = signal(true);
  protected readonly imageInteractionsDisabled = signal(false);
  protected readonly wikiLinksEnabled = signal(true);
  protected readonly uploadPending = signal(false);
  protected readonly imageConfig = computed(() =>
    this.imagesEnabled() ? MARKDOWN_IMAGE_CONFIG : null,
  );
  protected readonly wikiLinks = computed(() =>
    this.wikiLinksEnabled() ? MARKDOWN_WIKI_LINKS : null,
  );
  protected readonly renderedMarkdown = computed(() =>
    this.markdownRenderer.render(this.markdownValue(), {
      wikiLinks: this.wikiLinksEnabled() ? RENDERER_WIKI_LINKS : null,
    }),
  );
}
