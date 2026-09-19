import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FaqService } from '../../services/faq-service';
import { Faq } from '../../faq';
import { trackById } from '../../constants';
import { ModalService } from '../../services/modal-service';
import { AdminTableComponent } from '../../admin-table/admin-table.component';

@Component({
  selector: 'app-admin-faq',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AdminTableComponent],
  templateUrl: './admin-faq.component.html',
  styleUrl: './admin-faq.component.css'
})
// Admin "Preguntas Frecuentes" screen — same table + single create/edit form
// pattern as AdminBlogComponent, plus up/down buttons that swap position
// with the neighboring row (see FaqController::reorder).
export class AdminFaqComponent implements OnInit {

  faqs: Faq[] = [];
  trackById = trackById;

  form: FormGroup;
  editingFaqId: number | null = null;
  saving = false;

  constructor(
    private faqService: FaqService,
    private modalService: ModalService,
    private formBuilder: FormBuilder,
  ) {
    this.form = this.formBuilder.group({
      question: ['', Validators.required],
      answer: ['', Validators.required],
      published: [true],
    });
  }

  ngOnInit(): void {
    this.loadFaqs();
  }

  loadFaqs(): void {
    this.faqService.getFaqs().subscribe(data => {
      this.faqs = data.sort((a, b) => a.position - b.position);
    });
  }

  editFaq(faq: Faq): void {
    this.editingFaqId = faq.id;
    this.form.patchValue({
      question: faq.question,
      answer: faq.answer,
      published: faq.published,
    });
  }

  cancelEdit(): void {
    this.editingFaqId = null;
    this.form.reset({question: '', answer: '', published: true});
  }

  async deleteFaq(id: number): Promise<void> {
    const confirmed = await this.modalService.confirm({
      title: 'Eliminar pregunta',
      message: '¿Eliminar esta pregunta? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
    });
    if (!confirmed) {
      return;
    }
    this.faqService.deleteFaq(id).subscribe({
      next: () => this.loadFaqs(),
      error: () => this.modalService.error('Error al eliminar la pregunta.')
    });
  }

  move(faq: Faq, direction: 'up' | 'down'): void {
    this.faqService.reorderFaq(faq.id, direction).subscribe({
      next: () => this.loadFaqs(),
      error: () => this.modalService.error('Error al reordenar la pregunta.')
    });
  }

  save(): void {
    if (this.form.invalid) {
      return;
    }
    this.saving = true;

    const payload = this.form.value;
    const request = this.editingFaqId
      ? this.faqService.updateFaq(this.editingFaqId, payload)
      : this.faqService.createFaq(payload);

    request.subscribe({
      next: () => {
        this.saving = false;
        this.cancelEdit();
        this.loadFaqs();
      },
      error: () => {
        this.saving = false;
        this.modalService.error('Error al guardar la pregunta.');
      }
    });
  }
}
