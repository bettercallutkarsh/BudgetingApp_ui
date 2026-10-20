import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SummaryService } from './summary.service';
import { authInterceptor } from '../auth/auth.interceptor';
import { MonthlySummary } from './budget.models';

const SUMMARY: MonthlySummary = {
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
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('SummaryService', () => {
  let httpMock: HttpTestingController;
  let service: SummaryService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(SummaryService);
  });

  afterEach(() => httpMock.verify());

  it('GETs the monthly summary for a month', async () => {
    const promise = service.getMonthlySummary('2026-10');
    await settle();
    const req = httpMock.expectOne(
      (r) => r.url === '/api/v1/reports/monthly-summary' && r.params.get('month') === '2026-10',
    );
    expect(req.request.method).toBe('GET');
    req.flush(SUMMARY);
    await expect(promise).resolves.toEqual(SUMMARY);
  });

  it('omits the month param when none is provided', async () => {
    const promise = service.getMonthlySummary();
    await settle();
    const req = httpMock.expectOne(
      (r) => r.url === '/api/v1/reports/monthly-summary' && !r.params.has('month'),
    );
    req.flush(SUMMARY);
    await expect(promise).resolves.toEqual(SUMMARY);
  });
});
