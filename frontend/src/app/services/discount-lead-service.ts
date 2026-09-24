import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ORIGIN } from '../constants';

export interface DiscountLead {
  id: number;
  name: string;
  email: string;
  petName: string | null;
  petBirthday: string | null;
  createdAt: string;
}

export interface DiscountLeadInput {
  name: string;
  email: string;
  petName?: string;
  petBirthday?: string;
}

@Injectable({
  providedIn: 'root',
})
export class DiscountLeadService {
  private apiUrl = `${API_ORIGIN}/api/discount-leads`;

  constructor(private httpClient: HttpClient) {}

  create(lead: DiscountLeadInput): Observable<void> {
    return this.httpClient.post<void>(this.apiUrl, lead);
  }

  getAll(): Observable<DiscountLead[]> {
    return this.httpClient.get<DiscountLead[]>(this.apiUrl);
  }

  export(): Observable<Blob> {
    return this.httpClient.get(`${this.apiUrl}/export`, { responseType: 'blob' });
  }
}
