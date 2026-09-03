import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ModalService, ModalState } from '../services/modal-service';

// Renders whatever ModalService.state$ currently holds. Mounted once in
// AppComponent so it's available on every route (storefront and admin alike).
@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.css'
})
export class ModalComponent implements OnInit, OnDestroy {

  state: ModalState | null = null;
  private sub?: Subscription;

  constructor(private modalService: ModalService) {}

  ngOnInit(): void {
    this.sub = this.modalService.state$.subscribe(state => this.state = state);
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  confirm(): void {
    this.modalService.respond(true);
  }

  cancel(): void {
    this.modalService.respond(false);
  }
}
