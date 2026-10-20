const INR_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const MONTH_FORMATTER = new Intl.DateTimeFormat('en-IN', {
  month: 'long',
  year: 'numeric',
  timeZone: 'Asia/Kolkata',
});

/**
 * Formats a backend decimal string as INR with two decimals. Amounts are the
 * server's source of truth; this never performs arithmetic on them.
 */
export function formatInr(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') {
    return INR_FORMATTER.format(0);
  }
  const value = typeof amount === 'number' ? amount : Number(amount);
  if (!Number.isFinite(value)) {
    return INR_FORMATTER.format(0);
  }
  return INR_FORMATTER.format(value);
}

/** Formats a `YYYY-MM` month key as e.g. "October 2026" (Asia/Kolkata). */
export function formatMonthLabel(month: string | null | undefined): string {
  if (!month) {
    return '';
  }
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) {
    return month;
  }
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) {
    return month;
  }
  return MONTH_FORMATTER.format(new Date(Date.UTC(year, monthIndex, 1)));
}

/**
 * Current month key in the business timezone (Asia/Kolkata), used as the
 * default month before the server responds.
 */
export function currentMonthKey(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  const year = parts.find((p) => p.type === 'year')?.value ?? '';
  const month = parts.find((p) => p.type === 'month')?.value ?? '';
  return `${year}-${month}`;
}

/** Shifts a `YYYY-MM` month key by a number of months (may be negative). */
export function shiftMonth(month: string, delta: number): string {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) {
    return month;
  }
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1 + delta, 1));
  const year = date.getUTCFullYear();
  const monthIndex = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${monthIndex}`;
}

/** True when the month key is strictly before the current business month. */
export function isPastMonth(month: string): boolean {
  return month < currentMonthKey();
}

/** Formats an ISO instant as a local (Asia/Kolkata) date-time label. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) {
    return '';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(date);
}
