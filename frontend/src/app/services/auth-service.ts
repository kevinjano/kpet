import { Injectable } from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {Observable, tap} from "rxjs";
import {Router} from "@angular/router";
import {API_ORIGIN} from "../constants";

@Injectable({
  providedIn: 'root'
})
/**
 * "Session" is a JWT (see backend JwtService) stored in localStorage under
 * 'token', alongside userId/role/userLoggedIn flags for quick client-side
 * checks. auth.interceptor.ts attaches the token as an Authorization header to
 * every outgoing request; the backend independently verifies it on every
 * protected endpoint (see SecurityConfig/JwtAuthenticationFilter) rather than
 * trusting these localStorage values the way it used to. this.user (in-memory)
 * is still lost on page refresh; only the localStorage values survive.
 */
export class AuthService {
  private loginUrl = `${API_ORIGIN}/api/users/login`;
  private googleLoginUrl = `${API_ORIGIN}/api/users/google`;
  private user: any;

  constructor(private http: HttpClient, private router: Router) {}

  login(email: string, password: string): Observable<any> {
    const credentials = { email, password };
    return this.http.post<any>(this.loginUrl, credentials).pipe(
      tap((response: any) => this.storeSession(response))
    );
  }

  // credential is the Google ID token handed to the GIS callback — the
  // backend verifies it and returns the same {id, email, firstName, role,
  // token} shape as a normal login, creating the account on first use.
  loginWithGoogle(credential: string): Observable<any> {
    return this.http.post<any>(this.googleLoginUrl, { credential }).pipe(
      tap((response: any) => this.storeSession(response))
    );
  }

  private storeSession(response: any): void {
    this.user = response;
    localStorage.setItem('userId', response.id);
    localStorage.setItem('role', response.role);
    localStorage.setItem('firstName', response.firstName || '');
    localStorage.setItem('userLoggedIn', 'true');
    localStorage.setItem('token', response.token);
  }

  isLoggedIn(): boolean {
    return localStorage.getItem('userLoggedIn') === 'true';
  }

  getUserId(): number | undefined {
    return this.user?.id;
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getFirstName(): string | null {
    return localStorage.getItem('firstName');
  }

  logout() {
    localStorage.clear();
    this.user = null;
    this.router.navigate(['/']);
  }

}
