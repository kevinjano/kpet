import { Component, ElementRef, EventEmitter, HostBinding, HostListener, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface FilterDropdownOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-filter-dropdown',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './filter-dropdown.component.html',
  styleUrl: './filter-dropdown.component.css'
})
// Reusable pill dropdown for list-page filters (category, role, status,
// city...) — the same look/behavior as the storefront's sort control
// (HomeComponent's .products-sort), extracted here so every admin filter
// gets it via one component instead of a native <select> or its own
// copy-pasted open/close logic.
export class FilterDropdownComponent {
  @Input() options: FilterDropdownOption[] = [];
  @Input() value = '';
  @Output() valueChange = new EventEmitter<string>();

  open = false;

  @HostBinding('class.open')
  get isOpen(): boolean {
    return this.open;
  }

  constructor(private elementRef: ElementRef<HTMLElement>) {}

  get selectedLabel(): string {
    return this.options.find(o => o.value === this.value)?.label ?? this.options[0]?.label ?? '';
  }

  toggle(): void {
    this.open = !this.open;
  }

  select(value: string): void {
    this.value = value;
    this.valueChange.emit(value);
    this.open = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open && !this.elementRef.nativeElement.contains(event.target as Node)) {
      this.open = false;
    }
  }
}
