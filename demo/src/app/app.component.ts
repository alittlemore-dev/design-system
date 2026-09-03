import { CSP_NONCE, ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FoldableTreeComponent, ThemeService } from '@alittlemoron/design-system';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { DEMO_EXPANDED_SECTION_KEYS, DEMO_ROOT_ITEMS, DEMO_SECTIONS } from './demo-navigation';

@Component({
  selector: 'demo-root',
  standalone: true,
  imports: [FoldableTreeComponent, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.ngCspNonce]': 'cspNonce',
  },
})
export class AppComponent {
  private readonly router = inject(Router);

  protected readonly cspNonce = inject(CSP_NONCE);
  protected readonly themeService = inject(ThemeService);
  protected readonly rootItems = DEMO_ROOT_ITEMS;
  protected readonly sections = DEMO_SECTIONS;
  protected readonly expandedSectionKeys = DEMO_EXPANDED_SECTION_KEYS;
  protected readonly selectedRoute = signal('/overview');
  protected readonly mobileNavigationOpen = signal(false);

  private readonly navigationSubscription = this.router.events
    .pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed(),
    )
    .subscribe((event) => this.selectedRoute.set(this.routePath(event.urlAfterRedirects)));

  protected navigate(route: string): void {
    this.mobileNavigationOpen.set(false);
    void this.router.navigateByUrl(route);
  }

  private routePath(url: string): string {
    const [path] = url.split(/[?#]/u, 1);
    return path === '' || path === '/' ? '/overview' : path;
  }
}
