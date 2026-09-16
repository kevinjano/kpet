import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.css'
})
// Client-side pagination controls for an admin list (Productos, Usuarios,
// Pedidos' Historial) — the backend still returns the full list in one call
// (the catalog/order history is small enough that this isn't a real cost
// yet), this just caps how many rows render/scroll at once and lets the
// admin page through the rest. Renders nothing when everything fits on one
// page, so it's a no-op for small lists.
export class PaginationComponent {
  @Input() page = 1;
  @Input() pageSize = 20;
  @Input() totalItems = 0;
  @Output() pageChange = new EventEmitter<number>();

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }

  get currentPage(): number {
    return Math.min(Math.max(1, this.page), this.totalPages);
  }

  get rangeStart(): number {
    return this.totalItems === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }

  get rangeEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalItems);
  }

  goTo(page: number): void {
    const clamped = Math.min(Math.max(1, page), this.totalPages);
    if (clamped !== this.currentPage) {
      this.pageChange.emit(clamped);
    }
  }
}
