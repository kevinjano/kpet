import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {Order} from '../order';
import {API_ORIGIN} from '../constants';

@Injectable({
  providedIn: 'root',
})
// Thin HTTP wrapper over /api/orders — the central-store checkout/order-tracking
// workflow. Distributor "quick orders" never call this service.
export class OrderService {

  private apiUrl = `${API_ORIGIN}/api/orders`;

  constructor(private httpClient: HttpClient) {}

  getOrders(): Observable<Order[]> {
    return this.httpClient.get<Order[]>(`${this.apiUrl}/findAll`);
  }

  // The logged-in customer's own orders ("Mis pedidos" in Mi Perfil) — scoped
  // server-side to the authenticated user, not a client-supplied id.
  getMyOrders(): Observable<Order[]> {
    return this.httpClient.get<Order[]>(`${this.apiUrl}/mine`);
  }

  createOrder(order: Partial<Order>): Observable<Order> {
    return this.httpClient.post<Order>(`${this.apiUrl}/create`, order);
  }

  markReceiptSent(id: number): Observable<Order> {
    return this.httpClient.put<Order>(`${this.apiUrl}/${id}/receipt-sent`, {});
  }

  updateStatus(id: number, status: string): Observable<Order> {
    return this.httpClient.put<Order>(`${this.apiUrl}/${id}/status`, {status});
  }

  // Blob response so the caller can trigger a browser download — a plain
  // <a href> can't carry the Authorization header this admin-only endpoint needs.
  exportOrdersCsv(): Observable<Blob> {
    return this.httpClient.get(`${this.apiUrl}/export`, { responseType: 'blob' });
  }
}
