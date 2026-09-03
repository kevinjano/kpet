import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from './services/auth-service';

/**
 * Route guard used on every /admin/* route and /mon-compte. Checks
 * AuthService.isLoggedIn() and, if the route declares `data: {role: '...'}`,
 * compares it against the role stashed in localStorage at login. This is the
 * ONLY place role-based access is enforced — the backend accepts these
 * requests unconditionally (see SecurityConfig's class comment).
 */
@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private router: Router, private authService: AuthService) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const requiredRole = route.data['role'] as string | undefined;

    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return false;
    }

    if (requiredRole && localStorage.getItem('role') !== requiredRole) {
      this.router.navigate(['/']);
      return false;
    }

    return true;
  }
}
