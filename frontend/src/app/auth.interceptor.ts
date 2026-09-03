import { HttpInterceptorFn } from '@angular/common/http';
import { API_ORIGIN } from './constants';

/**
 * Attaches "Authorization: Bearer <token>" to every request going to our own
 * API (never to a third-party URL) when a token is present in localStorage.
 * Requests made before logging in (browsing the storefront, registering, the
 * login call itself) simply go out without the header — the backend treats
 * those as anonymous, which is fine for the public endpoints and rejected for
 * protected ones (see SecurityConfig).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('token');

  if (token && req.url.startsWith(API_ORIGIN)) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  return next(req);
};
