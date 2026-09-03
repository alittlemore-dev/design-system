import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'demo-page',
  standalone: true,
  templateUrl: './demo-page.component.html',
  styleUrl: './demo-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DemoPageComponent {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly showControls = input(true);
  readonly stacked = input(false);
}
