import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { IconComponent } from '../icon/icon.component';

/** Inline page navigation. Modal service menus belong in DrawerComponent. */
@Component({
  selector: 'ds-sidebar',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  readonly panelId = input.required<string>();
  readonly label = input.required<string>();
  readonly openLabel = input.required<string>();
  readonly closeLabel = input.required<string>();
  readonly open = input.required<boolean>();
  readonly openChange = output<boolean>();

  private readonly document = inject(DOCUMENT);
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly toggle = viewChild<ElementRef<HTMLButtonElement>>('toggle');

  private readonly restoreHiddenFocus = effect(() => {
    if (!this.open() && this.panel()?.nativeElement.contains(this.document.activeElement)) {
      this.toggle()?.nativeElement.focus();
    }
  });

  /** @internal */
  protected close(event: Event): void {
    if (!this.open()) return;
    event.stopPropagation();
    this.openChange.emit(false);
    this.toggle()?.nativeElement.focus();
  }
}
