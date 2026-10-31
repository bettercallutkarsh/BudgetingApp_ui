import { MoneyEntry } from '../budget/budget.models';

export type SipPlanStatus = 'ACTIVE' | 'STOPPED' | 'COMPLETED';

export const SIP_PLAN_STATUSES: SipPlanStatus[] = ['ACTIVE', 'STOPPED', 'COMPLETED'];

export const SIP_PLAN_STATUS_LABELS: Record<SipPlanStatus, string> = {
  ACTIVE: 'Active',
  STOPPED: 'Stopped',
  COMPLETED: 'Completed',
};

export type SipInstallmentStatus = 'UPCOMING' | 'DUE' | 'OVERDUE' | 'PAID';

export const SIP_INSTALLMENT_STATUSES: SipInstallmentStatus[] = [
  'UPCOMING',
  'DUE',
  'OVERDUE',
  'PAID',
];

export const SIP_INSTALLMENT_STATUS_LABELS: Record<SipInstallmentStatus, string> = {
  UPCOMING: 'Upcoming',
  DUE: 'Due',
  OVERDUE: 'Overdue',
  PAID: 'Paid',
};

export interface SipPlan {
  sipPlanId: number;
  investmentType: 'SIP';
  planName: string;
  monthlyAmount: string;
  installmentDay: number;
  originalStartDate: string;
  trackingStartDate: string;
  plannedEndDate: string | null;
  actualEndedDate: string | null;
  status: SipPlanStatus;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface SipPlanListResponse {
  content: SipPlan[];
  activeMonthlyCommitment: string;
}

export interface SipPlanCreateRequest {
  planName: string;
  monthlyAmount: string;
  installmentDay: number;
  originalStartDate: string;
  trackingStartDate: string;
  plannedEndDate?: string | null;
}

export type SipPlanUpdateRequest = SipPlanCreateRequest;

export interface SipPlanStopRequest {
  stopDate?: string | null;
}

export interface SipInstallment {
  sipPlanId: number;
  planName: string;
  period: string;
  dueDate: string;
  amount: string;
  status: SipInstallmentStatus;
  paidMoneyEntryId: number | null;
  paidAtUtc: string | null;
  paidDate: string | null;
}

export interface SipInstallmentListResponse {
  fromDate: string;
  toDate: string;
  content: SipInstallment[];
}

export interface SipInstallmentPaymentRequest {
  paymentDate?: string | null;
  paymentTime?: string | null;
  note?: string | null;
}

export interface SipInstallmentPaymentResponse {
  installment: SipInstallment;
  moneyEntry: MoneyEntry;
  idempotentReplay: boolean;
}

export interface SipCommitmentSummary {
  month: string;
  investmentsAmount: string | null;
  activeMonthlyCommitment: string;
  withinAllocation: boolean | null;
  overAllocationAmount: string;
  activePlanCount: number;
  message: string;
}
