import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {Distributor} from '../distributor';
import {API_ORIGIN} from '../constants';

@Injectable({
  providedIn: 'root',
})
// Thin HTTP wrapper over /api/distributors. create/update send Partial<Distributor>
// whose productQuantities field is what the backend actually reads to build each
// distributor's product/quantity list (see Distributor.ts's comment).
export class DistributorService {

  private apiUrl = `${API_ORIGIN}/api/distributors`;

  constructor(private httpClient: HttpClient) {}

  getDistributors(): Observable<Distributor[]> {
    return this.httpClient.get<Distributor[]>(`${this.apiUrl}/findAll`);
  }

  getDistributorById(id: number): Observable<Distributor> {
    return this.httpClient.get<Distributor>(`${this.apiUrl}/${id}`);
  }

  createDistributor(distributor: Partial<Distributor>): Observable<Distributor> {
    return this.httpClient.post<Distributor>(`${this.apiUrl}/create`, distributor);
  }

  updateDistributor(id: number, distributor: Partial<Distributor>): Observable<Distributor> {
    return this.httpClient.put<Distributor>(`${this.apiUrl}/update/${id}`, distributor);
  }

  deleteDistributor(id: number): Observable<any> {
    return this.httpClient.delete(`${this.apiUrl}/delete/${id}`);
  }
}
