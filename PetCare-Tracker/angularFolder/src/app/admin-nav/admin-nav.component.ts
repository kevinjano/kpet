import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { AuthService } from '../services/auth-service';
import { SiteSettingsService } from '../services/site-settings-service';
import { ModalService } from '../services/modal-service';
import { resolveImageUrl } from '../constants';

@Component({
  selector: 'app-admin-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './admin-nav.component.html',
  styleUrl: './admin-nav.component.css'
})
/**
 * Sidebar for the whole admin panel — a singleton across /admin/* navigation
 * (see AdminLayoutComponent). The active-link "pill" is a single absolutely-
 * positioned div whose transform/height are recalculated from the active
 * <a>'s offsetTop/offsetHeight (updateSliderToActive) rather than one pill per
 * link, which is what makes it animate smoothly between items instead of
 * jumping. onLinkClick moves it optimistically on click, before the route
 * finishes navigating; the router-events subscription then reconciles it on
 * every NavigationEnd in case something else (a guard redirect, back/forward)
 * changed the route without a click.
 */
export class AdminNavComponent implements OnInit, AfterViewInit, OnDestroy {
  logoUrl: string | null = null;
  resolveImageUrl = resolveImageUrl;

  sliderTop = 0;
  sliderHeight = 0;
  sliderReady = false;

  // Below 768px the sidebar becomes an off-canvas drawer instead of a
  // permanently-visible column; this just tracks whether it's open.
  mobileNavOpen = false;

  @ViewChild('navLinks') navLinksRef!: ElementRef<HTMLElement>;

  private routerSub?: Subscription;

  constructor(
    private authService: AuthService,
    private siteSettingsService: SiteSettingsService,
    private modalService: ModalService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.siteSettingsService.getSettings().subscribe(settings => {
      this.logoUrl = settings.logoUrl;
    });

    // The sidebar is a persistent singleton across /admin/* navigation (it lives
    // in AdminLayoutComponent), so we can track route changes to keep the pill
    // in sync even when it's not the user's own click that moved it (e.g. a
    // guard redirect or the browser's back/forward buttons).
    this.routerSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => setTimeout(() => this.updateSliderToActive(), 0));
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.updateSliderToActive(), 0);
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  private updateSliderToActive(): void {
    const container = this.navLinksRef?.nativeElement;
    if (!container) {
      return;
    }
    const active = container.querySelector('a.active') as HTMLElement | null;
    if (active) {
      this.sliderTop = active.offsetTop;
      this.sliderHeight = active.offsetHeight;
      this.sliderReady = true;
    }
  }

  onLinkClick(event: MouseEvent): void {
    // Move the pill immediately on click, before the route finishes navigating,
    // so it feels like it's sliding to meet the item you just touched.
    const target = event.currentTarget as HTMLElement;
    this.sliderTop = target.offsetTop;
    this.sliderHeight = target.offsetHeight;
    this.sliderReady = true;
    this.mobileNavOpen = false;
  }

  toggleMobileNav(): void {
    this.mobileNavOpen = !this.mobileNavOpen;
  }

  closeMobileNav(): void {
    this.mobileNavOpen = false;
  }

  async logout(): Promise<void> {
    const confirmed = await this.modalService.confirm({
      title: '¿Cerrar sesión?',
      message: 'Vas a salir de tu cuenta de administrador.',
      confirmText: 'Cerrar sesión',
    });
    if (confirmed) {
      this.authService.logout();
    }
  }
}
