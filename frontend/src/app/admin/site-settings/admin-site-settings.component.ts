import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { forkJoin, of } from 'rxjs';
import { SiteSettingsService } from '../../services/site-settings-service';
import { UploadService } from '../../services/upload-service';
import { ModalService } from '../../services/modal-service';
import { resolveImageUrl, extractErrorMessage, toEmbedVideoUrl, isDirectVideoFile, isVideoEmbeddable } from '../../constants';

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
  isDirectVideoFile = isDirectVideoFile;
  // Computed from valueChanges rather than called inline in the template —
  // bypassSecurityTrustResourceUrl() returns a new wrapper object each call,
  // which would otherwise reset the preview iframe's src (restarting
  // playback) on every unrelated change-detection cycle, not just when the
  // pasted link actually changes.
  aboutVideoEmbedUrl: SafeResourceUrl | null = null;
  aboutVideoUnsupported = false;

  // Carousel reads fine with more, but the client asked for a fixed cap
  // they can reason about ("space for 8") rather than an open-ended list.
  readonly maxBanners = 8;

  currentLogoUrl: string | null = null;
  currentQrCodeUrl: string | null = null;
  bannerUrls: string[] = [];

  logoFile: File | null = null;
  logoPreview: string | null = null;

  qrFile: File | null = null;
  qrPreview: string | null = null;

  currentDiscountImageUrl: string | null = null;
  discountImageFile: File | null = null;
  discountImagePreview: string | null = null;

  currentAboutImageUrl: string | null = null;
  aboutImageFile: File | null = null;
  aboutImagePreview: string | null = null;

  currentCommitmentImageUrl: string | null = null;
  commitmentImageFile: File | null = null;
  commitmentImagePreview: string | null = null;

  currentFollowCardImageUrl: string | null = null;
  followCardImageFile: File | null = null;
  followCardImagePreview: string | null = null;

  currentContactCardImageUrl: string | null = null;
  contactCardImageFile: File | null = null;
  contactCardImagePreview: string | null = null;

  // Home page's 3 big category cards — one image each, fixed to the real
  // catalog categories (no "Novedades" card; see TiendaComponent's comment).
  currentCategoryImages: Record<'Perros' | 'Gatos' | 'Accesorios', string | null> = { Perros: null, Gatos: null, Accesorios: null };
  categoryImageFiles: Partial<Record<'Perros' | 'Gatos' | 'Accesorios', File>> = {};
  categoryImagePreviews: Partial<Record<'Perros' | 'Gatos' | 'Accesorios', string>> = {};

  saving = false;
  uploadingBanner = false;

  constructor(
    private siteSettingsService: SiteSettingsService,
    private uploadService: UploadService,
    private modalService: ModalService,
    private formBuilder: FormBuilder,
    private sanitizer: DomSanitizer,
  ) {
    this.form = this.formBuilder.group({
      storeName: ['', Validators.required],
      whatsappNumber: ['', Validators.required],
      aboutText: [''],
      missionText: [''],
      visionText: [''],
      commitmentText: [''],
      aboutVideoUrl: [''],
      address: [''],
      mapUrl: [''],
      instagramUrl: [''],
      facebookUrl: [''],
      tiktokUrl: [''],
      youtubeUrl: [''],
      contactEmail: [''],
      discountEnabled: [false],
      discountPercent: [10, [Validators.min(1), Validators.max(90)]],
    });
  }

  ngOnInit(): void {
    this.loadSettings();
    this.form.get('aboutVideoUrl')!.valueChanges.subscribe(url => this.updateAboutVideoPreview(url));
  }

  private updateAboutVideoPreview(url: string | null): void {
    if (!url || isDirectVideoFile(url)) {
      this.aboutVideoEmbedUrl = null;
      this.aboutVideoUnsupported = false;
      return;
    }
    if (isVideoEmbeddable(url)) {
      this.aboutVideoEmbedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(toEmbedVideoUrl(url));
      this.aboutVideoUnsupported = false;
    } else {
      this.aboutVideoEmbedUrl = null;
      this.aboutVideoUnsupported = true;
    }
  }

  private loadSettings(): void {
    this.siteSettingsService.getSettings().subscribe(settings => {
      this.form.patchValue({
        storeName: settings.storeName,
        whatsappNumber: settings.whatsappNumber,
        aboutText: settings.aboutText,
        missionText: settings.missionText,
        visionText: settings.visionText,
        commitmentText: settings.commitmentText,
        aboutVideoUrl: settings.aboutVideoUrl,
        address: settings.address,
        mapUrl: settings.mapUrl,
        instagramUrl: settings.instagramUrl,
        facebookUrl: settings.facebookUrl,
        tiktokUrl: settings.tiktokUrl,
        youtubeUrl: settings.youtubeUrl,
        contactEmail: settings.contactEmail,
        discountEnabled: settings.discountEnabled,
        discountPercent: settings.discountPercent,
      });
      this.currentLogoUrl = settings.logoUrl;
      this.currentQrCodeUrl = settings.qrCodeUrl;
      this.currentDiscountImageUrl = settings.discountImageUrl;
      this.currentAboutImageUrl = settings.aboutImageUrl;
      this.currentCommitmentImageUrl = settings.commitmentImageUrl;
      this.currentFollowCardImageUrl = settings.followCardImageUrl;
      this.currentContactCardImageUrl = settings.contactCardImageUrl;
      this.currentCategoryImages = {
        Perros: settings.categoryImagePerros,
        Gatos: settings.categoryImageGatos,
        Accesorios: settings.categoryImageAccesorios,
      };
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

  removeLogo(): void {
    this.logoFile = null;
    this.logoPreview = null;
    this.currentLogoUrl = null;
  }

  onQrSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.qrFile = input.files[0];
      this.qrPreview = URL.createObjectURL(this.qrFile);
    }
  }

  removeQrCode(): void {
    this.qrFile = null;
    this.qrPreview = null;
    this.currentQrCodeUrl = null;
  }

  onDiscountImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.discountImageFile = input.files[0];
      this.discountImagePreview = URL.createObjectURL(this.discountImageFile);
    }
  }

  removeDiscountImage(): void {
    this.discountImageFile = null;
    this.discountImagePreview = null;
    this.currentDiscountImageUrl = null;
  }

  onAboutImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.aboutImageFile = input.files[0];
      this.aboutImagePreview = URL.createObjectURL(this.aboutImageFile);
    }
  }

  removeAboutImage(): void {
    this.aboutImageFile = null;
    this.aboutImagePreview = null;
    this.currentAboutImageUrl = null;
  }

  onCommitmentImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.commitmentImageFile = input.files[0];
      this.commitmentImagePreview = URL.createObjectURL(this.commitmentImageFile);
    }
  }

  removeCommitmentImage(): void {
    this.commitmentImageFile = null;
    this.commitmentImagePreview = null;
    this.currentCommitmentImageUrl = null;
  }

  onFollowCardImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.followCardImageFile = input.files[0];
      this.followCardImagePreview = URL.createObjectURL(this.followCardImageFile);
    }
  }

  removeFollowCardImage(): void {
    this.followCardImageFile = null;
    this.followCardImagePreview = null;
    this.currentFollowCardImageUrl = null;
  }

  onContactCardImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.contactCardImageFile = input.files[0];
      this.contactCardImagePreview = URL.createObjectURL(this.contactCardImageFile);
    }
  }

  removeContactCardImage(): void {
    this.contactCardImageFile = null;
    this.contactCardImagePreview = null;
    this.currentContactCardImageUrl = null;
  }

  onCategoryImageSelected(category: 'Perros' | 'Gatos' | 'Accesorios', event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.categoryImageFiles[category] = input.files[0];
      this.categoryImagePreviews[category] = URL.createObjectURL(input.files[0]);
    }
  }

  removeCategoryImage(category: 'Perros' | 'Gatos' | 'Accesorios'): void {
    delete this.categoryImageFiles[category];
    delete this.categoryImagePreviews[category];
    this.currentCategoryImages[category] = null;
  }

  onBannerSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }
    if (this.bannerUrls.length >= this.maxBanners) {
      input.value = '';
      this.modalService.error(`Ya llegaste al máximo de ${this.maxBanners} banners. Eliminá uno para agregar otro.`);
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
    const discountImageUpload$ = this.discountImageFile ? this.uploadService.upload(this.discountImageFile) : of(null);
    const aboutImageUpload$ = this.aboutImageFile ? this.uploadService.upload(this.aboutImageFile) : of(null);
    const commitmentImageUpload$ = this.commitmentImageFile ? this.uploadService.upload(this.commitmentImageFile) : of(null);
    const perrosUpload$ = this.categoryImageFiles.Perros ? this.uploadService.upload(this.categoryImageFiles.Perros) : of(null);
    const gatosUpload$ = this.categoryImageFiles.Gatos ? this.uploadService.upload(this.categoryImageFiles.Gatos) : of(null);
    const accesoriosUpload$ = this.categoryImageFiles.Accesorios ? this.uploadService.upload(this.categoryImageFiles.Accesorios) : of(null);
    const followCardUpload$ = this.followCardImageFile ? this.uploadService.upload(this.followCardImageFile) : of(null);
    const contactCardUpload$ = this.contactCardImageFile ? this.uploadService.upload(this.contactCardImageFile) : of(null);

    forkJoin({logo: logoUpload$, qr: qrUpload$, discountImage: discountImageUpload$, aboutImage: aboutImageUpload$, commitmentImage: commitmentImageUpload$, perros: perrosUpload$, gatos: gatosUpload$, accesorios: accesoriosUpload$, followCard: followCardUpload$, contactCard: contactCardUpload$}).subscribe({
      next: ({logo, qr, discountImage, aboutImage, commitmentImage, perros, gatos, accesorios, followCard, contactCard}) => {
        const logoUrl = logo ? logo.url : this.currentLogoUrl;
        const qrCodeUrl = qr ? qr.url : this.currentQrCodeUrl;
        const discountImageUrl = discountImage ? discountImage.url : this.currentDiscountImageUrl;
        const aboutImageUrl = aboutImage ? aboutImage.url : this.currentAboutImageUrl;
        const commitmentImageUrl = commitmentImage ? commitmentImage.url : this.currentCommitmentImageUrl;
        const categoryImagePerros = perros ? perros.url : this.currentCategoryImages.Perros;
        const categoryImageGatos = gatos ? gatos.url : this.currentCategoryImages.Gatos;
        const categoryImageAccesorios = accesorios ? accesorios.url : this.currentCategoryImages.Accesorios;
        const followCardImageUrl = followCard ? followCard.url : this.currentFollowCardImageUrl;
        const contactCardImageUrl = contactCard ? contactCard.url : this.currentContactCardImageUrl;

        this.siteSettingsService.updateSettings({
          storeName: this.form.value.storeName,
          whatsappNumber: this.form.value.whatsappNumber,
          aboutText: this.form.value.aboutText,
          missionText: this.form.value.missionText,
          visionText: this.form.value.visionText,
          commitmentText: this.form.value.commitmentText,
          commitmentImageUrl,
          aboutVideoUrl: this.form.value.aboutVideoUrl || null,
          address: this.form.value.address,
          mapUrl: this.form.value.mapUrl,
          instagramUrl: this.form.value.instagramUrl,
          facebookUrl: this.form.value.facebookUrl,
          tiktokUrl: this.form.value.tiktokUrl,
          youtubeUrl: this.form.value.youtubeUrl,
          contactEmail: this.form.value.contactEmail,
          discountEnabled: this.form.value.discountEnabled,
          discountPercent: this.form.value.discountPercent,
          logoUrl,
          qrCodeUrl,
          discountImageUrl,
          aboutImageUrl,
          categoryImagePerros,
          categoryImageGatos,
          categoryImageAccesorios,
          followCardImageUrl,
          contactCardImageUrl,
          bannerUrls: this.bannerUrls,
        }).subscribe({
          next: () => {
            this.saving = false;
            this.modalService.success('Configuración guardada con éxito.');
            this.currentLogoUrl = logoUrl;
            this.currentQrCodeUrl = qrCodeUrl;
            this.currentDiscountImageUrl = discountImageUrl;
            this.currentAboutImageUrl = aboutImageUrl;
            this.currentCommitmentImageUrl = commitmentImageUrl;
            this.currentFollowCardImageUrl = followCardImageUrl;
            this.currentContactCardImageUrl = contactCardImageUrl;
            this.currentCategoryImages = { Perros: categoryImagePerros, Gatos: categoryImageGatos, Accesorios: categoryImageAccesorios };
            this.logoFile = null;
            this.logoPreview = null;
            this.qrFile = null;
            this.qrPreview = null;
            this.discountImageFile = null;
            this.discountImagePreview = null;
            this.aboutImageFile = null;
            this.aboutImagePreview = null;
            this.commitmentImageFile = null;
            this.commitmentImagePreview = null;
            this.followCardImageFile = null;
            this.followCardImagePreview = null;
            this.contactCardImageFile = null;
            this.contactCardImagePreview = null;
            this.categoryImageFiles = {};
            this.categoryImagePreviews = {};
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
