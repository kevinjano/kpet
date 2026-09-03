import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {SiteSettings} from '../site-settings';
import {API_ORIGIN} from '../constants';

@Injectable({
  providedIn: 'root',
})
// Thin HTTP wrapper over /api/settings (the single store-config row).
export class SiteSettingsService {

  private apiUrl = `${API_ORIGIN}/api/settings`;

  constructor(private httpClient: HttpClient) {}

  getSettings(): Observable<SiteSettings> {
    return this.httpClient.get<SiteSettings>(this.apiUrl);
  }

  updateSettings(settings: Partial<SiteSettings>): Observable<SiteSettings> {
    return this.httpClient.put<SiteSettings>(`${this.apiUrl}/update`, settings);
  }
}
