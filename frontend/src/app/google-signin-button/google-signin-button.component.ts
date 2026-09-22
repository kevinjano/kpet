import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth-service';
import { ModalService } from '../services/modal-service';
import { FavoriteService } from '../services/favorite-service';
import { GOOGLE_CLIENT_ID } from '../constants';

declare const google: any;

// Self-contained "Continuar con Google" button: loads the Google Identity
// Services script on demand (not in index.html, so pages that never render
// this component never pay for it), then wires the resulting ID token
// straight through AuthService.loginWithGoogle — same success/error handling
// and role-based redirect as the plain email/password login, so both the
// login and register pages can drop this in and behave identically.
@Component({
  selector: 'app-google-signin-button',
  standalone: true,
  template: '<div #buttonContainer class="google-signin-container"></div>',
  styleUrl: './google-signin-button.component.css',
})
export class GoogleSigninButtonComponent implements OnInit {
  @ViewChild('buttonContainer', { static: true }) buttonContainer!: ElementRef<HTMLDivElement>;

  private static scriptLoading: Promise<void> | null = null;

  constructor(
    private authService: AuthService,
    private favoriteService: FavoriteService,
    private modalService: ModalService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadScript().then(() => this.renderButton());
  }

  private loadScript(): Promise<void> {
    if (typeof google !== 'undefined' && google?.accounts?.id) {
      return Promise.resolve();
    }
    if (!GoogleSigninButtonComponent.scriptLoading) {
      GoogleSigninButtonComponent.scriptLoading = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('No se pudo cargar Google Identity Services'));
        document.head.appendChild(script);
      });
    }
    return GoogleSigninButtonComponent.scriptLoading;
  }

  private renderButton(): void {
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response: { credential: string }) => this.handleCredential(response.credential),
    });
    google.accounts.id.renderButton(this.buttonContainer.nativeElement, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      width: 320,
      text: 'continue_with',
      locale: 'es',
    });
  }

  private handleCredential(credential: string): void {
    this.authService.loginWithGoogle(credential).subscribe({
      next: response => {
        this.favoriteService.loadFavorites();
        this.router.navigate([response.role === 'Admin' ? '/admin' : '/']);
      },
      error: () => {
        this.modalService.error('No se pudo iniciar sesión con Google. Intenta de nuevo.');
      }
    });
  }
}
