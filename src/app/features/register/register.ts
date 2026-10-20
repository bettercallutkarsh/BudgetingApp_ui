import { Component, ElementRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { TablerIconComponent } from '@tabler/icons-angular';
import { AuthService } from '../../core/auth/auth.service';
import {
  AuthApiError,
  EMPLOYMENT_TYPE_LABELS,
  EMPLOYMENT_TYPES,
  EmploymentType,
  RegisterPayload,
  serverErrorMessage,
} from '../../core/auth/auth.models';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  if (typeof password !== 'string' || typeof confirm !== 'string' || confirm === '') {
    return null;
  }
  return password === confirm ? null : { passwordMismatch: true };
}

export function normalizeIndianMobile(value: string): string | null {
  let digits = value.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return /^\d{10}$/.test(digits) ? digits : null;
}

const FIELD_CONTROL_MAP: Record<string, string> = {
  fullName: 'fullName',
  email: 'email',
  phoneNumber: 'phoneDigits',
  employmentType: 'employmentType',
  password: 'password',
};

const FIELD_IDS: Record<string, string> = {
  fullName: 'register-name',
  email: 'register-email',
  phoneDigits: 'register-phone',
  employmentType: 'register-employment',
  password: 'register-password',
  confirmPassword: 'register-confirm',
};

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, TablerIconComponent],
  template: `
    @if (registeredEmail()) {
      <div class="auth-card" role="status" aria-live="polite">
        <div class="success-mark" aria-hidden="true">
          <tabler-icon icon="check" [size]="24" [stroke]="2" />
        </div>
        <div class="auth-card__header">
          <h1 class="auth-card__title">Account created</h1>
          <p class="auth-card__subtitle">
            <span class="success-email">{{ registeredEmail() }}</span> is ready. Sign in to start
            planning your month.
          </p>
        </div>
        <a routerLink="/login" class="btn btn-primary btn-block">Continue to sign in</a>
      </div>
    } @else {
      <div class="auth-card">
        <div class="auth-card__header">
          <h1 class="auth-card__title">Create your account</h1>
          <p class="auth-card__subtitle">
            A few details and your monthly plan is ready to set up.
          </p>
        </div>

        @if (formError()) {
          <div class="alert alert-danger form-alert" role="alert">{{ formError() }}</div>
        }

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="form-stack">
            <div>
              <label class="label" for="register-name">Full name</label>
              <input
                id="register-name"
                type="text"
                class="input"
                [class.input-invalid]="isInvalid('fullName')"
                formControlName="fullName"
                autocomplete="name"
                placeholder="Your full name"
                [attr.aria-invalid]="isInvalid('fullName') ? 'true' : null"
                [attr.aria-describedby]="isInvalid('fullName') ? 'register-name-error' : null"
              />
              @if (isInvalid('fullName')) {
                <p class="error-text" id="register-name-error" role="alert">
                  {{ fieldError('fullName') }}
                </p>
              }
            </div>

            <div>
              <label class="label" for="register-email">Email</label>
              <input
                id="register-email"
                type="email"
                class="input"
                [class.input-invalid]="isInvalid('email')"
                formControlName="email"
                autocomplete="email"
                inputmode="email"
                placeholder="you@example.com"
                [attr.aria-invalid]="isInvalid('email') ? 'true' : null"
                [attr.aria-describedby]="isInvalid('email') ? 'register-email-error' : null"
              />
              @if (isInvalid('email')) {
                <p class="error-text" id="register-email-error" role="alert">
                  {{ fieldError('email') }}
                </p>
              }
            </div>

            <div>
              <label class="label" for="register-phone">Mobile number</label>
              <div class="phone-field">
                <span class="phone-field__prefix" aria-hidden="true">+91</span>
                <input
                  id="register-phone"
                  type="tel"
                  class="input phone-field__input"
                  [class.input-invalid]="isInvalid('phoneDigits')"
                  formControlName="phoneDigits"
                  autocomplete="tel-national"
                  inputmode="numeric"
                  maxlength="14"
                  placeholder="9876543210"
                  [attr.aria-invalid]="isInvalid('phoneDigits') ? 'true' : null"
                  [attr.aria-describedby]="isInvalid('phoneDigits') ? 'register-phone-error' : 'register-phone-hint'"
                />
              </div>
              @if (isInvalid('phoneDigits')) {
                <p class="error-text" id="register-phone-error" role="alert">
                  {{ fieldError('phoneDigits') }}
                </p>
              } @else {
                <p class="hint" id="register-phone-hint">10-digit Indian mobile number</p>
              }
            </div>

            <div>
              <label class="label" for="register-employment">Employment type</label>
              <select
                id="register-employment"
                class="select"
                [class.input-invalid]="isInvalid('employmentType')"
                formControlName="employmentType"
                [attr.aria-invalid]="isInvalid('employmentType') ? 'true' : null"
                [attr.aria-describedby]="isInvalid('employmentType') ? 'register-employment-error' : null"
              >
                <option value="" disabled>Choose one</option>
                @for (type of employmentTypes; track type) {
                  <option [value]="type">{{ employmentLabels[type] }}</option>
                }
              </select>
              @if (isInvalid('employmentType')) {
                <p class="error-text" id="register-employment-error" role="alert">
                  {{ fieldError('employmentType') }}
                </p>
              }
            </div>

            <div>
              <label class="label" for="register-password">Password</label>
              <div class="password-field">
                <input
                  id="register-password"
                  [type]="showPassword() ? 'text' : 'password'"
                  class="input password-field__input"
                  [class.input-invalid]="isInvalid('password')"
                  formControlName="password"
                  autocomplete="new-password"
                  placeholder="12 to 128 characters"
                  [attr.aria-invalid]="isInvalid('password') ? 'true' : null"
                  [attr.aria-describedby]="isInvalid('password') ? 'register-password-error' : 'register-password-hint'"
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
                <p class="error-text" id="register-password-error" role="alert">
                  {{ fieldError('password') }}
                </p>
              } @else {
                <p class="hint" id="register-password-hint">Use 12–128 characters. Spaces are allowed.</p>
              }
            </div>

            <div>
              <label class="label" for="register-confirm">Confirm password</label>
              <div class="password-field">
                <input
                  id="register-confirm"
                  [type]="showPassword() ? 'text' : 'password'"
                  class="input password-field__input"
                  [class.input-invalid]="isInvalid('confirmPassword') || mismatchError()"
                  formControlName="confirmPassword"
                  autocomplete="new-password"
                  placeholder="Re-enter your password"
                  [attr.aria-invalid]="isInvalid('confirmPassword') || mismatchError() ? 'true' : null"
                  [attr.aria-describedby]="isInvalid('confirmPassword') || mismatchError() ? 'register-confirm-error' : null"
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
              @if (isInvalid('confirmPassword') || mismatchError()) {
                <p class="error-text" id="register-confirm-error" role="alert">
                  {{ mismatchError() ? 'Passwords do not match.' : fieldError('confirmPassword') }}
                </p>
              }
            </div>

            <button
              type="submit"
              class="btn btn-primary btn-block"
              [disabled]="submitting()"
              [attr.aria-busy]="submitting()"
            >
              @if (submitting()) {
                <span class="spinner" aria-hidden="true"></span>
                Creating account…
              } @else {
                Create account
              }
            </button>
          </div>
        </form>

        <p class="auth-card__footer">
          Already have an account? <a routerLink="/login">Sign in</a>
        </p>
      </div>
    }
  `,
  styles: `
    .form-alert {
      margin-bottom: var(--space-4);
    }

    .phone-field {
      position: relative;
    }

    .phone-field__prefix {
      position: absolute;
      left: var(--space-3);
      top: 50%;
      transform: translateY(-50%);
      font-size: 0.875rem;
      color: var(--text-secondary);
      pointer-events: none;
      border-right: 1px solid var(--border-subtle);
      padding-right: var(--space-2);
      height: 18px;
      line-height: 18px;
    }

    .phone-field__input {
      padding-left: 62px;
      letter-spacing: 0.02em;
    }

    .success-mark {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: var(--radius-full);
      background: oklch(0.773 0.153 163.2 / 0.15);
      color: var(--state-success);
      margin-bottom: var(--space-4);
    }

    .success-email {
      color: var(--text-primary);
      font-weight: 500;
      word-break: break-all;
    }
  `,
})
export class RegisterPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly employmentTypes = EMPLOYMENT_TYPES;
  protected readonly employmentLabels = EMPLOYMENT_TYPE_LABELS;

  protected readonly form: FormGroup = this.fb.nonNullable.group(
    {
      fullName: ['', [Validators.required, Validators.maxLength(120)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
      phoneDigits: ['', [Validators.required, Validators.pattern(/^(?:\+91|0)?\d{10}$/)]],
      employmentType: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(128)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: [passwordsMatch] },
  );

  protected readonly showPassword = signal(false);
  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly registeredEmail = signal<string | null>(null);

  protected isInvalid(name: string): boolean {
    const control = this.form.get(name);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  protected mismatchError(): boolean {
    return !!this.form.errors?.['passwordMismatch'] &&
      !!this.form.get('confirmPassword')?.touched;
  }

  protected fieldError(name: string): string {
    const control = this.form.get(name);
    const errors = control?.errors;
    if (!errors) {
      return '';
    }
    if (errors['server']) {
      return String(errors['server']);
    }
    switch (name) {
      case 'fullName':
        if (errors['required']) return 'Full name is required.';
        if (errors['maxLength']) return 'Full name must be at most 120 characters.';
        break;
      case 'email':
        if (errors['required']) return 'Email is required.';
        if (errors['email']) return 'Enter a valid email address.';
        if (errors['maxLength']) return 'Email must be at most 254 characters.';
        break;
      case 'phoneDigits':
        if (errors['required']) return 'Mobile number is required.';
        if (errors['pattern']) return 'Enter a valid 10-digit Indian mobile number.';
        break;
      case 'employmentType':
        if (errors['required']) return 'Choose an employment type.';
        break;
      case 'password':
        if (errors['required']) return 'Password is required.';
        if (errors['minLength']) return 'Password must be at least 12 characters.';
        if (errors['maxLength']) return 'Password must be at most 128 characters.';
        break;
      case 'confirmPassword':
        if (errors['required']) return 'Confirm your password.';
        break;
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

    const raw = this.form.getRawValue();
    const digits = normalizeIndianMobile(String(raw['phoneDigits']));
    if (!digits) {
      this.form.get('phoneDigits')?.setErrors({ pattern: true });
      this.form.get('phoneDigits')?.markAsTouched();
      this.focusFirstInvalid();
      return;
    }

    const payload: RegisterPayload = {
      fullName: String(raw['fullName']).trim(),
      email: String(raw['email']).trim().toLowerCase(),
      phoneNumber: `+91${digits}`,
      employmentType: String(raw['employmentType']) as EmploymentType,
      password: String(raw['password']),
    };

    this.submitting.set(true);
    this.auth
      .register(payload)
      .then((profile) => {
        this.registeredEmail.set(profile.email || payload.email);
      })
      .catch((error: unknown) => {
        this.applyServerErrors(error);
      })
      .finally(() => {
        this.submitting.set(false);
      });
  }

  private applyServerErrors(error: unknown): void {
    const apiError = error instanceof AuthApiError ? error : null;
    this.formError.set(
      apiError && (apiError.fieldErrors.length > 0 || apiError.code === 'EMAIL_ALREADY_REGISTERED')
        ? 'Check the highlighted fields and try again.'
        : serverErrorMessage(error),
    );

    if (apiError) {
      for (const violation of apiError.fieldErrors) {
        const controlName = FIELD_CONTROL_MAP[violation.field];
        if (!controlName) {
          continue;
        }
        const control = this.form.get(controlName);
        control?.setErrors({ server: violation.message });
        control?.markAsTouched();
      }

      if (apiError.code === 'EMAIL_ALREADY_REGISTERED') {
        const emailControl = this.form.get('email');
        emailControl?.setErrors({ server: apiError.message });
        emailControl?.markAsTouched();
      }
    }

    this.focusFirstInvalid();
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
    const field = root.querySelector<HTMLElement>(
      `#${FIELD_IDS[firstInvalid] ?? firstInvalid}`,
    );
    field?.focus();
  }
}
