import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ReportsService } from './reports.service';
import { authInterceptor } from '../auth/auth.interceptor';
import { ReportSummaryResponse } from '../budget/budget.models';

const SUMMARY: ReportSummaryResponse = {
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
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('ReportsService', () => {
  let httpMock: HttpTestingController;
  let service: ReportsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(ReportsService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('requests the date-range summary with fromDate, toDate and uppercased groupBy', async () => {
    const promise = service.getSummary({ fromDate: '2026-10-01', toDate: '2026-10-20', groupBy: 'month' });
    await settle();
    const req = httpMock.expectOne(
      (r) =>
        r.url === '/api/v1/reports/summary' &&
        r.params.get('fromDate') === '2026-10-01' &&
        r.params.get('toDate') === '2026-10-20' &&
        r.params.get('groupBy') === 'MONTH',
    );
    expect(req.request.method).toBe('GET');
    req.flush(SUMMARY);
    await expect(promise).resolves.toEqual(SUMMARY);
  });

  it('forwards every supported grouping value', async () => {
    for (const groupBy of ['DAY', 'MONTH', 'QUARTER', 'HALF_YEAR', 'YEAR'] as const) {
      const promise = service.getSummary({ fromDate: '2026-04-01', toDate: '2026-04-30', groupBy });
      await settle();
      const req = httpMock.expectOne(
        (r) => r.url === '/api/v1/reports/summary' && r.params.get('groupBy') === groupBy,
      );
      req.flush({ ...SUMMARY, groupBy });
      await promise;
    }
  });

  it('maps a 400 range error to a typed AuthApiError', async () => {
    const promise = service.getSummary({ fromDate: '2026-10-20', toDate: '2026-10-01', groupBy: 'MONTH' });
    await settle();
    httpMock.expectOne((r) => r.url === '/api/v1/reports/summary').flush(
      {
        timestamp: '2026-10-20T07:00:00Z',
        status: 400,
        code: 'REPORT_RANGE_INVALID',
        message: 'toDate must not be before fromDate.',
        fieldErrors: [],
        traceId: 't',
      },
      { status: 400, statusText: 'Bad Request' },
    );
    await expect(promise).rejects.toMatchObject({ status: 400, code: 'REPORT_RANGE_INVALID' });
  });
});
