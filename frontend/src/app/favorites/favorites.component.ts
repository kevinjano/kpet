import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FavoriteService } from '../services/favorite-service';
import { CartService } from '../services/cart-service';
import { AuthService } from '../services/auth-service';
import { SiteSettingsService } from '../services/site-settings-service';
import { SiteSettings } from '../site-settings';
import { Product } from '../product';
import { resolveImageUrl, trackById, DEFAULT_LOGO_URL } from '../constants';
import { SiteFooterComponent } from '../site-footer/site-footer.component';

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [CommonModule, RouterModule, SiteFooterComponent],
  templateUrl: './favorites.component.html',
  styleUrl: './favorites.component.css'
})
// "Favoritos" — the logged-in customer's saved products (see FavoriteService).
// AuthGuard isn't applied to this route since a guest can land here and just
// see an empty/login-prompt state rather than being redirected away.
export class FavoritesComponent implements OnInit {
  settings: SiteSettings | undefined;
  resolveImageUrl = resolveImageUrl;
  defaultLogoUrl = DEFAULT_LOGO_URL;
  trackById = trackById;

  // productId -> quantity currently in the cart — same map as HomeComponent,
  // so the "Añadir al carrito" button here also turns into a +/- stepper.
  cartQuantities = new Map<number, number>();

  constructor(
    public favoriteService: FavoriteService,
    public cartService: CartService,
    public authService: AuthService,
    private siteSettingsService: SiteSettingsService,
  ) {}

  ngOnInit(): void {
    this.favoriteService.loadFavorites();
    this.siteSettingsService.getSettings().subscribe(settings => {
      this.settings = settings;
    });
    this.cartService.cart$.subscribe(items => {
      this.cartQuantities = new Map(items.map(item => [item.product.id, item.quantity]));
    });
  }

  getCartQuantity(productId: number): number {
    return this.cartQuantities.get(productId) ?? 0;
  }

  removeFavorite(product: Product, event: Event): void {
    event.stopPropagation();
    this.favoriteService.toggleFavorite(product);
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
}
