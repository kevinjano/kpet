import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

/** Auto-advancing hero image carousel (home page banners). Restarts its timer whenever the `images` input changes so a mid-cycle content swap doesn't leave a stale interval running. */
@Component({
  selector: 'app-banner-carousel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './banner-carousel.component.html',
  styleUrl: './banner-carousel.component.css'
})
export class BannerCarouselComponent implements OnInit, OnChanges, OnDestroy {

  @Input() images: string[] = [];
  @Input() intervalMs = 5000;

  activeIndex = 0;
  private timer: ReturnType<typeof setInterval> | undefined;

  ngOnInit(): void {
    this.startAutoplay();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['images']) {
      this.activeIndex = 0;
      this.startAutoplay();
    }
  }

  ngOnDestroy(): void {
    this.stopAutoplay();
  }

  startAutoplay(): void {
    this.stopAutoplay();
    if (this.images.length > 1) {
      this.timer = setInterval(() => this.next(), this.intervalMs);
    }
  }

  stopAutoplay(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  next(): void {
    this.activeIndex = (this.activeIndex + 1) % this.images.length;
  }

  prev(): void {
    this.activeIndex = (this.activeIndex - 1 + this.images.length) % this.images.length;
  }

  goTo(index: number): void {
    this.activeIndex = index;
    this.startAutoplay();
  }
}
