import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DiscountLeadService, DiscountLead } from '../../services/discount-lead-service';
import { ModalService } from '../../services/modal-service';
import { AdminTableComponent } from '../../admin-table/admin-table.component';

@Component({
  selector: 'app-admin-discounts',
  standalone: true,
  imports: [CommonModule, AdminTableComponent],
  templateUrl: './admin-discounts.component.html',
  styleUrl: './admin-discounts.component.css',
})
// Contacts captured by the "10% off your first order" modal (see
// DiscountModalComponent), plus whether each one has actually been redeemed
// on an order yet (see OrderController@create) — used to live as a table
// buried inside Configuración; split out to its own page since it's data to
// review/export, not a site setting.
export class AdminDiscountsComponent implements OnInit {
  leads: DiscountLead[] = [];
  leadsLoaded = false;

  constructor(
    private discountLeadService: DiscountLeadService,
    private modalService: ModalService,
  ) {}

  ngOnInit(): void {
    this.discountLeadService.getAll().subscribe(leads => {
      this.leads = leads;
      this.leadsLoaded = true;
    });
  }

  get redeemedCount(): number {
    return this.leads.filter(lead => lead.redeemedAt).length;
  }

  exportLeads(): void {
    this.discountLeadService.export().subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'descuentos-kiara-petnutri.csv';
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.modalService.error('Error al exportar los datos.')
    });
  }
}
