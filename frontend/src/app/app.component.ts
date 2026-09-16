import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { Meta } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet, RouterLink } from '@angular/router';
import { RouterModule} from '@angular/router';
import { filter } from 'rxjs';
import { SiteSettingsService } from './services/site-settings-service';
import { resolveImageUrl } from './constants';
import { ModalComponent } from './modal/modal.component';
import { WhatsappBubbleComponent } from './whatsapp-bubble/whatsapp-bubble.component';
import { FavoriteService } from './services/favorite-service';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterModule, ModalComponent, WhatsappBubbleComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
// Root shell: just the <router-outlet/> plus the favicon/tab-title sync below.
// All actual page chrome (nav, footer) lives in each routed page component.
export class AppComponent implements OnInit {
  title = 'Kpet';

  private storeName = 'Kpet';
  private routeTitle: string | null = null;

  // Same fallback text as index.html's static <meta name="description"> —
  // used for every route that doesn't set its own in app.routes.ts.
  private readonly defaultDescription = 'Snacks, alimentos y accesorios para perros y gatos. Pedí online y coordiná la entrega por WhatsApp.';

  constructor(
    private siteSettingsService: SiteSettingsService,
    private favoriteService: FavoriteService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private meta: Meta,
    @Inject(DOCUMENT) private document: Document,
  ) {}

  ngOnInit(): void {
    this.favoriteService.loadFavorites();

    // Keep the browser tab icon in sync with whatever logo the admin has configured,
    // so changing it in Configuración takes effect without touching any code.
    this.siteSettingsService.getSettings().subscribe(settings => {
      const logoUrl = resolveImageUrl(settings.logoUrl);
      if (logoUrl) {
        const link = this.document.getElementById('appFavicon') as HTMLLinkElement | null;
        if (link) {
          link.href = logoUrl;
        }
      }
      if (settings.storeName) {
        this.storeName = settings.storeName;
      }
      this.updateTitle();
    });

    // Per-route <title> (see each route's `data.title` in app.routes.ts) —
    // every page used to share the exact same tab title/SEO title regardless
    // of which one was open. Walks to the deepest activated route since the
    // leaf component (e.g. under /admin) is what carries the title, not the
    // top-level route match.
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        let route = this.activatedRoute.firstChild;
        while (route?.firstChild) {
          route = route.firstChild;
        }
        this.routeTitle = route?.snapshot.data?.['title'] ?? null;
        this.updateTitle();
        this.meta.updateTag({ name: 'description', content: route?.snapshot.data?.['description'] ?? this.defaultDescription });
      });
  }

  private updateTitle(): void {
    this.document.title = this.routeTitle
      ? `${this.routeTitle} — ${this.storeName}`
      : `${this.storeName} — Todo para tu mascota`;
  }
}
