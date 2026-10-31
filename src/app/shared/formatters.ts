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
 * Two-decimal grouping formatter (no currency symbol) used when displaying
 * values *inside* monetary inputs. Uses the Indian (en-IN) grouping
 * convention, e.g. 24500 -> "24,500.00", 100000 -> "1,00,000.00".
 */
const INR_GROUPING_FORMATTER = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: true,
});

const INR_WHOLE_FORMATTER = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 0,
  useGrouping: true,
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

/**
 * Formats a `YYYY-MM` month key, or a full `YYYY-MM-DD` calendar date, as e.g.
 * "October 2026". The date form is used for SIP installment-period references.
 */
export function formatMonthLabel(month: string | null | undefined): string {
  if (!month) {
    return '';
  }
  const match = /^(\d{4})-(\d{2})(?:-\d{2})?$/.exec(month);
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

/** Formats a backend ISO calendar date (`YYYY-MM-DD`) as `dd-MM-yyyy`. */
export function formatIsoDate(iso: string | null | undefined): string {
  if (!iso) {
    return '';
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) {
    return '';
  }
  return `${match[3]}-${match[2]}-${match[1]}`;
}

/**
 * Groups a canonical decimal string with Indian digit grouping and exactly two
 * decimals, without a currency symbol. Intended for display inside monetary
 * text inputs. Returns '' for empty/invalid input so callers can keep the
 * field blank while the user is typing.
 */
export function formatInrGrouping(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return '';
  }
  return INR_GROUPING_FORMATTER.format(numeric);
}

/** Groups a whole rupee amount (no decimals), e.g. 100000 -> "1,00,000". */
export function formatInrWhole(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return '';
  }
  return INR_WHOLE_FORMATTER.format(numeric);
}

/**
 * Parses user-entered monetary text into a canonical two-decimal string for
 * the API, stripping display-only currency symbols and grouping separators.
 *
 * Accepts an optional leading `₹`, Indian/English digit grouping and up to two
 * decimals. Rejects negatives, signs, scientific notation, more than two
 * decimals and over-large magnitudes (12 integer digits, matching the
 * backend's `@Digits(integer = 12, fraction = 2)` contract).
 *
 * Returns `null` for empty input (so "required" stays a separate concern) and
 * for malformed input. This is intentionally string-based; no binary
 * floating-point value is ever the source of financial truth.
 */
export function parseInrInput(raw: string | null | undefined): string | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  const trimmed = raw.trim();
  if (trimmed === '') {
    return null;
  }
  const withoutSymbol = trimmed.replace(/[₹\s\u00a0]/g, '');
  if (withoutSymbol === '') {
    return null;
  }
  if (!/^[0-9,]*(\.[0-9]*)?$/.test(withoutSymbol)) {
    return null;
  }
  const normalized = withoutSymbol.replace(/,/g, '');
  if (normalized === '' || normalized === '.') {
    return null;
  }
  const match = /^(\d+)(?:\.(\d*))?$/.exec(normalized);
  if (!match) {
    return null;
  }
  const whole = match[1];
  const fraction = match[2] ?? '';
  if (whole.length > 12) {
    return null;
  }
  if (fraction.length > 2) {
    return null;
  }
  const paddedFraction = (fraction + '00').slice(0, 2);
  const wholeTrimmed = whole.replace(/^0+(?=\d)/, '');
  return `${wholeTrimmed}.${paddedFraction}`;
}

/**
 * Parses a percentage input (0–100, at most two decimals). Returns a canonical
 * two-decimal string, or `null` when empty/malformed/out of range. String-based
 * to avoid floating-point rounding surprises; the server remains authoritative.
 */
export function parsePercentInput(raw: string | null | undefined): string | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  const trimmed = raw.trim().replace(/\s/g, '');
  if (trimmed === '') {
    return null;
  }
  if (!/^\d*\.?\d*$/.test(trimmed)) {
    return null;
  }
  const match = /^(\d*)(?:\.(\d*))?$/.exec(trimmed);
  if (!match) {
    return null;
  }
  const whole = match[1] === '' ? '0' : match[1];
  const fraction = match[2] ?? '';
  if (whole.length > 3 || fraction.length > 2) {
    return null;
  }
  const wholeTrimmed = whole.replace(/^0+(?=\d)/, '');
  const value = Number(`${wholeTrimmed}.${(fraction + '00').slice(0, 2)}`);
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    return null;
  }
  return `${wholeTrimmed}.${(fraction + '00').slice(0, 2)}`;
}

/**
 * Converts a canonical decimal string to integer paise using BigInt, avoiding
 * binary floating-point drift. Used by all shared currency arithmetic below.
 */
function toCents(value: string | number | null | undefined): bigint {
  if (value === null || value === undefined) {
    return 0n;
  }
  const raw = String(value).trim().replace(/[,\u20b9\s\u00a0]/g, '');
  if (raw === '' || raw === '-' || raw === '.') {
    return 0n;
  }
  const match = /^(-?)(\d+)(?:\.(\d*))?$/.exec(raw);
  if (!match) {
    return 0n;
  }
  const sign = match[1] === '-' ? -1n : 1n;
  const whole = BigInt(match[2]);
  const fraction = (match[3] ?? '').padEnd(2, '0').slice(0, 2);
  return sign * (whole * 100n + BigInt(fraction));
}

function fromCents(cents: bigint): string {
  const negative = cents < 0n;
  const absolute = negative ? -cents : cents;
  const whole = absolute / 100n;
  const fraction = (absolute % 100n).toString().padStart(2, '0');
  return `${negative ? '-' : ''}${whole.toString()}.${fraction}`;
}

/** Divides two positive-or-negative BigInts with HALF_UP rounding. */
function divideHalfUp(numerator: bigint, denominator: bigint): bigint {
  if (denominator === 0n) {
    return 0n;
  }
  const negative = numerator < 0n;
  const absolute = negative ? -numerator : numerator;
  const quotient = (absolute + denominator / 2n) / denominator;
  return negative ? -quotient : quotient;
}

/** Adds two canonical decimal strings exactly and returns a two-decimal string. */
export function addDecimalStrings(a: string, b: string): string {
  return fromCents(toCents(a) + toCents(b));
}

/** Subtracts `b` from `a` exactly and returns a canonical two-decimal string. */
export function subtractDecimalStrings(a: string, b: string): string {
  return fromCents(toCents(a) - toCents(b));
}

/** Compares two canonical decimal strings: -1, 0 or 1. */
export function compareDecimalStrings(a: string, b: string): number {
  const left = toCents(a);
  const right = toCents(b);
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

/** True when a canonical decimal string represents zero. */
export function isZeroDecimalString(value: string | null | undefined): boolean {
  return toCents(value) === 0n;
}

/**
 * Multiplies an amount by a percentage using integer paise math and HALF_UP
 * rounding to two decimals, matching the backend's allocation contract.
 */
export function amountForPercentage(amount: string, percentage: string): string {
  const amountCents = toCents(amount);
  const percentageCents = toCents(percentage);
  return fromCents(divideHalfUp(amountCents * percentageCents, 10000n));
}

function amountForPercentageDown(amount: string, percentage: string): string {
  const amountCents = toCents(amount);
  const percentageCents = toCents(percentage);
  const product = amountCents * percentageCents;
  const denominator = 10000n;
  const negative = product < 0n;
  const absolute = negative ? -product : product;
  const quotient = absolute / denominator;
  return fromCents(negative ? -quotient : quotient);
}

/**
 * Computes the percentage that `amount` represents of `income`, rounded
 * HALF_UP to two decimals.
 */
export function percentageOfAmount(amount: string, income: string): string {
  const amountCents = toCents(amount);
  const incomeCents = toCents(income);
  if (incomeCents === 0n) {
    return '0.00';
  }
  return fromCents(divideHalfUp(amountCents * 10000n, incomeCents));
}

export interface AllocationAmounts {
  essentials: string;
  safety: string;
  investments: string;
}

/**
 * Mirrors the backend `AllocationCalculator.calculate` residual policy:
 * Essentials and Safety are rounded HALF_UP to paise and Investments receives
 * the remainder so the three amounts always add up exactly to the income.
 * With Investments off, Safety receives the remainder and Investments is zero.
 */
export function allocateIncomeByPercentages(
  income: string,
  essentialsPercentage: string,
  safetyPercentage: string,
  investmentsPercentage: string,
  investmentsEnabled: boolean,
): AllocationAmounts {
  const base = addDecimalStrings(income, '0.00');
  const essentials = amountForPercentage(base, essentialsPercentage);
  if (!investmentsEnabled) {
    return {
      essentials,
      safety: subtractDecimalStrings(base, essentials),
      investments: '0.00',
    };
  }
  const safety = amountForPercentage(base, safetyPercentage);
  let investments = subtractDecimalStrings(
    subtractDecimalStrings(base, essentials),
    safety,
  );
  if (investments.startsWith('-')) {
    const essentialsDown = amountForPercentageDown(base, essentialsPercentage);
    const safetyDown = amountForPercentageDown(base, safetyPercentage);
    return {
      essentials: essentialsDown,
      safety: safetyDown,
      investments: subtractDecimalStrings(
        subtractDecimalStrings(base, essentialsDown),
        safetyDown,
      ),
    };
  }
  void investmentsPercentage;
  return { essentials, safety, investments };
}

export interface AllocationPercentages {
  essentials: string;
  safety: string;
  investments: string;
}

/**
 * Converts amount allocations into percentages and reconciles any rounding
 * residual so they total exactly 100.00 for the backend percentage contract.
 */
export function percentagesFromAmounts(
  income: string,
  amounts: AllocationAmounts,
): AllocationPercentages {
  const essentials = percentageOfAmount(amounts.essentials, income);
  const safety = percentageOfAmount(amounts.safety, income);
  const investments = percentageOfAmount(amounts.investments, income);
  const total = addDecimalStrings(addDecimalStrings(essentials, safety), investments);
  const residual = subtractDecimalStrings('100.00', total);
  if (isZeroDecimalString(residual)) {
    return { essentials, safety, investments };
  }
  const buckets: { key: keyof AllocationPercentages; value: string }[] = [
    { key: 'essentials', value: essentials },
    { key: 'safety', value: safety },
    { key: 'investments', value: investments },
  ];
  const largest = buckets.reduce((max, bucket) =>
    compareDecimalStrings(bucket.value, max.value) > 0 ? bucket : max,
  );
  const adjusted = addDecimalStrings(largest.value, residual);
  if (adjusted.startsWith('-')) {
    return { essentials, safety, investments };
  }
  const result = { essentials, safety, investments };
  result[largest.key] = adjusted;
  return result;
}

