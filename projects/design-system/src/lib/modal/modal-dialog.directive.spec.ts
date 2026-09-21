import { Component, PLATFORM_ID, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ModalDialogDirective } from './modal-dialog.directive';

@Component({
  imports: [ModalDialogDirective],
  template: `<button type="button">Open</button>
    <dialog
      dsModalDialog
      aria-label="Example"
      [dismissible]="dismissible()"
      (dismissed)="dismissals = dismissals + 1"
    >
      <button type="button">Content</button>
    </dialog>`,
})
class Host {
  dismissible = signal(true);
  dismissals = 0;
  readonly modal = viewChild.required(ModalDialogDirective);
}

function createHost() {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
  dialog.showModal = () => {
    dialog.open = true;
  };
  dialog.close = () => {
    dialog.open = false;
    dialog.dispatchEvent(new Event('close'));
  };
  return { fixture, dialog, modal: fixture.componentInstance.modal() };
}

describe('ModalDialogDirective', () => {
  it('contains native dismissal while required, and emits dismissal only for user requests', () => {
    const { fixture, dialog, modal } = createHost();
    fixture.componentInstance.dismissible.set(false);
    fixture.detectChanges();
    modal.open();
    const cancel = new Event('cancel', { cancelable: true });
    dialog.dispatchEvent(cancel);
    expect(cancel.defaultPrevented).toBe(true);
    expect(dialog.open).toBe(true);
    expect(fixture.componentInstance.dismissals).toBe(0);
    fixture.componentInstance.dismissible.set(true);
    fixture.detectChanges();
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(dialog.open).toBe(false);
    expect(fixture.componentInstance.dismissals).toBe(1);
    modal.open();
    modal.close();
    expect(fixture.componentInstance.dismissals).toBe(1);
  });

  it('restores focus and closes the native dialog on destruction', () => {
    const { fixture, dialog, modal } = createHost();
    const opener = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    document.body.appendChild(fixture.nativeElement);
    opener.focus();
    modal.open();
    modal.close();
    expect(document.activeElement).toBe(opener);
    modal.open();
    fixture.destroy();
    expect(dialog.open).toBe(false);
  });

  it('ignores stale close events after reopening', () => {
    const { dialog, modal } = createHost();
    dialog.close = () => {
      dialog.open = false;
    };
    modal.open();
    modal.close();
    modal.open();
    dialog.dispatchEvent(new Event('close'));
    expect(modal.isOpen()).toBe(true);
  });

  it('ignores open and close requests during SSR', () => {
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    const { dialog, modal } = createHost();
    dialog.showModal = () => {
      throw new Error('browser API');
    };
    dialog.close = () => {
      throw new Error('browser API');
    };
    modal.open();
    expect(modal.isOpen()).toBe(false);
    expect(() => modal.close()).not.toThrow();
  });

  it('does not call browser methods during SSR destruction', () => {
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    const { fixture, dialog } = createHost();
    dialog.close = () => {
      throw new Error('browser API');
    };
    expect(() => fixture.destroy()).not.toThrow();
  });
});
