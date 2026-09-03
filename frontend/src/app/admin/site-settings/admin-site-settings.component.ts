import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { SiteSettingsService } from '../../services/site-settings-service';
import { UploadService } from '../../services/upload-service';
import { ModalService } from '../../services/modal-service';
import { resolveImageUrl, extractErrorMessage } from '../../constants';

@Component({
  selector: 'app-admin-site-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-site-settings.component.html',
  styleUrl: './admin-site-settings.component.css'
})
// Edits the single SiteSettings row. Banner reordering (moveBanner) mutates a
// local array only — nothing is persisted until save() is clicked, which
// forkJoins the logo/QR uploads (only issuing the ones actually changed) before
// sending everything as one updateSettings() call.
export class AdminSiteSettingsComponent implements OnInit {

  form: FormGroup;
  resolveImageUrl = resolveImageUrl;

  currentLogoUrl: string | null = null;
  currentQrCodeUrl: string | null = null;
  bannerUrls: string[] = [];

  logoFile: File | null = null;
  logoPreview: string | null = null;

  qrFile: File | null = null;
  qrPreview: string | null = null;

  saving = false;
  uploadingBanner = false;

  constructor(
    private siteSettingsService: SiteSettingsService,
    private uploadService: UploadService,
    private modalService: ModalService,
    private formBuilder: FormBuilder,
  ) {
    this.form = this.formBuilder.group({
      storeName: ['', Validators.required],
      whatsappNumber: ['', Validators.required],
      aboutText: [''],
      instagramUrl: [''],
      tiktokUrl: [''],
      youtubeUrl: [''],
      contactEmail: [''],
    });
  }

  ngOnInit(): void {
    this.loadSettings();
  }

  private loadSettings(): void {
    this.siteSettingsService.getSettings().subscribe(settings => {
      this.form.patchValue({
        storeName: settings.storeName,
        whatsappNumber: settings.whatsappNumber,
        aboutText: settings.aboutText,
        instagramUrl: settings.instagramUrl,
        tiktokUrl: settings.tiktokUrl,
        youtubeUrl: settings.youtubeUrl,
        contactEmail: settings.contactEmail,
      });
      this.currentLogoUrl = settings.logoUrl;
      this.currentQrCodeUrl = settings.qrCodeUrl;
      this.bannerUrls = [...(settings.bannerUrls ?? [])];
    });
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.logoFile = input.files[0];
      this.logoPreview = URL.createObjectURL(this.logoFile);
    }
  }

  onQrSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.qrFile = input.files[0];
      this.qrPreview = URL.createObjectURL(this.qrFile);
    }
  }

  onBannerSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }
    const file = input.files[0];
    this.uploadingBanner = true;
    this.uploadService.upload(file).subscribe({
      next: res => {
        this.bannerUrls.push(res.url);
        this.uploadingBanner = false;
        input.value = '';
      },
      error: err => {
        this.uploadingBanner = false;
        this.modalService.error(extractErrorMessage(err, 'Error al subir el banner.'));
      }
    });
  }

  removeBanner(index: number): void {
    this.bannerUrls.splice(index, 1);
  }

  moveBanner(index: number, direction: -1 | 1): void {
    const target = index + direction;
    if (target < 0 || target >= this.bannerUrls.length) {
      return;
    }
    const [item] = this.bannerUrls.splice(index, 1);
    this.bannerUrls.splice(target, 0, item);
  }

  save(): void {
    if (this.form.invalid) {
      return;
    }
    this.saving = true;

    const logoUpload$ = this.logoFile ? this.uploadService.upload(this.logoFile) : of(null);
    const qrUpload$ = this.qrFile ? this.uploadService.upload(this.qrFile) : of(null);

    forkJoin({logo: logoUpload$, qr: qrUpload$}).subscribe({
      next: ({logo, qr}) => {
        const logoUrl = logo ? logo.url : this.currentLogoUrl;
        const qrCodeUrl = qr ? qr.url : this.currentQrCodeUrl;

        this.siteSettingsService.updateSettings({
          storeName: this.form.value.storeName,
          whatsappNumber: this.form.value.whatsappNumber,
          aboutText: this.form.value.aboutText,
          instagramUrl: this.form.value.instagramUrl,
          tiktokUrl: this.form.value.tiktokUrl,
          youtubeUrl: this.form.value.youtubeUrl,
          contactEmail: this.form.value.contactEmail,
          logoUrl,
          qrCodeUrl,
          bannerUrls: this.bannerUrls,
        }).subscribe({
          next: () => {
            this.saving = false;
            this.modalService.success('Configuración guardada con éxito.');
            this.currentLogoUrl = logoUrl;
            this.currentQrCodeUrl = qrCodeUrl;
            this.logoFile = null;
            this.logoPreview = null;
            this.qrFile = null;
            this.qrPreview = null;
          },
          error: () => {
            this.saving = false;
            this.modalService.error('Error al guardar la configuración.');
          }
        });
      },
      error: err => {
        this.saving = false;
        this.modalService.error(extractErrorMessage(err, 'Error al subir una de las imágenes.'));
      }
    });
  }
}
