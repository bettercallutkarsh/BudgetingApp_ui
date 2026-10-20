import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ReportsPageComponent } from './reports';
import { authInterceptor } from '../../core/auth/auth.interceptor';
import { MonthlySummary, ReportSummaryResponse } from '../../core/budget/budget.models';

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

function monthly(overrides: Partial<MonthlySummary> = {}): MonthlySummary {
  return {
    month: '2026-10',
    status: 'WITHIN_ALLOCATION',
    incomeAmount: '50000.00',
    allocationMode: 'BALANCED',
    investmentsEnabled: true,
    essentialsPercentage: '55.00',
    safetyPercentage: '10.00',
    investmentsPercentage: '35.00',
    essentialsAmount: '27500.00',
    safetyAmount: '5000.00',
    investmentsAmount: '17500.00',
    essentialsUsed: '10000.00',
    safetyUsed: '0.00',
    investmentsUsed: '0.00',
    essentialsRemaining: '17500.00',
    safetyRemaining: '5000.00',
    investmentsRemaining: '17500.00',
    consumptionExpenditure: '10000.00',
    safetySavings: '0.00',
    investmentContributions: '0.00',
    creditCardOutstandingAmount: '2500.00',
    explanation: 'Within your monthly allocation so far.',
    ...overrides,
  };
}

function range(overrides: Partial<ReportSummaryResponse> = {}): ReportSummaryResponse {
  return {
    fromDate: '2026-10-01',
    toDate: '2026-10-20',
    groupBy: 'MONTH',
    incomeIncluded: false,
    explanation: 'Income is recorded monthly; choose a full-month period to include it.',
    periods: [
      {
        period: '2026-10',
        consumptionExpenditure: '1000.00',
        safetySavings: '200.00',
        investmentContributions: '300.00',
        recordedIncome: null,
        incomeIncluded: false,
      },
    ],
    totals: {
      consumptionExpenditure: '1000.00',
      safetySavings: '200.00',
      investmentContributions: '300.00',
      recordedIncome: null,
    },
    ...overrides,
  };
}

function errorBody(status: number, code: string, message: string) {
  return { timestamp: '2026-10-20T07:00:00Z', status, code, message, fieldErrors: [], traceId: 't' };
}

describe('ReportsPageComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportsPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function flushInit(options: { monthly?: MonthlySummary; summary?: ReportSummaryResponse } = {}) {
    httpMock
      .expectOne((r) => r.url === '/api/v1/reports/monthly-summary')
      .flush(options.monthly ?? monthly());
    httpMock
      .expectOne((r) => r.url === '/api/v1/reports/summary')
      .flush(options.summary ?? range());
  }

  it('loads both the monthly and range summaries on init', async () => {
    const fixture = TestBed.createComponent(ReportsPageComponent);
    fixture.detectChanges();
    await settle();
    flushInit();
    await settle();
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Monthly summary');
    expect(text).toContain('50,000.00');
    expect(text).toContain('Date-range summary');
    expect(text).toContain('1,000.00');
  });

  it('requests the monthly summary for the selected month when navigating', async () => {
    const fixture = TestBed.createComponent(ReportsPageComponent);
    fixture.detectChanges();
    await settle();
    flushInit();
    await settle();
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    component.prevMonth();
    await settle();
    const req = httpMock.expectOne(
      (r) => r.url === '/api/v1/reports/monthly-summary' && r.params.has('month'),
    );
    req.flush(monthly());
    await settle();
  });

  it('does not advance past the current month', async () => {
    const fixture = TestBed.createComponent(ReportsPageComponent);
    fixture.detectChanges();
    await settle();
    flushInit();
    await settle();
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    const before = component.month();
    component.nextMonth();
    await settle();
    expect(component.month()).toBe(before);
    httpMock.expectNone((r) => r.url === '/api/v1/reports/monthly-summary');
  });

  it('blocks an invalid range without calling the API', async () => {
    const fixture = TestBed.createComponent(ReportsPageComponent);
    fixture.detectChanges();
    await settle();
    flushInit();
    await settle();
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    component.setFromDate('2026-10-20');
    component.setToDate('2026-10-01');
    component.loadRange();
    await settle();

    expect(component.rangeValidation()).toContain('end date cannot be before');
    // only the initial range request happened
    httpMock.expectNone((r) => r.url === '/api/v1/reports/summary');
  });

  it('sends the selected group by and shows income only when included', async () => {
    const fixture = TestBed.createComponent(ReportsPageComponent);
    fixture.detectChanges();
    await settle();
    flushInit({ summary: range({ incomeIncluded: false }) });
    await settle();
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    component.setGroupBy('QUARTER');
    component.loadRange();
    await settle();
    const req = httpMock.expectOne(
      (r) => r.url === '/api/v1/reports/summary' && r.params.get('groupBy') === 'QUARTER',
    );
    req.flush(
      range({
        groupBy: 'QUARTER',
        incomeIncluded: false,
        periods: [
          {
            period: 'FY2026-27Q3',
            consumptionExpenditure: '1000.00',
            safetySavings: '0.00',
            investmentContributions: '0.00',
            recordedIncome: null,
            incomeIncluded: false,
          },
        ],
      }),
    );
    await settle();
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('FY2026-27Q3');
    expect(text).toContain('Not included');
    const incomeCells = Array.from(
      fixture.nativeElement.querySelectorAll('.data-table tbody td.num') as HTMLElement[],
    ).map((el) => (el.textContent ?? '').trim());
    expect(incomeCells).toContain('Not included');
  });

  it('shows recorded income when the range includes full months', async () => {
    const fixture = TestBed.createComponent(ReportsPageComponent);
    fixture.detectChanges();
    await settle();
    flushInit({
      summary: range({
        fromDate: '2026-10-01',
        toDate: '2026-10-31',
        incomeIncluded: true,
        explanation: null,
        periods: [
          {
            period: '2026-10',
            consumptionExpenditure: '1000.00',
            safetySavings: '200.00',
            investmentContributions: '300.00',
            recordedIncome: '50000.00',
            incomeIncluded: true,
          },
        ],
        totals: {
          consumptionExpenditure: '1000.00',
          safetySavings: '200.00',
          investmentContributions: '300.00',
          recordedIncome: '50000.00',
        },
      }),
    });
    await settle();
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    expect(component.incomeIncluded()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('50,000.00');
  });

  it('renders the chart bars from the same periods as the table', async () => {
    const fixture = TestBed.createComponent(ReportsPageComponent);
    fixture.detectChanges();
    await settle();
    flushInit();
    await settle();
    fixture.detectChanges();

    const bars = fixture.nativeElement.querySelectorAll('.chart__bar');
    const rows = fixture.nativeElement.querySelectorAll('.data-table tbody tr');
    expect(bars.length).toBe(1);
    expect(bars.length).toBe(rows.length);
    expect(fixture.nativeElement.querySelector('.chart')?.getAttribute('aria-label')).toContain('Bar chart');
  });

  it('shows an empty state when there are no periods', async () => {
    const fixture = TestBed.createComponent(ReportsPageComponent);
    fixture.detectChanges();
    await settle();
    flushInit({
      summary: range({
        periods: [],
        totals: {
          consumptionExpenditure: '0.00',
          safetySavings: '0.00',
          investmentContributions: '0.00',
          recordedIncome: null,
        },
      }),
    });
    await settle();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No entries in this period');
  });

  it('shows a range error with retry', async () => {
    const fixture = TestBed.createComponent(ReportsPageComponent);
    fixture.detectChanges();
    await settle();
    httpMock.expectOne((r) => r.url === '/api/v1/reports/monthly-summary').flush(monthly());
    httpMock
      .expectOne((r) => r.url === '/api/v1/reports/summary')
      .flush(errorBody(400, 'REPORT_RANGE_INVALID', 'Bad range.'), {
        status: 400,
        statusText: 'Bad Request',
      });
    await settle();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Bad range.');
  });

  it('shows a monthly error with retry', async () => {
    const fixture = TestBed.createComponent(ReportsPageComponent);
    fixture.detectChanges();
    await settle();
    httpMock
      .expectOne((r) => r.url === '/api/v1/reports/monthly-summary')
      .flush(errorBody(500, 'INTERNAL_ERROR', 'Boom'), { status: 500, statusText: 'Server Error' });
    httpMock.expectOne((r) => r.url === '/api/v1/reports/summary').flush(range());
    await settle();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Boom');
  });
});
