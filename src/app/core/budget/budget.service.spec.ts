import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BudgetService } from './budget.service';
import { authInterceptor } from '../auth/auth.interceptor';
import { AuthApiError } from '../auth/auth.models';
import { MonthlyBudget, MonthlyBudgetSaveRequest } from './budget.models';

const BUDGET: MonthlyBudget = {
  month: '2026-10',
  incomeType: 'SALARY',
  incomeSourceLabel: 'Primary salary',
  incomeAmount: '50000.00',
  allocationMode: 'BALANCED',
  allocationInputMode: 'PERCENTAGE',
  investmentsEnabled: true,
  essentialsPercentage: '55.00',
  safetyPercentage: '10.00',
  investmentsPercentage: '35.00',
  essentialsAmount: '27500.00',
  safetyAmount: '5000.00',
  investmentsAmount: '17500.00',
  createdAtUtc: '2026-10-01T00:00:00Z',
  updatedAtUtc: '2026-10-01T00:00:00Z',
};

const SAVE_PAYLOAD: MonthlyBudgetSaveRequest = {
  incomeType: 'SALARY',
  incomeSourceLabel: 'Primary salary',
  incomeAmount: '50000.00',
  allocationMode: 'BALANCED',
  allocationInputMode: 'PERCENTAGE',
  investmentsEnabled: true,
  essentialsPercentage: '55.00',
  safetyPercentage: '10.00',
  investmentsPercentage: '35.00',
};

function errorBody(status: number, code: string, message: string, fieldErrors: unknown[] = []) {
  return { timestamp: '2026-10-20T07:00:00Z', status, code, message, fieldErrors, traceId: 't' };
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}`;
}

function clearCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('BudgetService', () => {
  let httpMock: HttpTestingController;
  let service: BudgetService;

  beforeEach(() => {
    clearCookie('XSRF-TOKEN');
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(BudgetService);
  });

  afterEach(() => {
    clearCookie('XSRF-TOKEN');
    httpMock.verify();
  });

  it('GETs the budget for a month and returns it', async () => {
    const promise = service.getBudget('2026-10');
    await settle();
    const req = httpMock.expectOne('/api/v1/budgets/2026-10');
    expect(req.request.method).toBe('GET');
    req.flush(BUDGET);
    await expect(promise).resolves.toEqual(BUDGET);
  });

  it('returns null when the budget is not set (404 BUDGET_NOT_SET)', async () => {
    const promise = service.getBudget('2026-10');
    await settle();
    httpMock
      .expectOne('/api/v1/budgets/2026-10')
      .flush(errorBody(404, 'BUDGET_NOT_SET', 'No budget is set for 2026-10.'), {
        status: 404,
        statusText: 'Not Found',
      });
    await expect(promise).resolves.toBeNull();
  });

  it('throws a typed error for non-404 failures', async () => {
    const promise = service.getBudget('2026-10');
    await settle();
    httpMock
      .expectOne('/api/v1/budgets/2026-10')
      .flush(errorBody(500, 'INTERNAL_ERROR', 'Boom'), {
        status: 500,
        statusText: 'Server Error',
      });
    await expect(promise).rejects.toBeInstanceOf(AuthApiError);
  });

  it('PUTs a save payload and attaches the CSRF header', async () => {
    setCookie('XSRF-TOKEN', 'csrf-abc123');
    const promise = service.saveBudget('2026-10', SAVE_PAYLOAD);
    await settle();
    const req = httpMock.expectOne('/api/v1/budgets/2026-10');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(SAVE_PAYLOAD);
    expect(req.request.headers.has('X-XSRF-TOKEN')).toBe(true);
    expect(req.request.headers.get('X-XSRF-TOKEN')).toBe('csrf-abc123');
    req.flush(BUDGET);
    await expect(promise).resolves.toEqual(BUDGET);
  });

  it('surfaces conflict codes such as INVESTMENT_TOGGLE_BLOCKED', async () => {
    const promise = service.saveBudget('2026-10', SAVE_PAYLOAD);
    await settle();
    httpMock
      .expectOne('/api/v1/budgets/2026-10')
      .flush(errorBody(409, 'INVESTMENT_TOGGLE_BLOCKED', 'Investments cannot be switched off.'), {
        status: 409,
        statusText: 'Conflict',
      });
    await expect(promise).rejects.toMatchObject({ code: 'INVESTMENT_TOGGLE_BLOCKED', status: 409 });
  });
});
