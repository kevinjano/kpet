import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { SiteSettingsService } from '../services/site-settings-service';
import { SiteSettings } from '../site-settings';
import { buildWhatsappUrl, resolveImageUrl, isDirectVideoFile, isVideoEmbeddable, toEmbedVideoUrl, extractYoutubeId } from '../constants';
import { SiteNavComponent } from '../site-nav/site-nav.component';
import { SiteFooterComponent } from '../site-footer/site-footer.component';

@Component({
  selector: 'app-sobre-nosotros',
  standalone: true,
  imports: [CommonModule, SiteNavComponent, SiteFooterComponent],
  templateUrl: './sobre-nosotros.component.html',
  styleUrl: './sobre-nosotros.component.css',
})
// Standalone "Conócenos" — used to be a same-page anchor section on Home;
// now its own route so the nav item is a real link. Same aboutText/video/
// social content as before, plus the new missión/visión fields.
export class SobreNosotrosComponent implements OnInit {
  settings: SiteSettings | undefined;
  buildWhatsappUrl = buildWhatsappUrl;
  resolveImageUrl = resolveImageUrl;
  isDirectVideoFile = isDirectVideoFile;

  safeAboutVideoUrl: SafeResourceUrl | null = null;
  private aboutVideoRawEmbedUrl: string | null = null;
  aboutVideoThumbnail: string | null = null;
  aboutVideoActivated = false;

  constructor(
    private siteSettingsService: SiteSettingsService,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    this.siteSettingsService.getSettings().subscribe(data => {
      this.settings = data;
      this.aboutVideoActivated = false;
      this.aboutVideoThumbnail = null;
      this.aboutVideoRawEmbedUrl = null;
      this.safeAboutVideoUrl = null;
      if (data.aboutVideoUrl && !isDirectVideoFile(data.aboutVideoUrl) && isVideoEmbeddable(data.aboutVideoUrl)) {
        this.aboutVideoRawEmbedUrl = toEmbedVideoUrl(data.aboutVideoUrl);
        const youtubeId = extractYoutubeId(data.aboutVideoUrl);
        if (youtubeId) {
          this.aboutVideoThumbnail = `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
        } else {
          this.safeAboutVideoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.aboutVideoRawEmbedUrl);
        }
      }
    });
  }

  activateAboutVideo(): void {
    if (!this.aboutVideoRawEmbedUrl) {
      return;
    }
    this.aboutVideoActivated = true;
    const separator = this.aboutVideoRawEmbedUrl.includes('?') ? '&' : '?';
    this.safeAboutVideoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(`${this.aboutVideoRawEmbedUrl}${separator}autoplay=1`);
  }
}
