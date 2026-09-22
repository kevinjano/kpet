import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DistributorService } from '../services/distributor-service';
import { SiteSettingsService } from '../services/site-settings-service';
import { Distributor } from '../distributor';
import { Product } from '../product';
import { SiteSettings } from '../site-settings';
import { resolveImageUrl, trackById } from '../constants';
import { ProductDetailModalComponent } from '../product-detail-modal/product-detail-modal.component';
import { SiteFooterComponent } from '../site-footer/site-footer.component';
import { LoadingSpinnerComponent } from '../loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-distributor-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, ProductDetailModalComponent, SiteFooterComponent, LoadingSpinnerComponent],
  templateUrl: './distributor-detail.component.html',
  styleUrl: './distributor-detail.component.css'
})
/**
 * Public page for a single distributor: informational only (name, price, stock
 * badge per product). Deliberately has no cart, no quantity selection, and
 * creates no backend Order — see Distributor's model comment for why.
 */
export class DistributorDetailComponent implements OnInit {

  distributor: Distributor | undefined;
  notFound = false;
  loading = true;
  selectedProduct: Product | null = null;
  settings: SiteSettings | undefined;
  resolveImageUrl = resolveImageUrl;
  trackById = trackById;

  constructor(
    private route: ActivatedRoute,
    private distributorService: DistributorService,
    private siteSettingsService: SiteSettingsService,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.distributorService.getDistributorById(id).subscribe({
      next: data => {
        this.distributor = data;
        this.loading = false;
      },
      error: () => {
        this.notFound = true;
        this.loading = false;
      },
    });

    this.siteSettingsService.getSettings().subscribe(settings => {
      this.settings = settings;
    });
  }

  get productList(): Product[] {
    return this.distributor ? this.distributor.distributorProducts.map(dp => dp.product) : [];
  }

  openProductInfo(product: Product): void {
    this.selectedProduct = product;
  }

  closeProductInfo(): void {
    this.selectedProduct = null;
  }
}
