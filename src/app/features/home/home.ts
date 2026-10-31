import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { MonthSelectorComponent } from '../../shared/components/month-selector/month-selector';
import { BudgetService } from '../../core/budget/budget.service';
import { SummaryService } from '../../core/budget/summary.service';
import { EntriesService } from '../../core/entries/entries.service';
import { SipService } from '../../core/sip/sip.service';
import { SipCommitmentSummary } from '../../core/sip/sip.models';
import {
  MonthlyBudget,
  MonthlySummary,
  MoneyEntry,
  INCOME_TYPE_LABELS,
  IncomeType,
} from '../../core/budget/budget.models';
import {
  currentMonthKey,
  formatDateTime,
  formatInr,
  formatMonthLabel,
  isPastMonth,
  shiftMonth,
} from '../../shared/formatters';
import { serverErrorMessage } from '../../core/auth/auth.models';

interface RecentEntry {
  id: number;
  label: string;
  bucket: string | null;
  amount: string;
  isExpense: boolean;
  at: string;
}

@Component({
  selector: 'app-home',
  imports: [PageHeaderComponent, MonthSelectorComponent, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class HomePageComponent {
  private readonly budgetService = inject(BudgetService);
  private readonly summaryService = inject(SummaryService);
  private readonly entriesService = inject(EntriesService);
  private readonly sipService = inject(SipService);
  private readonly route = inject(ActivatedRoute);

  protected readonly month = signal(currentMonthKey());
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly summary = signal<MonthlySummary | null>(null);
  protected readonly budget = signal<MonthlyBudget | null>(null);
  protected readonly entries = signal<RecentEntry[]>([]);
  protected readonly entriesLoading = signal(true);
  protected readonly entriesFailed = signal(false);
  protected readonly sipSummary = signal<SipCommitmentSummary | null>(null);

  protected readonly formatInr = formatInr;
  protected readonly monthLabel = computed(() => formatMonthLabel(this.month()));
  protected readonly currentMonth = currentMonthKey();
  protected readonly isViewingPastMonth = computed(() => isPastMonth(this.month()));

  protected readonly status = computed(() => this.summary()?.status ?? null);
  protected readonly noBudget = computed(() => this.status() === 'BUDGET_NOT_SET');
  protected readonly noIncome = computed(() => this.status() === 'NO_INCOME');
  protected readonly overAllocation = computed(
    () => this.status() === 'OVER_ALLOCATION',
  );
  protected readonly withinAllocation = computed(
    () => this.status() === 'WITHIN_ALLOCATION',
  );

  protected readonly investmentsEnabled = computed(
    () => this.summary()?.investmentsEnabled ?? this.budget()?.investmentsEnabled ?? false,
  );

  protected readonly sipWarning = computed(
    () => this.sipSummary()?.withinAllocation === false,
  );

  protected readonly essentials = computed(() =>
    this.bucket('essentials'),
  );
  protected readonly safety = computed(() => this.bucket('safety'));
  protected readonly investments = computed(() => this.bucket('investments'));

  constructor() {
    const queryMonth = this.route.snapshot.queryParamMap.get('month');
    if (queryMonth && /^\d{4}-\d{2}$/.test(queryMonth)) {
      this.month.set(queryMonth);
    }
    this.load();
  }

  protected changeMonth(delta: number): void {
    this.month.set(shiftMonth(this.month(), delta));
    this.load();
  }

  protected retry(): void {
    this.load();
  }

  protected incomeTypeLabel(type: IncomeType): string {
    return INCOME_TYPE_LABELS[type] ?? type;
  }

  protected bucketLabel(bucket: string): string {
    return bucket.charAt(0) + bucket.slice(1).toLowerCase();
  }
  protected statusLabel(): string {
    switch (this.status()) {
      case 'WITHIN_ALLOCATION':
        return 'Within allocation';
      case 'OVER_ALLOCATION':
        return 'Over allocation';
      case 'NO_INCOME':
        return 'No income recorded';
      case 'BUDGET_NOT_SET':
        return 'Budget not set';
      default:
        return '';
    }
  }

  protected statusClass(): string {
    switch (this.status()) {
      case 'WITHIN_ALLOCATION':
        return 'pill pill-success';
      case 'OVER_ALLOCATION':
        return 'pill pill-danger';
      case 'NO_INCOME':
        return 'pill pill-warning';
      default:
        return 'pill pill-neutral';
    }
  }

  private bucket(
    key: 'essentials' | 'safety' | 'investments',
  ): {
    allocated: string | null;
    used: string | null;
    remaining: string | null;
    percent: number | null;
    over: boolean;
  } {
    const s = this.summary();
    if (!s) {
      return { allocated: null, used: null, remaining: null, percent: null, over: false };
    }
    const allocated = s[`${key}Amount` as const];
    const used = s[`${key}Used` as const];
    const remaining = s[`${key}Remaining` as const];
    return {
      allocated,
      used,
      remaining,
      percent: computePercent(used, allocated),
      over: isOver(used, allocated),
    };
  }

  private async load(): Promise<void> {
    const month = this.month();
    this.loading.set(true);
    this.loadError.set(null);
    this.entriesLoading.set(true);
    this.entriesFailed.set(false);

    const summaryPromise = this.summaryService.getMonthlySummary(month).catch((error: unknown) => {
      this.loadError.set(serverErrorMessage(error));
      return null;
    });
    const budgetPromise = this.budgetService.getBudget(month).catch((error: unknown) => {
      this.loadError.set(serverErrorMessage(error));
      return null;
    });
    const entriesPromise = this.entriesService
      .listEntries({ page: 0, size: 5 })
      .catch(() => {
        this.entriesFailed.set(true);
        return null;
      });
    const sipPromise = this.sipService
      .getCommitmentSummary(month)
      .catch(() => null);

    try {
      const [summary, budget, entries, sip] = await Promise.all([
        summaryPromise,
        budgetPromise,
        entriesPromise,
        sipPromise,
      ]);
      this.summary.set(summary);
      this.budget.set(budget);
      this.entries.set(entries ? entries.content.map(toRecentEntry) : []);
      this.sipSummary.set(sip);
    } finally {
      this.loading.set(false);
      this.entriesLoading.set(false);
    }
  }
}

function toRecentEntry(entry: MoneyEntry): RecentEntry {
  return {
    id: entry.moneyEntryId,
    label: entry.note?.trim() || entry.categoryCode,
    bucket: entry.bucket,
    amount: entry.amount,
    isExpense: entry.entryType === 'EXPENSE',
    at: formatDateTime(entry.entryAtUtc),
  };
}

function computePercent(used: string | null, allocated: string | null): number | null {
  if (!used || !allocated) {
    return null;
  }
  const u = Number(used);
  const a = Number(allocated);
  if (!Number.isFinite(u) || !Number.isFinite(a) || a <= 0) {
    return null;
  }
  return Math.min(100, Math.max(0, (u / a) * 100));
}

function isOver(used: string | null, allocated: string | null): boolean {
  if (!used || !allocated) {
    return false;
  }
  const u = Number(used);
  const a = Number(allocated);
  return Number.isFinite(u) && Number.isFinite(a) && u > a;
}
