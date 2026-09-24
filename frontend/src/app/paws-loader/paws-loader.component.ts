import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-paws-loader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './paws-loader.component.html',
  styleUrl: './paws-loader.component.css',
})
// Just the three bouncing paw prints — no text, no skeleton grid (that part
// stays specific to wherever it's used, e.g. Tienda's product grid). Reused
// both as the global page-transition indicator (see AppComponent) and inside
// Tienda while product images preload.
export class PawsLoaderComponent {}
