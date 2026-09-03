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

  createOrder(order: Partial<Order>): Observable<Order> {
    return this.httpClient.post<Order>(`${this.apiUrl}/create`, order);
  }

  markReceiptSent(id: number): Observable<Order> {
    return this.httpClient.put<Order>(`${this.apiUrl}/${id}/receipt-sent`, {});
  }

  updateStatus(id: number, status: string): Observable<Order> {
    return this.httpClient.put<Order>(`${this.apiUrl}/${id}/status`, {status});
  }
}
