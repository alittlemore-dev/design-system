import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import {
  LocalizedDatePickerControlSize,
  TemporalBoundary,
} from './localized-temporal-picker.types';

export interface TemporalFieldEndpointEvent {
  readonly boundary: TemporalBoundary;
  readonly text: string;
}

@Component({
  selector: 'ds-temporal-picker-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './temporal-picker-field.component.html',
  styleUrl: './temporal-picker-field.component.scss',
})
export class TemporalPickerFieldComponent {
  readonly range = input(false);
  readonly inputId = input.required<string>();
  readonly startText = input.required<string>();
  readonly endText = input<string>('');
  readonly groupLabel = input.required<string>();
  readonly triggerLabel = input<string>('');
  readonly startLabel = input.required<string>();
  readonly endLabel = input<string>('');
  readonly accessibleSeparator = input<string>('to');
  readonly activeBoundary = input<TemporalBoundary>('single');
  readonly startInvalid = input(false);
  readonly endInvalid = input(false);
  readonly startRequired = input(false);
  readonly endRequired = input(false);

  readonly controlSize = input<LocalizedDatePickerControlSize>('default');
  readonly disabled = input(false);
  readonly readonly = input(false);
  readonly startDescribedBy = input<string>('');
  readonly endDescribedBy = input<string>('');
  readonly startErrorId = input<string>('');
  readonly endErrorId = input<string>('');
  readonly placeholder = input<string>('');
  readonly iconKind = input<'calendar' | 'clock'>('calendar');
  readonly expanded = input(false);
  readonly dialogId = input<string>('');

  readonly endpointInput = output<TemporalFieldEndpointEvent>();
  readonly endpointBlur = output<TemporalFieldEndpointEvent>();
  readonly endpointEscape = output<TemporalFieldEndpointEvent>();
  readonly endpointEnter = output<TemporalFieldEndpointEvent>();
  readonly endpointActivated = output<TemporalBoundary>();
  readonly triggerActivated = output<TemporalBoundary>();

  /** @internal */
  protected onEndpointInput(boundary: TemporalBoundary, event: Event): void {
    this.endpointInput.emit(this.endpointEvent(boundary, event));
  }

  /** @internal */
  protected onEndpointBlur(boundary: TemporalBoundary, event: FocusEvent): void {
    this.endpointBlur.emit(this.endpointEvent(boundary, event));
  }

  /** @internal */
  protected onEndpointKeydown(boundary: TemporalBoundary, event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.endpointEnter.emit(this.endpointEvent(boundary, event));
    } else if (event.key === 'Escape') {
      this.endpointEscape.emit(this.endpointEvent(boundary, event));
    }
  }

  /** @internal */
  protected onEndpointActivated(boundary: TemporalBoundary): void {
    if (!this.disabled()) this.endpointActivated.emit(boundary);
  }

  /** @internal */
  protected onTriggerActivated(): void {
    if (this.disabled() || this.readonly()) return;
    this.triggerActivated.emit(this.activeBoundary());
  }

  private endpointEvent(boundary: TemporalBoundary, event: Event): TemporalFieldEndpointEvent {
    return {
      boundary,
      text: (event.target as HTMLInputElement).value,
    };
  }
}
