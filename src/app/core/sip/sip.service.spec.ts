import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SipService } from './sip.service';
import { authInterceptor } from '../auth/auth.interceptor';
import { AuthApiError } from '../auth/auth.models';
import {
  SipCommitmentSummary,
  SipInstallmentListResponse,
  SipInstallmentPaymentResponse,
  SipPlan,
  SipPlanCreateRequest,
  SipPlanListResponse,
  SipPlanUpdateRequest,
} from './sip.models';

const PLAN: SipPlan = {
  sipPlanId: 7,
  investmentType: 'SIP',
  planName: 'Index fund SIP',
  monthlyAmount: '5000.00',
  installmentDay: 5,
  originalStartDate: '2026-01-05',
  trackingStartDate: '2026-01-05',
  plannedEndDate: null,
  actualEndedDate: null,
  status: 'ACTIVE',
  createdAtUtc: '2026-01-01T00:00:00Z',
  updatedAtUtc: '2026-01-01T00:00:00Z',
};

const CREATE_PAYLOAD: SipPlanCreateRequest = {
  planName: 'Index fund SIP',
  monthlyAmount: '5000.00',
  installmentDay: 5,
  originalStartDate: '2026-01-05',
  trackingStartDate: '2026-01-05',
  plannedEndDate: null,
};

const INSTALLMENTS: SipInstallmentListResponse = {
  fromDate: '2026-10-01',
  toDate: '2026-10-31',
  content: [
    {
      sipPlanId: 7,
      planName: 'Index fund SIP',
      period: '2026-10',
      dueDate: '2026-10-05',
      amount: '5000.00',
      status: 'UPCOMING',
      paidMoneyEntryId: null,
      paidAtUtc: null,
      paidDate: null,
    },
  ],
};

const SUMMARY: SipCommitmentSummary = {
  month: '2026-10',
  investmentsAmount: '17500.00',
  activeMonthlyCommitment: '5000.00',
  withinAllocation: true,
  overAllocationAmount: '0.00',
  activePlanCount: 1,
  message: "Active SIP commitments are within this month's Investments allocation.",
};

function errorBody(status: number, code: string, message: string) {
  return { timestamp: '2026-10-20T07:00:00Z', status, code, message, fieldErrors: [], traceId: 't' };
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}`;
}

function clearCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('SipService', () => {
  let httpMock: HttpTestingController;
  let service: SipService;

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
    service = TestBed.inject(SipService);
  });

  afterEach(() => {
    clearCookie('XSRF-TOKEN');
    httpMock.verify();
  });

  it('POSTs a new plan with the CSRF header', async () => {
    setCookie('XSRF-TOKEN', 'csrf-abc123');
    const promise = service.createPlan(CREATE_PAYLOAD);
    await settle();
    const req = httpMock.expectOne('/api/v1/sip-plans');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(CREATE_PAYLOAD);
    expect(req.request.headers.get('X-XSRF-TOKEN')).toBe('csrf-abc123');
    req.flush(PLAN);
    await expect(promise).resolves.toEqual(PLAN);
  });

  it('GETs the plan list', async () => {
    const list: SipPlanListResponse = { content: [PLAN], activeMonthlyCommitment: '5000.00' };
    const promise = service.listPlans();
    await settle();
    const req = httpMock.expectOne('/api/v1/sip-plans');
    expect(req.request.method).toBe('GET');
    req.flush(list);
    await expect(promise).resolves.toEqual(list);
  });

  it('GETs a single plan', async () => {
    const promise = service.getPlan(7);
    await settle();
    httpMock.expectOne('/api/v1/sip-plans/7').flush(PLAN);
    await expect(promise).resolves.toEqual(PLAN);
  });

  it('PUTs a plan update', async () => {
    setCookie('XSRF-TOKEN', 'csrf-abc123');
    const payload: SipPlanUpdateRequest = { ...CREATE_PAYLOAD, monthlyAmount: '6000.00' };
    const promise = service.updatePlan(7, payload);
    await settle();
    const req = httpMock.expectOne('/api/v1/sip-plans/7');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    expect(req.request.headers.get('X-XSRF-TOKEN')).toBe('csrf-abc123');
    req.flush({ ...PLAN, monthlyAmount: '6000.00' });
    await expect(promise).resolves.toMatchObject({ monthlyAmount: '6000.00' });
  });

  it('POSTs a stop request with the stopDate', async () => {
    const promise = service.stopPlan(7, { stopDate: '2026-10-20' });
    await settle();
    const req = httpMock.expectOne('/api/v1/sip-plans/7/stop');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ stopDate: '2026-10-20' });
    req.flush({ ...PLAN, status: 'STOPPED', actualEndedDate: '2026-10-20' });
    await expect(promise).resolves.toMatchObject({ status: 'STOPPED' });
  });

  it('GETs installments with an optional date range', async () => {
    const promise = service.listInstallments(7, '2026-10-01', '2026-10-31');
    await settle();
    const req = httpMock.expectOne(
      (r) =>
        r.url === '/api/v1/sip-plans/7/installments' &&
        r.params.get('fromDate') === '2026-10-01' &&
        r.params.get('toDate') === '2026-10-31',
    );
    expect(req.request.method).toBe('GET');
    req.flush(INSTALLMENTS);
    await expect(promise).resolves.toEqual(INSTALLMENTS);
  });

  it('POSTs an installment payment with a payment date and note', async () => {
    setCookie('XSRF-TOKEN', 'csrf-abc123');
    const response: SipInstallmentPaymentResponse = {
      installment: {
        ...INSTALLMENTS.content[0],
        status: 'PAID',
        paidMoneyEntryId: 41,
        paidDate: '2026-10-05',
        paidAtUtc: '2026-10-05T10:00:00Z',
      },
      moneyEntry: {
        moneyEntryId: 41,
        entryAtUtc: '2026-10-05T10:00:00Z',
        entryType: 'INVESTMENT',
        bucket: 'INVESTMENTS',
        categoryCode: 'SIP',
        amount: '5000.00',
        paymentMethod: null,
        note: null,
        status: 'POSTED',
        clientRequestId: null,
        sipPlanId: 7,
        sipInstallmentPeriod: '2026-10-01',
        voidedAtUtc: null,
        voidReason: null,
        createdAtUtc: '2026-10-05T10:00:00Z',
        updatedAtUtc: '2026-10-05T10:00:00Z',
      },
      idempotentReplay: false,
    };
    const promise = service.markInstallmentPaid(7, '2026-10', {
      paymentDate: '2026-10-05',
      note: 'Paid on time',
    });
    await settle();
    const req = httpMock.expectOne('/api/v1/sip-plans/7/installments/2026-10/pay');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ paymentDate: '2026-10-05', note: 'Paid on time' });
    expect(req.request.headers.get('X-XSRF-TOKEN')).toBe('csrf-abc123');
    req.flush(response);
    await expect(promise).resolves.toEqual(response);
  });

  it('GETs the commitment summary for a month', async () => {
    const promise = service.getCommitmentSummary('2026-10');
    await settle();
    const req = httpMock.expectOne(
      (r) => r.url === '/api/v1/sip-plans/summary' && r.params.get('month') === '2026-10',
    );
    req.flush(SUMMARY);
    await expect(promise).resolves.toEqual(SUMMARY);
  });

  it('throws a typed error on failure', async () => {
    const promise = service.listPlans();
    await settle();
    httpMock
      .expectOne('/api/v1/sip-plans')
      .flush(errorBody(500, 'INTERNAL_ERROR', 'Boom'), {
        status: 500,
        statusText: 'Server Error',
      });
    await expect(promise).rejects.toBeInstanceOf(AuthApiError);
  });
});
