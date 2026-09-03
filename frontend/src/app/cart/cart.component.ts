import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CartService } from '../services/cart-service';
import { SiteSettingsService } from '../services/site-settings-service';
import { OrderService } from '../services/order-service';
import { ModalService } from '../services/modal-service';
import { CartItem } from '../cart-item';
import { Order } from '../order';
import { resolveImageUrl, DEFAULT_LOGO_URL } from '../constants';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.css'
})
/**
 * Central store cart + checkout. Flow: build a WhatsApp message from the cart
 * contents, open wa.me, then (regardless of whether the backend call
 * succeeds — see checkoutOnWhatsapp's comment) advance to the QR payment step
 * and clear the cart. There is no "did the customer actually pay" signal here;
 * that's confirmed manually by the admin in the Pedidos screen.
 */
export class CartComponent implements OnInit {

  items: CartItem[] = [];
  storeName = 'Kpet';
  whatsappNumber = '';
  logoUrl: string = DEFAULT_LOGO_URL;
  qrCodeUrl: string | null = null;
  resolveImageUrl = resolveImageUrl;

  checkoutStep: 'cart' | 'payment' = 'cart';
  currentOrder: Order | null = null;
  receiptConfirmed = false;
  confirmingReceipt = false;

  constructor(
    private cartService: CartService,
    private siteSettingsService: SiteSettingsService,
    private orderService: OrderService,
    private modalService: ModalService,
  ) {}

  ngOnInit(): void {
    this.cartService.cart$.subscribe(items => this.items = items);
    this.siteSettingsService.getSettings().subscribe(settings => {
      this.storeName = settings.storeName || 'Kpet';
      this.whatsappNumber = settings.whatsappNumber || '';
      this.logoUrl = settings.logoUrl || DEFAULT_LOGO_URL;
      this.qrCodeUrl = settings.qrCodeUrl;
    });
  }

  trackByProductId(_index: number, item: CartItem): number {
    return item.product.id;
  }

  unitPrice(item: CartItem): number {
    return item.product.onSale && item.product.salePrice != null ? item.product.salePrice : item.product.price;
  }

  lineTotal(item: CartItem): number {
    return this.unitPrice(item) * item.quantity;
  }

  get total(): number {
    return this.cartService.getTotal();
  }

  increment(item: CartItem): void {
    this.cartService.updateQuantity(item.product.id, item.quantity + 1);
  }

  decrement(item: CartItem): void {
    this.cartService.updateQuantity(item.product.id, item.quantity - 1);
  }

  remove(item: CartItem): void {
    this.cartService.removeFromCart(item.product.id);
  }

  checkoutOnWhatsapp(): void {
    if (this.items.length === 0) {
      return;
    }
    if (!this.whatsappNumber) {
      this.modalService.error('El número de WhatsApp de la tienda todavía no está configurado.');
      return;
    }

    const itemsSnapshot = this.items.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      quantity: item.quantity,
      unitPrice: this.unitPrice(item),
    }));
    const totalSnapshot = this.total;

    const lines = this.items.map(item =>
      `${item.quantity}x ${item.product.name} - Bs.${this.lineTotal(item).toFixed(2)}`
    );

    const message = [
      `¡Hola! Quiero hacer un pedido en ${this.storeName}:`,
      '',
      ...lines,
      '',
      `Total: Bs.${totalSnapshot.toFixed(2)}`,
      '',
      'Gracias!'
    ].join('\n');

    const digitsOnly = this.whatsappNumber.replace(/\D/g, '');
    const url = `https://wa.me/${digitsOnly}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');

    this.orderService.createOrder({items: itemsSnapshot, total: totalSnapshot}).subscribe({
      next: order => {
        this.currentOrder = order;
        this.checkoutStep = 'payment';
        this.cartService.clearCart();
      },
      error: err => {
        console.error('Error creating order:', err);
        // The WhatsApp message already went out; the order record is just for tracking,
        // so a backend hiccup here shouldn't block the sale.
        this.checkoutStep = 'payment';
        this.cartService.clearCart();
      }
    });
  }

  confirmReceiptSent(): void {
    if (!this.currentOrder) {
      this.receiptConfirmed = true;
      return;
    }
    this.confirmingReceipt = true;
    this.orderService.markReceiptSent(this.currentOrder.id).subscribe({
      next: () => {
        this.confirmingReceipt = false;
        this.receiptConfirmed = true;
      },
      error: () => {
        this.confirmingReceipt = false;
        this.receiptConfirmed = true;
      }
    });
  }
}
