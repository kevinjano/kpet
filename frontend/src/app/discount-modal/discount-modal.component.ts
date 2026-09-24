import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SiteSettingsService } from '../services/site-settings-service';
import { DiscountLeadService } from '../services/discount-lead-service';
import { AuthService } from '../services/auth-service';
import { OrderService } from '../services/order-service';
import { resolveImageUrl } from '../constants';

const SEEN_KEY = 'discountModalSeen';
// Read by CartComponent at checkout to automatically mention the discount
// in the WhatsApp order message and redeem it server-side — cleared once
// an order actually uses it (see cart.component.ts).
export const PENDING_DISCOUNT_KEY = 'kpet_pending_discount';

export interface PendingDiscount {
  leadId: number;
  percent: number;
}

@Component({
  selector: 'app-discount-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './discount-modal.component.html',
  styleUrl: './discount-modal.component.css',
})
// Shown once per browser (localStorage flag, not per-session) to a logged-out
// visitor. The discount isn't a coupon code to remember — signing up here
// stores a pending-discount flag (see PENDING_DISCOUNT_KEY) that
// CartComponent picks up automatically on the customer's first order and
// the backend redeems at most once per lead (OrderController@create).
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
    private orderService: OrderService,
  ) {
    this.form = this.formBuilder.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      petName: [''],
      petBirthday: [''],
    });
  }

  ngOnInit(): void {
    // Already filled out the form on this browser (logged in or not) —
    // don't ask again, whether or not that lead has been redeemed yet.
    if (localStorage.getItem(SEEN_KEY)) {
      return;
    }
    if (this.authService.isLoggedIn()) {
      // A logged-in customer only qualifies while they've never placed an
      // order — once they have, the "first order" discount no longer
      // applies to them even if they never happened to fill this form.
      this.orderService.getMyOrders().subscribe({
        next: orders => {
          if (orders.length === 0) {
            this.loadAndShow();
          }
        },
        error: () => {
          // Can't confirm order history — safer to just not show it than
          // risk offering an already-used discount.
        },
      });
      return;
    }
    this.loadAndShow();
  }

  private loadAndShow(): void {
    this.siteSettingsService.getSettings().subscribe(settings => {
      if (!settings.discountEnabled) {
        return;
      }
      this.discountPercent = settings.discountPercent;
      this.imageUrl = settings.discountImageUrl ? resolveImageUrl(settings.discountImageUrl) : null;
      this.visible = true;
    });
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
      next: lead => {
        this.submitting = false;
        this.submitted = true;
        localStorage.setItem(SEEN_KEY, 'true');
        const pending: PendingDiscount = { leadId: lead.id, percent: lead.discountPercent ?? this.discountPercent };
        try {
          localStorage.setItem(PENDING_DISCOUNT_KEY, JSON.stringify(pending));
        } catch {
          // Private browsing / storage disabled — the discount just won't
          // auto-apply at checkout, not worth failing the signup over.
        }
      },
      error: () => {
        this.submitting = false;
      }
    });
  }
}
