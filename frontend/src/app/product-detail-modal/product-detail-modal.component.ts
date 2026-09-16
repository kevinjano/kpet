import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Product } from '../product';
import { Review } from '../review';
import { CartService } from '../services/cart-service';
import { ReviewService } from '../services/review-service';
import { AuthService } from '../services/auth-service';
import { ModalService } from '../services/modal-service';
import { resolveImageUrl, trackById } from '../constants';

@Component({
  selector: 'app-product-detail-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  reviews: Review[] = [];
  reviewsLoaded = false;
  newRating = 0;
  newComment = '';
  submittingReview = false;

  constructor(
    private cartService: CartService,
    private reviewService: ReviewService,
    private authService: AuthService,
    private modalService: ModalService,
    private router: Router,
  ) {}

  activeImageIndex = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['product'] || changes['allProducts']) {
      this.quantity = 1;
      this.activeImageIndex = 0;
      this.otherProducts = this.pickRandomOthers(6);
      this.otherActiveIndex = 0;
      this.startOtherAutoplay();
      this.loadReviews();
    }
  }

  // Cover image first, then the extra gallery — de-duplicated in case the
  // same URL somehow ended up in both (e.g. an old product edited before
  // the gallery field existed).
  get galleryImages(): string[] {
    const images = [this.product?.imageUrl, ...(this.product?.imageUrls ?? [])]
      .filter((url): url is string => !!url);
    return [...new Set(images)];
  }

  get activeImage(): string | null {
    return this.galleryImages[this.activeImageIndex] ?? null;
  }

  selectImage(index: number): void {
    this.activeImageIndex = index;
  }

  // A fresh random sample of up to `count` other products every time the
  // modal opens/changes product, rather than the full catalog in order — so
  // "Otros productos" surfaces different things across visits instead of
  // always the same first few by id.
  private pickRandomOthers(count: number): Product[] {
    const candidates = this.allProducts.filter(p => p.id !== this.product?.id);
    const shuffled = [...candidates];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, count);
  }

  private loadReviews(): void {
    this.reviewsLoaded = false;
    this.newRating = 0;
    this.newComment = '';
    this.reviewService.getReviewsForProduct(this.product.id).subscribe(reviews => {
      this.reviews = reviews;
      this.reviewsLoaded = true;
    });
  }

  get averageRating(): number {
    if (this.reviews.length === 0) {
      return 0;
    }
    return this.reviews.reduce((sum, r) => sum + r.rating, 0) / this.reviews.length;
  }

  get myUserId(): number {
    return Number(localStorage.getItem('userId'));
  }

  get hasReviewed(): boolean {
    return this.reviews.some(r => r.userId === this.myUserId);
  }

  canDelete(review: Review): boolean {
    return review.userId === this.myUserId || localStorage.getItem('role') === 'Admin';
  }

  setRating(rating: number): void {
    this.newRating = rating;
  }

  async submitReview(): Promise<void> {
    if (!this.authService.isLoggedIn()) {
      const goToLogin = await this.modalService.confirm({
        title: 'Inicia sesión',
        message: 'Necesitas iniciar sesión para dejar una reseña.',
        confirmText: 'Iniciar sesión',
      });
      if (goToLogin) {
        this.close.emit();
        this.router.navigate(['/login']);
      }
      return;
    }
    if (this.newRating < 1) {
      this.modalService.error('Elegí una calificación de 1 a 5 estrellas.');
      return;
    }

    this.submittingReview = true;
    this.reviewService.createReview(this.product.id, this.newRating, this.newComment).subscribe({
      next: review => {
        this.reviews = [review, ...this.reviews];
        this.newRating = 0;
        this.newComment = '';
        this.submittingReview = false;
      },
      error: err => {
        this.submittingReview = false;
        this.modalService.error(err?.error?.error || 'Error al enviar la reseña.');
      }
    });
  }

  async deleteReview(review: Review): Promise<void> {
    const confirmed = await this.modalService.confirm({
      title: 'Eliminar reseña',
      message: '¿Eliminar tu reseña de este producto?',
      confirmText: 'Eliminar',
    });
    if (!confirmed) {
      return;
    }
    this.reviewService.deleteReview(review.id).subscribe(() => {
      this.reviews = this.reviews.filter(r => r.id !== review.id);
    });
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
