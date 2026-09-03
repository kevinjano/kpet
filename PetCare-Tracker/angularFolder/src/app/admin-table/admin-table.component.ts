import { Component, ViewEncapsulation } from '@angular/core';

/**
 * Shared wrapper for every admin list table (Usuarios, Productos,
 * Distribuidores, Blog, Pedidos → Historial): provides the card + <table>
 * shell and its styling in one place; callers project their own <thead>/
 * <tbody> since each page's columns are different.
 *
 * ViewEncapsulation.None is required here, not stylistic preference: content
 * passed via <ng-content> keeps the PROJECTING component's (the caller's)
 * style-scope attribute, not this component's — so a normally-encapsulated
 * ".admin-table thead th {...}" rule here would never match the projected
 * <thead>/<th> elements (they carry a different scope attribute). Making
 * this component's styles global sidesteps that entirely.
 */
@Component({
  selector: 'app-admin-table',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './admin-table.component.html',
  styleUrl: './admin-table.component.css'
})
export class AdminTableComponent {
}
