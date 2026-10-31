import { Component, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { SipService } from '../../core/sip/sip.service';
import {
  SIP_INSTALLMENT_STATUS_LABELS,
  SIP_PLAN_STATUS_LABELS,
  SipCommitmentSummary,
  SipInstallment,
  SipInstallmentStatus,
  SipPlan,
  SipPlanCreateRequest,
  SipPlanStatus,
  SipPlanUpdateRequest,
} from '../../core/sip/sip.models';
import { AuthApiError, serverErrorMessage } from '../../core/auth/auth.models';
import {
  currentMonthKey,
  formatInr,
  formatInrGrouping,
  formatIsoDate,
  formatMonthLabel,
  parseInrInput,
  shiftMonth,
} from '../../shared/formatters';

type FormMode = 'create' | 'edit';

@Component({
  selector: 'app-sip-plans',
  imports: [PageHeaderComponent, ReactiveFormsModule, RouterLink],
  templateUrl: './sip-plans.html',
  styleUrl: './sip-plans.scss',
})
export class SipPlansPageComponent {
  private readonly sipService = inject(SipService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly formatInr = formatInr;
  protected readonly formatIsoDate = formatIsoDate;
  protected readonly formatMonthLabel = formatMonthLabel;
  protected readonly planStatusLabels = SIP_PLAN_STATUS_LABELS;
  protected readonly installmentStatusLabels = SIP_INSTALLMENT_STATUS_LABELS;
  protected readonly today = todayInIst;

  protected readonly plans = signal<SipPlan[]>([]);
  protected readonly plansLoading = signal(true);
  protected readonly plansError = signal<string | null>(null);

  protected readonly selectedPlanId = signal<number | null>(null);
  protected readonly selectedPlan = signal<SipPlan | null>(null);
  protected readonly detailLoading = signal(false);
  protected readonly detailError = signal<string | null>(null);

  protected readonly installments = signal<SipInstallment[]>([]);
  protected readonly installmentsLoading = signal(false);
  protected readonly installmentsError = signal<string | null>(null);

  protected readonly summary = signal<SipCommitmentSummary | null>(null);
  protected readonly summaryLoading = signal(true);
  protected readonly summaryError = signal<string | null>(null);

  protected readonly actionMessage = signal<string | null>(null);

  protected readonly formMode = signal<FormMode | null>(null);
  protected readonly editingPlanId = signal<number | null>(null);
  protected readonly formSubmitting = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly fieldErrors = signal<Record<string, string>>({});

  protected readonly payTarget = signal<SipInstallment | null>(null);
  protected readonly payDate = signal(todayInIst());
  protected readonly payNote = signal('');
  protected readonly paySubmitting = signal(false);
  protected readonly payError = signal<string | null>(null);

  protected readonly stopTarget = signal<SipPlan | null>(null);
  protected readonly stopDate = signal(todayInIst());
  protected readonly stopSubmitting = signal(false);
  protected readonly stopError = signal<string | null>(null);

  protected readonly form: FormGroup = this.fb.nonNullable.group({
    planName: ['', [Validators.required, Validators.maxLength(120)]],
    monthlyAmount: ['', [Validators.required, positiveAmountValidator]],
    installmentDay: [1, [Validators.required, Validators.min(1), Validators.max(31), integerValidator]],
    originalStartDate: ['', [Validators.required]],
    trackingStartDate: ['', [Validators.required]],
    plannedEndDate: [''],
  });

  protected readonly summaryWarning = computed(() => {
    const summary = this.summary();
    return summary !== null && summary.withinAllocation === false;
  });

  private readonly initialPlanId: number | null = parsePlanId(
    this.route.snapshot.queryParamMap.get('plan'),
  );

  constructor() {
    void this.loadSummary();
    void this.loadPlans(true);
  }

  protected retryAll(): void {
    void this.loadSummary();
    void this.loadPlans(true);
  }

  protected selectPlan(id: number, updateUrl = true): void {
    this.selectedPlanId.set(id);
    const fromList = this.plans().find((plan) => plan.sipPlanId === id) ?? null;
    this.selectedPlan.set(fromList);
    this.detailError.set(null);
    if (updateUrl) {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { plan: id },
        queryParamsHandling: 'merge',
      });
    }
    void this.loadPlanDetail(id);
    void this.loadInstallments(id);
  }

  protected openCreateForm(): void {
    this.formMode.set('create');
    this.editingPlanId.set(null);
    this.formError.set(null);
    this.fieldErrors.set({});
    const today = todayInIst();
    this.form.reset(
      {
        planName: '',
        monthlyAmount: '',
        installmentDay: currentIstDay(),
        originalStartDate: today,
        trackingStartDate: today,
        plannedEndDate: '',
      },
      { emitEvent: false },
    );
  }

  protected openEditForm(plan: SipPlan): void {
    this.formMode.set('edit');
    this.editingPlanId.set(plan.sipPlanId);
    this.formError.set(null);
    this.fieldErrors.set({});
    this.form.reset(
      {
        planName: plan.planName,
        monthlyAmount: formatInrGrouping(plan.monthlyAmount),
        installmentDay: plan.installmentDay,
        originalStartDate: plan.originalStartDate,
        trackingStartDate: plan.trackingStartDate,
        plannedEndDate: plan.plannedEndDate ?? '',
      },
      { emitEvent: false },
    );
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  protected closeForm(): void {
    if (this.formSubmitting()) {
      return;
    }
    this.formMode.set(null);
    this.editingPlanId.set(null);
    this.formError.set(null);
    this.fieldErrors.set({});
  }

  protected submitForm(): void {
    this.formError.set(null);
    this.fieldErrors.set({});
    if (this.formSubmitting()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const monthlyAmount = parseInrInput(String(raw['monthlyAmount']));
    if (monthlyAmount === null || monthlyAmount === '0.00') {
      this.formError.set('Monthly amount must be greater than 0.00.');
      return;
    }
    const originalStartDate = String(raw['originalStartDate']);
    const trackingStartDate = String(raw['trackingStartDate']);
    const plannedEndDate = String(raw['plannedEndDate'] ?? '').trim() || null;
    if (trackingStartDate < originalStartDate) {
      this.formError.set('Tracking start date must not be before the original start date.');
      return;
    }
    if (plannedEndDate !== null && plannedEndDate < trackingStartDate) {
      this.formError.set('Planned end date must not be before the tracking start date.');
      return;
    }

    const payload: SipPlanCreateRequest = {
      planName: String(raw['planName']).trim(),
      monthlyAmount,
      installmentDay: Number(raw['installmentDay']),
      originalStartDate,
      trackingStartDate,
      plannedEndDate,
    };

    const mode = this.formMode();
    const editingId = this.editingPlanId();
    this.formSubmitting.set(true);
    const request =
      mode === 'edit' && editingId !== null
        ? this.sipService.updatePlan(editingId, payload as SipPlanUpdateRequest)
        : this.sipService.createPlan(payload);

    request
      .then((plan) => {
        this.formMode.set(null);
        this.editingPlanId.set(null);
        this.actionMessage.set(
          mode === 'edit'
            ? `Updated ${plan.planName}.`
            : `${plan.planName} was created. Upcoming installments now appear below.`,
        );
        this.refreshAfterMutation(plan.sipPlanId);
      })
      .catch((error: unknown) => this.handleFormError(error))
      .finally(() => this.formSubmitting.set(false));
  }

  protected requestPay(installment: SipInstallment): void {
    this.payError.set(null);
    this.payTarget.set(installment);
    this.payDate.set(todayInIst());
    this.payNote.set('');
  }

  protected cancelPay(): void {
    if (this.paySubmitting()) {
      return;
    }
    this.payTarget.set(null);
    this.payError.set(null);
  }

  protected setPayDate(value: string): void {
    this.payDate.set(value);
  }

  protected setPayNote(value: string): void {
    this.payNote.set(value);
  }

  protected confirmPay(): void {
    const target = this.payTarget();
    if (!target || this.paySubmitting()) {
      return;
    }
    const paymentDate = this.payDate().trim();
    if (!paymentDate) {
      this.payError.set('Payment date is required.');
      return;
    }
    if (paymentDate > todayInIst()) {
      this.payError.set('Payment date must not be in the future.');
      return;
    }
    this.paySubmitting.set(true);
    this.payError.set(null);
    this.sipService
      .markInstallmentPaid(target.sipPlanId, target.period, {
        paymentDate,
        note: this.payNote().trim() || null,
      })
      .then((response) => {
        this.payTarget.set(null);
        this.actionMessage.set(
          `Marked the ${formatMonthLabel(target.period)} installment of ${formatInr(response.installment.amount)} as paid. A ${formatInr(response.moneyEntry.amount)} Investments/SIP entry was recorded.`,
        );
        this.refreshAfterMutation(target.sipPlanId);
      })
      .catch((error: unknown) => {
        this.payError.set(paymentErrorMessage(error));
      })
      .finally(() => this.paySubmitting.set(false));
  }

  protected requestStop(plan: SipPlan): void {
    this.stopError.set(null);
    this.stopTarget.set(plan);
    this.stopDate.set(todayInIst());
  }

  protected cancelStop(): void {
    if (this.stopSubmitting()) {
      return;
    }
    this.stopTarget.set(null);
    this.stopError.set(null);
  }

  protected setStopDate(value: string): void {
    this.stopDate.set(value);
  }

  protected confirmStop(): void {
    const target = this.stopTarget();
    if (!target || this.stopSubmitting()) {
      return;
    }
    const stopDate = this.stopDate().trim();
    if (!stopDate) {
      this.stopError.set('Stop date is required.');
      return;
    }
    if (stopDate > todayInIst()) {
      this.stopError.set('Stop date must not be in the future.');
      return;
    }
    if (stopDate < target.trackingStartDate) {
      this.stopError.set('Stop date must not be before the tracking start date.');
      return;
    }
    const maxStopDate = this.stopMaxDate(target);
    if (stopDate > maxStopDate) {
      this.stopError.set(
        target.plannedEndDate && maxStopDate === target.plannedEndDate
          ? 'Stop date must not be after the planned end date.'
          : 'Stop date must not be in the future.',
      );
      return;
    }
    this.stopSubmitting.set(true);
    this.stopError.set(null);
    this.sipService
      .stopPlan(target.sipPlanId, { stopDate })
      .then((plan) => {
        this.stopTarget.set(null);
        this.actionMessage.set(
          `${plan.planName} was stopped on ${formatIsoDate(plan.actualEndedDate ?? stopDate)}. Its history and paid installments are kept.`,
        );
        this.refreshAfterMutation(plan.sipPlanId);
      })
      .catch((error: unknown) => {
        this.stopError.set(stopErrorMessage(error));
      })
      .finally(() => this.stopSubmitting.set(false));
  }

  protected stopMaxDate(plan: SipPlan): string {
    const today = todayInIst();
    return plan.plannedEndDate && plan.plannedEndDate < today
      ? plan.plannedEndDate
      : today;
  }

  protected isActive(plan: SipPlan | null): boolean {
    return plan?.status === 'ACTIVE';
  }

  protected canPay(plan: SipPlan | null, installment: SipInstallment): boolean {
    return plan?.status === 'ACTIVE' && installment.status !== 'PAID';
  }

  protected planStatusClass(status: SipPlanStatus): string {
    switch (status) {
      case 'ACTIVE':
        return 'pill pill-success';
      case 'STOPPED':
        return 'pill pill-warning';
      default:
        return 'pill pill-neutral';
    }
  }

  protected installmentStatusClass(status: SipInstallmentStatus): string {
    switch (status) {
      case 'PAID':
        return 'pill pill-success';
      case 'DUE':
        return 'pill pill-warning';
      case 'OVERDUE':
        return 'pill pill-danger';
      default:
        return 'pill pill-neutral';
    }
  }

  protected fieldError(name: string): string {
    const server = this.fieldErrors()[name];
    if (server) {
      return server;
    }
    const control = this.form.get(name);
    if (!control || !control.invalid || !(control.touched || control.dirty)) {
      return '';
    }
    if (control.errors?.['required']) {
      return 'This field is required.';
    }
    if (control.errors?.['maxlength']) {
      return 'This value is too long.';
    }
    if (control.errors?.['min'] || control.errors?.['max'] || control.errors?.['integer']) {
      return 'Enter a whole number between 1 and 31.';
    }
    if (control.errors?.['amount']) {
      return 'Enter an amount greater than 0 with at most 2 decimals.';
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

  private async loadPlans(selectInitial: boolean): Promise<void> {
    this.plansLoading.set(true);
    this.plansError.set(null);
    try {
      const response = await this.sipService.listPlans();
      this.plans.set(response.content);
      const current = this.selectedPlanId();
      const requested = selectInitial ? this.initialPlanId : null;
      const desired =
        (requested !== null && response.content.some((p) => p.sipPlanId === requested)
          ? requested
          : null) ??
        (current !== null && response.content.some((p) => p.sipPlanId === current)
          ? current
          : null) ??
        response.content[0]?.sipPlanId ??
        null;
      if (desired !== null) {
        this.selectPlan(desired, false);
      } else {
        this.selectedPlanId.set(null);
        this.selectedPlan.set(null);
        this.installments.set([]);
      }
    } catch (error) {
      this.plansError.set(serverErrorMessage(error));
    } finally {
      this.plansLoading.set(false);
    }
  }

  private async loadPlanDetail(id: number): Promise<void> {
    this.detailLoading.set(true);
    this.detailError.set(null);
    try {
      const plan = await this.sipService.getPlan(id);
      if (this.selectedPlanId() === id) {
        this.selectedPlan.set(plan);
        this.plans.update((plans) =>
          plans.map((item) => (item.sipPlanId === id ? plan : item)),
        );
      }
    } catch (error) {
      if (this.selectedPlanId() === id) {
        this.detailError.set(serverErrorMessage(error));
      }
    } finally {
      if (this.selectedPlanId() === id) {
        this.detailLoading.set(false);
      }
    }
  }

  private async loadInstallments(id: number): Promise<void> {
    this.installmentsLoading.set(true);
    this.installmentsError.set(null);
    const { fromDate, toDate } = installmentRange();
    try {
      const response = await this.sipService.listInstallments(id, fromDate, toDate);
      if (this.selectedPlanId() === id) {
        this.installments.set(response.content);
      }
    } catch (error) {
      if (this.selectedPlanId() === id) {
        this.installments.set([]);
        this.installmentsError.set(serverErrorMessage(error));
      }
    } finally {
      if (this.selectedPlanId() === id) {
        this.installmentsLoading.set(false);
      }
    }
  }

  private async loadSummary(): Promise<void> {
    this.summaryLoading.set(true);
    this.summaryError.set(null);
    try {
      const summary = await this.sipService.getCommitmentSummary(currentMonthKey());
      this.summary.set(summary);
    } catch (error) {
      this.summary.set(null);
      this.summaryError.set(serverErrorMessage(error));
    } finally {
      this.summaryLoading.set(false);
    }
  }

  private refreshAfterMutation(planId: number): void {
    this.selectedPlanId.set(planId);
    void this.loadSummary();
    void this.loadPlans(false);
  }

  private handleFormError(error: unknown): void {
    if (error instanceof AuthApiError) {
      if (error.fieldErrors.length > 0) {
        const mapped: Record<string, string> = {};
        for (const fieldError of error.fieldErrors) {
          mapped[fieldError.field] = fieldError.message;
        }
        this.fieldErrors.set(mapped);
        this.formError.set('Check the highlighted fields and try again.');
        return;
      }
      this.formError.set(formErrorMessage(error));
      return;
    }
    this.formError.set(serverErrorMessage(error));
  }
}

function parsePlanId(raw: string | null): number | null {
  if (!raw) {
    return null;
  }
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function installmentRange(): { fromDate: string; toDate: string } {
  const startMonth = shiftMonth(currentMonthKey(), -2);
  const endMonth = shiftMonth(currentMonthKey(), 3);
  return {
    fromDate: `${startMonth}-01`,
    toDate: `${endMonth}-${daysInMonth(endMonth)}`,
  };
}

function daysInMonth(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const day = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return String(day).padStart(2, '0');
}

function todayInIst(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === 'year')?.value ?? '';
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  const day = parts.find((part) => part.type === 'day')?.value ?? '';
  return `${year}-${month}-${day}`;
}

function currentIstDay(): number {
  return Number(todayInIst().slice(8, 10)) || 1;
}

function paymentErrorMessage(error: unknown): string {
  if (error instanceof AuthApiError) {
    switch (error.code) {
      case 'BUDGET_NOT_SET':
        return 'Set this month’s budget before marking the installment as paid.';
      case 'INVESTMENTS_DISABLED':
        return 'Investments are switched off in this month’s budget. Turn them on before paying.';
      case 'PERIOD_READ_ONLY':
        return 'Installments for a past month can no longer be marked as paid.';
      case 'ENTRY_DATE_FUTURE':
        return 'The payment date must not be in the future.';
      case 'SIP_PLAN_NOT_ACTIVE':
        return 'This SIP plan is stopped or completed and cannot be paid.';
      case 'SIP_PLAN_COMPLETED':
        return 'This SIP plan is completed and cannot be paid.';
      case 'SIP_INSTALLMENT_NOT_SCHEDULED':
        return 'That installment is not part of this SIP plan’s schedule.';
      default:
        return error.message;
    }
  }
  return serverErrorMessage(error);
}

function stopErrorMessage(error: unknown): string {
  if (error instanceof AuthApiError) {
    switch (error.code) {
      case 'SIP_PLAN_ALREADY_STOPPED':
        return 'This SIP plan is already stopped.';
      case 'SIP_PLAN_COMPLETED':
        return 'Completed SIP plans cannot be stopped.';
      case 'SIP_STOP_DATE_FUTURE':
        return 'Stop date must not be in the future.';
      case 'SIP_STOP_DATE_BEFORE_TRACKING':
        return 'Stop date must not be before the tracking start date.';
      case 'SIP_STOP_DATE_INVALID':
        return 'Stop date must not be after the planned end date.';
      default:
        return error.message;
    }
  }
  return serverErrorMessage(error);
}

function formErrorMessage(error: AuthApiError): string {
  switch (error.code) {
    case 'SIP_PLAN_DATES_LOCKED':
      return 'Start dates cannot be changed after an installment has been paid.';
    case 'TRACKING_START_BEFORE_ORIGINAL':
      return 'Tracking start date must not be before the original start date.';
    case 'PLANNED_END_BEFORE_TRACKING':
      return 'Planned end date must not be before the tracking start date.';
    case 'SIP_PLAN_NOT_ACTIVE':
      return 'Stopped SIP plans cannot be updated.';
    case 'SIP_PLAN_COMPLETED':
      return 'Completed SIP plans cannot be updated.';
    case 'PLAN_NAME_INVALID':
      return 'Plan name must be between 1 and 120 characters.';
    case 'MONTHLY_AMOUNT_INVALID':
      return 'Monthly amount must be greater than 0.00.';
    case 'MONTHLY_AMOUNT_PRECISION':
      return 'Monthly amount must have at most 2 decimal places.';
    case 'INSTALLMENT_DAY_INVALID':
      return 'Installment day must be between 1 and 31.';
    default:
      return error.message;
  }
}

const positiveAmountValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const raw = control.value;
  if (raw === null || raw === undefined || String(raw).trim() === '') {
    return null;
  }
  const parsed = parseInrInput(String(raw));
  if (parsed === null || parsed === '0.00') {
    return { amount: true };
  }
  return null;
};

const integerValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value;
  if (value === null || value === undefined || value === '') {
    return null;
  }
  return Number.isInteger(Number(value)) ? null : { integer: true };
};
