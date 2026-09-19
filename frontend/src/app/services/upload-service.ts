import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {API_ORIGIN} from '../constants';

@Injectable({
  providedIn: 'root',
})
// Thin wrapper around POST /api/upload — used by every admin form with an
// image field. Returns the stored file's public /uploads/... URL.
export class UploadService {

  constructor(private httpClient: HttpClient) {}

  upload(file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.httpClient.post<{ url: string }>(`${API_ORIGIN}/api/upload`, formData);
  }

  // Short blog videos only — separate endpoint since it allows a much
  // bigger file (50MB vs 15MB) and skips the image-specific processing.
  uploadVideo(file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.httpClient.post<{ url: string }>(`${API_ORIGIN}/api/upload/video`, formData);
  }
}
