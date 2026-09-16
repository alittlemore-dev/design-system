import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  viewChild,
} from '@angular/core';
import { ModalDialogDirective } from '../modal/modal-dialog.directive';

/** A modal side panel. Applications own its content and opening control. */
@Component({
  selector: 'ds-drawer',
  standalone: true,
  imports: [ModalDialogDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog dsModalDialog [attr.aria-label]="label()" (openChange)="openChange.emit($event)">
      <header>
        <span>{{ label() }}</span>
        <button
          type="button"
          class="btn-close"
          [attr.aria-label]="closeLabel()"
          (click)="close()"
        ></button>
      </header>
      <div class="ds-drawer-content"><ng-content /></div>
    </dialog>
  `,
  styleUrl: './drawer.component.scss',
})
export class DrawerComponent {
  readonly label = input.required<string>();
  readonly closeLabel = input.required<string>();
  readonly openChange = output<boolean>();
  private readonly dialog = viewChild(ModalDialogDirective);
  readonly isOpen = computed(() => this.dialog()?.isOpen() ?? false);

  open(): void {
    this.dialog()?.open();
  }
  close(): void {
    this.dialog()?.close();
  }
}
