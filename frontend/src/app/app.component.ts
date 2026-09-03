import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { RouterOutlet, RouterLink } from '@angular/router';
import { RouterModule} from '@angular/router';
import { SiteSettingsService } from './services/site-settings-service';
import { resolveImageUrl } from './constants';
import { ModalComponent } from './modal/modal.component';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterModule, ModalComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
// Root shell: just the <router-outlet/> plus the favicon/tab-title sync below.
// All actual page chrome (nav, footer) lives in each routed page component.
export class AppComponent implements OnInit {
  title = 'Kpet';

  constructor(
    private siteSettingsService: SiteSettingsService,
    @Inject(DOCUMENT) private document: Document,
  ) {}

  ngOnInit(): void {
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
        this.document.title = `${settings.storeName} — Todo para tu mascota`;
      }
    });
  }
}
