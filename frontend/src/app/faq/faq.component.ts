import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FaqService } from '../services/faq-service';
import { SiteSettingsService } from '../services/site-settings-service';
import { Faq } from '../faq';
import { SiteSettings } from '../site-settings';
import { resolveImageUrl, trackById, DEFAULT_LOGO_URL } from '../constants';
import { SiteFooterComponent } from '../site-footer/site-footer.component';

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [CommonModule, RouterModule, SiteFooterComponent],
  templateUrl: './faq.component.html',
  styleUrl: './faq.component.css'
})
// Public "Preguntas Frecuentes" page — accordion list, one open at a time.
// The backend already scopes findAll() to published questions only.
export class FaqComponent implements OnInit {

  faqs: Faq[] = [];
  settings: SiteSettings | undefined;
  resolveImageUrl = resolveImageUrl;
  defaultLogoUrl = DEFAULT_LOGO_URL;
  trackById = trackById;
  openId: number | null = null;

  constructor(
    private faqService: FaqService,
    private siteSettingsService: SiteSettingsService,
  ) {}

  ngOnInit(): void {
    this.faqService.getFaqs().subscribe(data => {
      this.faqs = data;
    });

    this.siteSettingsService.getSettings().subscribe(settings => {
      this.settings = settings;
    });
  }

  toggle(id: number): void {
    this.openId = this.openId === id ? null : id;
  }
}
