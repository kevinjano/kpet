import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SiteSettingsService } from '../services/site-settings-service';
import { SiteSettings } from '../site-settings';
import { resolveImageUrl, DEFAULT_LOGO_URL } from '../constants';
import { SiteFooterComponent } from '../site-footer/site-footer.component';

@Component({
  selector: 'app-privacidad',
  standalone: true,
  imports: [CommonModule, RouterModule, SiteFooterComponent],
  templateUrl: './privacidad.component.html',
  styleUrl: './privacidad.component.css'
})
// Static "Política de Privacidad" page — generic e-commerce boilerplate
// adapted to this store, not a substitute for a lawyer's review.
export class PrivacidadComponent implements OnInit {
  settings: SiteSettings | undefined;
  resolveImageUrl = resolveImageUrl;
  defaultLogoUrl = DEFAULT_LOGO_URL;
  lastUpdated = 'septiembre de 2026';

  constructor(private siteSettingsService: SiteSettingsService) {}

  ngOnInit(): void {
    this.siteSettingsService.getSettings().subscribe(settings => {
      this.settings = settings;
    });
  }
}
