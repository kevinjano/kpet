import { AfterViewInit, Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProductService } from '../services/product-service';
import { SiteSettingsService } from '../services/site-settings-service';
import { CartService } from '../services/cart-service';
import { FavoriteService } from '../services/favorite-service';
import { ReviewService } from '../services/review-service';
import { RatingSummary } from '../review';
import { Product } from '../product';
import { SiteSettings } from '../site-settings';
import { resolveImageUrl, trackById, buildWhatsappUrl, isDirectVideoFile, isVideoEmbeddable, toEmbedVideoUrl, extractYoutubeId } from '../constants';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { BannerCarouselComponent } from '../banner-carousel/banner-carousel.component';
import { ProductDetailModalComponent } from '../product-detail-modal/product-detail-modal.component';
import { CartToastComponent } from '../cart-toast/cart-toast.component';
import { SiteNavComponent } from '../site-nav/site-nav.component';
import { SiteFooterComponent } from '../site-footer/site-footer.component';

interface CategoryCard {
  category: 'Perros' | 'Gatos' | 'Accesorios';
  label: string;
  imageUrl: string | null;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  standalone: true,
  styleUrl: './home.component.css',
  imports: [
    CommonModule,
    RouterModule,
    BannerCarouselComponent,
    ProductDetailModalComponent,
    CartToastComponent,
    SiteNavComponent,
    SiteFooterComponent,
  ],
})
// Landing page: hero banner (nav overlaid on top of it), the 3 big category
// cards into /tienda, a social "Síguenos" strip, a horizontal-scroll
// featured-products carousel, and the icon row (pedido/distribuidores/
// trabaja con nosotros). The old inline catalog grid + filters + "Conócenos"
// bio section moved out to TiendaComponent and SobreNosotrosComponent
// respectively — this page is now purely a landing/entry point.
export class HomeComponent implements OnInit, AfterViewInit {
  products: Product[] = [];
  settings: SiteSettings | undefined;
  bannerImages: string[] = [];
  selectedProduct: Product | null = null;
  resolveImageUrl = resolveImageUrl;
  buildWhatsappUrl = buildWhatsappUrl;
  isDirectVideoFile = isDirectVideoFile;
  trackById = trackById;

  cartQuantities = new Map<number, number>();
  ratingSummaries = new Map<number, RatingSummary>();

  // Same "Conócenos" video as /sobre-nosotros, shown again here right below
  // the featured carousel — a facade-then-iframe swap (see the ngOnInit
  // comment on the settings subscription) so mobile browsers actually allow
  // inline playback instead of refusing an unplayed pre-rendered iframe.
  safeAboutVideoUrl: SafeResourceUrl | null = null;
  private aboutVideoRawEmbedUrl: string | null = null;
  aboutVideoThumbnail: string | null = null;
  aboutVideoActivated = false;

  @ViewChild('featuredScroll') featuredScrollRef?: ElementRef<HTMLElement>;
  @ViewChild('heroWrap') heroWrapRef?: ElementRef<HTMLElement>;
  // Passed to the nav as [scrolledThreshold] so it turns solid exactly when
  // the hero ends, not partway through it (the hero's own height varies a
  // lot by breakpoint/aspect-ratio — see home.component.css).
  heroHeight = 400;

  constructor(
    private productService: ProductService,
    private siteSettingsService: SiteSettingsService,
    public cartService: CartService,
    public favoriteService: FavoriteService,
    private reviewService: ReviewService,
    private sanitizer: DomSanitizer,
  ) {
    // Seed the hero banner from the last-known settings *before* the first
    // render, not just in ngOnInit's subscription — that fires one change
    // detection cycle later, which was enough of a gap to flash the
    // no-banner placeholder on reload before the real one popped in.
    const cached = this.siteSettingsService.getCachedSettings();
    if (cached) {
      this.applySettings(cached);
    }
  }

  ngOnInit(): void {
    this.productService.getProducts().subscribe(data => {
      this.products = data.filter(p => p.active);
    });

    this.siteSettingsService.getSettings().subscribe(data => this.applySettings(data));

    this.cartService.cart$.subscribe(items => {
      this.cartQuantities = new Map(items.map(item => [item.product.id, item.quantity]));
    });

    this.reviewService.getRatingSummary().subscribe(summaries => {
      this.ratingSummaries = new Map(summaries.map(s => [s.productId, s]));
    });
  }

  ngAfterViewInit(): void {
    this.measureHero();
  }

  private applySettings(data: SiteSettings): void {
    this.settings = data;
    this.bannerImages = (data.bannerUrls ?? [])
      .map(url => resolveImageUrl(url))
      .filter((url): url is string => !!url);
    this.categoryCards = [
      { category: 'Perros', label: 'Perros', imageUrl: data.categoryImagePerros ? resolveImageUrl(data.categoryImagePerros) : null },
      { category: 'Gatos', label: 'Gatos', imageUrl: data.categoryImageGatos ? resolveImageUrl(data.categoryImageGatos) : null },
      { category: 'Accesorios', label: 'Accesorios', imageUrl: data.categoryImageAccesorios ? resolveImageUrl(data.categoryImageAccesorios) : null },
    ];

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
  }

  @HostListener('window:resize')
  measureHero(): void {
    const el = this.heroWrapRef?.nativeElement;
    if (el) {
      setTimeout(() => { this.heroHeight = el.offsetHeight; });
    }
  }

  // Computed once when settings load (in the ngOnInit subscription above),
  // not as a getter — a getter returns new object literals on every change
  // detection cycle, which made *ngFor destroy/recreate these cards (and
  // replay their kpet-fade-up animation) on every scroll event.
  categoryCards: CategoryCard[] = [];

  // Offers first (most likely to convert), then whatever's newest — capped
  // so the carousel stays a quick horizontal scroll, not the whole catalog.
  get featuredProducts(): Product[] {
    const onSale = this.products.filter(p => p.onSale);
    const rest = this.products.filter(p => !p.onSale).sort((a, b) => b.id - a.id);
    return [...onSale, ...rest].slice(0, 12);
  }

  trackByCategory(_index: number, card: CategoryCard): string {
    return card.category;
  }

  getCartQuantity(productId: number): number {
    return this.cartQuantities.get(productId) ?? 0;
  }

  getRatingSummary(productId: number): RatingSummary | undefined {
    return this.ratingSummaries.get(productId);
  }

  activateAboutVideo(): void {
    if (!this.aboutVideoRawEmbedUrl) {
      return;
    }
    this.aboutVideoActivated = true;
    const separator = this.aboutVideoRawEmbedUrl.includes('?') ? '&' : '?';
    this.safeAboutVideoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(`${this.aboutVideoRawEmbedUrl}${separator}autoplay=1`);
  }

  scrollFeatured(direction: -1 | 1): void {
    const el = this.featuredScrollRef?.nativeElement;
    if (!el) {
      return;
    }
    el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: 'smooth' });
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
