import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { Product } from '../product';
import { API_ORIGIN } from '../constants';
import { AuthService } from './auth-service';
import { ModalService } from './modal-service';

@Injectable({
  providedIn: 'root',
})
/**
 * A logged-in customer's saved products ("favoritos"). Mirrors CartService's
 * shape (a BehaviorSubject so every page reacts to changes) but the source of
 * truth is the backend, not localStorage — favorites should follow the
 * account across devices, not just this browser.
 *
 * Same login gate as CartService.addToCart(): a guest gets prompted to log in
 * instead of the action silently failing.
 */
export class FavoriteService {
  private favoritesSubject = new BehaviorSubject<Product[]>([]);
  favorites$: Observable<Product[]> = this.favoritesSubject.asObservable();

  private apiUrl = `${API_ORIGIN}/api/favorites`;

  constructor(
    private httpClient: HttpClient,
    private authService: AuthService,
    private modalService: ModalService,
    private router: Router,
  ) {}

  loadFavorites(): void {
    if (!this.authService.isLoggedIn()) {
      this.favoritesSubject.next([]);
      return;
    }
    this.httpClient.get<Product[]>(`${this.apiUrl}/mine`).subscribe(favorites => {
      this.favoritesSubject.next(favorites);
    });
  }

  isFavorite(productId: number): boolean {
    return this.favoritesSubject.value.some(p => p.id === productId);
  }

  clear(): void {
    this.favoritesSubject.next([]);
  }

  async toggleFavorite(product: Product): Promise<void> {
    if (!this.authService.isLoggedIn()) {
      const goToLogin = await this.modalService.confirm({
        title: 'Inicia sesión',
        message: 'Necesitas iniciar sesión para guardar productos en tus favoritos.',
        confirmText: 'Iniciar sesión',
      });
      if (goToLogin) {
        this.router.navigate(['/login']);
      }
      return;
    }

    if (this.isFavorite(product.id)) {
      this.httpClient.delete<void>(`${this.apiUrl}/${product.id}`).subscribe(() => {
        this.favoritesSubject.next(this.favoritesSubject.value.filter(p => p.id !== product.id));
      });
    } else {
      this.httpClient.post<void>(`${this.apiUrl}/${product.id}`, {}).subscribe(() => {
        this.favoritesSubject.next([...this.favoritesSubject.value, product]);
      });
    }
  }
}
