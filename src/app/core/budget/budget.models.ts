export type BudgetBucket = 'ESSENTIALS' | 'SAFETY' | 'INVESTMENTS';

export const BUDGET_BUCKETS: BudgetBucket[] = ['ESSENTIALS', 'SAFETY', 'INVESTMENTS'];

export const BUCKET_LABELS: Record<BudgetBucket, string> = {
  ESSENTIALS: 'Essentials',
  SAFETY: 'Safety',
  INVESTMENTS: 'Investments',
};

export type EntryType = 'EXPENSE' | 'SAFETY_SAVING' | 'INVESTMENT' | 'CREDIT_CARD_PAYMENT';

export const ENTRY_TYPES: EntryType[] = ['EXPENSE', 'SAFETY_SAVING', 'INVESTMENT', 'CREDIT_CARD_PAYMENT'];

export const ENTRY_TYPE_LABELS: Record<EntryType, string> = {
  EXPENSE: 'Expense',
  SAFETY_SAVING: 'Safety saving',
  INVESTMENT: 'Investment contribution',
  CREDIT_CARD_PAYMENT: 'Credit-card payment',
};

export type PaymentMethod = 'UPI' | 'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'BANK_TRANSFER' | 'WALLET' | 'OTHER';

export const PAYMENT_METHODS: PaymentMethod[] = [
  'UPI',
  'CASH',
  'CREDIT_CARD',
  'DEBIT_CARD',
  'BANK_TRANSFER',
  'WALLET',
  'OTHER',
];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  UPI: 'UPI',
  CASH: 'Cash',
  CREDIT_CARD: 'Credit Card',
  DEBIT_CARD: 'Debit Card',
  BANK_TRANSFER: 'Bank Transfer',
  WALLET: 'Wallet',
  OTHER: 'Other',
};

export type EntryStatus = 'POSTED' | 'VOID';

export const ENTRY_STATUSES: EntryStatus[] = ['POSTED', 'VOID'];

export const ENTRY_STATUS_LABELS: Record<EntryStatus, string> = {
  POSTED: 'Posted',
  VOID: 'Void',
};

export type AllocationMode = 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE' | 'MANUAL';

export const ALLOCATION_MODES: AllocationMode[] = ['CONSERVATIVE', 'BALANCED', 'AGGRESSIVE', 'MANUAL'];

export const ALLOCATION_MODE_LABELS: Record<AllocationMode, string> = {
  CONSERVATIVE: 'Conservative',
  BALANCED: 'Balanced',
  AGGRESSIVE: 'Aggressive',
  MANUAL: 'Manual',
};

export interface AllocationPreset {
  mode: AllocationMode;
  essentialsPercentage: string;
  safetyPercentage: string;
  investmentsPercentage: string;
  description: string;
}

export const ALLOCATION_PRESETS: AllocationPreset[] = [
  {
    mode: 'CONSERVATIVE',
    essentialsPercentage: '60.00',
    safetyPercentage: '10.00',
    investmentsPercentage: '30.00',
    description:
      'For people or families who want higher stability, lower market risk and a stronger safety allocation.',
  },
  {
    mode: 'BALANCED',
    essentialsPercentage: '55.00',
    safetyPercentage: '10.00',
    investmentsPercentage: '35.00',
    description: 'A practical mix of everyday expenses, safety and long-term investment contributions.',
  },
  {
    mode: 'AGGRESSIVE',
    essentialsPercentage: '50.00',
    safetyPercentage: '10.00',
    investmentsPercentage: '40.00',
    description:
      'For people who want a larger investment allocation for the future and understand that investments can fluctuate.',
  },
];

export type IncomeType = 'SALARY' | 'POCKET_MONEY' | 'OTHER_INCOME';

export const INCOME_TYPES: IncomeType[] = ['SALARY', 'POCKET_MONEY', 'OTHER_INCOME'];

export const INCOME_TYPE_LABELS: Record<IncomeType, string> = {
  SALARY: 'Salary',
  POCKET_MONEY: 'Pocket money',
  OTHER_INCOME: 'Other income',
};

export type MonthStatus = 'BUDGET_NOT_SET' | 'NO_INCOME' | 'WITHIN_ALLOCATION' | 'OVER_ALLOCATION';

export const MONTH_STATUSES: MonthStatus[] = [
  'BUDGET_NOT_SET',
  'NO_INCOME',
  'WITHIN_ALLOCATION',
  'OVER_ALLOCATION',
];

export const MONTH_STATUS_LABELS: Record<MonthStatus, string> = {
  BUDGET_NOT_SET: 'Budget not set',
  NO_INCOME: 'No income recorded',
  WITHIN_ALLOCATION: 'Within allocation',
  OVER_ALLOCATION: 'Over allocation',
};

export interface MonthlyBudget {
  month: string;
  incomeType: IncomeType;
  incomeSourceLabel: string | null;
  incomeAmount: string;
  allocationMode: AllocationMode;
  investmentsEnabled: boolean;
  essentialsPercentage: string;
  safetyPercentage: string;
  investmentsPercentage: string;
  essentialsAmount: string;
  safetyAmount: string;
  investmentsAmount: string;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface MonthlyBudgetSaveRequest {
  incomeType: IncomeType;
  incomeSourceLabel?: string | null;
  incomeAmount: string;
  allocationMode: AllocationMode;
  investmentsEnabled: boolean;
  essentialsPercentage: string;
  safetyPercentage: string;
  investmentsPercentage: string;
}

export interface MonthlySummary {
  month: string;
  status: MonthStatus;
  incomeAmount: string | null;
  allocationMode: AllocationMode | null;
  investmentsEnabled: boolean | null;
  essentialsPercentage: string | null;
  safetyPercentage: string | null;
  investmentsPercentage: string | null;
  essentialsAmount: string | null;
  safetyAmount: string | null;
  investmentsAmount: string | null;
  essentialsUsed: string | null;
  safetyUsed: string | null;
  investmentsUsed: string | null;
  essentialsRemaining: string | null;
  safetyRemaining: string | null;
  investmentsRemaining: string | null;
  consumptionExpenditure: string | null;
  safetySavings: string | null;
  investmentContributions: string | null;
  creditCardOutstandingAmount: string | null;
  explanation: string | null;
}

// Prompt 3 additions
export interface CategoryRef {
  code: string;
  label: string;
  allowedEntryTypes: EntryType[];
  allowedBuckets: BudgetBucket[];
}

export interface MoneyEntry {
  moneyEntryId: number;
  entryAtUtc: string;
  entryType: EntryType;
  bucket: BudgetBucket | null;
  categoryCode: string;
  amount: string;
  paymentMethod: PaymentMethod | null;
  note: string | null;
  status: EntryStatus;
  clientRequestId: string | null;
  voidedAtUtc: string | null;
  voidReason: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface MoneyEntryPage {
  content: MoneyEntry[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface MoneyEntryCreateRequest {
  entryDate: string;
  entryTime: string;
  entryType: EntryType;
  bucket: BudgetBucket | null;
  categoryCode: string;
  amount: string;
  paymentMethod: PaymentMethod | null;
  note: string | null;
  clientRequestId: string;
}

export interface MoneyEntryListQuery {
  fromDate?: string;
  toDate?: string;
  entryType?: EntryType;
  bucket?: BudgetBucket;
  categoryCode?: string;
  status?: EntryStatus;
  page?: number;
  size?: number;
}

// Prompt 4 additions
export interface CreditCardSummary {
  trackingConfigured: boolean | null;
  openingOutstandingAmount: string | null;
  currentOutstandingAmount: string | null;
  totalPostedPurchases: string | null;
  totalPostedPayments: string | null;
  trackingStartedAtUtc: string | null;
  explanation: string | null;
}

export interface CreditCardOpeningRequest {
  openingOutstandingAmount: string;
  trackingStartedAtUtc?: string | null;
}

export type ReportGroupBy = 'DAY' | 'MONTH' | 'QUARTER' | 'HALF_YEAR' | 'YEAR';

export const REPORT_GROUP_BY_OPTIONS: ReportGroupBy[] = ['DAY', 'MONTH', 'QUARTER', 'HALF_YEAR', 'YEAR'];

export interface ReportPeriod {
  period: string;
  consumptionExpenditure: string | null;
  safetySavings: string | null;
  investmentContributions: string | null;
  recordedIncome: string | null;
  incomeIncluded: boolean | null;
}

export interface ReportSummaryResponse {
  fromDate: string;
  toDate: string;
  groupBy: string;
  incomeIncluded: boolean | null;
  explanation: string | null;
  periods: ReportPeriod[] | null;
  totals: {
    consumptionExpenditure: string | null;
    safetySavings: string | null;
    investmentContributions: string | null;
    recordedIncome: string | null;
  } | null;
}
