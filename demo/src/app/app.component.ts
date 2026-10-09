import {
  CSP_NONCE,
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NavigationComponent,
  SidebarComponent,
  ThemeService,
  type NavigationSelection,
} from '@alittlemore.dev/design-system';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';

import { DEMO_ROOT_ITEMS, DEMO_GROUPS } from './demo-navigation';

@Component({
  selector: 'demo-root',
  standalone: true,
  imports: [NavigationComponent, SidebarComponent, RouterOutlet],
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
  protected readonly groups = DEMO_GROUPS;
  protected readonly selectedRoute = signal('/overview');
  protected readonly navigationOpen = signal(true);
  private readonly desktop = toSignal(
    inject(BreakpointObserver)
      .observe('(min-width: 768px)')
      .pipe(map((state) => state.matches)),
    { initialValue: true },
  );
  private readonly responsiveNavigation = effect(() => this.navigationOpen.set(this.desktop()));

  private readonly navigationSubscription = this.router.events
    .pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed(),
    )
    .subscribe((event) => this.selectedRoute.set(this.routePath(event.urlAfterRedirects)));

  protected navigate(selection: NavigationSelection): void {
    selection.event.preventDefault();
    if (!this.desktop()) this.navigationOpen.set(false);
    void this.router.navigateByUrl(selection.item.href);
  }

  private routePath(url: string): string {
    const [path] = url.split(/[?#]/u, 1);
    return path === '' || path === '/' ? '/overview' : path;
  }
}
