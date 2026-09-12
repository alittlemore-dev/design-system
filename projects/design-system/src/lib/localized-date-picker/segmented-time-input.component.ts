import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { parseTime } from './localized-date-picker.utils';

type TimeSegment = 'hour' | 'minute';

@Component({
  selector: 'ds-segmented-time-input',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './segmented-time-input.component.html',
  styleUrl: './segmented-time-input.component.scss',
})
export class SegmentedTimeInputComponent {
  readonly value = input<string | null>(null);
  readonly disabled = input(false);
  readonly readonly = input(false);
  readonly hourLabel = input.required<string>();
  readonly minuteLabel = input.required<string>();

  readonly valueChange = output<string>();
  readonly incompleteChange = output<void>();
  readonly editCompleted = output<string>();
  readonly confirmRequested = output<boolean>();

  /** @internal */
  protected readonly hour = signal<string | null>(null);

  /** @internal */
  protected readonly minute = signal<string | null>(null);

  /** @internal */
  protected readonly hourText = computed(() => this.segmentText(this.hour()));

  /** @internal */
  protected readonly minuteText = computed(() => this.segmentText(this.minute()));

  /** @internal */
  protected readonly timeValueText = computed(() => `${this.hourText()}:${this.minuteText()}`);

  private readonly entryBuffers: Record<TimeSegment, string | null> = { hour: null, minute: null };
  private readonly entryOrigins: Record<TimeSegment, string | null> = { hour: null, minute: null };
  private editDirty = false;

  private readonly valueSyncEffect = effect(() => {
    const parsed = parseTime(this.value() ?? '');
    const nextHour = parsed === null ? null : String(parsed.hour).padStart(2, '0');
    const nextMinute = parsed === null ? null : String(parsed.minute).padStart(2, '0');
    untracked(() => {
      if (this.hour() === nextHour && this.minute() === nextMinute) return;
      this.hour.set(nextHour);
      this.minute.set(nextMinute);
      this.resetBuffers();
      this.editDirty = false;
    });
  });

  /** @internal */
  protected segmentValue(segment: TimeSegment): number | null {
    const value = this.segmentPart(segment)();
    return value === null ? null : Number(value);
  }

  /** @internal */
  protected onSegmentKeydown(segment: TimeSegment, event: KeyboardEvent): void {
    if (this.disabled() || this.readonly()) return;

    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      this.stepSegment(segment, event.key === 'ArrowUp' ? 1 : -1);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const valueEmitted = this.finalizePendingSegment(segment);
      if (this.composedValue() !== null) {
        this.completeEdit();
        this.confirmRequested.emit(valueEmitted);
      }
      return;
    }

    if (!/^\d$/.test(event.key)) return;
    event.preventDefault();
    this.enterDigit(segment, event.key);
  }

  /** @internal */
  protected onSegmentFocus(segment: TimeSegment): void {
    this.resetBuffer(segment === 'hour' ? 'minute' : 'hour');
  }

  /** @internal */
  protected onSegmentBlur(segment: TimeSegment, event: FocusEvent): void {
    this.finalizePendingSegment(segment);
    const group = (event.currentTarget as HTMLElement | null)?.closest('.segmented-time-input');
    const next = event.relatedTarget;
    if (!(next instanceof Node) || group === null || group === undefined || !group.contains(next)) {
      this.completeEdit();
    }
  }

  /** @internal */
  protected adjustSegment(segment: TimeSegment, change: 1 | -1): void {
    if (this.disabled() || this.readonly()) return;
    this.stepSegment(segment, change);
  }

  finalizePendingEdit(): boolean {
    const hourEmitted = this.finalizePendingSegment('hour');
    const minuteEmitted = this.finalizePendingSegment('minute');
    this.completeEdit();
    return hourEmitted || minuteEmitted;
  }

  clearValue(): void {
    this.hour.set(null);
    this.minute.set(null);
    this.resetBuffers();
    this.editDirty = false;
  }

  private enterDigit(segment: TimeSegment, digit: string): void {
    this.editDirty = true;
    const buffer = this.entryBuffers[segment];
    if (buffer === null) {
      this.entryOrigins[segment] = this.segmentPart(segment)();
      this.entryBuffers[segment] = digit;
      this.segmentPart(segment).set(digit);
      return;
    }

    const value = Number(`${buffer}${digit}`);
    if (value > this.segmentMaximum(segment)) {
      this.segmentPart(segment).set(this.entryOrigins[segment]);
      this.resetBuffer(segment);
      return;
    }

    this.segmentPart(segment).set(`${buffer}${digit}`);
    this.resetBuffer(segment);
    this.emitComposedValue();
  }

  private stepSegment(segment: TimeSegment, change: 1 | -1): void {
    this.editDirty = true;
    const maximum = this.segmentMaximum(segment);
    const current = this.segmentValue(segment);
    const next =
      current === null
        ? change === 1
          ? 0
          : maximum
        : (current + change + maximum + 1) % (maximum + 1);
    this.segmentPart(segment).set(String(next).padStart(2, '0'));
    this.resetBuffer(segment);
    this.emitComposedValue();
  }

  private emitComposedValue(): void {
    const value = this.composedValue();
    if (value === null) this.incompleteChange.emit();
    else this.valueChange.emit(value);
  }

  private finalizePendingSegment(segment: TimeSegment): boolean {
    if (this.entryBuffers[segment] === null) return false;
    const current = this.segmentPart(segment)();
    if (current !== null) this.segmentPart(segment).set(current.padStart(2, '0'));
    this.resetBuffer(segment);
    this.emitComposedValue();
    return true;
  }

  private completeEdit(): void {
    const value = this.composedValue();
    if (!this.editDirty || value === null) return;
    this.editDirty = false;
    this.editCompleted.emit(value);
  }

  private composedValue(): string | null {
    const hour = this.hour();
    const minute = this.minute();
    if (hour === null || minute === null) return null;
    const value = `${this.segmentText(hour)}:${this.segmentText(minute)}`;
    return parseTime(value) === null ? null : value;
  }

  private segmentPart(segment: TimeSegment) {
    return segment === 'hour' ? this.hour : this.minute;
  }

  private segmentMaximum(segment: TimeSegment): number {
    return segment === 'hour' ? 23 : 59;
  }

  private segmentText(value: string | null): string {
    return value === null ? '--' : value.padStart(2, '0');
  }

  private resetBuffers(): void {
    this.resetBuffer('hour');
    this.resetBuffer('minute');
  }

  private resetBuffer(segment: TimeSegment): void {
    this.entryBuffers[segment] = null;
    this.entryOrigins[segment] = null;
  }
}
