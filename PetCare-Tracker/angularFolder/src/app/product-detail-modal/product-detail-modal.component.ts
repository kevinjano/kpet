import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../product';
import { CartService } from '../services/cart-service';
import { resolveImageUrl, trackById } from '../constants';

@Component({
  selector: 'app-product-detail-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-detail-modal.component.html',
  styleUrl: './product-detail-modal.component.css'
})
/**
 * Full product detail popup, reused on both the storefront (buy button shown)
 * and distributor pages (hideAddToCart=true, informational only). Also drives
 * the "Otros productos" auto-advancing carousel of every other product, which
 * restarts on ngOnChanges so switching products (via selectProduct, i.e.
 * clicking into another "other product") doesn't leave a stale timer running.
 */
export class ProductDetailModalComponent implements OnChanges, OnDestroy {

  @Input() product!: Product;
  @Input() allProducts: Product[] = [];
  // Distributor pages are informational-only (no cart there), so they show the
  // modal with the buy button/quantity stepper hidden.
  @Input() hideAddToCart = false;
  @Output() close = new EventEmitter<void>();
  @Output() selectProduct = new EventEmitter<Product>();

  resolveImageUrl = resolveImageUrl;
  trackById = trackById;
  quantity = 1;

  otherProducts: Product[] = [];
  otherActiveIndex = 0;
  private otherTimer: ReturnType<typeof setInterval> | undefined;

  constructor(private cartService: CartService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['product'] || changes['allProducts']) {
      this.quantity = 1;
      this.otherProducts = this.allProducts.filter(p => p.id !== this.product?.id);
      this.otherActiveIndex = 0;
      this.startOtherAutoplay();
    }
  }

  ngOnDestroy(): void {
    this.stopOtherAutoplay();
  }

  startOtherAutoplay(): void {
    this.stopOtherAutoplay();
    if (this.otherProducts.length > 1) {
      this.otherTimer = setInterval(() => this.nextOther(), 3500);
    }
  }

  stopOtherAutoplay(): void {
    if (this.otherTimer) {
      clearInterval(this.otherTimer);
      this.otherTimer = undefined;
    }
  }

  nextOther(): void {
    this.otherActiveIndex = (this.otherActiveIndex + 1) % this.otherProducts.length;
  }

  prevOther(): void {
    this.otherActiveIndex = (this.otherActiveIndex - 1 + this.otherProducts.length) % this.otherProducts.length;
  }

  goToOther(index: number): void {
    this.otherActiveIndex = index;
    this.startOtherAutoplay();
  }

  pickOther(product: Product): void {
    this.selectProduct.emit(product);
  }

  unitPrice(product: Product): number {
    return product.onSale && product.salePrice != null ? product.salePrice : product.price;
  }

  increment(): void {
    this.quantity++;
  }

  decrement(): void {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  addToCart(): void {
    this.cartService.addToCart(this.product, this.quantity);
    this.close.emit();
  }

  onBackdropClick(): void {
    this.close.emit();
  }
}
