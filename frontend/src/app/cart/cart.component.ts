import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { CartService, getPendingOrderId } from '../services/cart-service';
import { PendingOrderService, PendingOrderOutcome } from '../services/pending-order-service';
import { SiteSettingsService } from '../services/site-settings-service';
import { OrderService } from '../services/order-service';
import { ProductService } from '../services/product-service';
import { ModalService } from '../services/modal-service';
import { Product } from '../product';
import { AuthService } from '../services/auth-service';
import { CartItem } from '../cart-item';
import { Order, ORDER_STATUS_LABELS } from '../order';
import { OrderItem } from '../order-item';
import { SiteSettings } from '../site-settings';
import { resolveImageUrl, extractErrorMessage, DEFAULT_LOGO_URL } from '../constants';
import { SiteFooterComponent } from '../site-footer/site-footer.component';
import { PENDING_DISCOUNT_KEY, PendingDiscount } from '../discount-modal/discount-modal.component';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterModule, SiteFooterComponent],
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
export class CartComponent implements OnInit, OnDestroy {

  // The order the customer has placed and is waiting on the admin to confirm.
  // While there is one, the cart below is frozen (read-only) and stays put —
  // it's emptied only once that order is confirmed (see PendingOrderService).
  // pendingOrderId comes from the stored marker so the frozen state shows
  // immediately; pendingOrder (the full order) arrives once it's been fetched.
  pendingOrderId: number | null = getPendingOrderId();
  pendingOrder: Order | null = null;
  cancellingOrder = false;
  private subs = new Subscription();

  items: CartItem[] = [];
  storeName = 'Kpet';
  whatsappNumber = '';
  logoUrl: string = DEFAULT_LOGO_URL;
  qrCodeUrl: string | null = null;
  settings: SiteSettings | undefined;
  resolveImageUrl = resolveImageUrl;

  checkoutStep: 'cart' | 'payment' = 'cart';

  // "Historial": the logged-in customer's own past orders and their live
  // status (same labels the admin sets in Pedidos). Only offered when logged
  // in — guests can still check out, they just have no history to show.
  activeTab: 'cart' | 'history' = 'cart';
  myOrders: Order[] = [];
  ordersLoaded = false;
  ordersLoadFailed = false;
  statusLabels = ORDER_STATUS_LABELS;
  expandedOrderIds = new Set<number>();

  currentOrder: Order | null = null;
  receiptConfirmed = false;
  confirmingReceipt = false;
  placingOrder = false;

  // Guards proceedToPayment() against firing before the settings fetch below
  // resolves — without this, a slow connection could hit the "whatsappNumber
  // not configured" check purely because it hasn't loaded yet, not because
  // it's actually missing.
  settingsLoaded = false;

  // Built once when the order is created (while items/total are still known)
  // and reused when the customer taps "Enviar comprobante por WhatsApp" —
  // by then the cart has already been cleared.
  private pendingWhatsappMessage = '';

  constructor(
    private cartService: CartService,
    private siteSettingsService: SiteSettingsService,
    private orderService: OrderService,
    private productService: ProductService,
    private modalService: ModalService,
    private authService: AuthService,
    private pendingOrderService: PendingOrderService,
  ) {}

  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  selectTab(tab: 'cart' | 'history'): void {
    this.activeTab = tab;
    if (tab === 'history') {
      this.loadMyOrders();
    }
  }

  // Re-fetched every time the tab is opened so a status the admin just
  // changed (e.g. Confirmado) shows up without reloading the page.
  loadMyOrders(): void {
    this.ordersLoadFailed = false;
    this.orderService.getMyOrders().subscribe({
      next: orders => {
        this.myOrders = orders;
        this.ordersLoaded = true;
      },
      error: () => {
        this.ordersLoadFailed = true;
        this.ordersLoaded = true;
      }
    });
  }

  toggleOrderExpanded(orderId: number): void {
    if (this.expandedOrderIds.has(orderId)) {
      this.expandedOrderIds.delete(orderId);
    } else {
      this.expandedOrderIds.add(orderId);
    }
  }

  isOrderExpanded(orderId: number): boolean {
    return this.expandedOrderIds.has(orderId);
  }

  // Number() so a stray null/string unitPrice can't make .toFixed() throw
  // and blank the cell (see the same guard in the admin Pedidos screen).
  orderItemSubtotal(item: OrderItem): number {
    return (Number(item.unitPrice) || 0) * item.quantity;
  }

  // order.total is what was actually charged (already net of any first-order
  // discount), so the pre-discount subtotal is derived back from it.
  orderSubtotal(order: Order): number {
    return order.discountPercent ? order.total / (1 - order.discountPercent / 100) : order.total;
  }

  ngOnInit(): void {
    this.subs.add(this.cartService.cart$.subscribe(items => this.items = items));

    this.subs.add(this.pendingOrderService.pendingOrder$.subscribe(order => {
      this.pendingOrder = order;
      this.pendingOrderId = getPendingOrderId();
    }));
    this.subs.add(this.pendingOrderService.outcome$.subscribe(outcome => this.onPendingOutcome(outcome)));
    // Notices the admin's decision without a reload: checked now, then every
    // 15 s while this page stays open (a no-op when nothing is pending).
    this.pendingOrderService.refresh();
    this.subs.add(interval(15000).subscribe(() => this.pendingOrderService.refresh()));

    this.siteSettingsService.getSettings().subscribe(settings => {
      this.settings = settings;
      this.storeName = settings.storeName || 'Kpet';
      this.whatsappNumber = settings.whatsappNumber || '';
      this.logoUrl = settings.logoUrl || DEFAULT_LOGO_URL;
      this.qrCodeUrl = settings.qrCodeUrl;
      this.settingsLoaded = true;
    });
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  trackByProductId(_index: number, item: CartItem): number {
    return item.product.id;
  }

  private onPendingOutcome(outcome: PendingOrderOutcome): void {
    this.checkoutStep = 'cart';
    this.currentOrder = null;
    if (outcome.type === 'confirmed') {
      this.activeTab = 'history';
      this.loadMyOrders();
      this.modalService.success(`¡Confirmamos el pago de tu pedido #${outcome.order.id}! Ya lo puedes ver en tu historial.`);
    } else {
      this.activeTab = 'cart';
      this.modalService.alert({
        title: 'Pedido cancelado',
        message: `El pedido #${outcome.order.id} fue cancelado. Tu carrito sigue aquí por si quieres ajustarlo y pedir de nuevo.`,
      });
    }
  }

  backToCart(): void {
    this.checkoutStep = 'cart';
    this.activeTab = 'cart';
  }

  async cancelPendingOrder(): Promise<void> {
    const id = this.pendingOrderId;
    if (id === null || this.cancellingOrder) {
      return;
    }
    const confirmed = await this.modalService.confirm({
      title: 'Cancelar pedido',
      message: `¿Cancelar el pedido #${id}? Tu carrito se mantiene para que puedas ajustarlo y pedir de nuevo.`,
      confirmText: 'Cancelar pedido',
    });
    if (!confirmed) {
      return;
    }
    this.cancellingOrder = true;
    this.pendingOrderService.cancel(id).subscribe({
      next: () => this.cancellingOrder = false,
      error: err => {
        this.cancellingOrder = false;
        this.modalService.error(extractErrorMessage(err, 'No pudimos cancelar el pedido. Intenta de nuevo.'));
        this.pendingOrderService.refresh();
      }
    });
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

  get pendingDiscountPercent(): number | null {
    return this.getPendingDiscount()?.percent ?? null;
  }

  get discountedTotal(): number {
    const percent = this.pendingDiscountPercent;
    return percent ? this.total * (1 - percent / 100) : this.total;
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

  // Set by DiscountModalComponent when a logged-out visitor submits the
  // welcome-discount form, cleared once an order actually redeems it.
  private getPendingDiscount(): PendingDiscount | null {
    try {
      const raw = localStorage.getItem(PENDING_DISCOUNT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  // Step 1 (cart screen): show the QR payment screen. NO order exists yet —
  // the customer can still go back, edit the cart and return here as many
  // times as they like. The order is only created when they tap "Enviar
  // comprobante" (step 2). Stock is checked now, before they pay, so they
  // aren't told it ran out only after sending money.
  proceedToPayment(): void {
    if (this.pendingOrderId !== null || this.items.length === 0 || !this.settingsLoaded) {
      return;
    }
    if (!this.whatsappNumber) {
      this.modalService.error('El número de WhatsApp de la tienda todavía no está configurado.');
      return;
    }

    this.placingOrder = true;
    this.productService.getProducts().subscribe({
      next: products => {
        this.placingOrder = false;
        const problem = this.findStockProblem(products);
        if (problem) {
          this.modalService.error(problem);
          return;
        }
        this.receiptConfirmed = false;
        this.checkoutStep = 'payment';
      },
      // Couldn't check — let them through; the server re-checks stock
      // authoritatively when the order is created in step 2.
      error: () => {
        this.placingOrder = false;
        this.receiptConfirmed = false;
        this.checkoutStep = 'payment';
      }
    });
  }

  private findStockProblem(products: Product[]): string | null {
    for (const item of this.items) {
      const current = products.find(p => p.id === item.product.id);
      if (!current || !current.active) {
        return `"${item.product.name}" ya no está disponible. Quítalo de tu carrito para continuar.`;
      }
      if (current.stock !== null && item.quantity > current.stock) {
        return `No hay suficiente stock de "${item.product.name}" (disponible: ${current.stock}). Ajusta la cantidad para continuar.`;
      }
    }
    return null;
  }

  // Built from the saved order (not the live cart) so it can be rebuilt
  // identically whenever the customer comes back to the QR screen.
  // WhatsApp renders *text* as bold and a blank line as a paragraph break,
  // so this reads as a formatted receipt instead of one run-on paragraph.
  // No emoji here on purpose — they showed up as broken boxes in testing
  // on both desktop and phone once sent through a wa.me link.
  private buildWhatsappMessage(order: Order): string {
    const lines = order.items.map(item =>
      `- ${item.quantity}x ${item.productName} — Bs.${this.orderItemSubtotal(item).toFixed(2)}`
    );

    const subtotal = this.orderSubtotal(order);
    const totalLines = order.discountPercent
      ? [
          `Por ser mi primer pedido, tengo un descuento del ${order.discountPercent}%.`,
          '',
          `Subtotal: Bs.${subtotal.toFixed(2)}`,
          `Descuento (${order.discountPercent}%): -Bs.${(subtotal - order.total).toFixed(2)}`,
          `*Total a pagar: Bs.${order.total.toFixed(2)}*`,
        ]
      : [`*Total: Bs.${order.total.toFixed(2)}*`];

    return [
      `¡Hola! Quiero hacer un pedido en *${this.storeName}*:`,
      '',
      '*Mi pedido:*',
      ...lines,
      '',
      ...totalLines,
      '',
      'Ya realicé el pago, adjunto mi comprobante.',
    ].join('\n');
  }

  private whatsappUrl(message: string): string {
    const digitsOnly = this.whatsappNumber.replace(/\D/g, '');
    return `https://wa.me/${digitsOnly}?text=${encodeURIComponent(message)}`;
  }

  // Step 2 (QR payment screen): the customer has paid and taps "Enviar
  // comprobante". Only now is the order created — it's what the admin sees and
  // confirms — and WhatsApp opens with it pre-filled (the customer attaches
  // their payment screenshot manually once inside the chat, since a wa.me link
  // can't attach a file). The cart then stays, frozen, until the admin confirms.
  sendReceiptOnWhatsapp(): void {
    if (this.confirmingReceipt || this.items.length === 0) {
      return;
    }

    // Opened synchronously, inside the click, because browsers block a window
    // opened later from an async callback; it's pointed at WhatsApp once the
    // order exists, or closed again if creating it fails.
    const whatsappWindow = window.open('', '_blank');

    const itemsSnapshot = this.items.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      quantity: item.quantity,
      unitPrice: this.unitPrice(item),
    }));
    const rawTotal = this.total;

    // A first-order welcome discount is redeemed at most once per lead (see
    // OrderController@create) — checked here just to decide what to show the
    // customer; the backend re-validates it's actually still unused before
    // ever applying it.
    const pendingDiscount = this.getPendingDiscount();
    const discountAmount = pendingDiscount ? rawTotal * (pendingDiscount.percent / 100) : 0;
    const totalSnapshot = rawTotal - discountAmount;

    this.confirmingReceipt = true;
    this.orderService.createOrder({items: itemsSnapshot, total: totalSnapshot}, pendingDiscount?.leadId).subscribe({
      next: order => {
        this.pendingOrderService.register(order);
        this.currentOrder = order;
        this.pendingWhatsappMessage = this.buildWhatsappMessage(order);
        if (pendingDiscount) {
          localStorage.removeItem(PENDING_DISCOUNT_KEY);
        }

        const url = this.whatsappUrl(this.pendingWhatsappMessage);
        if (whatsappWindow) {
          whatsappWindow.location.href = url;
        } else {
          window.open(url, '_blank');
        }

        // The flag is best-effort: the order already exists either way.
        this.orderService.markReceiptSent(order.id).subscribe({
          next: () => this.finishReceipt(),
          error: () => this.finishReceipt(),
        });
      },
      error: err => {
        whatsappWindow?.close();
        this.confirmingReceipt = false;
        // Most commonly someone ordered more than what's in stock right now.
        // Nothing was sent to WhatsApp, so it's safe to stop here and say why.
        this.modalService.error(extractErrorMessage(err, 'No pudimos procesar tu pedido. Intenta de nuevo.'));
      }
    });
  }

  private finishReceipt(): void {
    this.confirmingReceipt = false;
    this.receiptConfirmed = true;
  }

  // Re-opens WhatsApp with the same message for an order that already exists —
  // for a customer who closed the chat without sending it. Creates nothing.
  resendReceipt(): void {
    const order = this.pendingOrder;
    if (!order) {
      return;
    }
    window.open(this.whatsappUrl(this.buildWhatsappMessage(order)), '_blank');
  }
}
