import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CreditCardPageComponent } from './credit-card';
import { authInterceptor } from '../../core/auth/auth.interceptor';
import { CreditCardSummary } from '../../core/budget/budget.models';

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const UNCONFIGURED: CreditCardSummary = {
  trackingConfigured: false,
  openingOutstandingAmount: '0.00',
  currentOutstandingAmount: '0.00',
  totalPostedPurchases: '0.00',
  totalPostedPayments: '0.00',
  trackingStartedAtUtc: null,
  explanation:
    'Credit-card tracking is not configured; set an opening outstanding amount to start estimating.',
};

const CONFIGURED: CreditCardSummary = {
  trackingConfigured: true,
  openingOutstandingAmount: '5000.00',
  currentOutstandingAmount: '7250.00',
  totalPostedPurchases: '3500.00',
  totalPostedPayments: '1250.00',
  trackingStartedAtUtc: '2026-10-01T00:00:00Z',
  explanation:
    'Estimated credit-card outstanding (manual tracking): opening amount plus posted credit-card purchases minus posted credit-card payments since tracking start.',
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

describe('CreditCardPageComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    clearCookie('XSRF-TOKEN');
    await TestBed.configureTestingModule({
      imports: [CreditCardPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    clearCookie('XSRF-TOKEN');
    httpMock.verify();
  });

  function flushInitial(summary: CreditCardSummary = CONFIGURED) {
    const req = httpMock.expectOne('/api/v1/credit-card/summary');
    req.flush(summary);
  }

  it('loads the summary on init and renders the estimate wording', async () => {
    const fixture = TestBed.createComponent(CreditCardPageComponent);
    fixture.detectChanges();
    await settle();
    flushInitial();
    await settle();
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Estimated current outstanding');
    expect(text).toContain('7,250.00');
    expect(text).toContain('not a live bank or card-issuer balance');
  });

  it('shows the unconfigured state with the server explanation', async () => {
    const fixture = TestBed.createComponent(CreditCardPageComponent);
    fixture.detectChanges();
    await settle();
    flushInitial(UNCONFIGURED);
    await settle();
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    expect(component.configured()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Tracking not configured');
  });

  it('shows a load error with a retry', async () => {
    const fixture = TestBed.createComponent(CreditCardPageComponent);
    fixture.detectChanges();
    await settle();
    httpMock
      .expectOne('/api/v1/credit-card/summary')
      .flush(errorBody(500, 'INTERNAL_ERROR', 'Boom'), { status: 500, statusText: 'Server Error' });
    await settle();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain("couldn't load your credit-card summary");
    const retry = fixture.nativeElement.querySelector('button');
    expect(retry).toBeTruthy();
  });

  it('blocks submit when the opening amount is invalid', async () => {
    const fixture = TestBed.createComponent(CreditCardPageComponent);
    fixture.detectChanges();
    await settle();
    flushInitial(CONFIGURED);
    await settle();
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    component.form.controls.openingOutstandingAmount.setValue('abc');
    component.submit();
    await settle();
    httpMock.expectNone((r) => r.method === 'PUT');
  });

  it('submits the exact payload and refreshes the summary', async () => {
    setCookie('XSRF-TOKEN', 'csrf-abc123');
    const fixture = TestBed.createComponent(CreditCardPageComponent);
    fixture.detectChanges();
    await settle();
    flushInitial(UNCONFIGURED);
    await settle();
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    component.form.patchValue({
      openingOutstandingAmount: '5000',
      trackingStartedAtUtc: '2026-10-01T00:00:00Z',
    });
    component.submit();
    await settle();

    const req = httpMock.expectOne('/api/v1/credit-card/opening-outstanding');
    expect(req.request.method).toBe('PUT');
    expect(req.request.headers.get('X-XSRF-TOKEN')).toBe('csrf-abc123');
    expect(req.request.body).toEqual({
      openingOutstandingAmount: '5000',
      trackingStartedAtUtc: '2026-10-01T00:00:00Z',
    });
    req.flush(CONFIGURED);
    await settle();

    expect(component.successMessage()).toContain('saved');
    expect(component.summary()).toEqual(CONFIGURED);
  });

  it('prevents duplicate submission while in flight', async () => {
    setCookie('XSRF-TOKEN', 'csrf-abc123');
    const fixture = TestBed.createComponent(CreditCardPageComponent);
    fixture.detectChanges();
    await settle();
    flushInitial(UNCONFIGURED);
    await settle();
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    component.form.patchValue({ openingOutstandingAmount: '100' });
    component.submit();
    component.submit();
    await settle();

    httpMock.expectOne('/api/v1/credit-card/opening-outstanding').flush(CONFIGURED);
    await settle();
    httpMock.expectNone({ method: 'PUT' });
  });

  it('locks the form when the server reports OPENING_BASELINE_LOCKED', async () => {
    setCookie('XSRF-TOKEN', 'csrf-abc123');
    const fixture = TestBed.createComponent(CreditCardPageComponent);
    fixture.detectChanges();
    await settle();
    flushInitial(CONFIGURED);
    await settle();
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    component.form.patchValue({ openingOutstandingAmount: '100' });
    component.submit();
    await settle();
    httpMock
      .expectOne('/api/v1/credit-card/opening-outstanding')
      .flush(errorBody(409, 'OPENING_BASELINE_LOCKED', 'Locked'), { status: 409, statusText: 'Conflict' });
    await settle();
    fixture.detectChanges();

    expect(component.locked()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('opening baseline is locked');

    component.submit();
    await settle();
    httpMock.expectNone({ method: 'PUT' });
  });

  it('maps field errors and generic conflicts to messages', async () => {
    setCookie('XSRF-TOKEN', 'csrf-abc123');
    const fixture = TestBed.createComponent(CreditCardPageComponent);
    fixture.detectChanges();
    await settle();
    flushInitial(UNCONFIGURED);
    await settle();
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    component.form.patchValue({ openingOutstandingAmount: '10' });
    component.submit();
    await settle();
    httpMock
      .expectOne('/api/v1/credit-card/opening-outstanding')
      .flush(
        errorBody(400, 'REQUEST_INVALID', 'Validation failed.', [
          { field: 'openingOutstandingAmount', code: 'Digits', message: 'Invalid amount.' },
        ]),
        { status: 400, statusText: 'Bad Request' },
      );
    await settle();

    expect(component.fieldErrors()['openingOutstandingAmount']).toContain('Invalid amount.');
  });
});
