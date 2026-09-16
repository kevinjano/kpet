import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProductService } from '../../services/product-service';
import { UploadService } from '../../services/upload-service';
import { Product } from '../../product';
import { PRODUCT_CATEGORIES, LOW_STOCK_THRESHOLD, resolveImageUrl, extractErrorMessage, trackById } from '../../constants';
import { ModalService } from '../../services/modal-service';
import { AdminTableComponent } from '../../admin-table/admin-table.component';

// '' = todas, a category name, or 'low-stock' for the stock-bajo filter —
// they're mutually exclusive so a single field covers both cases.
type CategoryFilterValue = string;

@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, AdminTableComponent],
  templateUrl: './admin-products.component.html',
  styleUrl: './admin-products.component.css'
})
// Admin "Productos" screen: table + search/category-filter, and a single
// create/edit form (editingProductId toggles between the two modes). Image
// upload is fire-and-forget: if a new file was picked, it's uploaded first and
// its URL is spliced into the payload before the product itself is saved.
export class AdminProductsComponent implements OnInit {

  products: Product[] = [];
  categories = PRODUCT_CATEGORIES;
  resolveImageUrl = resolveImageUrl;
  searchTerm = '';
  categoryFilter: CategoryFilterValue = '';
  categoryFilterMenuOpen = false;
  trackById = trackById;

  get categoryFilterOptions(): { value: CategoryFilterValue; label: string }[] {
    return [
      { value: '', label: 'Todas las categorías' },
      ...this.categories.map(cat => ({ value: cat, label: cat })),
      { value: 'low-stock', label: 'Stock bajo' },
    ];
  }

  get categoryFilterLabel(): string {
    return this.categoryFilterOptions.find(o => o.value === this.categoryFilter)?.label ?? 'Todas las categorías';
  }

  toggleCategoryFilterMenu(): void {
    this.categoryFilterMenuOpen = !this.categoryFilterMenuOpen;
  }

  selectCategoryFilter(value: CategoryFilterValue): void {
    this.categoryFilter = value;
    this.categoryFilterMenuOpen = false;
  }

  // Closes the custom filter dropdown when clicking outside it — same pattern
  // as HomeComponent's sort dropdown.
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.categoryFilterMenuOpen) {
      return;
    }
    const target = event.target as HTMLElement;
    if (!target.closest('.admin-filter-dropdown')) {
      this.categoryFilterMenuOpen = false;
    }
  }

  form: FormGroup;
  editingProductId: number | null = null;
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  saving = false;

  // Extra gallery shown in the product detail modal, separate from the single
  // "cover" image above (selectedFile/previewUrl) — already-uploaded URLs,
  // since each file uploads as soon as it's picked rather than waiting for save.
  galleryUrls: string[] = [];
  uploadingGallery = false;

  get filteredProducts(): Product[] {
    const term = this.searchTerm.trim().toLowerCase();
    return this.products.filter(p => {
      if (this.categoryFilter === 'low-stock') {
        if (p.stock >= LOW_STOCK_THRESHOLD) {
          return false;
        }
      } else if (this.categoryFilter && p.category !== this.categoryFilter) {
        return false;
      }
      if (!term) {
        return true;
      }
      return p.name.toLowerCase().includes(term) || (p.description ?? '').toLowerCase().includes(term);
    });
  }

  constructor(
    private productService: ProductService,
    private uploadService: UploadService,
    private modalService: ModalService,
    private formBuilder: FormBuilder,
  ) {
    this.form = this.formBuilder.group({
      name: ['', Validators.required],
      description: [''],
      price: [0, [Validators.required, Validators.min(0)]],
      onSale: [false],
      salePrice: [null],
      category: [PRODUCT_CATEGORIES[0], Validators.required],
      stock: [0, [Validators.required, Validators.min(0)]],
      active: [true],
    });
  }

  importing = false;

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.productService.getProducts().subscribe(data => this.products = data);
  }

  exportCsv(): void {
    this.productService.exportProductsCsv().subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'productos-kpet.csv';
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.modalService.error('Error al exportar el catálogo.')
    });
  }

  onImportFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }

    this.importing = true;
    this.productService.importProductsCsv(file).subscribe({
      next: result => {
        this.importing = false;
        this.loadProducts();
        const summary = `${result.created} producto${result.created === 1 ? '' : 's'} creado${result.created === 1 ? '' : 's'}, `
          + `${result.updated} actualizado${result.updated === 1 ? '' : 's'}.`;
        if (result.errors.length > 0) {
          this.modalService.error(`${summary}\n\nErrores:\n${result.errors.join('\n')}`);
        } else {
          this.modalService.success(summary);
        }
      },
      error: err => {
        this.importing = false;
        this.modalService.error(extractErrorMessage(err, 'Error al importar el archivo.'));
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.previewUrl = URL.createObjectURL(this.selectedFile);
    }
  }

  editProduct(product: Product): void {
    this.editingProductId = product.id;
    this.previewUrl = product.imageUrl ? resolveImageUrl(product.imageUrl) : null;
    this.selectedFile = null;
    this.galleryUrls = product.imageUrls ? [...product.imageUrls] : [];
    this.form.patchValue({
      name: product.name,
      description: product.description,
      price: product.price,
      onSale: product.onSale,
      salePrice: product.salePrice,
      category: product.category,
      stock: product.stock,
      active: product.active,
    });
  }

  cancelEdit(): void {
    this.editingProductId = null;
    this.selectedFile = null;
    this.previewUrl = null;
    this.galleryUrls = [];
    this.form.reset({name: '', description: '', price: 0, onSale: false, salePrice: null, category: PRODUCT_CATEGORIES[0], stock: 0, active: true});
  }

  resolveGalleryUrl(url: string): string {
    return resolveImageUrl(url) ?? url;
  }

  onGalleryFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    input.value = '';
    if (files.length === 0) {
      return;
    }

    this.uploadingGallery = true;
    let remaining = files.length;
    files.forEach(file => {
      this.uploadService.upload(file).subscribe({
        next: res => {
          this.galleryUrls.push(res.url);
          remaining--;
          if (remaining === 0) {
            this.uploadingGallery = false;
          }
        },
        error: () => {
          remaining--;
          if (remaining === 0) {
            this.uploadingGallery = false;
          }
          this.modalService.error('Error al subir una de las imágenes de la galería.');
        }
      });
    });
  }

  removeGalleryImage(index: number): void {
    this.galleryUrls.splice(index, 1);
  }

  async deleteProduct(id: number): Promise<void> {
    const confirmed = await this.modalService.confirm({
      title: 'Eliminar producto',
      message: '¿Eliminar este producto? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
    });
    if (!confirmed) {
      return;
    }
    this.productService.deleteProduct(id).subscribe({
      next: () => this.loadProducts(),
      error: () => this.modalService.error('Error al eliminar el producto.')
    });
  }

  save(): void {
    if (this.form.invalid) {
      return;
    }
    this.saving = true;

    const payload = {
      ...this.form.value,
      imageUrl: this.editingProductId
        ? this.products.find(p => p.id === this.editingProductId)?.imageUrl ?? null
        : null,
      imageUrls: this.galleryUrls,
    };

    const afterUpload = (imageUrl: string | null) => {
      if (imageUrl) {
        payload.imageUrl = imageUrl;
      }

      const request = this.editingProductId
        ? this.productService.updateProduct(this.editingProductId, payload)
        : this.productService.createProduct(payload);

      request.subscribe({
        next: () => {
          this.saving = false;
          this.cancelEdit();
          this.loadProducts();
        },
        error: () => {
          this.saving = false;
          this.modalService.error('Error al guardar el producto.');
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
