import { Component, computed, inject, signal } from '@angular/core';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { MonthSelectorComponent } from '../../shared/components/month-selector/month-selector';
import { ReportsService } from '../../core/reports/reports.service';
import { SummaryService } from '../../core/budget/summary.service';
import { AuthApiError, serverErrorMessage } from '../../core/auth/auth.models';
import { formatInr, formatMonthLabel, currentMonthKey, shiftMonth } from '../../shared/formatters';
import { FormsModule } from '@angular/forms';
import {
  MonthlySummary,
  REPORT_GROUP_BY_OPTIONS,
  ReportGroupBy,
  ReportPeriod,
  ReportSummaryResponse,
} from '../../core/budget/budget.models';

const GROUP_BY_LABELS: Record<ReportGroupBy, string> = {
  DAY: 'Day',
  MONTH: 'Month',
  QUARTER: 'Quarter',
  HALF_YEAR: 'Half-year',
  YEAR: 'Year',
};

interface ChartBar {
  label: string;
  consumption: number;
  safety: number;
  investments: number;
  total: number;
  heightPercent: number;
  tooltip: string;
}

@Component({
  selector: 'app-reports',
  imports: [PageHeaderComponent, MonthSelectorComponent, FormsModule],
  templateUrl: './reports.html',
  styleUrl: './reports.scss',
})
export class ReportsPageComponent {
  private readonly reportsService = inject(ReportsService);
  private readonly summaryService = inject(SummaryService);

  protected readonly formatInr = formatInr;
  protected readonly formatMonthLabel = formatMonthLabel;
  protected readonly groupOptions = REPORT_GROUP_BY_OPTIONS;
  protected readonly groupByLabels = GROUP_BY_LABELS;

  // --- Monthly summary ---
  protected readonly month = signal(currentMonthKey());
  protected readonly monthlyLoading = signal(false);
  protected readonly monthlySummary = signal<MonthlySummary | null>(null);
  protected readonly monthlyError = signal<string | null>(null);

  protected readonly monthLabel = computed(() => formatMonthLabel(this.month()));
  protected readonly canGoNext = computed(() => this.month() < currentMonthKey());

  // --- Date-range summary ---
  protected readonly fromDate = signal('');
  protected readonly toDate = signal('');
  protected readonly groupBy = signal<ReportGroupBy>('MONTH');
  protected readonly rangeLoading = signal(false);
  protected readonly rangeSummary = signal<ReportSummaryResponse | null>(null);
  protected readonly rangeError = signal<string | null>(null);
  protected readonly rangeValidation = signal<string | null>(null);

  protected readonly periods = computed<ReportPeriod[]>(() => this.rangeSummary()?.periods ?? []);
  protected readonly hasPeriods = computed(() => this.periods().length > 0);
  protected readonly incomeIncluded = computed(() => this.rangeSummary()?.incomeIncluded === true);

  /**
   * Chart bars share the exact same authoritative `periods` payload as the
   * table, so the two can never disagree. Heights are relative to the largest
   * period total; the numeric values are always formatted from the server
   * amount strings.
   */
  protected readonly chartBars = computed<ChartBar[]>(() => {
    const rows = this.periods();
    const totals = rows.map((p) => this.periodTotal(p));
    const max = Math.max(0, ...totals);
    return rows.map((p, index) => {
      const total = totals[index];
      return {
        label: p.period,
        consumption: this.toNumber(p.consumptionExpenditure),
        safety: this.toNumber(p.safetySavings),
        investments: this.toNumber(p.investmentContributions),
        total,
        heightPercent: max > 0 ? Math.round((total / max) * 100) : 0,
        tooltip: `${p.period}: ${formatInr(p.consumptionExpenditure)} consumption, ` +
          `${formatInr(p.safetySavings)} emergency fund, ${formatInr(p.investmentContributions)} investments`,
      };
    });
  });

  protected readonly incomePeriodsShown = computed(() =>
    this.periods().some((p) => p.incomeIncluded === true),
  );

  constructor() {
    const todayKey = this.todayKey();
    const startKey = this.daysAgoKey(29);
    this.fromDate.set(startKey);
    this.toDate.set(todayKey);
    void this.loadMonthly();
    void this.loadRange();
  }

  // --- Monthly actions ---
  protected changeMonth(delta: number): void {
    if (delta > 0) {
      this.nextMonth();
    } else {
      this.prevMonth();
    }
  }

  protected prevMonth(): void {
    this.month.set(shiftMonth(this.month(), -1));
    void this.loadMonthly();
  }

  protected nextMonth(): void {
    if (!this.canGoNext()) {
      return;
    }
    this.month.set(shiftMonth(this.month(), 1));
    void this.loadMonthly();
  }

  protected async loadMonthly(): Promise<void> {
    this.monthlyLoading.set(true);
    this.monthlyError.set(null);
    try {
      const summary = await this.summaryService.getMonthlySummary(this.month());
      this.monthlySummary.set(summary);
    } catch (e) {
      this.monthlySummary.set(null);
      this.monthlyError.set(e instanceof AuthApiError ? e.message : serverErrorMessage(e));
    } finally {
      this.monthlyLoading.set(false);
    }
  }

  protected retryMonthly(): void {
    void this.loadMonthly();
  }

  // --- Range actions ---
  protected setFromDate(value: string): void {
    this.fromDate.set(value);
  }

  protected setToDate(value: string): void {
    this.toDate.set(value);
  }

  protected setGroupBy(value: string): void {
    this.groupBy.set(value as ReportGroupBy);
  }

  protected loadRange(): void {
    this.rangeValidation.set(null);
    this.rangeError.set(null);

    if (!this.fromDate() || !this.toDate()) {
      this.rangeValidation.set('Both a start and end date are required.');
      return;
    }
    if (this.toDate() < this.fromDate()) {
      this.rangeValidation.set('The end date cannot be before the start date.');
      return;
    }

    this.rangeLoading.set(true);
    this.reportsService
      .getSummary({
        fromDate: this.fromDate(),
        toDate: this.toDate(),
        groupBy: this.groupBy(),
      })
      .then((response) => {
        this.rangeSummary.set(response);
      })
      .catch((e) => {
        this.rangeSummary.set(null);
        this.rangeError.set(e instanceof AuthApiError ? e.message : serverErrorMessage(e));
      })
      .finally(() => this.rangeLoading.set(false));
  }

  protected retryRange(): void {
    this.loadRange();
  }

  protected groupByLabel(value: string | null | undefined): string {
    if (!value) {
      return '';
    }
    return GROUP_BY_LABELS[value as ReportGroupBy] ?? value;
  }

  protected incomeCell(period: ReportPeriod): string {
    if (period.incomeIncluded === true) {
      return formatInr(period.recordedIncome);
    }
    return 'Not included';
  }

  private periodTotal(period: ReportPeriod): number {
    return (
      this.toNumber(period.consumptionExpenditure) +
      this.toNumber(period.safetySavings) +
      this.toNumber(period.investmentContributions)
    );
  }

  private toNumber(amount: string | null | undefined): number {
    if (amount === null || amount === undefined || amount === '') {
      return 0;
    }
    const value = Number(amount);
    return Number.isFinite(value) ? value : 0;
  }

  private todayKey(): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    return `${parts.find((p) => p.type === 'year')?.value}-${parts.find((p) => p.type === 'month')?.value}-${parts.find((p) => p.type === 'day')?.value}`;
  }

  private daysAgoKey(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    return `${parts.find((p) => p.type === 'year')?.value}-${parts.find((p) => p.type === 'month')?.value}-${parts.find((p) => p.type === 'day')?.value}`;
  }
}
