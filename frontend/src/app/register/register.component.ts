import {Component, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import {NgForOf, NgIf} from "@angular/common";
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {Router, RouterLink, RouterLinkActive} from '@angular/router';
import { UserService } from "../services/user-service";
import { SiteSettingsService } from "../services/site-settings-service";
import { ModalService } from "../services/modal-service";
import { resolveImageUrl, DEFAULT_LOGO_URL } from "../constants";

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    RouterLinkActive,
    NgForOf,
    NgIf
  ],
  standalone: true
})
// Public sign-up form. Role is hardcoded to 'Client' here — there is no
// self-service way to create an Admin account through the UI.
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  logoUrl: string = DEFAULT_LOGO_URL;
  showPassword = false;
  resolveImageUrl = resolveImageUrl;

  constructor(
      private formBuilder: FormBuilder,
      private userService: UserService,
      private siteSettingsService: SiteSettingsService,
      private modalService: ModalService,
      private router: Router) { }

  ngOnInit(): void {
    this.registerForm = this.formBuilder.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      noTel: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });

    this.siteSettingsService.getSettings().subscribe(settings => {
      this.logoUrl = settings.logoUrl || DEFAULT_LOGO_URL;
    });
  }

  onSubmit() {
    const userData = {
      firstName: this.registerForm.value['firstName'],
      lastName: this.registerForm.value['lastName'],
      email: this.registerForm.value['email'],
      noTel: this.registerForm.value['noTel'],
      password: this.registerForm.value['password'],
      role: 'Client'
    };

    this.userService.addUser(userData).subscribe({
      next: response => {
        this.modalService.success('¡Cuenta creada con éxito!').then(() => this.router.navigate(['/login']));
      },
      error: error => {
        console.error('Error al crear la cuenta', error);
        this.modalService.error('Error al crear la cuenta. Intenta de nuevo.');
      }
    });
  }

}
