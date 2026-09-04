import { CdkTrapFocus } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, DOCUMENT, inject, signal } from '@angular/core';
import { ModalScrollDirective } from '@alittlemore.dev/design-system';

import { DemoPageComponent } from '../shared/demo-page.component';

@Component({
  selector: 'demo-modal-scroll-page',
  standalone: true,
  imports: [CdkTrapFocus, DemoPageComponent, ModalScrollDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <demo-page
      title="Modal scroll"
      description="Reference-counted CDK page locking with wheel and touch routing into a consumer-owned modal body."
      [showControls]="false"
    >
      <div demo-preview>
        <button
          #modalTrigger
          type="button"
          class="btn btn-primary"
          (click)="openModal(modalTrigger)"
        >
          Open modal scroll demo
        </button>

        @if (modalOpen()) {
          <section
            class="demo-modal-backdrop"
            data-demo-modal
            role="dialog"
            aria-modal="true"
            aria-labelledby="demo-modal-title"
            [dsModalScroll]="modalBody"
            [cdkTrapFocus]="true"
            [cdkTrapFocusAutoCapture]="true"
            (keydown.escape)="closeModal()"
          >
            <article class="demo-modal">
              <header class="demo-modal-header" data-demo-modal-header>
                <h2 id="demo-modal-title">Modal scroll demo</h2>
                <button
                  type="button"
                  class="btn-close"
                  aria-label="Close modal scroll demo"
                  cdkFocusInitial
                  (click)="closeModal()"
                ></button>
              </header>
              <div #modalBody class="demo-modal-body" data-demo-modal-body tabindex="0">
                <p>Scroll input over this body keeps the browser's native scrolling behavior.</p>
                <p>Scroll input over the header is redirected into this body by the directive.</p>
                <p>The page remains locked through Angular CDK while the modal is present.</p>
                <p>Nested consumers share the same reference-counted page lock.</p>
                <p>Wheel deltas in pixels, lines, and pages are normalized before scrolling.</p>
                <p>Single-touch gestures over modal chrome are routed to this body.</p>
                <p>Touch state is cleared when a gesture ends or is cancelled.</p>
                <p>Removing the final modal restores the previous page scroll position.</p>
              </div>
            </article>
          </section>
        }
      </div>
    </demo-page>
  `,
  styles: `
    .demo-modal-backdrop {
      position: fixed;
      z-index: 1050;
      inset: 0;
      display: grid;
      place-items: center;
      padding: 1rem;
      background: rgba(0, 0, 0, 0.55);
    }

    .demo-modal {
      width: min(32rem, 100%);
      overflow: hidden;
      background: var(--surface-1);
      border: 1px solid var(--border-color-solid);
      border-radius: 0.75rem;
      box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.3);
    }

    .demo-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--border-color-solid);
    }

    .demo-modal-header h2 {
      margin: 0;
      font-size: 1.125rem;
    }

    .demo-modal-body {
      max-height: 12rem;
      padding: 1.25rem;
      overflow-y: auto;
    }

    .demo-modal-body p:last-child {
      margin-bottom: 0;
    }
  `,
})
export class ModalScrollPageComponent {
  private readonly document = inject(DOCUMENT);
  private modalTrigger: HTMLButtonElement | null = null;

  protected readonly modalOpen = signal(false);

  protected openModal(trigger: HTMLButtonElement): void {
    this.modalTrigger = trigger;
    this.modalOpen.set(true);
  }

  protected closeModal(): void {
    const trigger = this.modalTrigger;
    this.modalOpen.set(false);
    this.modalTrigger = null;
    this.document.defaultView?.setTimeout(() => trigger?.focus());
  }
}
