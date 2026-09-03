import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {Product} from '../product';
import {API_ORIGIN} from '../constants';

@Injectable({
  providedIn: 'root',
})
// Thin HTTP wrapper over /api/products. No client-side caching — every page
// that needs products (home, admin, distributor forms) calls getProducts()
// on its own ngOnInit, so edits made elsewhere are picked up on next navigation.
export class ProductService {

  private apiUrl = `${API_ORIGIN}/api/products`;

  constructor(private httpClient: HttpClient) {}

  getProducts(): Observable<Product[]> {
    return this.httpClient.get<Product[]>(`${this.apiUrl}/findAll`);
  }

  getProductById(id: number): Observable<Product> {
    return this.httpClient.get<Product>(`${this.apiUrl}/${id}`);
  }

  createProduct(product: Partial<Product>): Observable<Product> {
    return this.httpClient.post<Product>(`${this.apiUrl}/create`, product);
  }

  updateProduct(id: number, product: Partial<Product>): Observable<Product> {
    return this.httpClient.put<Product>(`${this.apiUrl}/update/${id}`, product);
  }

  deleteProduct(id: number): Observable<any> {
    return this.httpClient.delete(`${this.apiUrl}/delete/${id}`);
  }
}
