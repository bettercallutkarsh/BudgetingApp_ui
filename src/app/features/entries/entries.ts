import { Component, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { EntriesService } from '../../core/entries/entries.service';
import { CategoriesService } from '../../core/categories/categories.service';
import {
  BUDGET_BUCKETS,
  BUCKET_LABELS,
  BudgetBucket,
  CategoryRef,
  ENTRY_TYPES,
  ENTRY_STATUS_LABELS,
  ENTRY_TYPE_LABELS,
  EntryStatus,
  EntryType,
  MoneyEntry,
  MoneyEntryCreateRequest,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  PaymentMethod,
} from '../../core/budget/budget.models';
import { AuthApiError, serverErrorMessage } from '../../core/auth/auth.models';
import { currentMonthKey, formatDateTime, formatInr, formatMonthLabel } from '../../shared/formatters';

const PAGE_SIZE = 10;

const LEGACY_CATEGORY_LABELS: Record<string, string> = {
  GOLD_SIP: 'Gold SIP (legacy)',
};

@Component({
  selector: 'app-entries',
  imports: [PageHeaderComponent, ReactiveFormsModule, RouterLink],
  templateUrl: './entries.html',
  styleUrl: './entries.scss',
})
export class EntriesPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly entriesService = inject(EntriesService);
  private readonly categoriesService = inject(CategoriesService);

  protected readonly entryTypes: EntryType[] = ['EXPENSE', 'SAFETY_SAVING', 'INVESTMENT'];
  protected readonly entryTypeLabels = ENTRY_TYPE_LABELS;
  protected readonly bucketLabels = BUCKET_LABELS;
  protected readonly paymentMethods = PAYMENT_METHODS;
  protected readonly paymentMethodLabels = PAYMENT_METHOD_LABELS;
  protected readonly entryStatusLabels = ENTRY_STATUS_LABELS;
  protected readonly formatInr = formatInr;
  protected readonly formatDateTime = formatDateTime;
  protected readonly formatMonthLabel = formatMonthLabel;

  // --- create form state ---
  protected readonly form: FormGroup = this.fb.nonNullable.group({
    entryType: ['EXPENSE' as EntryType, [Validators.required]],
    bucket: ['ESSENTIALS' as BudgetBucket | null],
    categoryCode: ['', [Validators.required]],
    amount: ['', [Validators.required, amountValidator]],
    paymentMethod: ['UPI' as PaymentMethod | null, [Validators.required]],
    entryDate: [todayInIst(), [Validators.required, notFutureDateValidator]],
    entryTime: [nowTimeInIst(), [Validators.required]],
    note: ['', [Validators.maxLength(500)]],
  });

  protected readonly submitting = signal(false);
  protected readonly createError = signal<string | null>(null);
  protected readonly createdMessage = signal<string | null>(null);
  protected readonly fieldErrors = signal<Record<string, string>>({});

  protected readonly entryType = signal<EntryType>('EXPENSE');
  protected readonly bucket = signal<BudgetBucket | null>('ESSENTIALS');

  // --- categories ---
  protected readonly categories = signal<CategoryRef[]>([]);
  protected readonly categoriesLoading = signal(false);
  protected readonly categoriesError = signal<string | null>(null);

  // --- history ---
  protected readonly entries = signal<MoneyEntry[]>([]);
  protected readonly historyLoading = signal(false);
  protected readonly historyError = signal<string | null>(null);
  protected readonly page = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly totalElements = signal(0);
  protected readonly filterEntryType = signal<EntryType | ''>('');
  protected readonly filterStatus = signal<EntryStatus | ''>('');

  // --- void dialog ---
  protected readonly voidTarget = signal<MoneyEntry | null>(null);
  protected readonly voidSubmitting = signal(false);
  protected readonly voidError = signal<string | null>(null);
  protected readonly voidReason = signal('');

  protected readonly historyEmpty = computed(
    () => !this.historyLoading() && !this.historyError() && this.entries().length === 0,
  );
  protected readonly categoryEmpty = computed(
    () => !this.categoriesLoading() && !this.categoriesError() && this.categories().length === 0,
  );
  protected readonly hasPrevious = computed(() => this.page() > 0);
  protected readonly hasNext = computed(() => this.page() + 1 < this.totalPages());
  protected readonly currentMonthLabel = computed(() => formatMonthLabel(currentMonthKey()));

  constructor() {
    this.watchEntryShape();
    void this.loadCategories();
    void this.loadHistory();
  }

  // ---------- create form helpers ----------

  protected onEntryTypeChange(type: EntryType): void {
    this.entryType.set(type);
    const bucket = defaultBucketFor(type);
    this.bucket.set(bucket);
    this.form.patchValue({ bucket }, { emitEvent: false });
    // Reset the category: the previously selected one may not be valid anymore.
    this.form.patchValue({ categoryCode: '' }, { emitEvent: false });
    void this.loadCategories();
  }

  protected onBucketChange(bucket: BudgetBucket): void {
    this.bucket.set(bucket);
    this.form.patchValue({ categoryCode: '' }, { emitEvent: false });
    void this.loadCategories();
  }

  protected paymentRequired(): boolean {
    return this.entryType() === 'EXPENSE';
  }

  protected bucketEditable(): boolean {
    return this.entryType() === 'EXPENSE';
  }

  protected isInvalid(name: string): boolean {
    if (this.fieldErrors()[name]) {
      return true;
    }
    const control = this.form.get(name);
    return !!control && control.invalid && (control.touched || control.dirty);
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
    const errors = control.errors ?? {};
    if (errors['required']) {
      return 'This field is required.';
    }
    if (errors['maxLength']) {
      return 'This value is too long.';
    }
    if (errors['amount']) {
      return 'Enter an amount greater than 0 with at most 2 decimals.';
    }
    if (errors['futureDate']) {
      return 'The date and time must not be in the future.';
    }
    return 'Please check this value.';
  }

  protected submit(): void {
    this.createError.set(null);
    this.createdMessage.set(null);
    this.fieldErrors.set({});

    if (this.submitting()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const type = raw.entryType as EntryType;
    const payload: MoneyEntryCreateRequest = {
      entryDate: String(raw.entryDate),
      entryTime: normalizeTime(String(raw.entryTime)),
      entryType: type,
      bucket: type === 'EXPENSE' ? (raw.bucket as BudgetBucket) : defaultBucketFor(type),
      categoryCode: String(raw.categoryCode),
      amount: normalizeAmount(String(raw.amount)),
      paymentMethod: type === 'EXPENSE' ? (raw.paymentMethod as PaymentMethod) : null,
      note: String(raw.note ?? '').trim() || null,
      clientRequestId: uuid(),
    };

    this.submitting.set(true);
    this.entriesService
      .createEntry(payload)
      .then((entry) => {
        this.createdMessage.set(
          `Entry of ${formatInr(entry.amount)} recorded for ${formatDateTime(entry.entryAtUtc)}.`,
        );
        this.resetCreateForm();
        this.page.set(0);
        void this.loadHistory();
      })
      .catch((error: unknown) => this.handleCreateError(error))
      .finally(() => this.submitting.set(false));
  }

  private handleCreateError(error: unknown): void {
    if (error instanceof AuthApiError) {
      if (error.fieldErrors.length > 0) {
        const mapped: Record<string, string> = {};
        for (const fe of error.fieldErrors) {
          mapped[fe.field] = fe.message;
        }
        this.fieldErrors.set(mapped);
        this.createError.set('Check the highlighted fields and try again.');
        return;
      }
      this.createError.set(createErrorMessage(error));
      return;
    }
    this.createError.set(serverErrorMessage(error));
  }

  private resetCreateForm(): void {
    const type = this.entryType();
    this.form.patchValue(
      {
        categoryCode: '',
        amount: '',
        note: '',
        entryDate: todayInIst(),
        entryTime: nowTimeInIst(),
      },
      { emitEvent: false },
    );
    this.form.markAsPristine();
    this.form.markAsUntouched();
    void type;
  }

  // ---------- categories ----------

  protected async loadCategories(): Promise<void> {
    const type = this.entryType();
    const bucket = this.bucket();
    this.categoriesLoading.set(true);
    this.categoriesError.set(null);
    try {
      const list = await this.categoriesService.listCategories({
        entryType: type,
        bucket: bucket ?? undefined,
      });
      this.categories.set(
        type === 'INVESTMENT'
          ? list.filter((category) => category.code !== 'GOLD_SIP')
          : list,
      );
    } catch (error) {
      this.categories.set([]);
      this.categoriesError.set(serverErrorMessage(error));
    } finally {
      this.categoriesLoading.set(false);
    }
  }

  // ---------- history ----------

  protected async loadHistory(): Promise<void> {
    this.historyLoading.set(true);
    this.historyError.set(null);
    try {
      const result = await this.entriesService.listEntries({
        entryType: this.filterEntryType() || undefined,
        status: this.filterStatus() || undefined,
        page: this.page(),
        size: PAGE_SIZE,
      });
      this.entries.set(result.content);
      this.totalPages.set(result.totalPages);
      this.totalElements.set(result.totalElements);
    } catch (error) {
      this.entries.set([]);
      this.historyError.set(serverErrorMessage(error));
    } finally {
      this.historyLoading.set(false);
    }
  }

  protected applyFilters(): void {
    this.page.set(0);
    void this.loadHistory();
  }

  protected clearFilters(): void {
    this.filterEntryType.set('');
    this.filterStatus.set('');
    this.page.set(0);
    void this.loadHistory();
  }

  protected setFilterEntryType(value: string): void {
    this.filterEntryType.set(value as EntryType | '');
  }

  protected setFilterStatus(value: string): void {
    this.filterStatus.set(value as EntryStatus | '');
  }

  protected goToPage(delta: number): void {
    const next = this.page() + delta;
    if (next < 0 || (this.totalPages() > 0 && next >= this.totalPages())) {
      return;
    }
    this.page.set(next);
    void this.loadHistory();
  }

  protected categoryLabel(code: string): string {
    return (
      this.categories().find((c) => c.code === code)?.label ??
      LEGACY_CATEGORY_LABELS[code] ??
      code
    );
  }

  // ---------- void ----------

  protected requestVoid(entry: MoneyEntry): void {
    if (entry.status === 'VOID') {
      return;
    }
    this.voidError.set(null);
    this.voidReason.set('');
    this.voidTarget.set(entry);
  }

  protected cancelVoid(): void {
    if (this.voidSubmitting()) {
      return;
    }
    this.voidTarget.set(null);
    this.voidError.set(null);
  }

  protected setVoidReason(value: string): void {
    this.voidReason.set(value);
  }

  protected confirmVoid(): void {
    const target = this.voidTarget();
    if (!target || this.voidSubmitting()) {
      return;
    }
    this.voidSubmitting.set(true);
    this.voidError.set(null);
    this.entriesService
      .voidEntry(target.moneyEntryId, this.voidReason())
      .then(() => {
        this.voidTarget.set(null);
        void this.loadHistory();
      })
      .catch((error: unknown) => {
        if (error instanceof AuthApiError && error.code === 'ALREADY_VOIDED') {
          this.voidError.set('This entry has already been voided.');
          void this.loadHistory();
        } else if (error instanceof AuthApiError && error.code === 'ENTRY_NOT_FOUND') {
          this.voidError.set('This entry could no longer be found.');
          void this.loadHistory();
        } else {
          this.voidError.set(serverErrorMessage(error));
        }
      })
      .finally(() => this.voidSubmitting.set(false));
  }

  private watchEntryShape(): void {
    this.form.get('entryType')?.valueChanges.subscribe((type: EntryType) => {
      if (type !== this.entryType()) {
        this.onEntryTypeChange(type);
      }
    });
    this.form.get('bucket')?.valueChanges.subscribe((bucket: BudgetBucket) => {
      if (bucket && bucket !== this.bucket()) {
        this.onBucketChange(bucket);
      }
    });
  }

  protected clearCreateError(): void {
    this.createError.set(null);
    this.createdMessage.set(null);
    this.fieldErrors.set({});
  }
}

function defaultBucketFor(type: EntryType): BudgetBucket | null {
  switch (type) {
    case 'EXPENSE':
      return 'ESSENTIALS';
    case 'SAFETY_SAVING':
      return 'SAFETY';
    case 'INVESTMENT':
      return 'INVESTMENTS';
    default:
      return null;
  }
}

const amountValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const raw = control.value;
  if (raw === null || raw === undefined || String(raw).trim() === '') {
    return null;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    return { amount: true };
  }
  const decimals = String(raw).split('.')[1];
  if (decimals && decimals.length > 2) {
    return { amount: true };
  }
  return null;
};

const notFutureDateValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const raw = control.value;
  if (!raw) {
    return null;
  }
  const value = new Date(String(raw));
  if (Number.isNaN(value.getTime())) {
    return { futureDate: true };
  }
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return value.getTime() > today.getTime() ? { futureDate: true } : null;
};

function normalizeAmount(raw: string): string {
  const n = Number(raw);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}

function normalizeTime(raw: string): string {
  // The backend LocalTime accepts HH:mm; ensure seconds form when present.
  const parts = raw.split(':');
  const hh = (parts[0] ?? '00').padStart(2, '0');
  const mm = (parts[1] ?? '00').padStart(2, '0');
  const ss = (parts[2] ?? '00').padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function todayInIst(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === 'year')?.value ?? '';
  const m = parts.find((p) => p.type === 'month')?.value ?? '';
  const d = parts.find((p) => p.type === 'day')?.value ?? '';
  return `${y}-${m}-${d}`;
}

function nowTimeInIst(): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const h = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const m = parts.find((p) => p.type === 'minute')?.value ?? '00';
  return `${h === '24' ? '00' : h}:${m}`;
}

function uuid(): string {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function createErrorMessage(error: AuthApiError): string {
  switch (error.code) {
    case 'BUDGET_NOT_SET':
      return 'Set the budget for this month before recording investments.';
    case 'INVESTMENTS_DISABLED':
      return 'Investments are switched off in the budget for this month.';
    case 'PERIOD_READ_ONLY':
      return 'This month is in the past and can no longer receive new entries.';
    case 'ENTRY_DATE_FUTURE':
      return 'The entry date and time must not be in the future.';
    default:
      return error.message;
  }
}
