import {
  currentMonthKey,
  formatInr,
  formatMonthLabel,
  isPastMonth,
  shiftMonth,
} from './formatters';

describe('formatters', () => {
  it('formats INR amounts with two decimals', () => {
    expect(formatInr('50000.00')).toContain('50,000.00');
    expect(formatInr('0')).toContain('0.00');
  });

  it('treats null/empty/invalid amounts as zero', () => {
    expect(formatInr(null)).toContain('0.00');
    expect(formatInr('')).toContain('0.00');
    expect(formatInr('not-a-number')).toContain('0.00');
  });

  it('formats a YYYY-MM key as a month label', () => {
    expect(formatMonthLabel('2026-10')).toBe('October 2026');
    expect(formatMonthLabel('2026-01')).toBe('January 2026');
  });

  it('returns the raw value for malformed month keys', () => {
    expect(formatMonthLabel('nope')).toBe('nope');
    expect(formatMonthLabel(null)).toBe('');
  });

  it('shifts months forward and backward across year boundaries', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-10', 0)).toBe('2026-10');
  });

  it('computes the current month key in YYYY-MM format', () => {
    expect(currentMonthKey()).toMatch(/^\d{4}-\d{2}$/);
  });

  it('detects past months relative to the current business month', () => {
    expect(isPastMonth('2020-01')).toBe(true);
    expect(isPastMonth('2999-01')).toBe(false);
  });
});
