import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ProductService } from '../services/product-service';
import { CartService } from '../services/cart-service';
import { FavoriteService } from '../services/favorite-service';
import { ReviewService } from '../services/review-service';
import { RatingSummary } from '../review';
import { Product } from '../product';
import { SiteSettingsService } from '../services/site-settings-service';
import { SiteSettings } from '../site-settings';
import { resolveImageUrl, trackById } from '../constants';
import { SiteNavComponent } from '../site-nav/site-nav.component';
import { SiteFooterComponent } from '../site-footer/site-footer.component';
import { ProductDetailModalComponent } from '../product-detail-modal/product-detail-modal.component';
import { CartToastComponent } from '../cart-toast/cart-toast.component';
import { PaginationComponent } from '../pagination/pagination.component';
import { PawsLoaderComponent } from '../paws-loader/paws-loader.component';

type SortOption = 'relevancia' | 'precio-asc' | 'precio-desc' | 'nuevos';

// The 4 filter chips the client asked for, in this fixed order — "Novedades"
// and "Ver todo" from the old home-page nav are gone on purpose: with no
// dedicated chip, a product still tagged "Novedades" just shows up in the
// unfiltered (no chip selected) view instead of being unreachable.
const FILTER_CATEGORIES = ['Perros', 'Gatos', 'Accesorios'];

@Component({
  selector: 'app-tienda',
  standalone: true,
  imports: [CommonModule, FormsModule, SiteNavComponent, SiteFooterComponent, ProductDetailModalComponent, CartToastComponent, PaginationComponent, PawsLoaderComponent],
  templateUrl: './tienda.component.html',
  styleUrl: './tienda.component.css',
})
// The full catalog + filters, split out of what used to be the home page —
// reachable on its own (/tienda) and via the home page's big category cards
// (?categoria=Perros / ?categoria=Gatos / ?categoria=Accesorios /
// ?oferta=1), read once on init.
export class TiendaComponent implements OnInit {
  @ViewChild('productsGrid') productsGridRef?: ElementRef<HTMLElement>;

  categories = FILTER_CATEGORIES;
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
  productsLoaded = false;
  settings: SiteSettings | undefined;
  resolveImageUrl = resolveImageUrl;
  trackById = trackById;
  selectedProduct: Product | null = null;

  productsPage = 1;
  readonly productsPageSize = 12;

  // True while the products API call is in flight, OR while the current
  // page's product images are still being fetched — kept true across both
  // so the loading screen covers exactly the stretch that used to render as
  // a slow pop-in of blank image boxes.
  imagesLoading = true;
  private imagesLoadToken = 0;

  cartQuantities = new Map<number, number>();
  ratingSummaries = new Map<number, RatingSummary>();

  constructor(
    private productService: ProductService,
    private siteSettingsService: SiteSettingsService,
    public cartService: CartService,
    public favoriteService: FavoriteService,
    private reviewService: ReviewService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const categoria = params.get('categoria');
    if (categoria && this.categories.includes(categoria)) {
      this.selectedCategory = categoria;
    }
    this.showOffersOnly = params.get('oferta') === '1';

    this.productService.getProducts().subscribe(data => {
      this.products = data.filter(p => p.active);
      this.productsLoaded = true;
      this.preloadCurrentPageImages();
    });

    this.siteSettingsService.getSettings().subscribe(settings => this.settings = settings);

    this.cartService.cart$.subscribe(items => {
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

  get pagedProducts(): Product[] {
    const start = (this.productsPage - 1) * this.productsPageSize;
    return this.visibleProducts.slice(start, start + this.productsPageSize);
  }

  // Called by every filter/search/sort/page action so the loading screen +
  // image preloading always match what's about to render, instead of the
  // grid quietly popping in image-by-image while the user waits.
  private preloadCurrentPageImages(): void {
    const token = ++this.imagesLoadToken;
    const urls = this.pagedProducts
      .map(p => p.imageUrl ? this.resolveImageUrl(p.imageUrl) : null)
      .filter((url): url is string => !!url);

    if (urls.length === 0) {
      this.imagesLoading = false;
      return;
    }

    this.imagesLoading = true;
    let remaining = urls.length;
    const onOneDone = () => {
      remaining--;
      if (remaining <= 0 && token === this.imagesLoadToken) {
        this.imagesLoading = false;
      }
    };
    urls.forEach(url => {
      const img = new Image();
      img.onload = onOneDone;
      img.onerror = onOneDone;
      img.src = url;
    });
    // Never block the page for more than a couple seconds, even if an image
    // stalls or 404s.
    setTimeout(() => {
      if (token === this.imagesLoadToken) {
        this.imagesLoading = false;
      }
    }, 2500);
  }

  goToProductsPage(page: number): void {
    this.productsPage = page;
    this.preloadCurrentPageImages();
    this.productsGridRef?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private resetToFirstPage(): void {
    this.productsPage = 1;
    this.preloadCurrentPageImages();
  }

  onSearchTermChange(term: string): void {
    this.searchTerm = term;
    this.resetToFirstPage();
  }

  clearFilters(): void {
    this.selectedCategory = null;
    this.showOffersOnly = false;
    this.resetToFirstPage();
  }

  get productsSectionTitle(): string {
    if (this.searchTerm.trim()) {
      return `Resultados para "${this.searchTerm.trim()}"`;
    }
    if (this.showOffersOnly) {
      return 'Productos en oferta';
    }
    if (this.selectedCategory) {
      return `Productos para ${this.selectedCategory}`;
    }
    return 'Todos los productos';
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.resetToFirstPage();
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
    this.resetToFirstPage();
  }

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
    this.selectedCategory = this.selectedCategory === category ? null : category;
    this.showOffersOnly = false;
    this.resetToFirstPage();
  }

  selectOffers(): void {
    this.showOffersOnly = !this.showOffersOnly;
    this.selectedCategory = null;
    this.resetToFirstPage();
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
}
