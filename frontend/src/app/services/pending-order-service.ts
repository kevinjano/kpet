import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable, Subject} from 'rxjs';
import {Order, ORDER_STATUS_PENDING, ORDER_STATUS_CANCELLED} from '../order';
import {OrderService} from './order-service';
import {CartService, getPendingOrderId, setPendingOrderId} from './cart-service';
import {AuthService} from './auth-service';

export interface PendingOrderOutcome {
  type: 'confirmed' | 'cancelled';
  order: Order;
}

/**
 * Tracks the one order a customer has placed but the admin hasn't confirmed
 * yet. The cart is not emptied when the order is created — it stays (frozen,
 * see CartService) until that order is confirmed, at which point it's emptied
 * and the order lives on in the customer's Historial. If the order is
 * cancelled instead (by the admin, or by the customer withdrawing it) the cart
 * is kept and unfrozen so they can adjust it and order again.
 *
 * The status is read from the customer's own orders (GET /orders/mine), so
 * refresh() is what notices the admin's decision — called on app start, when
 * the cart page opens, and periodically while it stays open.
 */
@Injectable({
  providedIn: 'root',
})
export class PendingOrderService {

  private pendingSubject = new BehaviorSubject<Order | null>(null);
  pendingOrder$: Observable<Order | null> = this.pendingSubject.asObservable();

  private outcomeSubject = new Subject<PendingOrderOutcome>();
  outcome$: Observable<PendingOrderOutcome> = this.outcomeSubject.asObservable();

  constructor(
    private orderService: OrderService,
    private cartService: CartService,
    private authService: AuthService,
  ) {}

  register(order: Order): void {
    setPendingOrderId(order.id);
    this.pendingSubject.next(order);
  }

  // Re-checks the pending order's status. A failed request changes nothing —
  // the cart simply stays frozen until the next successful check.
  refresh(): void {
    const id = getPendingOrderId();
    if (id === null) {
      this.pendingSubject.next(null);
      return;
    }
    if (!this.authService.isLoggedIn()) {
      return;
    }
    this.orderService.getMyOrders().subscribe({
      next: orders => {
        const order = orders.find(o => o.id === id);
        if (!order) {
          // Order no longer exists (e.g. wiped by the admin) — nothing left
          // to wait for, so unfreeze the cart as it is.
          this.finish(null);
        } else if (order.status === ORDER_STATUS_PENDING) {
          this.pendingSubject.next(order);
        } else if (order.status === ORDER_STATUS_CANCELLED) {
          this.finish({type: 'cancelled', order});
        } else {
          this.finish({type: 'confirmed', order});
        }
      },
      error: () => {},
    });
  }

  // The customer withdrawing their own pending order.
  cancel(orderId: number): Observable<Order> {
    return new Observable<Order>(subscriber => {
      this.orderService.cancelMyOrder(orderId).subscribe({
        next: order => {
          this.finish({type: 'cancelled', order});
          subscriber.next(order);
          subscriber.complete();
        },
        error: err => subscriber.error(err),
      });
    });
  }

  // The marker is cleared before the cart so the freeze can't block the
  // emptying. Only a confirmed order empties the cart.
  private finish(outcome: PendingOrderOutcome | null): void {
    setPendingOrderId(null);
    this.pendingSubject.next(null);
    if (outcome?.type === 'confirmed') {
      this.cartService.clearCart();
    }
    if (outcome) {
      this.outcomeSubject.next(outcome);
    }
  }
}
