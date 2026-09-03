import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DistributorService } from '../services/distributor-service';
import { SiteSettingsService } from '../services/site-settings-service';
import { Distributor } from '../distributor';
import { SiteSettings } from '../site-settings';
import { resolveImageUrl, trackById, DEFAULT_LOGO_URL } from '../constants';

@Component({
  selector: 'app-distributors',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './distributors.component.html',
  styleUrl: './distributors.component.css'
})
// Public directory of active distributors, filterable by city (client-side —
// `cities` is derived once from the fetched list, not a separate API call).
export class DistributorsComponent implements OnInit {

  distributors: Distributor[] = [];
  cities: string[] = [];
  selectedCity: string | null = null;
  settings: SiteSettings | undefined;
  resolveImageUrl = resolveImageUrl;
  defaultLogoUrl = DEFAULT_LOGO_URL;
  trackById = trackById;

  constructor(
    private distributorService: DistributorService,
    private siteSettingsService: SiteSettingsService,
  ) {}

  ngOnInit(): void {
    this.distributorService.getDistributors().subscribe(data => {
      this.distributors = data.filter(d => d.active);
      this.cities = Array.from(new Set(this.distributors.map(d => d.city))).sort();
    });

    this.siteSettingsService.getSettings().subscribe(settings => {
      this.settings = settings;
    });
  }

  get visibleDistributors(): Distributor[] {
    return this.distributors.filter(d => !this.selectedCity || d.city === this.selectedCity);
  }

  selectCity(city: string | null): void {
    this.selectedCity = city;
  }
}
