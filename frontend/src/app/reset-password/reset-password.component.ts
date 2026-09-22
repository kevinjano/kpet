import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { UserService } from '../services/user-service';
import { SiteSettingsService } from '../services/site-settings-service';
import { ModalService } from '../services/modal-service';
import { resolveImageUrl, DEFAULT_LOGO_URL, extractErrorMessage } from '../constants';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrls: ['../auth-shared.css', './reset-password.component.css'],
})
// token comes from the emailed link's ?token= query param — read once on
// init rather than kept reactive, since this page has nothing else that
// would change it while open.
export class ResetPasswordComponent implements OnInit {
  form!: FormGroup;
  logoUrl: string = DEFAULT_LOGO_URL;
  resolveImageUrl = resolveImageUrl;
  token: string | null = null;
  saving = false;
  done = false;

  constructor(
    private formBuilder: FormBuilder,
    private userService: UserService,
    private siteSettingsService: SiteSettingsService,
    private modalService: ModalService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token');
    this.form = this.formBuilder.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
    });
    this.siteSettingsService.getSettings().subscribe(settings => {
      this.logoUrl = settings.logoUrl || DEFAULT_LOGO_URL;
    });
  }

  onSubmit(): void {
    if (this.form.invalid || this.saving || !this.token) {
      return;
    }
    if (this.form.value.newPassword !== this.form.value.confirmPassword) {
      this.modalService.error('Las contraseñas no coinciden.');
      return;
    }
    this.saving = true;
    this.userService.resetPassword(this.token, this.form.value.newPassword).subscribe({
      next: () => {
        this.saving = false;
        this.done = true;
      },
      error: err => {
        this.saving = false;
        this.modalService.error(extractErrorMessage(err, 'El enlace no es válido o ya venció. Solicitá uno nuevo.'));
      }
    });
  }
}
