import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterLink } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { CartService } from '../services/cart-service';

@Component({
  selector: 'app-cart-bubble',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './cart-bubble.component.html',
  styleUrl: './cart-bubble.component.css'
})
// Floating shortcut to the cart, stacked just above the WhatsApp bubble
// (see WhatsappBubbleComponent) and mounted once at the app root. Hidden on
// the same full-screen/back-office routes as that bubble, plus on /carrito
// itself where it would just point at the page you're already on.
export class CartBubbleComponent implements OnInit, OnDestroy {
  itemCount = 0;
  hideBubble = false;
  private subs = new Subscription();

  constructor(
    private cartService: CartService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.subs.add(this.cartService.cart$.subscribe(() => {
      this.itemCount = this.cartService.getItemCount();
    }));

    this.hideBubble = this.shouldHide(this.router.url);
    this.subs.add(this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(event => {
        this.hideBubble = this.shouldHide(event.urlAfterRedirects);
      }));
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  private shouldHide(url: string): boolean {
    return url.startsWith('/admin')
      || url.startsWith('/login')
      || url.startsWith('/register')
      || url.startsWith('/carrito');
  }
}
