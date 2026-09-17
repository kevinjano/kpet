import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OrderService } from '../../services/order-service';
import { ProductService } from '../../services/product-service';
import { UserService } from '../../services/user-service';
import { ReviewService } from '../../services/review-service';
import { Order, ORDER_STATUS_LABELS, ORDER_STATUS_PENDING, ORDER_STATUS_CONFIRMED, ORDER_STATUS_CANCELLED, ORDER_STATUS_COMPLETED } from '../../order';
import { Product } from '../../product';
import { RatingSummary } from '../../review';
import { trackById, LOW_STOCK_THRESHOLD } from '../../constants';
import { ModalService } from '../../services/modal-service';

// Recent orders are refetched on this interval so "Pedidos recientes" and the
// sales chart reflect new orders without the admin needing to reload the page.
const ORDERS_REFRESH_MS = 25000;

interface TopProductRow {
  productId: number;
  name: string;
  quantitySold: number;
}

interface ChartBucket {
  date: Date;
  label: string;
  total: number;
  count: number;
}

type ChartRange = 'day' | 'week' | 'month';

/**
 * Admin landing page ("Inicio") — a quick at-a-glance summary computed
 * client-side from data every other admin screen already fetches (orders,
 * products, users), so it needed no new backend endpoints. Revenue only
 * counts CONFIRMED/COMPLETED orders (i.e. actually paid), never PENDING or
 * CANCELLED ones, to avoid overstating sales with orders that never closed.
 */
@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  orders: Order[] = [];
  products: Product[] = [];
  usersCount = 0;
  ratingSummaries: RatingSummary[] = [];
  loaded = false;
  statusLabels = ORDER_STATUS_LABELS;
  trackById = trackById;

  // "Stock bajo" panel shows only the 5 lowest by default; this toggles the
  // full list inline instead of navigating away.
  showAllLowStock = false;

  // "Ventas confirmadas" chart granularity — día/semana/mes, switched via the
  // tabs in the chart panel header.
  chartRange: ChartRange = 'day';
  chartRangeOptions: { value: ChartRange; label: string }[] = [
    { value: 'day', label: 'Día' },
    { value: 'week', label: 'Semana' },
    { value: 'month', label: 'Mes' },
  ];

  setChartRange(range: ChartRange): void {
    this.chartRange = range;
    this.activeBarIndex = null;
    this.refreshChartData();
  }

  // Which chart bar's tooltip is showing — set on hover (desktop) and on tap
  // (mobile, since touch devices don't fire mouseenter/mouseleave); cleared
  // on mouseleave or by tapping anywhere outside the chart.
  activeBarIndex: number | null = null;

  setActiveBar(i: number): void {
    this.activeBarIndex = i;
  }

  clearActiveBar(): void {
    this.activeBarIndex = null;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClickForChart(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dash-chart-col')) {
      this.activeBarIndex = null;
    }
  }

  private refreshHandle?: ReturnType<typeof setInterval>;

  constructor(
    private orderService: OrderService,
    private productService: ProductService,
    private userService: UserService,
    private reviewService: ReviewService,
    private modalService: ModalService,
  ) {}

  ngOnInit(): void {
    this.loadOrders();
    this.productService.getProducts().subscribe({
      next: products => this.products = products,
      error: () => this.modalService.error('No se pudieron cargar los productos. Recargá la página.'),
    });
    this.userService.getUsers().subscribe({
      next: users => this.usersCount = users.length,
      error: () => this.modalService.error('No se pudo cargar el número de usuarios. Recargá la página.'),
    });
    this.reviewService.getRatingSummary().subscribe({
      next: summaries => this.ratingSummaries = summaries,
      error: () => {},
    });

    this.refreshHandle = setInterval(() => this.loadOrders(), ORDERS_REFRESH_MS);
  }

  ngOnDestroy(): void {
    if (this.refreshHandle) {
      clearInterval(this.refreshHandle);
    }
  }

  // Only surfaces one error modal for the periodic refresh (every
  // ORDERS_REFRESH_MS) even if it keeps failing — otherwise a dropped
  // connection would pop a new modal every 25s.
  private orderLoadErrorShown = false;

  private loadOrders(): void {
    this.orderService.getOrders().subscribe({
      next: orders => {
        this.orders = orders;
        this.loaded = true;
        this.orderLoadErrorShown = false;
        this.refreshChartData();
      },
      error: () => {
        if (!this.orderLoadErrorShown) {
          this.orderLoadErrorShown = true;
          this.modalService.error('No se pudieron cargar los pedidos. Recargá la página.');
        }
      },
    });
  }

  get greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  }

  get todayLabel(): string {
    return new Date().toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  get pendingOrdersCount(): number {
    return this.orders.filter(o => o.status === ORDER_STATUS_PENDING).length;
  }

  get cancelledOrdersCount(): number {
    return this.orders.filter(o => o.status === ORDER_STATUS_CANCELLED).length;
  }

  get todayOrdersCount(): number {
    const today = new Date().toDateString();
    return this.orders.filter(o => new Date(o.createdAt).toDateString() === today).length;
  }

  // Store-wide average across every product that has at least one review,
  // weighted by how many reviews each product has (not a plain average of
  // averages, so one product with a single 5-star review doesn't count as
  // much as one with fifty reviews).
  get overallRating(): { average: number; count: number } {
    const totalCount = this.ratingSummaries.reduce((sum, r) => sum + r.count, 0);
    if (totalCount === 0) {
      return { average: 0, count: 0 };
    }
    const weightedSum = this.ratingSummaries.reduce((sum, r) => sum + r.average * r.count, 0);
    return { average: weightedSum / totalCount, count: totalCount };
  }

  // Lowest stock first, so both the "5 más bajos" default view and the
  // expanded view read as a worst-first priority list.
  get lowStockProducts(): Product[] {
    return this.products
      .filter(p => p.active && p.stock < LOW_STOCK_THRESHOLD)
      .sort((a, b) => a.stock - b.stock);
  }

  get lowStockDisplayed(): Product[] {
    return this.showAllLowStock ? this.lowStockProducts : this.lowStockProducts.slice(0, 5);
  }

  toggleLowStockView(): void {
    this.showAllLowStock = !this.showAllLowStock;
  }

  get activeProductsCount(): number {
    return this.products.filter(p => p.active).length;
  }

  // Proportional breakdown of every order by status, for the status bar —
  // percentages of the whole order count, not just the closed ones.
  get statusBreakdown(): { status: string; label: string; count: number; percent: number }[] {
    const total = this.orders.length;
    if (total === 0) {
      return [];
    }
    const statuses = [ORDER_STATUS_PENDING, ORDER_STATUS_CONFIRMED, ORDER_STATUS_COMPLETED, ORDER_STATUS_CANCELLED];
    return statuses
      .map(status => {
        const count = this.orders.filter(o => o.status === status).length;
        return { status, label: this.statusLabels[status] || status, count, percent: (count / total) * 100 };
      })
      .filter(row => row.count > 0);
  }

  get recentOrders(): Order[] {
    return [...this.orders]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);
  }

  // One bucket per day/week/month depending on chartRange, each with the
  // total Bs. and order count from CONFIRMED/COMPLETED orders placed in that
  // bucket — feeds the "Ventas confirmadas" bar chart.
  //
  // This is a plain field, recomputed explicitly by refreshChartData()
  // (called from loadOrders() and setChartRange()), NOT a getter. A getter
  // here would rebuild a brand-new array/objects on every change-detection
  // run — and since hovering a bar fires (mouseenter)/(mouseleave) on every
  // pointer move, that's very often. With no trackBy, Angular would then see
  // a whole new array each time and destroy+recreate every bar element,
  // restarting the CSS "grow" animation — which looked like the bars
  // flickering/reloading in a loop while hovering.
  salesChartData: ChartBucket[] = [];
  trackByChartIndex = (i: number) => i;

  private refreshChartData(): void {
    switch (this.chartRange) {
      case 'week':
        this.salesChartData = this.buildChartBuckets(8, 'week');
        break;
      case 'month':
        this.salesChartData = this.buildChartBuckets(6, 'month');
        break;
      default:
        this.salesChartData = this.buildChartBuckets(7, 'day');
    }
  }

  get salesChartMax(): number {
    return Math.max(1, ...this.salesChartData.map(b => b.total));
  }

  // Sum of exactly what's plotted for the selected range (last 7 days, 8
  // weeks, or 6 months) — shown next to the title, so it moves with the
  // Día/Semana/Mes tabs instead of always being the all-time total.
  get salesChartTotal(): number {
    return this.salesChartData.reduce((sum, b) => sum + b.total, 0);
  }

  private buildChartBuckets(count: number, unit: ChartRange): ChartBucket[] {
    const buckets: ChartBucket[] = [];
    const today = new Date();

    for (let i = count - 1; i >= 0; i--) {
      let date: Date;
      let label: string;
      if (unit === 'day') {
        date = new Date(today);
        date.setDate(date.getDate() - i);
        label = date.toLocaleDateString('es-BO', { weekday: 'short', day: 'numeric' });
      } else if (unit === 'week') {
        date = this.startOfWeek(today);
        date.setDate(date.getDate() - i * 7);
        label = date.toLocaleDateString('es-BO', { day: 'numeric', month: 'short' });
      } else {
        date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        label = date.toLocaleDateString('es-BO', { month: 'short' });
      }
      buckets.push({ date, label, total: 0, count: 0 });
    }

    for (const order of this.orders) {
      if (order.status !== ORDER_STATUS_CONFIRMED && order.status !== ORDER_STATUS_COMPLETED) {
        continue;
      }
      const orderDate = new Date(order.createdAt);
      const bucket = buckets.find(b => this.sameBucket(b.date, orderDate, unit));
      if (bucket) {
        bucket.total += order.total;
        bucket.count += 1;
      }
    }

    return buckets;
  }

  private sameBucket(bucketDate: Date, orderDate: Date, unit: ChartRange): boolean {
    if (unit === 'day') {
      return bucketDate.toDateString() === orderDate.toDateString();
    }
    if (unit === 'week') {
      return this.startOfWeek(bucketDate).toDateString() === this.startOfWeek(orderDate).toDateString();
    }
    return bucketDate.getFullYear() === orderDate.getFullYear() && bucketDate.getMonth() === orderDate.getMonth();
  }

  // Monday of the week containing the given date, at midnight.
  private startOfWeek(d: Date): Date {
    const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = date.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    date.setDate(date.getDate() + diff);
    return date;
  }

  // Ranks products by total units sold across every order that actually went
  // through (CONFIRMED/COMPLETED) — a PENDING or CANCELLED order's items
  // don't reflect real demand.
  get topProducts(): TopProductRow[] {
    const totals = new Map<number, TopProductRow>();
    for (const order of this.orders) {
      if (order.status !== ORDER_STATUS_CONFIRMED && order.status !== ORDER_STATUS_COMPLETED) {
        continue;
      }
      for (const item of order.items) {
        if (item.productId == null) {
          continue;
        }
        const existing = totals.get(item.productId);
        if (existing) {
          existing.quantitySold += item.quantity;
        } else {
          totals.set(item.productId, {productId: item.productId, name: item.productName, quantitySold: item.quantity});
        }
      }
    }
    return [...totals.values()].sort((a, b) => b.quantitySold - a.quantitySold).slice(0, 5);
  }
}
