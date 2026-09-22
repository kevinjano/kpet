import {Injectable} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {Observable, tap} from 'rxjs';
import {User} from "../user";
import {API_ORIGIN} from "../constants";

@Injectable({
  providedIn: 'root',
})
// Thin HTTP wrapper over /api/users (accounts CRUD + password change). Login
// itself lives in AuthService, not here.
export class UserService {

  private apiUrl = `${API_ORIGIN}/api/users`;

  constructor(private httpClient: HttpClient) {}

  getUsers(): Observable<User[]> {
    return this.httpClient.get<User[]>(`${this.apiUrl}/findAll`)
      .pipe(
        tap(data => console.log('Fetched users:', data))
      );
  }

  addUser(user: Partial<User>): Observable<User> {
    const headers = new HttpHeaders({'Content-type': 'application/json'});
    return this.httpClient.post<User>(`${this.apiUrl}/create`, user, {headers});
  }

  updateUser(user: User): Observable<User> {
    return this.httpClient.put<User>(`${this.apiUrl}/update/${user.id}`, user);
  }

  changePassword(userId: number, currentPassword: string, newPassword: string): Observable<any> {
    return this.httpClient.put(`${this.apiUrl}/${userId}/password`, {currentPassword, newPassword});
  }

  deleteUser(id: number): Observable<any> {
    return this.httpClient.delete(`${this.apiUrl}/delete/${id}`);
  }

  getUserById(userId: number | undefined) {
    return this.httpClient.get<User>(`${this.apiUrl}/${userId}`);
  }

  forgotPassword(email: string): Observable<{ message: string }> {
    return this.httpClient.post<{ message: string }>(`${this.apiUrl}/forgot-password`, { email });
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.httpClient.post(`${this.apiUrl}/reset-password`, { token, newPassword });
  }
}
