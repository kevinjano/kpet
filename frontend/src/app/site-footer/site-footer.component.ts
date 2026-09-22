import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SiteSettings } from '../site-settings';
import { buildWhatsappUrl } from '../constants';

@Component({
  selector: 'app-site-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './site-footer.component.html',
  styleUrl: './site-footer.component.css'
})
// Same footer markup as the homepage's own (Nosotros / Contacto / Síguenos en
// redes), extracted so every secondary page — Blog, Trabaja con nosotros, FAQ,
// Distribuidores, Términos, Privacidad — gets it too instead of ending
// abruptly after their content. "Conócenos" always links back to the
// homepage's #conocenos section (HomeComponent scrolls to it on that
// fragment), since that section only exists there.
export class SiteFooterComponent {
  @Input() settings: SiteSettings | undefined;
  buildWhatsappUrl = buildWhatsappUrl;
}
