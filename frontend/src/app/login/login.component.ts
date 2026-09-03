import {Component, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {Router, RouterLink, RouterLinkActive} from "@angular/router";
import {AuthService} from "../services/auth-service";
import {SiteSettingsService} from "../services/site-settings-service";
import {ModalService} from "../services/modal-service";
import {resolveImageUrl} from "../constants";


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, RouterLinkActive],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})

// Redirects away immediately if already logged in (see ngOnInit), and after a
// successful login routes by role — Admin to /admin, everyone else to /.
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  logoUrl: string | null = null;
  showPassword = false;
  resolveImageUrl = resolveImageUrl;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private siteSettingsService: SiteSettingsService,
    private modalService: ModalService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
    if (this.authService.isLoggedIn()) {
      const role = localStorage.getItem('role');
      this.router.navigate([role === 'Admin' ? '/admin' : '/']);
    }

    this.siteSettingsService.getSettings().subscribe(settings => {
      this.logoUrl = settings.logoUrl;
    });
  }


  onSubmit(): void {
    const loginData = {
      email: this.loginForm.value['email'],
      password: this.loginForm.value['password']
    };

    this.authService.login(loginData.email, loginData.password).subscribe({
      next: (response) => {
        if (response.role === 'Admin') {
          this.router.navigate(['/admin']);
        } else {
          this.router.navigate(['/']);
        }
      },
      error: (error) => {
        console.error('Erreur de connexion', error);
        this.modalService.error('Correo o contraseña inválidos. Intenta de nuevo.');
      }
    });
  }
}
