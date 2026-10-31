import { Component, computed, inject, signal } from '@angular/core';
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
import { MonthSelectorComponent } from '../../shared/components/month-selector/month-selector';
import { BudgetService } from '../../core/budget/budget.service';
import {
  ALLOCATION_MODES,
  ALLOCATION_MODE_LABELS,
  ALLOCATION_PRESETS,
  ALLOCATION_INPUT_MODE_LABELS,
  AllocationInputMode,
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
  addDecimalStrings,
  allocateIncomeByPercentages,
  compareDecimalStrings,
  currentMonthKey,
  formatInr,
  formatInrGrouping,
  formatMonthLabel,
  isPastMonth,
  isZeroDecimalString,
  parseInrInput,
  parsePercentInput,
  percentageOfAmount,
  percentagesFromAmounts,
  shiftMonth,
  subtractDecimalStrings,
} from '../../shared/formatters';

interface AmountSnapshot {
  essentials: string;
  safety: string;
  investments: string;
}

interface PresetIndicator {
  label: string;
  customized: boolean;
}

interface InvestmentToggleSnapshot {
  presetMode: AllocationMode;
  allocationMode: AllocationMode;
  investmentsPercentage: string;
  investmentsAmount: string;
}

@Component({
  selector: 'app-budget',
  imports: [PageHeaderComponent, MonthSelectorComponent, ReactiveFormsModule],
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
  protected readonly formatInrGrouping = formatInrGrouping;

  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly saved = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly conflictMessage = signal<string | null>(null);
  protected readonly noteMessage = signal<string | null>(null);
  protected readonly fieldErrors = signal<Record<string, string>>({});
  protected readonly existingBudget = signal<MonthlyBudget | null>(null);

  /**
   * Preset identity and input mode are deliberately independent. Amount mode
   * can keep a named template even after the amounts are customised.
   */
  protected readonly presetMode = signal<AllocationMode>('MANUAL');
  protected readonly inputMode = signal<AllocationInputMode>('AMOUNT');

  protected readonly month = signal(currentMonthKey());

  protected readonly form: FormGroup = this.fb.nonNullable.group({
    incomeType: ['SALARY' as IncomeType, [Validators.required]],
    incomeSourceLabel: ['', [Validators.maxLength(120)]],
    incomeAmount: ['', [Validators.required, amountValidator]],
    allocationMode: ['MANUAL' as AllocationMode, [Validators.required]],
    investmentsEnabled: [true, [Validators.required]],
    essentialsPercentage: ['0.00', [percentValidator]],
    safetyPercentage: ['0.00', [percentValidator]],
    investmentsPercentage: ['0.00', [percentValidator]],
    essentialsAmount: ['', [amountValidator]],
    safetyAmount: ['', [amountValidator]],
    investmentsAmount: ['', [amountValidator]],
  });

  protected readonly monthLabel = computed(() => formatMonthLabel(this.month()));
  protected readonly isPast = computed(() => isPastMonth(this.month()));
  protected readonly investmentsEnabled = signal(true);

  protected readonly previewAmounts = computed(() => {
    this.amountRevision();
    this.investmentsEnabled();
    return this.computePercentPreview();
  });
  protected readonly amountTotal = computed(() => {
    this.amountRevision();
    this.investmentsEnabled();
    return this.computeAmountTotal();
  });
  protected readonly presetIndicator = computed<PresetIndicator | null>(() => {
    this.amountRevision();
    this.inputMode();
    this.investmentsEnabled();
    const mode = this.presetMode();
    const preset = this.presetFor(mode);
    if (!preset) {
      return null;
    }
    const customized = this.isPresetCustomized(preset);
    return {
      label: customized
        ? `Based on ${ALLOCATION_MODE_LABELS[mode]} · Customized`
        : ALLOCATION_MODE_LABELS[mode],
      customized,
    };
  });
  protected readonly undoSnapshot = signal<AmountSnapshot | null>(null);

  private readonly amountRevision = signal(0);
  private applyingAllocation = false;
  private lastPresetMatch = true;
  private toggleSnapshot: InvestmentToggleSnapshot | null = null;

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

  protected isAmountMode(): boolean {
    return this.inputMode() === 'AMOUNT';
  }

  protected inputModeLabel(): string {
    return ALLOCATION_INPUT_MODE_LABELS[this.inputMode()];
  }

  protected allocationTemplateLabel(): string {
    return ALLOCATION_MODE_LABELS[this.presetMode()];
  }

  protected selectInputMode(mode: AllocationInputMode): void {
    if (this.isPast() || this.submitting() || mode === this.inputMode()) {
      return;
    }
    this.convertMode(mode);
    this.clearServerErrors();
  }

  protected selectPreset(preset: AllocationPreset): void {
    if (!this.canSelectPreset()) {
      return;
    }
    this.undoSnapshot.set(null);
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

    if (this.isAmountMode()) {
      const income = this.parsedIncome();
      if (income !== null && compareDecimalStrings(income, '0.00') > 0) {
        const amounts = allocateIncomeByPercentages(
          income,
          preset.essentialsPercentage,
          preset.safetyPercentage,
          preset.investmentsPercentage,
          true,
        );
        this.form.patchValue(
          {
            essentialsAmount: formatInrGrouping(amounts.essentials),
            safetyAmount: formatInrGrouping(amounts.safety),
            investmentsAmount: formatInrGrouping(amounts.investments),
          },
          { emitEvent: false },
        );
      } else {
        this.form.patchValue(
          { essentialsAmount: '', safetyAmount: '', investmentsAmount: '' },
          { emitEvent: false },
        );
      }
    }

    this.lastPresetMatch = true;
    this.touchAmounts();
    this.syncInvestmentControls();
    this.clearServerErrors();
  }

  protected selectManual(): void {
    if (this.isPast() || this.submitting()) {
      return;
    }
    this.undoSnapshot.set(null);
    this.presetMode.set('MANUAL');
    this.form.patchValue({ allocationMode: 'MANUAL' }, { emitEvent: false });
    this.lastPresetMatch = false;
    this.touchAmounts();
    this.clearServerErrors();
  }

  protected canSelectPreset(): boolean {
    return this.investmentsEnabled() && !this.isPast() && !this.submitting();
  }

  protected toggleInvestments(): void {
    if (this.isPast() || this.submitting()) {
      return;
    }
    const next = !this.investmentsEnabled();
    this.investmentsEnabled.set(next);
    this.form.patchValue({ investmentsEnabled: next }, { emitEvent: false });
    this.undoSnapshot.set(null);
    if (!next) {
      this.toggleSnapshot = {
        presetMode: this.presetMode(),
        allocationMode: this.form.get('allocationMode')?.value as AllocationMode,
        investmentsPercentage: String(
          this.form.get('investmentsPercentage')?.value ?? '0.00',
        ),
        investmentsAmount: String(this.form.get('investmentsAmount')?.value ?? ''),
      };
      // Finalized behaviour: turning Investments off forces MANUAL and zeroes
      // the investment bucket in whichever mode is active.
      this.presetMode.set('MANUAL');
      this.form.patchValue(
        {
          allocationMode: 'MANUAL',
          investmentsPercentage: '0.00',
          investmentsAmount: '0.00',
        },
        { emitEvent: false },
      );
    } else {
      this.toggleSnapshot = null;
    }
    this.lastPresetMatch = false;
    this.touchAmounts();
    this.syncInvestmentControls();
    this.clearServerErrors();
  }

  protected percentageTotal(): string {
    const essentials = parsePercentInput(String(this.form.get('essentialsPercentage')?.value ?? '')) ?? '0.00';
    const safety = parsePercentInput(String(this.form.get('safetyPercentage')?.value ?? '')) ?? '0.00';
    const investments = this.investmentsEnabled()
      ? (parsePercentInput(String(this.form.get('investmentsPercentage')?.value ?? '')) ?? '0.00')
      : '0.00';
    return addDecimalStrings(addDecimalStrings(essentials, safety), investments);
  }

  protected allocationValid(): boolean {
    if (this.isAmountMode()) {
      return this.amountTotalValid() === 'exact';
    }
    const essentials = parsePercentInput(String(this.form.get('essentialsPercentage')?.value ?? ''));
    const safety = parsePercentInput(String(this.form.get('safetyPercentage')?.value ?? ''));
    if (essentials === null || safety === null) {
      return false;
    }
    if (!this.investmentsEnabled()) {
      return compareDecimalStrings(addDecimalStrings(essentials, safety), '100.00') === 0;
    }
    if (this.presetMode() === 'MANUAL') {
      return compareDecimalStrings(this.percentageTotal(), '100.00') === 0;
    }
    return true;
  }

  /** Result of comparing amount-mode total with monthly income. */
  protected amountTotalValid(): 'exact' | 'under' | 'over' | 'invalid' {
    const income = this.parsedIncome();
    if (income === null) {
      return 'invalid';
    }
    const essentials = this.parsedAmount('essentialsAmount');
    const safety = this.parsedAmount('safetyAmount');
    if (essentials === null || safety === null) {
      return 'invalid';
    }
    let total = addDecimalStrings(essentials, safety);
    if (this.investmentsEnabled()) {
      const investments = this.parsedAmount('investmentsAmount');
      if (investments === null) {
        return 'invalid';
      }
      total = addDecimalStrings(total, investments);
    }
    const comparison = compareDecimalStrings(total, income);
    if (comparison === 0) {
      return 'exact';
    }
    return comparison < 0 ? 'under' : 'over';
  }

  protected amountRemaining(): string {
    const income = this.parsedIncome() ?? '0.00';
    const total = this.amountTotal();
    const comparison = compareDecimalStrings(total, income);
    if (comparison <= 0) {
      return subtractDecimalStrings(income, total);
    }
    return subtractDecimalStrings(total, income);
  }

  protected unallocatedRemainder(): string | null {
    if (!this.isAmountMode()) {
      return null;
    }
    const income = this.parsedIncome();
    if (income === null) {
      return null;
    }
    const comparison = compareDecimalStrings(this.amountTotal(), income);
    if (comparison >= 0) {
      return null;
    }
    return subtractDecimalStrings(income, this.amountTotal());
  }

  protected amountPercent(controlName: string): string {
    const income = this.parsedIncome();
    if (income === null || compareDecimalStrings(income, '0.00') === 0) {
      return '0.00';
    }
    const amount = this.parsedAmount(controlName) ?? '0.00';
    return percentageOfAmount(amount, income);
  }

  protected onUnallocatedTargetChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const target = select.value;
    select.value = '';
    this.allocateUnallocated(target);
  }

  protected allocateUnallocated(target: string): void {
    if (this.isPast() || this.submitting()) {
      return;
    }
    if (target !== 'ESSENTIALS' && target !== 'SAFETY') {
      return;
    }
    const remainder = this.unallocatedRemainder();
    if (remainder === null || isZeroDecimalString(remainder)) {
      return;
    }
    const controlName = target === 'ESSENTIALS' ? 'essentialsAmount' : 'safetyAmount';
    const current = this.parsedAmount(controlName) ?? '0.00';
    const snapshot: AmountSnapshot = {
      essentials: String(this.form.get('essentialsAmount')?.value ?? ''),
      safety: String(this.form.get('safetyAmount')?.value ?? ''),
      investments: String(this.form.get('investmentsAmount')?.value ?? ''),
    };
    this.applyingAllocation = true;
    this.form.patchValue(
      { [controlName]: formatInrGrouping(addDecimalStrings(current, remainder)) },
      { emitEvent: false },
    );
    this.applyingAllocation = false;
    this.undoSnapshot.set(snapshot);
    this.touchAmounts();
    this.lastPresetMatch = this.computePresetMatch();
    this.saved.set(false);
  }

  protected undoUnallocated(): void {
    const snapshot = this.undoSnapshot();
    if (!snapshot || this.isPast() || this.submitting()) {
      return;
    }
    this.applyingAllocation = true;
    this.form.patchValue(
      {
        essentialsAmount: snapshot.essentials,
        safetyAmount: snapshot.safety,
        investmentsAmount: snapshot.investments,
      },
      { emitEvent: false },
    );
    this.applyingAllocation = false;
    this.undoSnapshot.set(null);
    this.touchAmounts();
    this.lastPresetMatch = this.computePresetMatch();
    this.saved.set(false);
  }

  /** Canonical monthly income string for display alongside the amount total. */
  protected parseIncomeDisplay(): string {
    return this.parsedIncome() ?? '0.00';
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
      return 'Enter a valid amount of 0 or more with up to 2 decimals.';
    }
    if (control.errors?.['percent']) {
      return 'Enter a percentage between 0 and 100 with up to 2 decimals.';
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
    this.noteMessage.set(null);

    if (this.isPast() || this.submitting()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.isAmountMode()) {
      const result = this.amountTotalValid();
      if (result === 'invalid') {
        this.formError.set('Enter valid bucket amounts and a valid monthly income.');
        return;
      }
      if (result === 'over') {
        this.formError.set(
          `Total allocation ${formatInr(this.amountTotal())} exceeds your monthly income. Reduce the bucket amounts before saving.`,
        );
        return;
      }
      if (result === 'under') {
        this.formError.set(
          `${formatInr(this.amountRemaining())} is still unallocated. Allocate it before saving.`,
        );
        return;
      }
    } else if (!this.allocationValid()) {
      this.formError.set('The bucket percentages must add up to 100%.');
      return;
    }

    const raw = this.form.getRawValue();
    const payload = this.buildPayload(raw);

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

  private buildPayload(raw: Record<string, unknown>): MonthlyBudgetSaveRequest {
    const incomeAmount = parseInrInput(String(raw['incomeAmount'])) ?? '0.00';
    const base: MonthlyBudgetSaveRequest = {
      incomeType: raw['incomeType'] as IncomeType,
      incomeSourceLabel: String(raw['incomeSourceLabel'] ?? '').trim() || null,
      incomeAmount,
      allocationMode: this.presetMode(),
      allocationInputMode: this.inputMode(),
      investmentsEnabled: this.investmentsEnabled(),
    };

    if (this.isAmountMode()) {
      return {
        ...base,
        essentialsAmount: this.parsedAmount('essentialsAmount') ?? '0.00',
        safetyAmount: this.parsedAmount('safetyAmount') ?? '0.00',
        investmentsAmount: this.investmentsEnabled()
          ? (this.parsedAmount('investmentsAmount') ?? '0.00')
          : '0.00',
      };
    }

    return {
      ...base,
      essentialsPercentage: parsePercentInput(String(raw['essentialsPercentage'])) ?? '0.00',
      safetyPercentage: parsePercentInput(String(raw['safetyPercentage'])) ?? '0.00',
      investmentsPercentage: this.investmentsEnabled()
        ? (parsePercentInput(String(raw['investmentsPercentage'])) ?? '0.00')
        : '0.00',
    };
  }

  private handleSaveError(error: unknown): void {
    const apiError = error instanceof AuthApiError ? error : null;
    if (apiError) {
      if (apiError.code === 'PERIOD_READ_ONLY') {
        this.formError.set('This month is in the past and can no longer be edited.');
        return;
      }
      if (apiError.code === 'INVESTMENT_TOGGLE_BLOCKED') {
        // Restore the last valid toggle state, including the preset identity
        // and investment values that were replaced when Investments were off.
        const previous = this.existingBudget()?.investmentsEnabled ?? true;
        const snapshot = this.toggleSnapshot;
        this.investmentsEnabled.set(previous);
        this.form.patchValue(
          {
            investmentsEnabled: previous,
            ...(previous && snapshot
              ? {
                  allocationMode: snapshot.allocationMode,
                  investmentsPercentage: snapshot.investmentsPercentage,
                  investmentsAmount: snapshot.investmentsAmount,
                }
              : {}),
          },
          { emitEvent: false },
        );
        if (previous) {
          this.presetMode.set(
            snapshot?.presetMode ??
              (this.form.get('allocationMode')?.value as AllocationMode),
          );
          this.lastPresetMatch = this.computePresetMatch();
        }
        this.toggleSnapshot = null;
        this.touchAmounts();
        this.syncInvestmentControls();
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
    this.noteMessage.set(null);
    this.fieldErrors.set({});
    this.saved.set(false);
    this.undoSnapshot.set(null);
    this.toggleSnapshot = null;

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
    const mode: AllocationInputMode = budget.allocationInputMode ?? 'PERCENTAGE';
    this.inputMode.set(mode);
    this.investmentsEnabled.set(budget.investmentsEnabled);
    this.presetMode.set(budget.allocationMode);
    this.toggleSnapshot = null;
    this.form.patchValue(
      {
        incomeType: budget.incomeType,
        incomeSourceLabel: budget.incomeSourceLabel ?? '',
        incomeAmount: formatInrGrouping(budget.incomeAmount),
        allocationMode: budget.allocationMode,
        investmentsEnabled: budget.investmentsEnabled,
        essentialsPercentage: budget.essentialsPercentage,
        safetyPercentage: budget.safetyPercentage,
        investmentsPercentage: budget.investmentsPercentage,
        // Preserve the exact server-returned amounts for amount mode.
        essentialsAmount: formatInrGrouping(budget.essentialsAmount),
        safetyAmount: formatInrGrouping(budget.safetyAmount),
        investmentsAmount: formatInrGrouping(budget.investmentsAmount),
      },
      { emitEvent: false },
    );
    this.lastPresetMatch = this.computePresetMatch();
    this.touchAmounts();
    this.syncInvestmentControls();
  }

  private applyDefaults(): void {
    // New budgets start in MANUAL + AMOUNT with three editable bucket fields.
    this.inputMode.set('AMOUNT');
    this.investmentsEnabled.set(true);
    this.presetMode.set('MANUAL');
    this.toggleSnapshot = null;
    this.form.reset(
      {
        incomeType: 'SALARY',
        incomeSourceLabel: '',
        incomeAmount: '',
        allocationMode: 'MANUAL',
        investmentsEnabled: true,
        essentialsPercentage: '0.00',
        safetyPercentage: '0.00',
        investmentsPercentage: '0.00',
        essentialsAmount: '',
        safetyAmount: '',
        investmentsAmount: '',
      },
      { emitEvent: false },
    );
    this.lastPresetMatch = false;
    this.touchAmounts();
    this.syncInvestmentControls();
  }

  private convertMode(target: AllocationInputMode): void {
    if (target === this.inputMode()) {
      return;
    }
    if (target === 'AMOUNT') {
      this.convertToAmount();
    } else {
      this.convertToPercentage();
    }
    this.inputMode.set(target);
    this.touchAmounts();
    this.lastPresetMatch = this.computePresetMatch();
  }

  private convertToAmount(): void {
    const income = this.parsedIncome();
    if (income === null || compareDecimalStrings(income, '0.00') === 0) {
      this.noteMessage.set(
        'Enter a monthly income to review the converted allocation amounts.',
      );
      return;
    }
    const preset = this.presetFor(this.presetMode());
    const percentagesMatchPreset =
      preset !== null &&
      compareDecimalStrings(
        parsePercentInput(String(this.form.get('essentialsPercentage')?.value ?? '')) ?? '0.00',
        preset.essentialsPercentage,
      ) === 0 &&
      compareDecimalStrings(
        parsePercentInput(String(this.form.get('safetyPercentage')?.value ?? '')) ?? '0.00',
        preset.safetyPercentage,
      ) === 0 &&
      compareDecimalStrings(
        parsePercentInput(String(this.form.get('investmentsPercentage')?.value ?? '')) ?? '0.00',
        preset.investmentsPercentage,
      ) === 0;

    if (preset && !percentagesMatchPreset) {
      this.presetMode.set('MANUAL');
      this.form.patchValue({ allocationMode: 'MANUAL' }, { emitEvent: false });
    }

    const essentialsPercentage = preset && percentagesMatchPreset
      ? preset.essentialsPercentage
      : (parsePercentInput(String(this.form.get('essentialsPercentage')?.value ?? '')) ?? '0.00');
    const safetyPercentage = preset && percentagesMatchPreset
      ? preset.safetyPercentage
      : (parsePercentInput(String(this.form.get('safetyPercentage')?.value ?? '')) ?? '0.00');
    const investmentsPercentage = preset && percentagesMatchPreset
      ? preset.investmentsPercentage
      : (parsePercentInput(String(this.form.get('investmentsPercentage')?.value ?? '')) ?? '0.00');

    const amounts = allocateIncomeByPercentages(
      income,
      essentialsPercentage,
      safetyPercentage,
      investmentsPercentage,
      this.investmentsEnabled(),
    );
    this.form.patchValue(
      {
        essentialsAmount: formatInrGrouping(amounts.essentials),
        safetyAmount: formatInrGrouping(amounts.safety),
        investmentsAmount: formatInrGrouping(amounts.investments),
      },
      { emitEvent: false },
    );
    this.noteMessage.set(
      'Converted from percentages to amounts. The total matches your monthly income exactly; review the amounts before saving.',
    );
  }

  private convertToPercentage(): void {
    const income = this.parsedIncome();
    const currentAmounts = {
      essentials: this.parsedAmount('essentialsAmount') ?? '0.00',
      safety: this.parsedAmount('safetyAmount') ?? '0.00',
      investments: this.investmentsEnabled()
        ? (this.parsedAmount('investmentsAmount') ?? '0.00')
        : '0.00',
    };
    const preset = this.presetFor(this.presetMode());
    let keepPreset = false;
    if (preset && income !== null && compareDecimalStrings(income, '0.00') > 0) {
      const expected = allocateIncomeByPercentages(
        income,
        preset.essentialsPercentage,
        preset.safetyPercentage,
        preset.investmentsPercentage,
        this.investmentsEnabled(),
      );
      keepPreset =
        compareDecimalStrings(currentAmounts.essentials, expected.essentials) === 0 &&
        compareDecimalStrings(currentAmounts.safety, expected.safety) === 0 &&
        compareDecimalStrings(currentAmounts.investments, expected.investments) === 0;
    }

    if (keepPreset && preset) {
      this.form.patchValue(
        {
          essentialsPercentage: preset.essentialsPercentage,
          safetyPercentage: preset.safetyPercentage,
          investmentsPercentage: preset.investmentsPercentage,
        },
        { emitEvent: false },
      );
    } else if (income !== null && compareDecimalStrings(income, '0.00') > 0) {
      const percentages = percentagesFromAmounts(income, currentAmounts);
      this.presetMode.set('MANUAL');
      this.form.patchValue(
        {
          allocationMode: 'MANUAL',
          essentialsPercentage: percentages.essentials,
          safetyPercentage: percentages.safety,
          investmentsPercentage: percentages.investments,
        },
        { emitEvent: false },
      );
    }

    this.noteMessage.set(
      keepPreset
        ? 'The preset identity is preserved because the amounts still match its default distribution.'
        : 'Converted from amounts to percentages. Percentages are limited to two decimals and are adjusted to total exactly 100%.',
    );
  }

  private watchAllocationInputs(): void {
    for (const name of [
      'essentialsPercentage',
      'safetyPercentage',
      'investmentsPercentage',
    ]) {
      this.form.get(name)?.valueChanges.subscribe(() => {
        // A preset in percentage mode requires its exact ratios, so a manual
        // percentage edit becomes a MANUAL template.
        if (this.inputMode() === 'PERCENTAGE' && this.presetMode() !== 'MANUAL') {
          this.presetMode.set('MANUAL');
          this.form.patchValue({ allocationMode: 'MANUAL' }, { emitEvent: false });
        }
        this.handleManualChange();
      });
    }
    for (const name of ['essentialsAmount', 'safetyAmount', 'investmentsAmount']) {
      this.form.get(name)?.valueChanges.subscribe(() => {
        // Amount edits never change a named preset's identity: amount mode
        // keeps the template and marks the distribution as Customized.
        if (!this.applyingAllocation) {
          this.undoSnapshot.set(null);
        }
        this.handleManualChange();
      });
    }
    this.form.get('incomeAmount')?.valueChanges.subscribe(() => {
      const preset = this.presetFor(this.presetMode());
      if (
        this.isAmountMode() &&
        preset &&
        this.lastPresetMatch
      ) {
        const income = this.parsedIncome();
        if (income !== null && compareDecimalStrings(income, '0.00') > 0) {
          const amounts = allocateIncomeByPercentages(
            income,
            preset.essentialsPercentage,
            preset.safetyPercentage,
            preset.investmentsPercentage,
            this.investmentsEnabled(),
          );
          this.applyingAllocation = true;
          this.form.patchValue(
            {
              essentialsAmount: formatInrGrouping(amounts.essentials),
              safetyAmount: formatInrGrouping(amounts.safety),
              investmentsAmount: formatInrGrouping(amounts.investments),
            },
            { emitEvent: false },
          );
          this.applyingAllocation = false;
        }
      }
      this.handleManualChange();
    });
  }

  private handleManualChange(): void {
    this.touchAmounts();
    this.lastPresetMatch = this.computePresetMatch();
    if (this.saved()) {
      this.saved.set(false);
    }
  }

  private touchAmounts(): void {
    this.amountRevision.update((n) => n + 1);
  }

  private presetFor(mode: AllocationMode): AllocationPreset | null {
    return ALLOCATION_PRESETS.find((preset) => preset.mode === mode) ?? null;
  }

  private isPresetCustomized(preset: AllocationPreset): boolean {
    if (this.isAmountMode()) {
      const income = this.parsedIncome();
      if (income === null || compareDecimalStrings(income, '0.00') === 0) {
        return false;
      }
      const expected = allocateIncomeByPercentages(
        income,
        preset.essentialsPercentage,
        preset.safetyPercentage,
        preset.investmentsPercentage,
        this.investmentsEnabled(),
      );
      const essentials = this.parsedAmount('essentialsAmount') ?? '0.00';
      const safety = this.parsedAmount('safetyAmount') ?? '0.00';
      const investments = this.investmentsEnabled()
        ? (this.parsedAmount('investmentsAmount') ?? '0.00')
        : '0.00';
      return (
        compareDecimalStrings(essentials, expected.essentials) !== 0 ||
        compareDecimalStrings(safety, expected.safety) !== 0 ||
        compareDecimalStrings(investments, expected.investments) !== 0
      );
    }
    const essentials = parsePercentInput(String(this.form.get('essentialsPercentage')?.value ?? '')) ?? '0.00';
    const safety = parsePercentInput(String(this.form.get('safetyPercentage')?.value ?? '')) ?? '0.00';
    const investments = this.investmentsEnabled()
      ? (parsePercentInput(String(this.form.get('investmentsPercentage')?.value ?? '')) ?? '0.00')
      : '0.00';
    return (
      compareDecimalStrings(essentials, preset.essentialsPercentage) !== 0 ||
      compareDecimalStrings(safety, preset.safetyPercentage) !== 0 ||
      compareDecimalStrings(investments, preset.investmentsPercentage) !== 0
    );
  }

  private computePresetMatch(): boolean {
    const preset = this.presetFor(this.presetMode());
    if (!preset) {
      return false;
    }
    if (this.isAmountMode()) {
      const income = this.parsedIncome();
      if (income === null || compareDecimalStrings(income, '0.00') === 0) {
        // Empty amounts before income entry still allow the preset to seed
        // amounts once an income is entered.
        return (
          (this.form.get('essentialsAmount')?.value ?? '') === '' &&
          (this.form.get('safetyAmount')?.value ?? '') === '' &&
          (this.form.get('investmentsAmount')?.value ?? '') === ''
        );
      }
    }
    return !this.isPresetCustomized(preset);
  }

  /** Keeps the investment controls disabled in the form model (not the template)
   *  so Angular's reactive forms do not warn about the disabled attribute. */
  private syncInvestmentControls(): void {
    const names = ['investmentsPercentage', 'investmentsAmount'];
    for (const name of names) {
      const control = this.form.get(name);
      if (!control) {
        continue;
      }
      if (this.investmentsEnabled()) {
        control.enable({ emitEvent: false });
      } else {
        control.disable({ emitEvent: false });
      }
    }
  }

  private computePercentPreview(): {
    essentials: string;
    safety: string;
    investments: string;
  } {
    const income = this.parsedIncome() ?? '0.00';
    const essentialsPercentage = parsePercentInput(String(this.form.get('essentialsPercentage')?.value ?? '')) ?? '0.00';
    const safetyPercentage = parsePercentInput(String(this.form.get('safetyPercentage')?.value ?? '')) ?? '0.00';
    const investmentsPercentage = this.investmentsEnabled()
      ? (parsePercentInput(String(this.form.get('investmentsPercentage')?.value ?? '')) ?? '0.00')
      : '0.00';
    return allocateIncomeByPercentages(
      income,
      essentialsPercentage,
      safetyPercentage,
      investmentsPercentage,
      this.investmentsEnabled(),
    );
  }

  private computeAmountTotal(): string {
    const essentials = this.parsedAmount('essentialsAmount') ?? '0.00';
    const safety = this.parsedAmount('safetyAmount') ?? '0.00';
    const investments = this.investmentsEnabled()
      ? (this.parsedAmount('investmentsAmount') ?? '0.00')
      : '0.00';
    return addDecimalStrings(addDecimalStrings(essentials, safety), investments);
  }

  private parsedIncome(): string | null {
    return parseInrInput(String(this.form.get('incomeAmount')?.value ?? ''));
  }

  private parsedAmount(controlName: string): string | null {
    return parseInrInput(String(this.form.get(controlName)?.value ?? ''));
  }

  private clearServerErrors(): void {
    this.fieldErrors.set({});
    this.formError.set(null);
    this.conflictMessage.set(null);
    this.noteMessage.set(null);
    this.saved.set(false);
  }
}

const amountValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const raw = control.value;
  if (raw === null || raw === undefined || String(raw).trim() === '') {
    return null;
  }
  return parseInrInput(String(raw)) === null ? { amount: true } : null;
};

const percentValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const raw = control.value;
  if (raw === null || raw === undefined || String(raw).trim() === '') {
    return null;
  }
  return parsePercentInput(String(raw)) === null ? { percent: true } : null;
};
