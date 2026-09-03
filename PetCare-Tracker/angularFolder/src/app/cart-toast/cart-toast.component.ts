import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { CartToastService } from '../services/cart-toast-service';

interface ToastEntry {
  id: number;
  message: string;
}

// nextId is a simple incrementing counter (not a global uuid) — fine because
// each toast only needs to be unique within this one component instance's
// lifetime, for trackBy/removal purposes.

@Component({
  selector: 'app-cart-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cart-toast.component.html',
  styleUrl: './cart-toast.component.css'
})
// Renders a stack of auto-dismissing (2.2s) toasts fed by CartToastService.
// Mount one instance per page that can trigger an add-to-cart (home,
// distributor-detail) — CartToastService itself is a singleton, but the visual
// stack is local to wherever this component is placed.
export class CartToastComponent implements OnInit, OnDestroy {

  toasts: ToastEntry[] = [];
  private nextId = 0;
  private sub?: Subscription;

  constructor(private cartToastService: CartToastService) {}

  ngOnInit(): void {
    this.sub = this.cartToastService.message$.subscribe(message => {
      const toast: ToastEntry = { id: this.nextId++, message };
      this.toasts.push(toast);
      setTimeout(() => this.dismiss(toast.id), 2200);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  dismiss(id: number): void {
    this.toasts = this.toasts.filter(t => t.id !== id);
  }
}
