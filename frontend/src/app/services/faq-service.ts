import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {Faq} from '../faq';
import {API_ORIGIN} from '../constants';

@Injectable({
  providedIn: 'root',
})
// Thin HTTP wrapper over /api/faq. The backend already scopes findAll() to
// published==true for non-admin callers, so this returns exactly what
// should be shown to whoever's asking — no client-side filtering needed.
export class FaqService {

  private apiUrl = `${API_ORIGIN}/api/faq`;

  constructor(private httpClient: HttpClient) {}

  getFaqs(): Observable<Faq[]> {
    return this.httpClient.get<Faq[]>(`${this.apiUrl}/findAll`);
  }

  createFaq(faq: Partial<Faq>): Observable<Faq> {
    return this.httpClient.post<Faq>(`${this.apiUrl}/create`, faq);
  }

  updateFaq(id: number, faq: Partial<Faq>): Observable<Faq> {
    return this.httpClient.put<Faq>(`${this.apiUrl}/update/${id}`, faq);
  }

  reorderFaq(id: number, direction: 'up' | 'down'): Observable<Faq> {
    return this.httpClient.put<Faq>(`${this.apiUrl}/${id}/reorder`, {direction});
  }

  deleteFaq(id: number): Observable<any> {
    return this.httpClient.delete(`${this.apiUrl}/delete/${id}`);
  }
}
