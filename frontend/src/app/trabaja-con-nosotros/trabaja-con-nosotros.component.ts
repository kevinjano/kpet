import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SiteSettingsService } from '../services/site-settings-service';
import { ModalService } from '../services/modal-service';
import { SiteSettings } from '../site-settings';
import { resolveImageUrl, DEFAULT_LOGO_URL } from '../constants';

@Component({
  selector: 'app-trabaja-con-nosotros',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './trabaja-con-nosotros.component.html',
  styleUrl: './trabaja-con-nosotros.component.css'
})
// "Trabaja con nosotros" is actually a distributor-application form — other
// petshops that want to resell Kpet products fill this out. There's no
// backend endpoint for it (nothing is stored): submitting just builds a
// WhatsApp message and opens wa.me to the central store's own number,
// exactly like the cart checkout message. The store owner reviews and
// follows up with each applicant manually over WhatsApp.
export class TrabajaConNosotrosComponent implements OnInit {

  form: FormGroup;
  settings: SiteSettings | undefined;
  resolveImageUrl = resolveImageUrl;
  defaultLogoUrl = DEFAULT_LOGO_URL;
  submitted = false;

  constructor(
    private formBuilder: FormBuilder,
    private siteSettingsService: SiteSettingsService,
    private modalService: ModalService,
  ) {
    this.form = this.formBuilder.group({
      storeName: ['', Validators.required],
      contactName: ['', Validators.required],
      phone: ['', Validators.required],
      city: ['', Validators.required],
      address: [''],
      message: [''],
    });
  }

  ngOnInit(): void {
    this.siteSettingsService.getSettings().subscribe(settings => {
      this.settings = settings;
    });
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.form.invalid) {
      return;
    }
    if (!this.settings?.whatsappNumber) {
      this.modalService.error('El número de WhatsApp de la tienda todavía no está configurado.');
      return;
    }

    const v = this.form.value;
    const storeName = this.settings.storeName || 'Kpet';
    const lines = [
      `¡Hola! Quiero postular mi petshop para trabajar como distribuidor de *${storeName}*:`,
      '',
      '*Datos de mi negocio:*',
      `*Nombre del negocio:* ${v.storeName}`,
      `*Nombre de contacto:* ${v.contactName}`,
      `*Teléfono:* ${v.phone}`,
      `*Ciudad:* ${v.city}`,
    ];
    if (v.address) {
      lines.push(`*Dirección:* ${v.address}`);
    }
    if (v.message) {
      lines.push('', '*Mensaje:*', v.message);
    }
    lines.push('', 'Quedo atento/a a su respuesta. ¡Gracias!');

    const digitsOnly = this.settings.whatsappNumber.replace(/\D/g, '');
    const url = `https://wa.me/${digitsOnly}?text=${encodeURIComponent(lines.join('\n'))}`;
    window.open(url, '_blank');
  }
}
