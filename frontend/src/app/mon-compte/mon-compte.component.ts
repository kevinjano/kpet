import {Component, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import {UserService} from "../services/user-service";
import {User} from "../user";
import {FormBuilder, FormsModule, ReactiveFormsModule, Validators} from "@angular/forms";
import {UserModel} from "../user-model";
import {RouterLink, RouterLinkActive, Router} from "@angular/router";
import {AuthService} from "../services/auth-service";
import {SiteSettingsService} from "../services/site-settings-service";
import {ModalService} from "../services/modal-service";
import {OrderService} from "../services/order-service";
import {FavoriteService} from "../services/favorite-service";
import {Order, ORDER_STATUS_LABELS} from "../order";
import {resolveImageUrl, DEFAULT_LOGO_URL} from "../constants";

@Component({
  selector: 'app-mon-compte',
  standalone: true,
    imports: [CommonModule,
        FormsModule,
        ReactiveFormsModule, RouterLink, RouterLinkActive],
  templateUrl: './mon-compte.component.html',
  styleUrl: './mon-compte.component.css'
})
// "Mi Perfil" — the Client-only account page (AuthGuard + role check in
// ngOnInit boot the user out if they're not a logged-in Client). Two
// independent inline edit forms (profile fields, password) plus a delete
// action; logout goes through a confirm modal (showLogoutConfirm) rather than
// firing immediately.
export class MonCompteComponent implements OnInit {
  private user: User | undefined;
  selectedUser!: UserModel;
  submitted = false;
  isEditingInfo: boolean = false;
  isEditingPassword: boolean = false;
  showCurrentPassword = false;
  showNewPassword = false;
  logoUrl: string = DEFAULT_LOGO_URL;
  resolveImageUrl = resolveImageUrl;

  myOrders: Order[] = [];
  ordersLoaded = false;
  statusLabels = ORDER_STATUS_LABELS;
  expandedOrderIds = new Set<number>();

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private siteSettingsService: SiteSettingsService,
    private modalService: ModalService,
    private orderService: OrderService,
    private favoriteService: FavoriteService,
    private formBuilder: FormBuilder,
    private router: Router,
  ) {}

  ngOnInit() {
    if (localStorage.getItem('role') !== 'Client') {
      this.router.navigate(['/']);
      return;
    }
    const userId = Number(localStorage.getItem('userId'));
    this.userService.getUserById(userId).subscribe(data => {
      this.user = data;
      this.selectedUser = data as UserModel;
    });

    this.siteSettingsService.getSettings().subscribe(settings => {
      this.logoUrl = settings.logoUrl || DEFAULT_LOGO_URL;
    });

    this.orderService.getMyOrders().subscribe({
      next: orders => {
        this.myOrders = orders;
        this.ordersLoaded = true;
      },
      error: () => {
        this.ordersLoaded = true;
      }
    });
  }

  toggleOrderExpanded(orderId: number): void {
    if (this.expandedOrderIds.has(orderId)) {
      this.expandedOrderIds.delete(orderId);
    } else {
      this.expandedOrderIds.add(orderId);
    }
  }

  isOrderExpanded(orderId: number): boolean {
    return this.expandedOrderIds.has(orderId);
  }

  checkoutForm = this.formBuilder.group({
    firstName: [{value: '', disabled: true}, Validators.required],
    lastName: [{value: '', disabled: true}, Validators.required],
    email: [{value: '', disabled: true}, Validators.required],
    noTel: [{value: '', disabled: true}, Validators.required],
  });

  checkoutFormPassword = this.formBuilder.group({
    password: [{value: '', disabled: true}, Validators.required],
    newPassword: [{value: '', disabled: true}, Validators.required],
  });

  onEditButtonClick() {
    this.checkoutForm.enable();
    this.isEditingInfo = true;
  }

  onEditPasswordButtonClick() {
    this.checkoutFormPassword.enable();
    this.isEditingPassword = true;
  }

  async openLogoutConfirm(): Promise<void> {
    const confirmed = await this.modalService.confirm({
      title: '¿Cerrar sesión?',
      message: 'Vas a salir de tu cuenta.',
      confirmText: 'Cerrar sesión',
    });
    if (confirmed) {
      this.favoriteService.clear();
      this.authService.logout();
    }
  }

  async deleteUser(userId: number | undefined): Promise<void> {
    const confirmed = await this.modalService.confirm({
      title: 'Eliminar cuenta',
      message: '¿Estás seguro de que quieres eliminar tu cuenta? Esta acción es irreversible.',
      confirmText: 'Eliminar',
    });
    if (!confirmed) {
      return;
    }
    if (typeof userId !== 'number') {
      console.error('Error deleting user: user ID is undefined.');
      return;
    }
    this.userService.deleteUser(userId).subscribe({
      next: () => {
        this.modalService.success('Cuenta eliminada con éxito.').then(() => this.authService.logout());
      },
      error: error => {
        console.error('Error deleting user:', error);
        this.modalService.error('Error al eliminar la cuenta. Intenta de nuevo.');
      }
    });
  }

  onSubmit(user: User): void {
    if (!user.id) {
      console.error("El id del usuario no está definido.");
      return;
    }

    this.selectedUser = {
      id: user.id,
      firstName: this.checkoutForm.value['firstName'] ? this.checkoutForm.value['firstName']! : user.firstName,
      lastName: this.checkoutForm.value['lastName'] ? this.checkoutForm.value['lastName']! : user.lastName,
      email: this.checkoutForm.value['email'] ? this.checkoutForm.value['email']! : user.email,
      noTel: this.checkoutForm.value['noTel'] ? this.checkoutForm.value['noTel']! : user.noTel,
      password: user.password,
      role: user.role,
    }

    this.userService.updateUser(this.selectedUser)
      .subscribe({
        next: response => {
          this.submitted = true;
          this.modalService.success('Cambios guardados con éxito.').then(() => window.location.reload());
        },
        error: error => {
          console.error("Error al guardar los cambios:", error);
          this.modalService.error('Error al guardar los cambios.').then(() => window.location.reload());
        }
      });
  }

  onSubmitPassword(user: User): void {
    if (!user.id) {
      console.error("El id del usuario no está definido.");
      return;
    }

    const currentPassword = this.checkoutFormPassword.value['password'] ?? '';
    const newPassword = this.checkoutFormPassword.value['newPassword'] ?? '';

    this.userService.changePassword(user.id, currentPassword, newPassword)
      .subscribe({
        next: () => {
          this.submitted = true;
          this.modalService.success('Contraseña actualizada con éxito.').then(() => window.location.reload());
        },
        error: error => {
          console.error("Error al actualizar la contraseña:", error);
          if (error.status === 401) {
            this.modalService.error('La contraseña actual es incorrecta.');
          } else {
            this.modalService.error('Error al actualizar la contraseña.');
          }
        }
      });
  }

  cancel() {
    this.isEditingInfo = false;
    this.isEditingPassword = false;
    window.location.reload();
  }
}
