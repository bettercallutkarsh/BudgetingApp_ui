import { Component, ElementRef, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TablerIconComponent } from '@tabler/icons-angular';
import { AuthService, safeReturnUrl } from '../../core/auth/auth.service';
import { serverErrorMessage } from '../../core/auth/auth.models';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, TablerIconComponent],
  template: `
    <div class="auth-card">
      <div class="auth-card__header">
        <h1 class="auth-card__title">Sign in</h1>
        <p class="auth-card__subtitle">Welcome back. Sign in to continue your monthly plan.</p>
      </div>

      @if (sessionExpired()) {
        <div class="alert alert-info form-alert" role="status">
          Your session expired. Please sign in again.
        </div>
      }

      @if (formError()) {
        <div class="alert alert-danger form-alert" role="alert">
          {{ formError() }}
        </div>
      }

      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div class="form-stack">
          <div>
            <label class="label" for="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              class="input"
              [class.input-invalid]="isInvalid('email')"
              formControlName="email"
              autocomplete="email"
              inputmode="email"
              placeholder="you@example.com"
              [attr.aria-invalid]="isInvalid('email') ? 'true' : null"
              [attr.aria-describedby]="isInvalid('email') ? 'login-email-error' : null"
            />
            @if (isInvalid('email')) {
              <p class="error-text" id="login-email-error" role="alert">{{ fieldError('email') }}</p>
            }
          </div>

          <div>
            <label class="label" for="login-password">Password</label>
            <div class="password-field">
              <input
                id="login-password"
                [type]="showPassword() ? 'text' : 'password'"
                class="input password-field__input"
                [class.input-invalid]="isInvalid('password')"
                formControlName="password"
                autocomplete="current-password"
                placeholder="Your password"
                [attr.aria-invalid]="isInvalid('password') ? 'true' : null"
                [attr.aria-describedby]="isInvalid('password') ? 'login-password-error' : null"
              />
              <button
                type="button"
                class="password-field__toggle"
                (click)="togglePassword()"
                [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
                [attr.aria-pressed]="showPassword()"
              >
                <tabler-icon [icon]="showPassword() ? 'eye-off' : 'eye'" [size]="18" [stroke]="1.75" />
              </button>
            </div>
            @if (isInvalid('password')) {
              <p class="error-text" id="login-password-error" role="alert">{{ fieldError('password') }}</p>
            }
          </div>

          <button type="submit" class="btn btn-primary btn-block" [disabled]="submitting()" [attr.aria-busy]="submitting()">
            @if (submitting()) {
              <span class="spinner" aria-hidden="true"></span>
              Signing in…
            } @else {
              Sign in
            }
          </button>
        </div>
      </form>

      <p class="auth-card__footer">
        New here? <a routerLink="/register">Create an account</a>
      </p>
    </div>
  `,
  styles: `
    .form-alert {
      margin-bottom: var(--space-4);
    }
  `,
})
export class LoginPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly form: FormGroup = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    password: ['', [Validators.required, Validators.maxLength(128)]],
  });

  protected readonly showPassword = signal(false);
  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly sessionExpired = signal(false);

  constructor() {
    this.sessionExpired.set(
      this.route.snapshot.queryParamMap.get('reason') === 'expired' ||
        this.auth.sessionExpired(),
    );
  }

  protected isInvalid(name: 'email' | 'password'): boolean {
    const control = this.form.get(name);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  protected fieldError(name: 'email' | 'password'): string {
    const errors = this.form.get(name)?.errors;
    if (!errors) {
      return '';
    }
    if (errors['required']) {
      return name === 'email' ? 'Email is required.' : 'Password is required.';
    }
    if (errors['email']) {
      return 'Enter a valid email address.';
    }
    if (errors['maxLength']) {
      return name === 'email' ? 'Email must be at most 254 characters.' : 'Password must be at most 128 characters.';
    }
    return '';
  }

  protected togglePassword(): void {
    this.showPassword.update((value) => !value);
  }

  protected submit(): void {
    this.formError.set(null);
    if (this.submitting()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstInvalid();
      return;
    }

    this.submitting.set(true);
    const raw = this.form.getRawValue();
    const email = String(raw['email']).trim().toLowerCase();
    const password = String(raw['password']);

    this.auth
      .login(email, password)
      .then(() => {
        const returnUrl = safeReturnUrl(
          this.route.snapshot.queryParamMap.get('returnUrl'),
        );
        void this.router.navigateByUrl(returnUrl);
      })
      .catch((error: unknown) => {
        this.formError.set(serverErrorMessage(error));
      })
      .finally(() => {
        this.submitting.set(false);
      });
  }

  private focusFirstInvalid(): void {
    const firstInvalid = Object.keys(this.form.controls).find((name) => {
      const control = this.form.get(name);
      return control && control.invalid;
    });
    if (!firstInvalid) {
      return;
    }
    const root: HTMLElement = this.host.nativeElement;
    const field = root.querySelector<HTMLElement>(`#login-${firstInvalid}`);
    field?.focus();
  }
}
