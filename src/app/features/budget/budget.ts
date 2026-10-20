import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { BudgetService } from '../../core/budget/budget.service';
import {
  ALLOCATION_MODES,
  ALLOCATION_MODE_LABELS,
  ALLOCATION_PRESETS,
  AllocationMode,
  AllocationPreset,
  INCOME_TYPES,
  INCOME_TYPE_LABELS,
  IncomeType,
  MonthlyBudget,
  MonthlyBudgetSaveRequest,
} from '../../core/budget/budget.models';
import { AuthApiError, serverErrorMessage } from '../../core/auth/auth.models';
import {
  currentMonthKey,
  formatInr,
  formatMonthLabel,
  isPastMonth,
  shiftMonth,
} from '../../shared/formatters';

@Component({
  selector: 'app-budget',
  imports: [PageHeaderComponent, ReactiveFormsModule, DecimalPipe],
  templateUrl: './budget.html',
  styleUrl: './budget.scss',
})
export class BudgetPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly budgetService = inject(BudgetService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly incomeTypes = INCOME_TYPES;
  protected readonly incomeTypeLabels = INCOME_TYPE_LABELS;
  protected readonly presets = ALLOCATION_PRESETS;
  protected readonly allocationModes = ALLOCATION_MODES;
  protected readonly allocationModeLabels = ALLOCATION_MODE_LABELS;
  protected readonly formatInr = formatInr;

  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly saved = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly conflictMessage = signal<string | null>(null);
  protected readonly fieldErrors = signal<Record<string, string>>({});
  protected readonly existingBudget = signal<MonthlyBudget | null>(null);

  protected readonly presetMode = signal<AllocationMode>('BALANCED');

  protected readonly month = signal(currentMonthKey());

  protected readonly form: FormGroup = this.fb.nonNullable.group({
    incomeType: ['SALARY' as IncomeType, [Validators.required]],
    incomeSourceLabel: ['', [Validators.maxLength(120)]],
    incomeAmount: ['', [Validators.required, amountValidator]],
    allocationMode: ['BALANCED' as AllocationMode, [Validators.required]],
    investmentsEnabled: [true, [Validators.required]],
    essentialsPercentage: ['55.00', [Validators.required, percentValidator]],
    safetyPercentage: ['10.00', [Validators.required, percentValidator]],
    investmentsPercentage: ['35.00', [Validators.required, percentValidator]],
  });

  protected readonly monthLabel = computed(() => formatMonthLabel(this.month()));
  protected readonly isPast = computed(() => isPastMonth(this.month()));
  protected readonly investmentsEnabled = signal(true);
  protected readonly previewAmounts = computed(() => this.computePreview());

  constructor() {
    const queryMonth = this.route.snapshot.queryParamMap.get('month');
    if (queryMonth && /^\d{4}-\d{2}$/.test(queryMonth)) {
      this.month.set(queryMonth);
    }
    this.watchAllocationInputs();
    this.load();
  }

  protected changeMonth(delta: number): void {
    this.month.set(shiftMonth(this.month(), delta));
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { month: this.month() },
      queryParamsHandling: 'merge',
    });
    this.load();
  }

  protected retry(): void {
    this.load();
  }

  protected selectPreset(preset: AllocationPreset): void {
    if (this.isPast() || this.submitting()) {
      return;
    }
    this.presetMode.set(preset.mode);
    this.form.patchValue(
      {
        allocationMode: preset.mode,
        essentialsPercentage: preset.essentialsPercentage,
        safetyPercentage: preset.safetyPercentage,
        investmentsPercentage: preset.investmentsPercentage,
      },
      { emitEvent: false },
    );
    this.clearServerErrors();
  }

  protected selectManual(): void {
    if (this.isPast() || this.submitting()) {
      return;
    }
    this.presetMode.set('MANUAL');
    this.form.patchValue({ allocationMode: 'MANUAL' });
    this.clearServerErrors();
  }

  protected toggleInvestments(): void {
    if (this.isPast() || this.submitting()) {
      return;
    }
    const next = !this.investmentsEnabled();
    this.investmentsEnabled.set(next);
    this.form.patchValue({ investmentsEnabled: next }, { emitEvent: false });
    if (!next) {
      this.form.patchValue({ investmentsPercentage: '0.00' }, { emitEvent: false });
    }
    this.clearServerErrors();
  }

  protected allocationTotal(): number {
    return (
      toNumber(this.form.get('essentialsPercentage')?.value) +
      toNumber(this.form.get('safetyPercentage')?.value) +
      toNumber(this.form.get('investmentsPercentage')?.value)
    );
  }

  protected allocationValid(): boolean {
    const total = this.allocationTotal();
    if (!this.investmentsEnabled()) {
      return Math.abs(total - 100) < 0.005;
    }
    if (this.form.get('allocationMode')?.value === 'MANUAL') {
      return Math.abs(total - 100) < 0.005;
    }
    return true;
  }

  protected toggleLabel(): string {
    return this.investmentsEnabled() ? 'On' : 'Off';
  }

  protected fieldError(name: string): string {
    const serverError = this.fieldErrors()[name];
    if (serverError) {
      return serverError;
    }
    const control = this.form.get(name);
    if (!control || !control.invalid || !(control.touched || control.dirty)) {
      return '';
    }
    if (control.errors?.['required']) {
      return 'This field is required.';
    }
    if (control.errors?.['maxLength']) {
      return 'This value is too long.';
    }
    if (control.errors?.['amount']) {
      return 'Enter a valid amount of 0 or more.';
    }
    if (control.errors?.['percent']) {
      return 'Enter a percentage between 0 and 100.';
    }
    return 'Please check this value.';
  }

  protected isInvalid(name: string): boolean {
    if (this.fieldErrors()[name]) {
      return true;
    }
    const control = this.form.get(name);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  protected submit(): void {
    this.formError.set(null);
    this.saved.set(false);
    this.conflictMessage.set(null);

    if (this.isPast() || this.submitting()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.allocationValid()) {
      this.formError.set(
        'The three bucket percentages must add up to 100%.',
      );
      return;
    }

    const raw = this.form.getRawValue();
    const payload: MonthlyBudgetSaveRequest = {
      incomeType: raw.incomeType,
      incomeSourceLabel: String(raw.incomeSourceLabel ?? '').trim() || null,
      incomeAmount: normalizeAmount(String(raw.incomeAmount)),
      allocationMode: raw.allocationMode,
      investmentsEnabled: this.investmentsEnabled(),
      essentialsPercentage: normalizePercent(String(raw.essentialsPercentage)),
      safetyPercentage: normalizePercent(String(raw.safetyPercentage)),
      investmentsPercentage: this.investmentsEnabled()
        ? normalizePercent(String(raw.investmentsPercentage))
        : '0.00',
    };

    this.submitting.set(true);
    this.budgetService
      .saveBudget(this.month(), payload)
      .then((budget) => {
        this.existingBudget.set(budget);
        this.applyBudget(budget);
        this.saved.set(true);
        void this.router.navigate(['/home'], {
          queryParams: { month: this.month() },
        });
      })
      .catch((error: unknown) => {
        this.handleSaveError(error);
      })
      .finally(() => {
        this.submitting.set(false);
      });
  }

  private handleSaveError(error: unknown): void {
    const apiError = error instanceof AuthApiError ? error : null;
    if (apiError) {
      if (apiError.code === 'PERIOD_READ_ONLY') {
        this.formError.set('This month is in the past and can no longer be edited.');
        return;
      }
      if (apiError.code === 'INVESTMENT_TOGGLE_BLOCKED') {
        this.conflictMessage.set(apiError.message);
        return;
      }
      if (apiError.fieldErrors.length > 0) {
        const mapped: Record<string, string> = {};
        for (const fe of apiError.fieldErrors) {
          mapped[fe.field] = fe.message;
        }
        this.fieldErrors.set(mapped);
        this.formError.set('Check the highlighted fields and try again.');
        return;
      }
    }
    this.formError.set(serverErrorMessage(error));
  }

  private load(): void {
    const month = this.month();
    this.loading.set(true);
    this.loadError.set(null);
    this.formError.set(null);
    this.conflictMessage.set(null);
    this.fieldErrors.set({});
    this.saved.set(false);

    this.budgetService
      .getBudget(month)
      .then((budget) => {
        this.existingBudget.set(budget);
        if (budget) {
          this.applyBudget(budget);
        } else {
          this.applyDefaults();
        }
      })
      .catch((error: unknown) => {
        this.loadError.set(serverErrorMessage(error));
      })
      .finally(() => {
        this.loading.set(false);
      });
  }

  private applyBudget(budget: MonthlyBudget): void {
    this.investmentsEnabled.set(budget.investmentsEnabled);
    this.presetMode.set(budget.allocationMode);
    this.form.patchValue(
      {
        incomeType: budget.incomeType,
        incomeSourceLabel: budget.incomeSourceLabel ?? '',
        incomeAmount: budget.incomeAmount,
        allocationMode: budget.allocationMode,
        investmentsEnabled: budget.investmentsEnabled,
        essentialsPercentage: budget.essentialsPercentage,
        safetyPercentage: budget.safetyPercentage,
        investmentsPercentage: budget.investmentsPercentage,
      },
      { emitEvent: false },
    );
  }

  private applyDefaults(): void {
    const balanced = ALLOCATION_PRESETS.find((p) => p.mode === 'BALANCED')!;
    this.investmentsEnabled.set(true);
    this.presetMode.set('BALANCED');
    this.form.reset(
      {
        incomeType: 'SALARY',
        incomeSourceLabel: '',
        incomeAmount: '',
        allocationMode: 'BALANCED',
        investmentsEnabled: true,
        essentialsPercentage: balanced.essentialsPercentage,
        safetyPercentage: balanced.safetyPercentage,
        investmentsPercentage: balanced.investmentsPercentage,
      },
      { emitEvent: false },
    );
  }

  private watchAllocationInputs(): void {
    // Editing any bucket percentage by hand upgrades the allocation to MANUAL
    // so the server validates the custom split instead of a preset.
    for (const name of [
      'essentialsPercentage',
      'safetyPercentage',
      'investmentsPercentage',
    ]) {
      this.form.get(name)?.valueChanges.subscribe(() => {
        if (this.form.get('allocationMode')?.value !== 'MANUAL') {
          this.form.patchValue({ allocationMode: 'MANUAL' }, { emitEvent: false });
          this.presetMode.set('MANUAL');
        }
        if (this.saved()) {
          this.saved.set(false);
        }
      });
    }
  }

  private computePreview(): {
    essentials: string;
    safety: string;
    investments: string;
  } {
    const income = toNumber(this.form.get('incomeAmount')?.value);
    const essentials = (income * toNumber(this.form.get('essentialsPercentage')?.value)) / 100;
    const safety = (income * toNumber(this.form.get('safetyPercentage')?.value)) / 100;
    const investments = this.investmentsEnabled()
      ? (income * toNumber(this.form.get('investmentsPercentage')?.value)) / 100
      : 0;
    return {
      essentials: essentials.toFixed(2),
      safety: safety.toFixed(2),
      investments: investments.toFixed(2),
    };
  }

  private clearServerErrors(): void {
    this.fieldErrors.set({});
    this.formError.set(null);
    this.conflictMessage.set(null);
    this.saved.set(false);
  }
}

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

const amountValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const raw = control.value;
  if (raw === null || raw === undefined || String(raw).trim() === '') {
    return null;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    return { amount: true };
  }
  return null;
};

const percentValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const raw = control.value;
  if (raw === null || raw === undefined || String(raw).trim() === '') {
    return null;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    return { percent: true };
  }
  return null;
};

function normalizeAmount(raw: string): string {
  const n = Number(raw);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}

function normalizePercent(raw: string): string {
  const n = Number(raw);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}
