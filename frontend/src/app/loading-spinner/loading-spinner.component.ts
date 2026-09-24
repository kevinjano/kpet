import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PawsLoaderComponent } from '../paws-loader/paws-loader.component';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule, PawsLoaderComponent],
  templateUrl: './loading-spinner.component.html',
  styleUrl: './loading-spinner.component.css'
})
// Shared branded loading state (bouncing paws) shown instead of a page's
// empty-state message while its first data fetch is still in flight —
// without it, pages like Distribuidores/Blog/Distribuidor briefly flash "no
// hay nada todavía" before the real content replaces it, which reads as a
// bug rather than a load.
export class LoadingSpinnerComponent {
  @Input() message: string | null = null;
}
