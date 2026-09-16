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
 * Central store cart + checkout. Flow: create the order, advance to the QR
 * payment step, and clear the cart — WhatsApp is NOT opened yet at this
 * point. Only once the customer has seen the QR and paid do they tap "Enviar
 * comprobante por WhatsApp", which opens wa.me with the order pre-filled;
 * they attach the payment screenshot manually once inside WhatsApp (a wa.me
 * link can't attach a file for them). Opening WhatsApp any earlier used to
 * cover the QR with the new tab/window before the customer had a chance to
 * pay. There is no "did the customer actually pay" signal here; that's
 * confirmed manually by the admin in the Pedidos screen.
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

  // Built once when the order is created (while items/total are still known)
  // and reused when the customer taps "Enviar comprobante por WhatsApp" —
  // by then the cart has already been cleared.
  private pendingWhatsappMessage = '';

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

  // Step 1 (cart screen): create the order and move to the QR payment step.
  // Does NOT open WhatsApp — that used to happen here and its new tab/window
  // would cover the QR before the customer had a chance to pay.
  proceedToPayment(): void {
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

    this.pendingWhatsappMessage = [
      `¡Hola! Quiero hacer un pedido en ${this.storeName}:`,
      '',
      ...lines,
      '',
      `Total: Bs.${totalSnapshot.toFixed(2)}`,
      '',
      'Ya realicé el pago, adjunto mi comprobante.'
    ].join('\n');

    this.orderService.createOrder({items: itemsSnapshot, total: totalSnapshot}).subscribe({
      next: order => {
        this.currentOrder = order;
        this.checkoutStep = 'payment';
        this.cartService.clearCart();
      },
      error: err => {
        console.error('Error creating order:', err);
        // The order record is just for tracking — a backend hiccup here
        // shouldn't block the customer from paying and reaching out.
        this.checkoutStep = 'payment';
        this.cartService.clearCart();
      }
    });
  }

  // Step 2 (QR payment screen): only now does WhatsApp open, with the order
  // pre-filled — the customer attaches their payment screenshot manually
  // once inside the chat, since a wa.me link can't attach a file for them.
  sendReceiptOnWhatsapp(): void {
    const digitsOnly = this.whatsappNumber.replace(/\D/g, '');
    const url = `https://wa.me/${digitsOnly}?text=${encodeURIComponent(this.pendingWhatsappMessage)}`;
    window.open(url, '_blank');
    this.confirmReceiptSent();
  }

  private confirmReceiptSent(): void {
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
