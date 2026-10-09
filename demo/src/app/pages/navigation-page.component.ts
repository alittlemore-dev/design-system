import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DemoPageComponent } from '../shared/demo-page.component';

@Component({
  selector: 'demo-navigation-page',
  standalone: true,
  imports: [DemoPageComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<demo-page
    title="Navigation and sidebar"
    description="Inline page navigation with grouped links or expandable folders. Applications own labels, routes and persistence."
    [showControls]="false"
    ><div demo-preview data-demo-navigation>
      <p>
        The catalogue uses the same public SidebarComponent and NavigationComponent as the
        full-width preview.
      </p>
      <a routerLink="/preview/navigation" class="btn btn-primary">Open navigation demo</a>
      <p class="mt-3 mb-0">
        Compare workspace sections and article folders, collapse and reopen the same panel, change
        themes, and try keyboard navigation.
      </p>
    </div></demo-page
  >`,
})
export class NavigationPageComponent {}
