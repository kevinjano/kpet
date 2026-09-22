import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DistributorService } from '../../services/distributor-service';
import { ProductService } from '../../services/product-service';
import { UploadService } from '../../services/upload-service';
import { Distributor } from '../../distributor';
import { Product } from '../../product';
import { resolveImageUrl, extractErrorMessage, trackById } from '../../constants';
import { ModalService } from '../../services/modal-service';
import { AdminTableComponent } from '../../admin-table/admin-table.component';
import { FilterDropdownComponent } from '../../filter-dropdown/filter-dropdown.component';

/**
 * Admin "Distribuidores" screen. The product-picker in the create/edit form
 * lists the ENTIRE catalog (loadProducts) with a checkbox + quantity stepper
 * per row, backed by productQuantities — reusing product images/names already
 * uploaded elsewhere rather than letting distributors have their own separate
 * image set. On save, that Map is flattened into the {productId, quantity}[]
 * shape the backend expects (see Distributor.ts's ProductQuantityInput comment).
 */
@Component({
  selector: 'app-admin-distributors',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, AdminTableComponent, FilterDropdownComponent],
  templateUrl: './admin-distributors.component.html',
  styleUrl: './admin-distributors.component.css'
})
export class AdminDistributorsComponent implements OnInit {

  distributors: Distributor[] = [];
  allProducts: Product[] = [];
  resolveImageUrl = resolveImageUrl;
  searchTerm = '';
  cityFilter = '';
  trackById = trackById;

  form: FormGroup;
  editingDistributorId: number | null = null;
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  // productId -> quantity; presence of a key means the product is selected
  productQuantities = new Map<number, number>();
  saving = false;

  get cities(): string[] {
    return Array.from(new Set(this.distributors.map(d => d.city).filter(c => !!c))).sort();
  }

  get cityFilterOptions() {
    return [
      { value: '', label: 'Todas las ciudades' },
      ...this.cities.map(city => ({ value: city, label: city })),
    ];
  }

  get filteredDistributors(): Distributor[] {
    const term = this.searchTerm.trim().toLowerCase();
    return this.distributors.filter(d => {
      if (this.cityFilter && d.city !== this.cityFilter) {
        return false;
      }
      if (!term) {
        return true;
      }
      return d.name.toLowerCase().includes(term) || (d.address ?? '').toLowerCase().includes(term);
    });
  }

  constructor(
    private distributorService: DistributorService,
    private productService: ProductService,
    private uploadService: UploadService,
    private modalService: ModalService,
    private formBuilder: FormBuilder,
  ) {
    this.form = this.formBuilder.group({
      name: ['', Validators.required],
      city: ['', Validators.required],
      address: [''],
      phone: [''],
      whatsappNumber: [''],
      mapUrl: [''],
      description: [''],
      active: [true],
    });
  }

  ngOnInit(): void {
    this.loadDistributors();
    this.loadProducts();
  }

  loadDistributors(): void {
    this.distributorService.getDistributors().subscribe(data => this.distributors = data);
  }

  loadProducts(): void {
    // Always pulls the current full catalog, so any product added anywhere in
    // the system shows up here automatically — no separate registration needed.
    this.productService.getProducts().subscribe(data => this.allProducts = data);
  }

  get selectedCount(): number {
    return this.productQuantities.size;
  }

  isSelected(productId: number): boolean {
    return this.productQuantities.has(productId);
  }

  getQuantity(productId: number): number {
    return this.productQuantities.get(productId) ?? 0;
  }

  toggleProduct(productId: number): void {
    if (this.productQuantities.has(productId)) {
      this.productQuantities.delete(productId);
    } else {
      this.productQuantities.set(productId, 1);
    }
  }

  incrementQuantity(productId: number): void {
    const current = this.productQuantities.get(productId) ?? 0;
    this.productQuantities.set(productId, current + 1);
  }

  decrementQuantity(productId: number): void {
    const current = this.productQuantities.get(productId) ?? 0;
    if (current > 0) {
      this.productQuantities.set(productId, current - 1);
    }
  }

  onQuantityInput(productId: number, value: string): void {
    const parsed = parseInt(value, 10);
    this.productQuantities.set(productId, isNaN(parsed) || parsed < 0 ? 0 : parsed);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.previewUrl = URL.createObjectURL(this.selectedFile);
    }
  }

  editDistributor(dist: Distributor): void {
    this.editingDistributorId = dist.id;
    this.previewUrl = dist.imageUrl ? resolveImageUrl(dist.imageUrl) : null;
    this.selectedFile = null;
    this.productQuantities = new Map(dist.distributorProducts.map(dp => [dp.product.id, dp.quantity]));
    this.form.patchValue({
      name: dist.name,
      city: dist.city,
      address: dist.address,
      phone: dist.phone,
      whatsappNumber: dist.whatsappNumber,
      mapUrl: dist.mapUrl,
      description: dist.description,
      active: dist.active,
    });
  }

  cancelEdit(): void {
    this.editingDistributorId = null;
    this.selectedFile = null;
    this.previewUrl = null;
    this.productQuantities = new Map();
    this.form.reset({name: '', city: '', address: '', phone: '', whatsappNumber: '', mapUrl: '', description: '', active: true});
  }

  async deleteDistributor(id: number): Promise<void> {
    const confirmed = await this.modalService.confirm({
      title: 'Eliminar distribuidor',
      message: '¿Eliminar este distribuidor? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
    });
    if (!confirmed) {
      return;
    }
    this.distributorService.deleteDistributor(id).subscribe({
      next: () => this.loadDistributors(),
      error: () => this.modalService.error('Error al eliminar el distribuidor.')
    });
  }

  save(): void {
    if (this.form.invalid) {
      return;
    }
    this.saving = true;

    const payload = {
      ...this.form.value,
      productQuantities: Array.from(this.productQuantities.entries()).map(([productId, quantity]) => ({productId, quantity})),
      imageUrl: this.editingDistributorId
        ? this.distributors.find(d => d.id === this.editingDistributorId)?.imageUrl ?? null
        : null,
    };

    const afterUpload = (imageUrl: string | null) => {
      if (imageUrl) {
        payload.imageUrl = imageUrl;
      }

      const request = this.editingDistributorId
        ? this.distributorService.updateDistributor(this.editingDistributorId, payload)
        : this.distributorService.createDistributor(payload);

      const wasEditing = this.editingDistributorId !== null;
      request.subscribe({
        next: () => {
          this.saving = false;
          this.cancelEdit();
          this.loadDistributors();
          this.modalService.success(wasEditing ? 'Distribuidor actualizado con éxito.' : 'Distribuidor añadido con éxito.');
        },
        error: () => {
          this.saving = false;
          this.modalService.error('Error al guardar el distribuidor.');
        }
      });
    };

    if (this.selectedFile) {
      this.uploadService.upload(this.selectedFile).subscribe({
        next: res => afterUpload(res.url),
        error: err => {
          this.saving = false;
          this.modalService.error(extractErrorMessage(err, 'Error al subir la imagen.'));
        }
      });
    } else {
      afterUpload(null);
    }
  }
}
