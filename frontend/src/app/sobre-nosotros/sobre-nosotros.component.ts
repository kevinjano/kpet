import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SiteSettingsService } from '../services/site-settings-service';
import { SiteSettings } from '../site-settings';
import { buildWhatsappUrl, resolveImageUrl } from '../constants';
import { SiteNavComponent } from '../site-nav/site-nav.component';
import { SiteFooterComponent } from '../site-footer/site-footer.component';
import { LoadingSpinnerComponent } from '../loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-sobre-nosotros',
  standalone: true,
  imports: [CommonModule, SiteNavComponent, SiteFooterComponent, LoadingSpinnerComponent],
  templateUrl: './sobre-nosotros.component.html',
  styleUrl: './sobre-nosotros.component.css',
})
// Standalone "Conócenos" — used to be a same-page anchor section on Home;
// now its own route so the nav item is a real link. Same aboutText/social
// content as before, plus the missión/visión/compromiso fields. The video
// (aboutVideoUrl) still plays on Home — this page swapped its own copy for
// the heart-framed "Nuestro compromiso" image instead.
export class SobreNosotrosComponent implements OnInit {
  settings: SiteSettings | undefined;
  settingsLoaded = false;
  buildWhatsappUrl = buildWhatsappUrl;
  resolveImageUrl = resolveImageUrl;

  constructor(private siteSettingsService: SiteSettingsService) {}

  ngOnInit(): void {
    this.siteSettingsService.getSettings().subscribe(data => {
      this.settings = data;
      this.settingsLoaded = true;
    });
  }
}
