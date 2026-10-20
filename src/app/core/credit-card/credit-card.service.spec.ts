import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CreditCardService } from './credit-card.service';
import { authInterceptor } from '../auth/auth.interceptor';
import { CreditCardOpeningRequest, CreditCardSummary } from '../budget/budget.models';

const SUMMARY: CreditCardSummary = {
  trackingConfigured: true,
  openingOutstandingAmount: '5000.00',
  currentOutstandingAmount: '7250.00',
  totalPostedPurchases: '3500.00',
  totalPostedPayments: '1250.00',
  trackingStartedAtUtc: '2026-10-01T00:00:00Z',
  explanation: 'Estimated credit-card outstanding (manual tracking).',
};

const OPENING_PAYLOAD: CreditCardOpeningRequest = {
  openingOutstandingAmount: '5000.00',
  trackingStartedAtUtc: '2026-10-01T00:00:00Z',
};

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}`;
}

function clearCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('CreditCardService', () => {
  let httpMock: HttpTestingController;
  let service: CreditCardService;

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
    service = TestBed.inject(CreditCardService);
  });

  afterEach(() => {
    clearCookie('XSRF-TOKEN');
    httpMock.verify();
  });

  it('gets the credit-card summary', async () => {
    const promise = service.getSummary();
    await settle();
    const req = httpMock.expectOne('/api/v1/credit-card/summary');
    expect(req.request.method).toBe('GET');
    req.flush(SUMMARY);
    await expect(promise).resolves.toEqual(SUMMARY);
  });

  it('saves the opening outstanding baseline with a CSRF header and exact payload', async () => {
    setCookie('XSRF-TOKEN', 'csrf-abc123');
    const promise = service.setOpeningOutstanding(OPENING_PAYLOAD);
    await settle();
    const req = httpMock.expectOne('/api/v1/credit-card/opening-outstanding');
    expect(req.request.method).toBe('PUT');
    expect(req.request.headers.get('X-XSRF-TOKEN')).toBe('csrf-abc123');
    expect(req.request.body).toEqual({
      openingOutstandingAmount: '5000.00',
      trackingStartedAtUtc: '2026-10-01T00:00:00Z',
    });
    req.flush(SUMMARY);
    await expect(promise).resolves.toEqual(SUMMARY);
  });

  it('omits trackingStartedAtUtc as null when not provided', async () => {
    setCookie('XSRF-TOKEN', 'csrf-abc123');
    const promise = service.setOpeningOutstanding({ openingOutstandingAmount: '100.00', trackingStartedAtUtc: null });
    await settle();
    const req = httpMock.expectOne('/api/v1/credit-card/opening-outstanding');
    expect((req.request.body as any).trackingStartedAtUtc).toBeNull();
    req.flush(SUMMARY);
    await promise;
  });

  it('maps a 409 conflict to a typed AuthApiError with the server code', async () => {
    setCookie('XSRF-TOKEN', 'csrf-abc123');
    const promise = service.setOpeningOutstanding(OPENING_PAYLOAD);
    await settle();
    httpMock.expectOne('/api/v1/credit-card/opening-outstanding').flush(
      {
        timestamp: '2026-10-20T07:00:00Z',
        status: 409,
        code: 'OPENING_BASELINE_LOCKED',
        message: 'Posted credit-card activity already exists.',
        fieldErrors: [],
        traceId: 't',
      },
      { status: 409, statusText: 'Conflict' },
    );
    await expect(promise).rejects.toMatchObject({ status: 409, code: 'OPENING_BASELINE_LOCKED' });
  });
});
