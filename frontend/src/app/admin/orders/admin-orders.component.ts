import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../services/order-service';
import { DistributorService } from '../../services/distributor-service';
import { Order, ORDER_STATUS_LABELS, ORDER_STATUS_PENDING, ORDER_STATUS_CONFIRMED, ORDER_STATUS_COMPLETED, ORDER_STATUS_CANCELLED } from '../../order';
import { OrderItem } from '../../order-item';
import { trackById, LOW_STOCK_THRESHOLD } from '../../constants';
import { ModalService } from '../../services/modal-service';
import { AdminTableComponent } from '../../admin-table/admin-table.component';
import { FilterDropdownComponent } from '../../filter-dropdown/filter-dropdown.component';
import { PaginationComponent } from '../../pagination/pagination.component';

// Flattened {distributor, product, quantity} row for the low-stock warning
// banner — built from every distributor's per-product quantities, not from
// orders at all (this screen doubles as the low-stock dashboard; see
// loadLowStock()).
interface LowStockEntry {
  distributorName: string;
  productName: string;
  quantity: number;
}

/**
 * Admin "Pedidos" screen: search/status-filter over every order, then a
 * gradient pill switch (activeOrdersTab) toggles between two views —
 * "Pendientes" (Pendiente/Confirmado, card layout with the status action
 * buttons, including Cancelar) and "Historial" (Finalizado or Cancelado, a
 * compact expandable table since those are done and just need to be
 * look-up-able). Confirming a payment triggers backend stock deduction;
 * cancelling a CONFIRMED order restores it (see OrderServiceImpl). Also
 * shows a low-stock banner that has nothing to do with orders — it's just
 * surfaced here because this is where the admin already checks in regularly.
 */
@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminTableComponent, FilterDropdownComponent, PaginationComponent],
  templateUrl: './admin-orders.component.html',
  styleUrl: './admin-orders.component.css'
})
export class AdminOrdersComponent implements OnInit {

  orders: Order[] = [];
  statusLabels = ORDER_STATUS_LABELS;
  STATUS_PENDING = ORDER_STATUS_PENDING;
  STATUS_CONFIRMED = ORDER_STATUS_CONFIRMED;
  STATUS_COMPLETED = ORDER_STATUS_COMPLETED;
  STATUS_CANCELLED = ORDER_STATUS_CANCELLED;
  updatingId: number | null = null;
  lowStockEntries: LowStockEntry[] = [];
  searchTerm = '';
  statusFilter = '';
  trackById = trackById;

  get statusFilterOptions() {
    return [
      { value: '', label: 'Todos los estados' },
      { value: this.STATUS_PENDING, label: this.statusLabels[this.STATUS_PENDING] },
      { value: this.STATUS_CONFIRMED, label: this.statusLabels[this.STATUS_CONFIRMED] },
      { value: this.STATUS_COMPLETED, label: this.statusLabels[this.STATUS_COMPLETED] },
      { value: this.STATUS_CANCELLED, label: this.statusLabels[this.STATUS_CANCELLED] },
    ];
  }

  // "Historial" date-range filter — separate from the CSV export below
  // (that one's always "this calendar month", this is just what's shown on
  // screen). Plain string (not a union literal) so FilterDropdownComponent's
  // (valueChange)="historyRangeFilter = $event" two-way binding type-checks —
  // same reasoning as CategoryFilterValue in AdminProductsComponent.
  historyRangeFilter = 'all';
  historyRangeOptions = [
    { value: 'all', label: 'Todo el historial' },
    { value: 'day', label: 'Hoy' },
    { value: 'week', label: 'Esta semana' },
    { value: 'month', label: 'Este mes' },
  ];

  constructor(
    private orderService: OrderService,
    private distributorService: DistributorService,
    private modalService: ModalService,
  ) {}

  // Which of the two views (pill switch) is showing.
  activeOrdersTab: 'inProcess' | 'history' = 'inProcess';

  // Orders shown in "Historial de pedidos" (table, expandable rows) get their
  // details toggled independently rather than reusing updatingId, since more
  // than one history row can be open at once.
  expandedOrderIds = new Set<number>();

  get filteredOrders(): Order[] {
    const term = this.searchTerm.trim().toLowerCase();
    return this.orders.filter(o => {
      if (this.statusFilter && o.status !== this.statusFilter) {
        return false;
      }
      if (!term) {
        return true;
      }
      if (String(o.id).includes(term)) {
        return true;
      }
      return o.items.some(item => item.productName.toLowerCase().includes(term));
    });
  }

  // "Pendientes" = still needs admin action (Pendiente a confirmar / Confirmado).
  get inProcessOrders(): Order[] {
    return this.filteredOrders.filter(o => o.status === this.STATUS_PENDING || o.status === this.STATUS_CONFIRMED);
  }

  // "Historial" = resolved either way (Finalizado or Cancelado) — read-only
  // from here on. Also narrowed by historyRangeFilter (día/semana/mes),
  // independent of the status/search filter bar above.
  get historyOrders(): Order[] {
    const resolved = this.filteredOrders.filter(o => o.status === this.STATUS_COMPLETED || o.status === this.STATUS_CANCELLED);
    if (this.historyRangeFilter === 'all') {
      return resolved;
    }
    return resolved.filter(o => this.isWithinHistoryRange(new Date(o.createdAt)));
  }

  private isWithinHistoryRange(date: Date): boolean {
    const now = new Date();
    if (this.historyRangeFilter === 'day') {
      return date.toDateString() === now.toDateString();
    }
    if (this.historyRangeFilter === 'week') {
      return this.startOfWeek(date).toDateString() === this.startOfWeek(now).toDateString();
    }
    if (this.historyRangeFilter === 'month') {
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    }
    return true;
  }

  // Monday of the week containing the given date, at midnight — same
  // definition as the dashboard's sales-by-week chart.
  private startOfWeek(d: Date): Date {
    const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = date.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    date.setDate(date.getDate() + diff);
    return date;
  }

  // Only "Historial" is paginated — it only grows over time, whereas
  // "Pendientes" is naturally self-limiting (the admin clears it by acting
  // on each order) and hiding one behind a second page could mean it's missed.
  historyPage = 1;
  historyPageSize = 20;

  get pagedHistoryOrders(): Order[] {
    const totalPages = Math.max(1, Math.ceil(this.historyOrders.length / this.historyPageSize));
    const page = Math.min(this.historyPage, totalPages);
    const start = (page - 1) * this.historyPageSize;
    return this.historyOrders.slice(start, start + this.historyPageSize);
  }

  toggleExpanded(orderId: number): void {
    if (this.expandedOrderIds.has(orderId)) {
      this.expandedOrderIds.delete(orderId);
    } else {
      this.expandedOrderIds.add(orderId);
    }
  }

  isExpanded(orderId: number): boolean {
    return this.expandedOrderIds.has(orderId);
  }

  // Defensive against a stale/legacy row where unitPrice came back as null
  // or a numeric string (e.g. from a raw DB read) — calling .toFixed()
  // directly on that in the template throws and blanks out the whole cell
  // instead of just showing Bs.0.00, which is what broke Precio/Subtotal.
  itemUnitPrice(item: OrderItem): number {
    return Number(item.unitPrice) || 0;
  }

  itemSubtotal(item: OrderItem): number {
    return this.itemUnitPrice(item) * item.quantity;
  }

  // Subtotal before the first-order discount was applied — order.total is
  // already the post-discount amount that was actually charged.
  preDiscountTotal(order: Order): number {
    if (!order.discountPercent) {
      return order.total;
    }
    return order.total / (1 - order.discountPercent / 100);
  }

  discountAmount(order: Order): number {
    return this.preDiscountTotal(order) - order.total;
  }

  ngOnInit(): void {
    this.loadOrders();
    this.loadLowStock();
  }

  loadLowStock(): void {
    this.distributorService.getDistributors().subscribe(distributors => {
      const entries: LowStockEntry[] = [];
      for (const distributor of distributors) {
        for (const entry of distributor.distributorProducts || []) {
          if (entry.quantity < LOW_STOCK_THRESHOLD) {
            entries.push({
              distributorName: distributor.name,
              productName: entry.product.name,
              quantity: entry.quantity
            });
          }
        }
      }
      this.lowStockEntries = entries.sort((a, b) => a.quantity - b.quantity);
    });
  }

  loadOrders(): void {
    this.orderService.getOrders().subscribe(data => {
      this.orders = data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    });
  }

  exportOrdersCsv(): void {
    this.orderService.exportOrdersCsv().subscribe({
      next: blob => {
        const now = new Date();
        const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pedidos-${month}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.modalService.error('Error al exportar el historial de pedidos.')
    });
  }

  confirmPayment(order: Order): void {
    this.updatingId = order.id;
    this.orderService.updateStatus(order.id, this.STATUS_CONFIRMED).subscribe({
      next: () => {
        this.updatingId = null;
        this.loadOrders();
      },
      error: () => {
        this.updatingId = null;
        this.modalService.error('Error al actualizar el pedido.');
      }
    });
  }

  markCompleted(order: Order): void {
    this.updatingId = order.id;
    this.orderService.updateStatus(order.id, this.STATUS_COMPLETED).subscribe({
      next: () => {
        this.updatingId = null;
        this.loadOrders();
      },
      error: () => {
        this.updatingId = null;
        this.modalService.error('Error al actualizar el pedido.');
      }
    });
  }

  async cancelOrder(order: Order): Promise<void> {
    const confirmed = await this.modalService.confirm({
      title: 'Cancelar pedido',
      message: order.status === this.STATUS_CONFIRMED
        ? `¿Cancelar el pedido #${order.id}? El stock que se descontó al confirmarlo se devolverá al inventario central.`
        : `¿Cancelar el pedido #${order.id}?`,
      confirmText: 'Cancelar pedido',
    });
    if (!confirmed) {
      return;
    }
    this.updatingId = order.id;
    this.orderService.updateStatus(order.id, this.STATUS_CANCELLED).subscribe({
      next: () => {
        this.updatingId = null;
        this.loadOrders();
      },
      error: () => {
        this.updatingId = null;
        this.modalService.error('Error al cancelar el pedido.');
      }
    });
  }
}
