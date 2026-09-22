import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { UserService } from '../services/user-service';
import { SiteSettingsService } from '../services/site-settings-service';
import { resolveImageUrl, DEFAULT_LOGO_URL } from '../constants';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['../auth-shared.css', './forgot-password.component.css'],
})
// Always shows the same success message regardless of whether the email
// exists (the backend deliberately doesn't reveal that either) — sending
// stays true once submitted so a resubmit doesn't flash the form again.
export class ForgotPasswordComponent implements OnInit {
  form!: FormGroup;
  logoUrl: string = DEFAULT_LOGO_URL;
  resolveImageUrl = resolveImageUrl;
  submitted = false;
  sending = false;

  constructor(
    private formBuilder: FormBuilder,
    private userService: UserService,
    private siteSettingsService: SiteSettingsService,
  ) {}

  ngOnInit(): void {
    this.form = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
    });
    this.siteSettingsService.getSettings().subscribe(settings => {
      this.logoUrl = settings.logoUrl || DEFAULT_LOGO_URL;
    });
  }

  onSubmit(): void {
    if (this.form.invalid || this.sending) {
      return;
    }
    this.sending = true;
    this.userService.forgotPassword(this.form.value.email).subscribe({
      next: () => {
        this.sending = false;
        this.submitted = true;
      },
      error: () => {
        this.sending = false;
        this.submitted = true;
      }
    });
  }
}
