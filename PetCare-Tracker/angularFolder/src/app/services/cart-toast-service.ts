import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * Fire-and-forget notification bus for "added to cart/order" toasts. A plain
 * Subject (not BehaviorSubject) on purpose — there's no "current" message to
 * replay to late subscribers, each call to show() is a one-off event. Any
 * number of CartToastComponent instances can subscribe; CartService.addToCart
 * calls this directly so the confirmation fires no matter which page/component
 * triggered the add.
 */
@Injectable({
  providedIn: 'root',
})
export class CartToastService {

  private messageSubject = new Subject<string>();
  message$ = this.messageSubject.asObservable();

  show(message: string): void {
    this.messageSubject.next(message);
  }
}
