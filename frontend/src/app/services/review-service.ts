import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Review, RatingSummary } from '../review';
import { API_ORIGIN } from '../constants';

@Injectable({
  providedIn: 'root',
})
// Thin HTTP wrapper over /api/reviews. Reading is public; posting/deleting
// require a logged-in account (enforced backend-side, see ReviewController).
export class ReviewService {

  private apiUrl = `${API_ORIGIN}/api/reviews`;

  constructor(private httpClient: HttpClient) {}

  getReviewsForProduct(productId: number): Observable<Review[]> {
    return this.httpClient.get<Review[]>(`${this.apiUrl}/product/${productId}`);
  }

  getRatingSummary(): Observable<RatingSummary[]> {
    return this.httpClient.get<RatingSummary[]>(`${this.apiUrl}/summary`);
  }

  createReview(productId: number, rating: number, comment: string): Observable<Review> {
    return this.httpClient.post<Review>(this.apiUrl, {productId, rating, comment});
  }

  deleteReview(id: number): Observable<void> {
    return this.httpClient.post<void>(`${this.apiUrl}/remove/${id}`, {});
  }
}
