import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BlogPost } from '../blog-post';
import { resolveImageUrl } from '../constants';

@Component({
  selector: 'app-blog-post-detail-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './blog-post-detail-modal.component.html',
  styleUrl: './blog-post-detail-modal.component.css'
})
// Expanded view of a single blog post, opened by clicking its card — same
// backdrop/modal pattern as ProductDetailModalComponent, just simpler
// (no gallery, no reviews): one big photo or video plus the full text.
export class BlogPostDetailModalComponent {

  @Input() post!: BlogPost;
  @Output() close = new EventEmitter<void>();

  resolveImageUrl = resolveImageUrl;

  onBackdropClick(): void {
    this.close.emit();
  }
}
