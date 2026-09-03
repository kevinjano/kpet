import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { BlogService } from '../../services/blog-service';
import { UploadService } from '../../services/upload-service';
import { BlogPost } from '../../blog-post';
import { resolveImageUrl, extractErrorMessage, trackById } from '../../constants';
import { ModalService } from '../../services/modal-service';
import { AdminTableComponent } from '../../admin-table/admin-table.component';

@Component({
  selector: 'app-admin-blog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AdminTableComponent],
  templateUrl: './admin-blog.component.html',
  styleUrl: './admin-blog.component.css'
})
// Admin "Blog" screen — same table + single create/edit form pattern as
// AdminProductsComponent, applied to BlogPost instead of Product.
export class AdminBlogComponent implements OnInit {

  posts: BlogPost[] = [];
  resolveImageUrl = resolveImageUrl;
  trackById = trackById;

  form: FormGroup;
  editingPostId: number | null = null;
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  saving = false;

  constructor(
    private blogService: BlogService,
    private uploadService: UploadService,
    private modalService: ModalService,
    private formBuilder: FormBuilder,
  ) {
    this.form = this.formBuilder.group({
      title: ['', Validators.required],
      content: ['', Validators.required],
      eventDate: [''],
      published: [true],
    });
  }

  ngOnInit(): void {
    this.loadPosts();
  }

  loadPosts(): void {
    this.blogService.getPosts().subscribe(data => {
      this.posts = data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.previewUrl = URL.createObjectURL(this.selectedFile);
    }
  }

  editPost(post: BlogPost): void {
    this.editingPostId = post.id;
    this.previewUrl = post.imageUrl ? resolveImageUrl(post.imageUrl) : null;
    this.selectedFile = null;
    this.form.patchValue({
      title: post.title,
      content: post.content,
      eventDate: post.eventDate ?? '',
      published: post.published,
    });
  }

  cancelEdit(): void {
    this.editingPostId = null;
    this.selectedFile = null;
    this.previewUrl = null;
    this.form.reset({title: '', content: '', eventDate: '', published: true});
  }

  async deletePost(id: number): Promise<void> {
    const confirmed = await this.modalService.confirm({
      title: 'Eliminar publicación',
      message: '¿Eliminar esta publicación? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
    });
    if (!confirmed) {
      return;
    }
    this.blogService.deletePost(id).subscribe({
      next: () => this.loadPosts(),
      error: () => this.modalService.error('Error al eliminar la publicación.')
    });
  }

  save(): void {
    if (this.form.invalid) {
      return;
    }
    this.saving = true;

    const payload = {
      ...this.form.value,
      eventDate: this.form.value.eventDate || null,
      imageUrl: this.editingPostId
        ? this.posts.find(p => p.id === this.editingPostId)?.imageUrl ?? null
        : null,
    };

    const afterUpload = (imageUrl: string | null) => {
      if (imageUrl) {
        payload.imageUrl = imageUrl;
      }

      const request = this.editingPostId
        ? this.blogService.updatePost(this.editingPostId, payload)
        : this.blogService.createPost(payload);

      request.subscribe({
        next: () => {
          this.saving = false;
          this.cancelEdit();
          this.loadPosts();
        },
        error: () => {
          this.saving = false;
          this.modalService.error('Error al guardar la publicación.');
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
