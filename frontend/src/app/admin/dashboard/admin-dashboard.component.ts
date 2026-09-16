import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OrderService } from '../../services/order-service';
import { ProductService } from '../../services/product-service';
import { UserService } from '../../services/user-service';
import { ReviewService } from '../../services/review-service';
import { Order, ORDER_STATUS_LABELS, ORDER_STATUS_PENDING, ORDER_STATUS_CONFIRMED, ORDER_STATUS_CANCELLED, ORDER_STATUS_COMPLETED } from '../../order';
import { Product } from '../../product';
import { RatingSummary } from '../../review';
import { trackById } from '../../constants';

const LOW_STOCK_THRESHOLD = 15;

interface TopProductRow {
  productId: number;
  name: string;
  quantitySold: number;
}

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
export class AdminDashboardComponent implements OnInit {
  orders: Order[] = [];
  products: Product[] = [];
  usersCount = 0;
  ratingSummaries: RatingSummary[] = [];
  loaded = false;
  statusLabels = ORDER_STATUS_LABELS;
  trackById = trackById;

  constructor(
    private orderService: OrderService,
    private productService: ProductService,
    private userService: UserService,
    private reviewService: ReviewService,
  ) {}

  ngOnInit(): void {
    this.orderService.getOrders().subscribe(orders => {
      this.orders = orders;
      this.loaded = true;
    });
    this.productService.getProducts().subscribe(products => {
      this.products = products;
    });
    this.userService.getUsers().subscribe(users => {
      this.usersCount = users.length;
    });
    this.reviewService.getRatingSummary().subscribe(summaries => {
      this.ratingSummaries = summaries;
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

  get totalRevenue(): number {
    return this.orders
      .filter(o => o.status === ORDER_STATUS_CONFIRMED || o.status === ORDER_STATUS_COMPLETED)
      .reduce((sum, o) => sum + o.total, 0);
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

  // Average value of an order that actually went through — a more honest
  // "how much does a typical sale bring in" figure than total revenue alone.
  get averageTicket(): number {
    const closed = this.orders.filter(o => o.status === ORDER_STATUS_CONFIRMED || o.status === ORDER_STATUS_COMPLETED);
    if (closed.length === 0) {
      return 0;
    }
    return closed.reduce((sum, o) => sum + o.total, 0) / closed.length;
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

  get lowStockProducts(): Product[] {
    return this.products.filter(p => p.active && p.stock < LOW_STOCK_THRESHOLD);
  }

  get activeProductsCount(): number {
    return this.products.filter(p => p.active).length;
  }

  get recentOrders(): Order[] {
    return [...this.orders]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
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
