import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

/** Native disclosure popover for arbitrary links, actions and form controls. */
@Component({
  selector: 'ds-dropdown',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      #trigger
      type="button"
      class="btn button-inactive btn-sm dropdown-toggle ds-dropdown-trigger"
      [attr.aria-label]="label()"
      [attr.aria-expanded]="isOpen()"
      [attr.aria-controls]="id() + '-panel'"
      [attr.popovertarget]="id() + '-panel'"
      popovertargetaction="toggle"
      [disabled]="disabled()"
      (keydown.arrowdown)="focusFirst($event)"
    >
      <ng-content select="[dsDropdownTrigger]" />
    </button>
    <div
      #panel
      [id]="id() + '-panel'"
      popover="auto"
      class="dropdown-menu ds-dropdown-panel"
      [class.ds-dropdown-start]="align() === 'start'"
      (toggle)="onToggle($event)"
    >
      <ng-content />
    </div>
  `,
  styleUrl: './dropdown.component.scss',
})
export class DropdownComponent {
  readonly id = input.required<string>();
  readonly label = input.required<string>();
  readonly align = input<'start' | 'end'>('end');
  readonly disabled = input(false);
  readonly openChange = output<boolean>();
  private readonly opened = signal(false);
  readonly isOpen = this.opened.asReadonly();
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');

  close(): void {
    const panel = this.panel()?.nativeElement;
    if (typeof panel?.hidePopover === 'function') panel.hidePopover();
    this.setOpen(false);
  }

  protected onToggle(event: ToggleEvent): void {
    this.setOpen(event.newState === 'open');
  }

  protected focusFirst(event: Event): void {
    if (this.disabled()) return;
    const panel = this.panel()?.nativeElement;
    if (typeof panel?.showPopover !== 'function') return;
    event.preventDefault();
    panel.showPopover({ source: this.trigger()?.nativeElement });
    panel
      .querySelector<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex="0"]',
      )
      ?.focus();
  }

  private setOpen(open: boolean): void {
    if (this.opened() === open) return;
    this.opened.set(open);
    this.openChange.emit(open);
  }
}
