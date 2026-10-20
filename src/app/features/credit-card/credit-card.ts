import { Component, computed, inject, signal } from '@angular/core';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { CreditCardService } from '../../core/credit-card/credit-card.service';
import { AuthApiError, serverErrorMessage } from '../../core/auth/auth.models';
import { formatInr, formatDateTime } from '../../shared/formatters';
import { CreditCardOpeningRequest, CreditCardSummary } from '../../core/budget/budget.models';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;

@Component({
  selector: 'app-credit-card',
  imports: [PageHeaderComponent, ReactiveFormsModule],
  templateUrl: './credit-card.html',
  styleUrl: './credit-card.scss',
})
export class CreditCardPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly creditCardService = inject(CreditCardService);

  protected readonly formatInr = formatInr;
  protected readonly formatDateTime = formatDateTime;

  protected readonly loading = signal(false);
  protected readonly summary = signal<CreditCardSummary | null>(null);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    openingOutstandingAmount: [
      '',
      [Validators.required, Validators.min(0), Validators.pattern(AMOUNT_PATTERN)],
    ],
    trackingStartedAtUtc: [''],
  });

  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly fieldErrors = signal<Record<string, string>>({});

  /**
   * True once the server has reported `OPENING_BASELINE_LOCKED` (posted
   * credit-card activity already exists). The opening baseline is then no
   * longer editable and we disable the form rather than repeatedly failing.
   */
  protected readonly locked = signal(false);

  protected readonly configured = computed(() => this.summary()?.trackingConfigured === true);

  protected readonly isFieldInvalid = (field: keyof typeof this.form.controls): boolean => {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || control.dirty);
  };

  protected fieldError(field: string): string | null {
    return this.fieldErrors()[field] ?? null;
  }

  constructor() {
    void this.loadSummary();
  }

  protected async loadSummary(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const summary = await this.creditCardService.getSummary();
      this.summary.set(summary);
      if (summary.trackingConfigured) {
        this.form.controls.openingOutstandingAmount.setValue(
          summary.openingOutstandingAmount ?? '',
          { emitEvent: false },
        );
        this.form.controls.trackingStartedAtUtc.setValue(
          summary.trackingStartedAtUtc ?? '',
          { emitEvent: false },
        );
      }
    } catch (e) {
      this.error.set(serverErrorMessage(e));
    } finally {
      this.loading.set(false);
    }
  }

  protected retry(): void {
    void this.loadSummary();
  }

  protected submit(): void {
    this.formError.set(null);
    this.successMessage.set(null);
    this.fieldErrors.set({});

    if (this.submitting() || this.locked()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const trackingRaw = raw.trackingStartedAtUtc.trim();
    const payload: CreditCardOpeningRequest = {
      openingOutstandingAmount: raw.openingOutstandingAmount.trim(),
      trackingStartedAtUtc: trackingRaw.length > 0 ? trackingRaw : null,
    };

    this.submitting.set(true);
    this.creditCardService
      .setOpeningOutstanding(payload)
      .then((summary) => {
        this.summary.set(summary);
        this.locked.set(false);
        this.successMessage.set('Opening outstanding baseline saved.');
        this.form.patchValue({ openingOutstandingAmount: '', trackingStartedAtUtc: '' });
        this.form.markAsPristine();
        this.form.markAsUntouched();
      })
      .catch((e) => {
        if (e instanceof AuthApiError) {
          if (e.code === 'OPENING_BASELINE_LOCKED') {
            this.locked.set(true);
            this.formError.set(
              'Posted credit-card activity already exists, so the opening baseline can no longer be changed.',
            );
            return;
          }
          if (e.fieldErrors.length > 0) {
            const mapped: Record<string, string> = {};
            e.fieldErrors.forEach((f) => (mapped[f.field] = f.message));
            this.fieldErrors.set(mapped);
            this.formError.set('Check the highlighted fields and try again.');
            return;
          }
          this.formError.set(e.message);
        } else {
          this.formError.set(serverErrorMessage(e));
        }
      })
      .finally(() => this.submitting.set(false));
  }
}
