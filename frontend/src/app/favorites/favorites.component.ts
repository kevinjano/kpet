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

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [CommonModule, RouterModule],
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
  }

  removeFavorite(product: Product, event: Event): void {
    event.stopPropagation();
    this.favoriteService.toggleFavorite(product);
  }

  addToCart(product: Product): void {
    this.cartService.addToCart(product, 1);
  }
}
