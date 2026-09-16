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

  // Fixed points (as % of the hero) tracing a gentle wandering path across the
  // header, alternating rotation so consecutive paws read left/right like a
  // real footprint trail rather than a repeated stamp.
  pawTrail = [
    { left: 3, top: 72, rot: -20 },
    { left: 11, top: 52, rot: 12 },
    { left: 19, top: 66, rot: -18 },
    { left: 27, top: 40, rot: 16 },
    { left: 36, top: 58, rot: -14 },
    { left: 45, top: 34, rot: 20 },
    { left: 54, top: 50, rot: -16 },
    { left: 63, top: 28, rot: 14 },
    { left: 72, top: 46, rot: -12 },
    { left: 81, top: 62, rot: 18 },
    { left: 90, top: 40, rot: -20 },
  ];

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
