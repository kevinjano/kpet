import { AfterViewInit, Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ProductService } from '../services/product-service';
import { SiteSettingsService } from '../services/site-settings-service';
import { CartService } from '../services/cart-service';
import { FavoriteService } from '../services/favorite-service';
import { ReviewService } from '../services/review-service';
import { RatingSummary } from '../review';
import { AuthService } from '../services/auth-service';
import { Product } from '../product';
import { SiteSettings } from '../site-settings';
import { PRODUCT_CATEGORIES, resolveImageUrl, trackById, DEFAULT_LOGO_URL, buildWhatsappUrl } from '../constants';
import { BannerCarouselComponent } from '../banner-carousel/banner-carousel.component';
import { ProductDetailModalComponent } from '../product-detail-modal/product-detail-modal.component';
import { CartToastComponent } from '../cart-toast/cart-toast.component';

type SortOption = 'relevancia' | 'precio-asc' | 'precio-desc' | 'nuevos';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  standalone: true,
  styleUrl: './home.component.css',
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    BannerCarouselComponent,
    ProductDetailModalComponent,
    CartToastComponent,
  ],
})
// The public storefront landing page: category/offer filtering (visibleProducts
// getter, all client-side against the already-fetched full catalog), the hero
// banner carousel, and the "Conócenos" about/social section.
export class HomeComponent implements OnInit, AfterViewInit {

  categories = PRODUCT_CATEGORIES;
  selectedCategory: string | null = null;
  showOffersOnly = false;
  searchTerm = '';
  sortOption: SortOption = 'relevancia';
  sortMenuOpen = false;
  sortOptions: { value: SortOption; label: string }[] = [
    { value: 'relevancia', label: 'Más relevantes' },
    { value: 'nuevos', label: 'Más nuevos' },
    { value: 'precio-asc', label: 'Precio: menor a mayor' },
    { value: 'precio-desc', label: 'Precio: mayor a menor' },
  ];

  products: Product[] = [];
  // Distinguishes "still loading" from "genuinely empty" so the "no hay
  // productos" message doesn't flash on screen for a moment before the first
  // catalog response arrives.
  productsLoaded = false;
  settings: SiteSettings | undefined;
  bannerImages: string[] = [];
  cartItemCount = 0;
  mobileMenuOpen = false;
  selectedProduct: Product | null = null;
  resolveImageUrl = resolveImageUrl;
  defaultLogoUrl = DEFAULT_LOGO_URL;
  buildWhatsappUrl = buildWhatsappUrl;
  trackById = trackById;

  // productId -> quantity currently in the cart, so each "Añadir al carrito"
  // button can show how many of that product are already in there.
  cartQuantities = new Map<number, number>();

  // productId -> {average, count}, fetched once so every card can show a
  // star rating without one request per product.
  ratingSummaries = new Map<number, RatingSummary>();

  // Mobile drawer's sliding active-category pill — same offsetTop/offsetHeight
  // mechanic as the admin sidebar's pill (see AdminNavComponent), just vertical
  // here too since the drawer's category list is also a vertical stack.
  @ViewChild('categoryNavLinks') categoryNavLinksRef?: ElementRef<HTMLElement>;
  sliderTop = 0;
  sliderHeight = 0;
  sliderReady = false;

  constructor(
    private productService: ProductService,
    private siteSettingsService: SiteSettingsService,
    public cartService: CartService,
    public favoriteService: FavoriteService,
    private reviewService: ReviewService,
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.productService.getProducts().subscribe(data => {
      this.products = data.filter(p => p.active);
      this.productsLoaded = true;
    });

    this.siteSettingsService.getSettings().subscribe(data => {
      this.settings = data;
      this.bannerImages = (data.bannerUrls ?? [])
        .map(url => resolveImageUrl(url))
        .filter((url): url is string => !!url);
    });

    this.cartService.cart$.subscribe(items => {
      this.cartItemCount = this.cartService.getItemCount();
      this.cartQuantities = new Map(items.map(item => [item.product.id, item.quantity]));
    });

    this.reviewService.getRatingSummary().subscribe(summaries => {
      this.ratingSummaries = new Map(summaries.map(s => [s.productId, s]));
    });
  }

  getCartQuantity(productId: number): number {
    return this.cartQuantities.get(productId) ?? 0;
  }

  getRatingSummary(productId: number): RatingSummary | undefined {
    return this.ratingSummaries.get(productId);
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.updateSliderToActive(), 0);
  }

  private updateSliderToActive(): void {
    const container = this.categoryNavLinksRef?.nativeElement;
    if (!container) {
      return;
    }
    const active = container.querySelector('a.active') as HTMLElement | null;
    if (active) {
      this.sliderTop = active.offsetTop;
      this.sliderHeight = active.offsetHeight;
      this.sliderReady = true;
    }
  }

  onCategoryLinkClick(event: MouseEvent): void {
    const target = event.currentTarget as HTMLElement;
    this.sliderTop = target.offsetTop;
    this.sliderHeight = target.offsetHeight;
    this.sliderReady = true;
  }

  // "Conócenos" doesn't navigate anywhere — it's a same-page nav item that
  // just scrolls down to the about/social section further down this page.
  // A no-op if that section isn't rendered (settings has no bio/social links yet).
  scrollToAbout(): void {
    document.getElementById('conocenos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  get visibleProducts(): Product[] {
    const term = this.searchTerm.trim().toLowerCase();
    const filtered = this.products.filter(p => {
      const matchesCategory = !this.selectedCategory || p.category === this.selectedCategory;
      const matchesOffer = !this.showOffersOnly || p.onSale;
      const matchesSearch = !term
        || p.name.toLowerCase().includes(term)
        || p.description.toLowerCase().includes(term);
      return matchesCategory && matchesOffer && matchesSearch;
    });

    const sorted = [...filtered];
    switch (this.sortOption) {
      case 'precio-asc':
        sorted.sort((a, b) => this.effectivePrice(a) - this.effectivePrice(b));
        break;
      case 'precio-desc':
        sorted.sort((a, b) => this.effectivePrice(b) - this.effectivePrice(a));
        break;
      case 'nuevos':
        sorted.sort((a, b) => b.id - a.id);
        break;
    }
    return sorted;
  }

  private effectivePrice(product: Product): number {
    return product.onSale && product.salePrice != null ? product.salePrice : product.price;
  }

  get productsSectionTitle(): string {
    if (this.searchTerm.trim()) {
      return `Resultados para "${this.searchTerm.trim()}"`;
    }
    if (this.showOffersOnly) {
      return 'Productos en oferta';
    }
    if (this.selectedCategory === 'Novedades') {
      return 'Novedades';
    }
    if (this.selectedCategory) {
      return `Productos para ${this.selectedCategory}`;
    }
    return 'Productos';
  }

  clearSearch(): void {
    this.searchTerm = '';
  }

  get sortLabel(): string {
    return this.sortOptions.find(o => o.value === this.sortOption)?.label ?? 'Más relevantes';
  }

  toggleSortMenu(): void {
    this.sortMenuOpen = !this.sortMenuOpen;
  }

  selectSort(option: SortOption): void {
    this.sortOption = option;
    this.sortMenuOpen = false;
  }

  // Closes the custom sort dropdown when clicking anywhere outside it —
  // native <select> gets this for free, a hand-rolled one doesn't.
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.sortMenuOpen) {
      return;
    }
    const target = event.target as HTMLElement;
    if (!target.closest('.products-sort')) {
      this.sortMenuOpen = false;
    }
  }

  selectCategory(category: string | null): void {
    this.selectedCategory = category;
    this.showOffersOnly = false;
    this.mobileMenuOpen = false;
  }

  selectOffers(): void {
    this.showOffersOnly = true;
    this.selectedCategory = null;
    this.mobileMenuOpen = false;
  }

  addToCart(product: Product): void {
    this.cartService.addToCart(product, 1);
  }

  incrementCartQty(product: Product, event: Event): void {
    event.stopPropagation();
    this.cartService.updateQuantity(product.id, this.getCartQuantity(product.id) + 1);
  }

  decrementCartQty(product: Product, event: Event): void {
    event.stopPropagation();
    this.cartService.updateQuantity(product.id, this.getCartQuantity(product.id) - 1);
  }

  toggleFavorite(product: Product, event: Event): void {
    event.stopPropagation();
    this.favoriteService.toggleFavorite(product);
  }

  openProductInfo(product: Product): void {
    this.selectedProduct = product;
  }

  closeProductInfo(): void {
    this.selectedProduct = null;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  openLoginDialog() {
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  get userName(): string | null {
    return this.authService.getFirstName();
  }

  isAdmin(): boolean {
    return localStorage.getItem('role') === 'Admin';
  }

  goToAccount(): void {
    this.router.navigate([this.isAdmin() ? '/admin' : '/mon-compte']);
  }
}
