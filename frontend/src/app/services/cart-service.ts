import {Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {BehaviorSubject, Observable} from 'rxjs';
import {Product} from '../product';
import {CartItem} from '../cart-item';
import {CartToastService} from './cart-toast-service';
import {AuthService} from './auth-service';
import {ModalService} from './modal-service';

const STORAGE_KEY = 'kpet_cart';

/**
 * The single shared cart for the central store checkout flow (WhatsApp + QR).
 * Backed by a BehaviorSubject + localStorage, so it survives page reloads and
 * every subscriber (nav badge, cart page) reacts to changes made from anywhere.
 * Distributor "quick orders" never touch this service — see
 * DistributorDetailComponent, which keeps its own local, non-persisted list.
 *
 * addToCart() requires a logged-in session — guests get prompted to log in
 * instead of silently adding anything. This is enforced here rather than in
 * each calling component (home, product-detail-modal) so there's exactly one
 * place the rule lives. Note logout() already wipes the cart anyway
 * (AuthService.logout() does localStorage.clear()), so there's no scenario
 * where a guest ends up with a leftover populated cart.
 */
@Injectable({
  providedIn: 'root',
})
export class CartService {

  private cartSubject = new BehaviorSubject<CartItem[]>(this.loadFromStorage());
  cart$: Observable<CartItem[]> = this.cartSubject.asObservable();

  constructor(
    private cartToastService: CartToastService,
    private authService: AuthService,
    private modalService: ModalService,
    private router: Router,
  ) {}

  private loadFromStorage(): CartItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  // Writes to localStorage AND pushes the new value through cart$ so every
  // subscriber (nav badge, cart page) re-renders in the same tick.
  private persist(items: CartItem[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    this.cartSubject.next(items);
  }

  getItems(): CartItem[] {
    return this.cartSubject.value;
  }

  async addToCart(product: Product, quantity: number = 1): Promise<void> {
    if (!this.authService.isLoggedIn()) {
      const goToLogin = await this.modalService.confirm({
        title: 'Inicia sesión',
        message: 'Necesitas iniciar sesión para añadir productos al carrito.',
        confirmText: 'Iniciar sesión',
      });
      if (goToLogin) {
        this.router.navigate(['/login']);
      }
      return;
    }

    const items = [...this.cartSubject.value];
    const existing = items.find(item => item.product.id === product.id);
    if (existing) {
      existing.quantity += quantity;
    } else {
      items.push({product, quantity});
    }
    this.persist(items);
    this.cartToastService.show(`${product.name} añadido al carrito`);
  }

  removeFromCart(productId: number): void {
    this.persist(this.cartSubject.value.filter(item => item.product.id !== productId));
  }

  updateQuantity(productId: number, quantity: number): void {
    if (quantity <= 0) {
      this.removeFromCart(productId);
      return;
    }
    const items = this.cartSubject.value.map(item =>
      item.product.id === productId ? {...item, quantity} : item
    );
    this.persist(items);
  }

  clearCart(): void {
    this.persist([]);
  }

  getTotal(): number {
    return this.cartSubject.value.reduce((sum, item) => {
      const unitPrice = item.product.onSale && item.product.salePrice != null ? item.product.salePrice : item.product.price;
      return sum + unitPrice * item.quantity;
    }, 0);
  }

  getItemCount(): number {
    return this.cartSubject.value.reduce((sum, item) => sum + item.quantity, 0);
  }
}
