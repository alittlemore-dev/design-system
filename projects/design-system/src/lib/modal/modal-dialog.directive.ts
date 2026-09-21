import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  Directive,
  ElementRef,
  PLATFORM_ID,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { ModalPageScrollLockService } from './modal-page-scroll-lock.service';

/** Native top-layer lifecycle; the consumer owns dialog content, labeling and presentation. */
@Directive({
  selector: 'dialog[dsModalDialog]',
  exportAs: 'dsModalDialog',
  standalone: true,
  host: {
    '(cancel)': 'cancel($event)',
    '(close)': 'finishClose()',
    '(pointerdown)': 'dismissBackdrop($event)',
  },
})
export class ModalDialogDirective {
  readonly dismissible = input(true);
  readonly dismissed = output<void>();
  readonly openChange = output<boolean>();
  private readonly opened = signal(false);
  readonly isOpen = this.opened.asReadonly();
  private readonly dialog = inject<ElementRef<HTMLDialogElement>>(ElementRef).nativeElement;
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly scrollLock = inject(ModalPageScrollLockService);
  private releaseScroll: (() => void) | null = null;
  private trigger: HTMLElement | null = null;
  private destroying = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destroying = true;
      if (isPlatformBrowser(this.platformId)) this.dialog.close?.();
      this.releaseScroll?.();
      this.trigger?.focus();
    });
  }

  open(): void {
    if (this.destroying || !isPlatformBrowser(this.platformId) || this.opened()) return;
    if (typeof this.dialog.showModal !== 'function') return;
    this.trigger = this.document.activeElement as HTMLElement | null;
    this.dialog.showModal();
    this.releaseScroll = this.scrollLock.acquire();
    this.opened.set(true);
    this.openChange.emit(true);
  }

  close(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.dialog.close?.();
    this.finishClose();
  }

  protected cancel(event: Event): void {
    event.preventDefault();
    this.requestDismiss();
  }

  protected dismissBackdrop(event: PointerEvent): void {
    if (event.target !== this.dialog || event.button !== 0) return;
    const rect = this.dialog.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      this.requestDismiss();
  }

  protected finishClose(): void {
    if (this.dialog.open) return;
    this.releaseScroll?.();
    this.releaseScroll = null;
    if (!this.opened()) return;
    this.opened.set(false);
    if (!this.destroying) this.openChange.emit(false);
    this.trigger?.focus();
    this.trigger = null;
  }

  private requestDismiss(): void {
    if (!this.dismissible()) return;
    this.close();
    if (!this.destroying) this.dismissed.emit();
  }
}
