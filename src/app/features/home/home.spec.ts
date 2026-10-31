import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HomePageComponent } from './home';
import { authInterceptor } from '../../core/auth/auth.interceptor';
import { currentMonthKey, formatMonthLabel } from '../../shared/formatters';
import { MonthlySummary } from '../../core/budget/budget.models';
import { SipCommitmentSummary } from '../../core/sip/sip.models';

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

function summary(overrides: Partial<MonthlySummary> = {}): MonthlySummary {
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
    creditCardOutstandingAmount: '0.00',
    explanation: 'You are within your allocation.',
    ...overrides,
  };
}

function sipCommitment(
  overrides: Partial<SipCommitmentSummary> = {},
): SipCommitmentSummary {
  return {
    month: '2026-10',
    investmentsAmount: '17500.00',
    activeMonthlyCommitment: '5000.00',
    withinAllocation: true,
    overAllocationAmount: '0.00',
    activePlanCount: 1,
    message: 'Your SIPs fit within this month’s Investments allocation.',
    ...overrides,
  };
}

const EMPTY_PAGE = { content: [], page: 0, size: 5, totalElements: 0, totalPages: 0 };

function errorBody(status: number, code: string, message: string) {
  return { timestamp: '2026-10-20T07:00:00Z', status, code, message, fieldErrors: [], traceId: 't' };
}

describe('HomePageComponent', () => {
  let httpMock: HttpTestingController;
  const month = currentMonthKey();

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomePageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  async function flushLoad(options: {
    summary?: MonthlySummary | null;
    summaryError?: { status: number; code: string; message: string };
    budget?: unknown | null;
    entries?: unknown;
    sip?: SipCommitmentSummary;
  } = {}): Promise<void> {
    const summaryReq = httpMock.expectOne(
      (r) => r.url === '/api/v1/reports/monthly-summary',
    );
    if (options.summaryError) {
      summaryReq.flush(
        errorBody(options.summaryError.status, options.summaryError.code, options.summaryError.message),
        { status: options.summaryError.status, statusText: 'Error' },
      );
    } else if (options.summary === null) {
      summaryReq.flush(errorBody(404, 'BUDGET_NOT_SET', 'No budget is set.'), {
        status: 404,
        statusText: 'Not Found',
      });
    } else {
      summaryReq.flush(options.summary ?? summary());
    }

    const budgetReq = httpMock.expectOne((r) => r.url.startsWith('/api/v1/budgets/'));
    if (options.budget) {
      budgetReq.flush(options.budget);
    } else {
      budgetReq.flush(errorBody(404, 'BUDGET_NOT_SET', 'No budget is set.'), {
        status: 404,
        statusText: 'Not Found',
      });
    }

    const entriesReq = httpMock.expectOne((r) => r.url === '/api/v1/money-entries');
    entriesReq.flush(options.entries ?? EMPTY_PAGE);

    const sipReq = httpMock.expectOne((r) => r.url === '/api/v1/sip-plans/summary');
    sipReq.flush(options.sip ?? sipCommitment());
    await settle();
  }

  it('renders the summary amounts and status once loaded', async () => {
    const fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();
    await settle();
    await flushLoad();
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain(formatMonthLabel(month));
    expect(text).toContain('Within allocation');
    expect(text).toContain('50,000.00');
    expect(text).toContain('No entries yet');
  });

  it('labels each bucket card amount as Remaining', async () => {
    const fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();
    await settle();
    await flushLoad();
    fixture.detectChanges();

    const captions = Array.from(
      fixture.nativeElement.querySelectorAll('.dash-grid .text-text-muted') as HTMLElement[],
    ).map((el) => (el.textContent ?? '').trim());
    expect(captions.filter((c) => c === 'Remaining').length).toBe(3);
  });

  it('flags an over-allocated bucket with visible text, not colour alone', async () => {
    const fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();
    await settle();
    await flushLoad({
      summary: summary({ status: 'OVER_ALLOCATION', essentialsUsed: '99999.00' }),
    });
    fixture.detectChanges();

    const flags = Array.from(
      fixture.nativeElement.querySelectorAll('.over-flag') as HTMLElement[],
    ).map((el) => (el.textContent ?? '').trim());
    expect(flags.length).toBe(1);
    expect(flags[0]).toContain('Over allocated');
  });

  it('shows the BUDGET_NOT_SET state with a setup link', async () => {
    const fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();
    await settle();
    await flushLoad({
      summary: summary({ status: 'BUDGET_NOT_SET', incomeAmount: null, explanation: 'Your budget isn\'t set for this month.' }),
    });
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('No budget set');
    expect(text).toContain("Your budget isn't set for this month.");
    expect(fixture.nativeElement.querySelector('a[href^="/budget"]')).toBeTruthy();
  });

  it('shows the OVER_ALLOCATION warning', async () => {
    const fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();
    await settle();
    await flushLoad({
      summary: summary({ status: 'OVER_ALLOCATION', explanation: 'You have exceeded your allocation.' }),
    });
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Over allocation');
    expect(text).toContain('exceeded your allocation');
  });

  it('shows the NO_INCOME state', async () => {
    const fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();
    await settle();
    await flushLoad({
      summary: summary({ status: 'NO_INCOME', incomeAmount: null }),
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No income recorded');
  });

  it('hides investments when they are switched off', async () => {
    const fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();
    await settle();
    await flushLoad({ summary: summary({ investmentsEnabled: false }) });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Switched off');
  });

  it('shows the SIP commitment, over-allocation warning and plan link', async () => {
    const fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();
    await settle();
    await flushLoad({
      sip: sipCommitment({
        activeMonthlyCommitment: '19000.00',
        withinAllocation: false,
        overAllocationAmount: '1500.00',
        message: 'SIPs exceed the Investments allocation for this month.',
      }),
    });
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('SIP commitment');
    expect(text).toContain('19,000.00');
    expect(text).toContain('SIPs exceed the Investments allocation by');
    expect(text).toContain('1,500.00');
    expect(fixture.nativeElement.querySelector('a[href="/sip-plans"]')).toBeTruthy();
  });

  it('shows an error state with retry when the summary fails hard', async () => {
    const fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();
    await settle();
    await flushLoad({
      summaryError: { status: 500, code: 'INTERNAL_ERROR', message: 'Boom' },
    });
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain("We couldn't load your overview");
    expect(fixture.nativeElement.querySelector('button')).toBeTruthy();
  });

  it('renders recent entries when present', async () => {
    const fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();
    await settle();
    await flushLoad({
      entries: {
        content: [
          {
            moneyEntryId: 1,
            entryAtUtc: '2026-10-05T10:00:00Z',
            entryType: 'EXPENSE',
            bucket: 'ESSENTIALS',
            categoryCode: 'GROCERIES',
            amount: '1200.00',
            paymentMethod: 'UPI',
            note: 'Weekly groceries',
            status: 'POSTED',
            clientRequestId: null,
            voidedAtUtc: null,
            voidReason: null,
            createdAtUtc: '2026-10-05T10:00:00Z',
            updatedAtUtc: '2026-10-05T10:00:00Z',
          },
        ],
        page: 0,
        size: 5,
        totalElements: 1,
        totalPages: 1,
      },
    });
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Weekly groceries');
    expect(text).toContain('1,200.00');
    expect(text).not.toContain('No entries yet');
  });

  it('reads the selected month from the URL and carries it into the budget link', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [HomePageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    })
      .overrideComponent(HomePageComponent, {
        set: {
          providers: [
            {
              provide: ActivatedRoute,
              useValue: { snapshot: { queryParamMap: convertToParamMap({ month: '2026-03' }) } },
            },
          ],
        },
      })
      .compileComponents();

    const localHttp = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();
    await settle();

    localHttp
      .expectOne(
        (r) => r.url === '/api/v1/reports/monthly-summary' && r.params.get('month') === '2026-03',
      )
      .flush(summary({ status: 'BUDGET_NOT_SET', incomeAmount: null, explanation: "Your budget isn't set for this month." }));
    localHttp
      .expectOne((r) => r.url === '/api/v1/budgets/2026-03')
      .flush(errorBody(404, 'BUDGET_NOT_SET', 'No budget is set.'), {
        status: 404,
        statusText: 'Not Found',
      });
    localHttp.expectOne((r) => r.url === '/api/v1/money-entries').flush(EMPTY_PAGE);
    localHttp
      .expectOne(
        (r) => r.url === '/api/v1/sip-plans/summary' && r.params.get('month') === '2026-03',
      )
      .flush(sipCommitment({ month: '2026-03' }));
    await settle();
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('a[href^="/budget"]') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toContain('month=2026-03');
    expect(fixture.nativeElement.textContent).toContain('March 2026');
    localHttp.verify();
  });
});
