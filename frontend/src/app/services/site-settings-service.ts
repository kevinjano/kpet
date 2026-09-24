import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, concat, of} from 'rxjs';
import {tap} from 'rxjs/operators';
import {SiteSettings} from '../site-settings';
import {API_ORIGIN} from '../constants';

const CACHE_KEY = 'kpet_site_settings_cache';

@Injectable({
  providedIn: 'root',
})
// Thin HTTP wrapper over /api/settings (the single store-config row).
export class SiteSettingsService {

  private apiUrl = `${API_ORIGIN}/api/settings`;

  constructor(private httpClient: HttpClient) {}

  // Emits the last-known settings from localStorage first (if any) so the
  // real logo/banners paint immediately instead of flashing the bundled
  // default logo / empty hero placeholder while the network request is
  // still in flight, then emits again once the fresh response arrives.
  // Every page that reads settings goes through here, so this fixes the
  // flicker everywhere at once instead of per-component.
  getSettings(): Observable<SiteSettings> {
    const cached = this.readCache();
    const network$ = this.httpClient.get<SiteSettings>(this.apiUrl).pipe(
      tap(settings => this.writeCache(settings))
    );
    return cached ? concat(of(cached), network$) : network$;
  }

  // Synchronous escape hatch for a component that needs the last-known
  // settings before its first render (e.g. seeding an @Input field's
  // initializer) — even the "cached" emission from getSettings() above
  // only arrives after a subscription fires, which is one change-detection
  // cycle too late to avoid a flash of the empty/placeholder state.
  getCachedSettings(): SiteSettings | null {
    return this.readCache();
  }

  updateSettings(settings: Partial<SiteSettings>): Observable<SiteSettings> {
    return this.httpClient.put<SiteSettings>(`${this.apiUrl}/update`, settings).pipe(
      tap(updated => this.writeCache(updated))
    );
  }

  private readCache(): SiteSettings | null {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private writeCache(settings: SiteSettings): void {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(settings));
    } catch {
      // Private browsing / storage disabled / quota exceeded — fine to skip,
      // this cache is a pure optimization, never load-bearing.
    }
  }
}
