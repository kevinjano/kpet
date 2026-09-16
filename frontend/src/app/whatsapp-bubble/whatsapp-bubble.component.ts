import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { SiteSettingsService } from '../services/site-settings-service';

@Component({
  selector: 'app-whatsapp-bubble',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './whatsapp-bubble.component.html',
  styleUrl: './whatsapp-bubble.component.css'
})
// Floating "contact us on WhatsApp" bubble, mounted once at the app root
// (see app.component.html) — hides itself on /admin/** routes since it's a
// storefront contact tool, not something the admin backoffice needs.
export class WhatsappBubbleComponent implements OnInit {
  whatsappNumber: string | null = null;
  isAdminRoute = false;

  constructor(
    private siteSettingsService: SiteSettingsService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.siteSettingsService.getSettings().subscribe(settings => {
      this.whatsappNumber = settings.whatsappNumber || null;
    });

    this.isAdminRoute = this.router.url.startsWith('/admin');
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(event => {
        this.isAdminRoute = event.urlAfterRedirects.startsWith('/admin');
      });
  }
}
