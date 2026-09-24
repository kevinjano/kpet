import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SiteSettingsService } from '../services/site-settings-service';
import { DiscountLeadService } from '../services/discount-lead-service';
import { AuthService } from '../services/auth-service';
import { resolveImageUrl } from '../constants';

const SEEN_KEY = 'discountModalSeen';

@Component({
  selector: 'app-discount-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './discount-modal.component.html',
  styleUrl: './discount-modal.component.css',
})
// Shown once per browser (localStorage flag, not per-session) to a logged-out
// visitor, the same "10% off your first order" pattern referenced from the
// competitor site. No online payment to actually apply a coupon against —
// the code is just something the customer mentions in their WhatsApp order,
// same as every other discount on this storefront.
export class DiscountModalComponent implements OnInit {
  visible = false;
  submitted = false;
  submitting = false;
  discountPercent = 10;
  imageUrl: string | null = null;
  form: FormGroup;

  constructor(
    private formBuilder: FormBuilder,
    private siteSettingsService: SiteSettingsService,
    private discountLeadService: DiscountLeadService,
    private authService: AuthService,
  ) {
    this.form = this.formBuilder.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      petName: [''],
      petBirthday: [''],
    });
  }

  ngOnInit(): void {
    if (this.authService.isLoggedIn() || localStorage.getItem(SEEN_KEY)) {
      return;
    }
    this.siteSettingsService.getSettings().subscribe(settings => {
      if (!settings.discountEnabled) {
        return;
      }
      this.discountPercent = settings.discountPercent;
      this.imageUrl = settings.discountImageUrl ? resolveImageUrl(settings.discountImageUrl) : null;
      this.visible = true;
    });
  }

  get discountCode(): string {
    return `BIENVENIDO${this.discountPercent}`;
  }

  close(): void {
    localStorage.setItem(SEEN_KEY, 'true');
    this.visible = false;
  }

  onSubmit(): void {
    if (this.form.invalid || this.submitting) {
      return;
    }
    this.submitting = true;
    this.discountLeadService.create(this.form.value).subscribe({
      next: () => {
        this.submitting = false;
        this.submitted = true;
        localStorage.setItem(SEEN_KEY, 'true');
      },
      error: () => {
        this.submitting = false;
      }
    });
  }
}
