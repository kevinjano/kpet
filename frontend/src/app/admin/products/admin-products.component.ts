import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProductService } from '../../services/product-service';
import { UploadService } from '../../services/upload-service';
import { Product } from '../../product';
import { PRODUCT_CATEGORIES, resolveImageUrl, extractErrorMessage, trackById } from '../../constants';
import { ModalService } from '../../services/modal-service';
import { AdminTableComponent } from '../../admin-table/admin-table.component';

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
  categoryFilter = '';
  trackById = trackById;

  form: FormGroup;
  editingProductId: number | null = null;
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  saving = false;

  get filteredProducts(): Product[] {
    const term = this.searchTerm.trim().toLowerCase();
    return this.products.filter(p => {
      if (this.categoryFilter && p.category !== this.categoryFilter) {
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

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.productService.getProducts().subscribe(data => this.products = data);
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
    this.form.reset({name: '', description: '', price: 0, onSale: false, salePrice: null, category: PRODUCT_CATEGORIES[0], stock: 0, active: true});
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
