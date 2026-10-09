import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DemoPageComponent } from '../shared/demo-page.component';
@Component({
  selector: 'demo-calendar-page',
  standalone: true,
  imports: [DemoPageComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<demo-page
    title="Calendar and mini calendar"
    description="Month, week, day, agenda and year views, compact differentiated entries, and keyboard date navigation. Applications own data, labels, selection and time zone."
    [showControls]="false"
    ><div demo-preview>
      <p>
        Compare entry tones, open a busy day, change views, and navigate with the mini calendar. The
        full-width preview uses only packed public components.
      </p>
      <a class="btn btn-primary" routerLink="/preview/calendar">Open calendar demo</a>
    </div></demo-page
  >`,
})
export class CalendarPageComponent {}
