import {Component, OnInit} from '@angular/core';
import { UserService } from '../services/user-service';
import {UserModel} from "../user-model";
import {NgForOf, NgIf} from "@angular/common";
import {User} from "../user";
import {Router, RouterLink, RouterLinkActive} from "@angular/router";
import {FormBuilder, FormsModule, ReactiveFormsModule, Validators} from "@angular/forms";
import {AuthService} from "../services/auth-service";
import {ModalService} from "../services/modal-service";
import {trackById} from "../constants";
import {AdminTableComponent} from "../admin-table/admin-table.component";
import {FilterDropdownComponent} from "../filter-dropdown/filter-dropdown.component";

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    NgForOf,
    NgIf,
    RouterLink,
    RouterLinkActive,
    ReactiveFormsModule,
    FormsModule,
    AdminTableComponent,
    FilterDropdownComponent
  ],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
// Admin "Usuarios" screen: list + search/role-filter (filteredUsers getter) of
// every account, plus a single inline edit form bound to whichever row was
// clicked (selectedUser) — not a modal, the form just lives below the table.
export class AdminComponent implements OnInit{
  users: User[] = [];
  selectedUser: UserModel | undefined;
  submitted = false;
  isEditingInfo: boolean = false;
  searchTerm = '';
  roleFilter = '';
  trackById = trackById;

  roleFilterOptions = [
    { value: '', label: 'Todos los roles' },
    { value: 'Admin', label: 'Admin' },
    { value: 'Client', label: 'Cliente' },
  ];

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private modalService: ModalService,
    private formBuilder: FormBuilder,
    private router: Router,
  ) { }

  get filteredUsers(): User[] {
    const term = this.searchTerm.trim().toLowerCase();
    return this.users.filter(u => {
      if (this.roleFilter && u.role !== this.roleFilter) {
        return false;
      }
      if (!term) {
        return true;
      }
      return (u.firstName ?? '').toLowerCase().includes(term)
        || (u.lastName ?? '').toLowerCase().includes(term)
        || (u.email ?? '').toLowerCase().includes(term)
        || (u.noTel ?? '').toLowerCase().includes(term);
    });
  }

  checkoutForm = this.formBuilder.group({
    firstName: [{value: '', disabled: true}, Validators.required],
    lastName: [{value: '', disabled: true}, Validators.required],
    email: [{value: '', disabled: true}, Validators.required],
    noTel: [{value: '', disabled: true}, Validators.required],
  });

  ngOnInit() {
    this.userService.getUsers().subscribe(data => {
      this.users = data;
    }, error => {
      console.error('Error fetching users:', error);
    });
  }

  async deleteUser(userId: number | undefined) {
    const confirmed = await this.modalService.confirm({
      title: 'Eliminar cuenta',
      message: '¿Estás seguro de que quieres eliminar esta cuenta? Esta acción es irreversible.',
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
        this.users = this.users.filter(u => u.id !== userId);
        this.modalService.success('Usuario eliminado con éxito.');
      },
      error: error => {
        console.error('Error deleting user:', error);
        this.modalService.error('Error al eliminar el usuario. Intenta de nuevo.');
      }
    });
  }

  showUserDetails(user: User) {
    this.selectedUser = user as UserModel;
  }

  onEditButtonClick() {
    this.checkoutForm.enable();
    this.isEditingInfo = true;
  }

  cancel() {
    this.isEditingInfo = false;
    window.location.reload();
  }

  onSubmit(user: UserModel): void {
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

  logout() {
    this.authService.logout();
  }

}
