import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AdminNavComponent } from '../admin-nav/admin-nav.component';

/**
 * Persistent shell for every /admin/* route (see app.routes.ts's nested
 * `children`). Because AdminNavComponent lives here rather than in each admin
 * page, it's a singleton across admin navigation — this is what lets its
 * sliding active-link pill animate between pages instead of resetting on every
 * route change.
 */
@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, AdminNavComponent],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css'
})
export class AdminLayoutComponent {
}
