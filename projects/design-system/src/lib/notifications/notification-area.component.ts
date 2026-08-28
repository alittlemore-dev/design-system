import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';

import { NotificationService } from './notification.service';

@Component({
  selector: 'ds-notification-area',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './notification-area.component.html',
  styleUrl: './notification-area.component.scss',
})
export class NotificationAreaComponent {
  protected readonly notificationService = inject(NotificationService);

  readonly closeLabel = input.required<string>();
}
