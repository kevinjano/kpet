import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { Product } from '../product';
import { API_ORIGIN, extractErrorMessage } from '../constants';
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
 *
 * toggleFavorite() updates the local list optimistically (so the heart flips
 * the instant you click it, not after a round trip) and rolls the change back
 * with a visible error if the request actually fails — the previous version
 * only updated local state inside the success callback, so a failed request
 * silently looked like nothing happened (no rollback, no error, no visible
 * feedback either way).
 */
export class FavoriteService {
  private favoritesSubject = new BehaviorSubject<Product[]>([]);
  favorites$: Observable<Product[]> = this.favoritesSubject.asObservable();

  // Product ids with an add/remove request currently in flight, so rapid
  // double-clicks on the heart don't fire two overlapping requests for the
  // same product (which could otherwise race and leave the UI out of sync
  // with what the backend ends up with).
  private pendingIds = new Set<number>();

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
    this.httpClient.get<Product[]>(`${this.apiUrl}/mine`).subscribe({
      next: favorites => this.favoritesSubject.next(favorites),
      error: () => this.favoritesSubject.next([]),
    });
  }

  isFavorite(productId: number): boolean {
    return this.favoritesSubject.value.some(p => p.id === productId);
  }

  isPending(productId: number): boolean {
    return this.pendingIds.has(productId);
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

    if (this.pendingIds.has(product.id)) {
      return;
    }

    const wasFavorite = this.isFavorite(product.id);
    const previous = this.favoritesSubject.value;

    // Optimistic update: flip it immediately, then confirm/roll back once
    // the request settles, instead of waiting for the round trip to show
    // anything at all.
    this.favoritesSubject.next(
      wasFavorite
        ? previous.filter(p => p.id !== product.id)
        : [...previous, product]
    );
    this.pendingIds.add(product.id);

    const request = wasFavorite
      ? this.httpClient.post<void>(`${this.apiUrl}/remove/${product.id}`, {})
      : this.httpClient.post<void>(`${this.apiUrl}/add/${product.id}`, {});

    request.subscribe({
      next: () => {
        this.pendingIds.delete(product.id);
      },
      error: err => {
        this.pendingIds.delete(product.id);
        // Roll back to exactly what it was before the optimistic update.
        this.favoritesSubject.next(previous);
        this.modalService.error(extractErrorMessage(err, 'No se pudo actualizar tus favoritos. Intenta de nuevo.'));
      }
    });
  }
}
