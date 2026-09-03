import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DistributorService } from '../services/distributor-service';
import { Distributor } from '../distributor';
import { Product } from '../product';
import { resolveImageUrl, trackById } from '../constants';
import { ProductDetailModalComponent } from '../product-detail-modal/product-detail-modal.component';
import { ModalService } from '../services/modal-service';

@Component({
  selector: 'app-distributor-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, ProductDetailModalComponent],
  templateUrl: './distributor-detail.component.html',
  styleUrl: './distributor-detail.component.css'
})
/**
 * Public page for a single distributor: informational only (name, price, stock
 * badge per product) plus one WhatsApp CTA (contactOnWhatsapp) that opens a
 * fixed generic message to that distributor's own number. Deliberately has no
 * cart, no quantity selection, and creates no backend Order — see Distributor's
 * model comment for why.
 */
export class DistributorDetailComponent implements OnInit {

  distributor: Distributor | undefined;
  notFound = false;
  selectedProduct: Product | null = null;
  resolveImageUrl = resolveImageUrl;
  trackById = trackById;

  constructor(
    private route: ActivatedRoute,
    private distributorService: DistributorService,
    private modalService: ModalService,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.distributorService.getDistributorById(id).subscribe({
      next: data => this.distributor = data,
      error: () => this.notFound = true,
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

  contactOnWhatsapp(): void {
    if (!this.distributor) {
      return;
    }
    if (!this.distributor.whatsappNumber) {
      this.modalService.error('Este distribuidor todavía no configuró su número de WhatsApp.');
      return;
    }

    const message = `Hola, me gustaría adquirir productos de ${this.distributor.name}`;
    const digitsOnly = this.distributor.whatsappNumber.replace(/\D/g, '');
    const url = `https://wa.me/${digitsOnly}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  }
}
