import { AfterViewInit, Component, ElementRef, HostListener, Input, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { SiteSettingsService } from '../services/site-settings-service';
import { CartService } from '../services/cart-service';
import { AuthService } from '../services/auth-service';
import { resolveImageUrl, DEFAULT_LOGO_URL } from '../constants';

@Component({
  selector: 'app-site-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './site-nav.component.html',
  styleUrl: './site-nav.component.css',
})
// Shared top nav for every storefront page (Home, Tienda, Blog, Distribuidores,
// Sobre nosotros, etc.) — replaces the old per-page header that only showed
// the logo, and the category-filter nav that used to live only on Home
// (those filters moved to /tienda, so this nav no longer needs to know
// about product categories at all).
export class SiteNavComponent implements OnInit, AfterViewInit {
  // Home passes true so this nav sits transparent over the hero banner
  // (like the reference site) instead of its own solid white bar — every
  // other page uses the default, solid appearance.
  @Input() overlay = false;
  // How far to scroll before switching to the solid appearance — the caller
  // (Home) passes its actual hero height so the switch happens right as the
  // hero ends, not partway through it. Only matters when overlay=true.
  @Input() scrolledThreshold = 60;
  // Once scrolled far enough that the transparent overlay nav would sit over
  // regular (non-hero) content, it switches to the normal solid appearance —
  // still fixed to the top, just no longer transparent. Only relevant when
  // overlay=true; the default nav is already `position: sticky`.
  scrolled = false;
  logoUrl = DEFAULT_LOGO_URL;
  resolveImageUrl = resolveImageUrl;
  cartItemCount = 0;
  mobileMenuOpen = false;

  // The nav is always `position: fixed` now (both overlay and plain), so it
  // never occupies document flow space — on non-overlay pages that leaves a
  // gap where the nav used to sit, closed by measuring the real rendered
  // nav height (varies by breakpoint/content) and reserving that with a
  // spacer div, rather than a guessed fixed padding on every page.
  @ViewChild('navEl') private navElRef?: ElementRef<HTMLElement>;
  navHeight = 0;

  constructor(
    private siteSettingsService: SiteSettingsService,
    private cartService: CartService,
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.siteSettingsService.getSettings().subscribe(settings => {
      this.logoUrl = settings.logoUrl || DEFAULT_LOGO_URL;
    });
    this.cartService.cart$.subscribe(() => {
      this.cartItemCount = this.cartService.getItemCount();
    });
  }

  // Hysteresis (60 to turn solid, 30 to go back transparent) plus one
  // requestAnimationFrame in flight at a time — without both, scrollY
  // hovering right at a single threshold during momentum/trackpad scroll
  // toggled the class dozens of times a second, visibly flickering the
  // background-color transition on and off.
  private scrollTicking = false;

  ngAfterViewInit(): void {
    this.measureNavHeight();
  }

  @HostListener('window:resize')
  measureNavHeight(): void {
    const el = this.navElRef?.nativeElement;
    if (el) {
      // Runs after the current change-detection cycle so it doesn't fight
      // Angular's own render pass (and to let fonts/images finish affecting
      // layout first).
      setTimeout(() => { this.navHeight = el.offsetHeight; });
    }
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (!this.overlay || this.scrollTicking) {
      return;
    }
    this.scrollTicking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      if (!this.scrolled && y > this.scrolledThreshold) {
        this.scrolled = true;
      } else if (this.scrolled && y < this.scrolledThreshold - 30) {
        this.scrolled = false;
      }
      this.scrollTicking = false;
    });
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }

  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  get userName(): string | null {
    return this.authService.getFirstName();
  }

  isAdmin(): boolean {
    return localStorage.getItem('role') === 'Admin';
  }

  goToAccount(): void {
    this.closeMobileMenu();
    this.router.navigate([this.isAdmin() ? '/admin' : '/mon-compte']);
  }

  openLoginDialog(): void {
    this.closeMobileMenu();
    this.router.navigate(['/login']);
  }
}
