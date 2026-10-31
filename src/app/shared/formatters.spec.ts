import {
  addDecimalStrings,
  allocateIncomeByPercentages,
  amountForPercentage,
  compareDecimalStrings,
  currentMonthKey,
  formatInr,
  formatInrGrouping,
  formatInrWhole,
  formatIsoDate,
  formatMonthLabel,
  isPastMonth,
  parseInrInput,
  parsePercentInput,
  percentageOfAmount,
  percentagesFromAmounts,
  shiftMonth,
  subtractDecimalStrings,
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

  it('formats a YYYY-MM key or a full date as a month label', () => {
    expect(formatMonthLabel('2026-10')).toBe('October 2026');
    expect(formatMonthLabel('2026-01')).toBe('January 2026');
    expect(formatMonthLabel('2026-10-01')).toBe('October 2026');
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

describe('INR input formatting', () => {
  it('groups amounts using the Indian convention with two decimals', () => {
    expect(formatInrGrouping('24500')).toBe('24,500.00');
    expect(formatInrGrouping('100000')).toBe('1,00,000.00');
    expect(formatInrGrouping('1000000')).toBe('10,00,000.00');
  });

  it('returns an empty string for empty or invalid values', () => {
    expect(formatInrGrouping('')).toBe('');
    expect(formatInrGrouping(null)).toBe('');
    expect(formatInrGrouping('nope')).toBe('');
  });

  it('groups whole amounts without decimals', () => {
    expect(formatInrWhole('100000')).toBe('1,00,000');
    expect(formatInrWhole('24500')).toBe('24,500');
  });
});

describe('parseInrInput', () => {
  it('parses plain and grouped amounts to canonical two-decimal strings', () => {
    expect(parseInrInput('24500')).toBe('24500.00');
    expect(parseInrInput('24,500.00')).toBe('24500.00');
    expect(parseInrInput('₹1,00,000.00')).toBe('100000.00');
    expect(parseInrInput('₹10,00,000')).toBe('1000000.00');
  });

  it('trims whitespace and a leading currency symbol', () => {
    expect(parseInrInput('  ₹ 5,000 ')).toBe('5000.00');
  });

  it('supports a single decimal place by padding', () => {
    expect(parseInrInput('500.5')).toBe('500.50');
    expect(parseInrInput('0.1')).toBe('0.10');
  });

  it('returns null for empty input', () => {
    expect(parseInrInput('')).toBeNull();
    expect(parseInrInput('   ')).toBeNull();
    expect(parseInrInput(null)).toBeNull();
  });

  it('rejects malformed, negative, signed and scientific input', () => {
    expect(parseInrInput('abc')).toBeNull();
    expect(parseInrInput('-100')).toBeNull();
    expect(parseInrInput('+100')).toBeNull();
    expect(parseInrInput('1e5')).toBeNull();
    expect(parseInrInput('1.2.3')).toBeNull();
  });

  it('rejects more than two decimals', () => {
    expect(parseInrInput('100.123')).toBeNull();
  });

  it('rejects amounts beyond 12 integer digits', () => {
    expect(parseInrInput('1234567890123')).toBeNull();
    expect(parseInrInput('999999999999.99')).toBe('999999999999.99');
  });
});

describe('parsePercentInput', () => {
  it('parses percentages to canonical two-decimal strings', () => {
    expect(parsePercentInput('55')).toBe('55.00');
    expect(parsePercentInput('10.5')).toBe('10.50');
    expect(parsePercentInput('100')).toBe('100.00');
    expect(parsePercentInput('.5')).toBe('0.50');
  });

  it('returns null for empty, out-of-range or malformed values', () => {
    expect(parsePercentInput('')).toBeNull();
    expect(parsePercentInput('101')).toBeNull();
    expect(parsePercentInput('-1')).toBeNull();
    expect(parsePercentInput('50.123')).toBeNull();
    expect(parsePercentInput('abc')).toBeNull();
  });
});

describe('decimal string arithmetic', () => {
  it('adds, subtracts and compares canonical decimal strings exactly', () => {
    expect(addDecimalStrings('10000.00', '5000.00')).toBe('15000.00');
    expect(addDecimalStrings('0.10', '0.20')).toBe('0.30');
    expect(subtractDecimalStrings('24500.00', '19150.00')).toBe('5350.00');
    expect(subtractDecimalStrings('1000.00', '0.01')).toBe('999.99');
    expect(compareDecimalStrings('100.00', '100.00')).toBe(0);
    expect(compareDecimalStrings('99.99', '100.00')).toBe(-1);
    expect(compareDecimalStrings('100.01', '100.00')).toBe(1);
  });

  it('uses BigInt precision for large amounts', () => {
    expect(addDecimalStrings('999999999999.99', '0.01')).toBe('1000000000000.00');
    expect(amountForPercentage('999999999999.99', '55.00')).toBe('549999999999.99');
  });
});

describe('allocation arithmetic', () => {
  it('computes preset amounts with HALF_UP rounding and an exact residual', () => {
    const balanced = allocateIncomeByPercentages(
      '24500.00',
      '55.00',
      '10.00',
      '35.00',
      true,
    );
    expect(balanced).toEqual({
      essentials: '13475.00',
      safety: '2450.00',
      investments: '8575.00',
    });
    expect(
      addDecimalStrings(
        addDecimalStrings(balanced.essentials, balanced.safety),
        balanced.investments,
      ),
    ).toBe('24500.00');
  });

  it('keeps totals exact when rounding both rounded buckets up', () => {
    const result = allocateIncomeByPercentages('1.01', '50.00', '50.00', '0.00', true);
    expect(addDecimalStrings(addDecimalStrings(result.essentials, result.safety), result.investments)).toBe('1.01');
  });

  it('gives the residual to Emergency Fund when Investments are off', () => {
    const result = allocateIncomeByPercentages('100.00', '60.00', '0.00', '0.00', false);
    expect(result.essentials).toBe('60.00');
    expect(result.safety).toBe('40.00');
    expect(result.investments).toBe('0.00');
  });

  it('converts amounts back to percentages that total exactly 100', () => {
    const percentages = percentagesFromAmounts('24500.00', {
      essentials: '14000.00',
      safety: '3000.00',
      investments: '7500.00',
    });
    expect(percentages).toEqual({
      essentials: '57.15',
      safety: '12.24',
      investments: '30.61',
    });
    expect(
      addDecimalStrings(
        addDecimalStrings(percentages.essentials, percentages.safety),
        percentages.investments,
      ),
    ).toBe('100.00');
  });

  it('computes a bucket percentage from its amount', () => {
    expect(percentageOfAmount('13475.00', '24500.00')).toBe('55.00');
    expect(percentageOfAmount('3000.00', '24500.00')).toBe('12.24');
  });
});

describe('calendar date formatting', () => {
  it('formats backend ISO dates as dd-MM-yyyy', () => {
    expect(formatIsoDate('2026-10-05')).toBe('05-10-2026');
    expect(formatIsoDate('2026-01-31')).toBe('31-01-2026');
    expect(formatIsoDate(null)).toBe('');
    expect(formatIsoDate('not-a-date')).toBe('');
  });
});
