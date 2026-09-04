import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  EmptyStateComponent,
  ErrorMessageComponent,
  LoadingSpinnerComponent,
  NotificationAreaComponent,
  NotificationService,
  type ErrorDisplay,
} from '@alittlemore.dev/design-system';

import { DemoPageComponent } from '../shared/demo-page.component';

@Component({
  selector: 'demo-empty-state-page',
  standalone: true,
  imports: [DemoPageComponent, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <demo-page
      title="Empty state"
      description="A neutral presentation whose message is entirely owned by the consuming application."
      [showControls]="false"
    >
      <div demo-preview class="demo-preview-surface">
        <ds-empty-state message="Nothing has been added yet." />
      </div>
    </demo-page>
  `,
})
export class EmptyStatePageComponent {}

@Component({
  selector: 'demo-loading-spinner-page',
  standalone: true,
  imports: [DemoPageComponent, LoadingSpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <demo-page
      title="Loading spinner"
      description="A visual progress indicator with a consumer-provided accessible status name."
      [showControls]="false"
    >
      <div demo-preview class="demo-preview-surface">
        <ds-loading-spinner ariaLabel="Loading example content" />
        <p class="demo-output" data-demo-spinner-label>
          Accessible status name: Loading example content
        </p>
      </div>
    </demo-page>
  `,
})
export class LoadingSpinnerPageComponent {}

@Component({
  selector: 'demo-error-message-page',
  standalone: true,
  imports: [DemoPageComponent, ErrorMessageComponent, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <demo-page
      title="Error message"
      description="Formats application-owned error context and leaves retry behavior with the consumer."
    >
      <div demo-preview>
        <ds-error-message
          [error]="error()"
          [retryLabel]="retryLabel()"
          (retry)="retryCount.update(increment)"
        />
        <p class="demo-output" data-demo-retry-count>Retries: {{ retryCount() }}</p>
      </div>
      <div demo-controls class="demo-form-stack">
        <div>
          <label class="form-label" for="error-message">error.message</label>
          <input
            id="error-message"
            class="form-control"
            [ngModel]="message()"
            (ngModelChange)="message.set($event)"
          />
        </div>
        <div>
          <label class="form-label" for="error-location">error.location</label>
          <input
            id="error-location"
            class="form-control"
            [ngModel]="location()"
            (ngModelChange)="location.set($event)"
          />
        </div>
        <div>
          <label class="form-label" for="retry-label">retryLabel</label>
          <input
            id="retry-label"
            class="form-control"
            [ngModel]="retryLabel()"
            (ngModelChange)="retryLabel.set($event)"
          />
        </div>
        <div class="form-check">
          <input
            id="nested-errors"
            class="form-check-input"
            type="checkbox"
            [ngModel]="nested()"
            (ngModelChange)="nested.set($event)"
          />
          <label class="form-check-label" for="nested-errors">Render nested errors as a list</label>
        </div>
      </div>
    </demo-page>
  `,
})
export class ErrorMessagePageComponent {
  protected readonly message = signal('The example request could not be completed.');
  protected readonly location = signal('showcase.request');
  protected readonly retryLabel = signal('Retry');
  protected readonly nested = signal(false);
  protected readonly retryCount = signal(0);
  protected readonly increment = (count: number) => count + 1;
  protected readonly error = computed<ErrorDisplay>(() =>
    this.nested()
      ? {
          message: this.message(),
          location: this.location(),
          nested_errors: [
            { message: 'A value is required.', attr: 'profile.email' },
            { message: 'Choose another value.', attr: 'profile.site' },
          ],
        }
      : { message: this.message(), location: this.location() },
  );
}

@Component({
  selector: 'demo-notifications-page',
  standalone: true,
  imports: [DemoPageComponent, FormsModule, NotificationAreaComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <demo-page
      title="Notifications"
      description="Polite live-region alerts with consumer-owned content and explicit success or error intent."
    >
      <div demo-preview>
        <ds-notification-area [closeLabel]="closeLabel()" />
        <div class="demo-action-row">
          <button type="button" class="btn btn-success" (click)="showSuccess()">
            Show success notification
          </button>
          <button type="button" class="btn btn-danger" (click)="showError()">
            Show error notification
          </button>
        </div>
        <p class="demo-output">
          Active notifications: {{ notificationService.notifications().length }}
        </p>
      </div>
      <div demo-controls class="demo-form-stack">
        <div>
          <label class="form-label" for="notification-message">message</label>
          <input
            id="notification-message"
            class="form-control"
            [ngModel]="message()"
            (ngModelChange)="message.set($event)"
          />
        </div>
        <div>
          <label class="form-label" for="notification-close-label">closeLabel</label>
          <input
            id="notification-close-label"
            class="form-control"
            [ngModel]="closeLabel()"
            (ngModelChange)="closeLabel.set($event)"
          />
        </div>
      </div>
    </demo-page>
  `,
})
export class NotificationsPageComponent {
  protected readonly notificationService = inject(NotificationService);
  protected readonly message = signal('Demo notification saved');
  protected readonly closeLabel = signal('Close notification');

  protected showSuccess(): void {
    this.notificationService.success(this.message());
  }

  protected showError(): void {
    this.notificationService.error(this.message());
  }
}
