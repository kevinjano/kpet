import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ModalVariant = 'confirm' | 'success' | 'error' | 'info';

export interface ModalOptions {
  title: string;
  message: string;
  variant?: ModalVariant;
  confirmText?: string;
  cancelText?: string;
}

export interface ModalState {
  id: number;
  variant: ModalVariant;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  showCancel: boolean;
}

/**
 * App-wide replacement for window.confirm()/alert() so every confirmation and
 * notification looks like the rest of Kpet instead of a native browser popup.
 * ModalComponent (mounted once, in AppComponent, so it's available on every
 * route) subscribes to state$ and renders whatever is currently set; only one
 * modal can be visible at a time — calling confirm()/alert() again while one
 * is open replaces it (the previous caller's promise is simply never resolved).
 */
@Injectable({
  providedIn: 'root',
})
export class ModalService {

  private stateSubject = new BehaviorSubject<ModalState | null>(null);
  state$ = this.stateSubject.asObservable();

  private resolver: ((confirmed: boolean) => void) | null = null;
  private nextId = 0;

  /** Resolves true if the user clicked confirm, false if they clicked cancel or dismissed it. */
  confirm(options: ModalOptions): Promise<boolean> {
    return new Promise(resolve => {
      this.resolver = resolve;
      this.open(options, 'confirm', true, options.confirmText ?? 'Confirmar', options.cancelText ?? 'Cancelar');
    });
  }

  /** Single "Aceptar" button — resolves once dismissed. */
  alert(options: ModalOptions): Promise<void> {
    return new Promise(resolve => {
      this.resolver = () => resolve();
      this.open(options, options.variant ?? 'info', false, options.confirmText ?? 'Aceptar', '');
    });
  }

  success(message: string, title = '¡Listo!'): Promise<void> {
    return this.alert({title, message, variant: 'success'});
  }

  error(message: string, title = 'Ocurrió un error'): Promise<void> {
    return this.alert({title, message, variant: 'error'});
  }

  private open(options: ModalOptions, variant: ModalVariant, showCancel: boolean, confirmText: string, cancelText: string): void {
    this.stateSubject.next({
      id: ++this.nextId,
      variant: options.variant ?? variant,
      title: options.title,
      message: options.message,
      confirmText,
      cancelText,
      showCancel,
    });
  }

  respond(confirmed: boolean): void {
    const resolver = this.resolver;
    this.resolver = null;
    this.stateSubject.next(null);
    resolver?.(confirmed);
  }
}
