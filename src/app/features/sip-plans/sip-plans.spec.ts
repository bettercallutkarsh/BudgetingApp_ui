import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SipPlansPageComponent } from './sip-plans';
import { authInterceptor } from '../../core/auth/auth.interceptor';
import {
  SipCommitmentSummary,
  SipInstallment,
  SipPlan,
} from '../../core/sip/sip.models';
import { MoneyEntry } from '../../core/budget/budget.models';
import { currentMonthKey } from '../../shared/formatters';

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const PLAN: SipPlan = {
  sipPlanId: 7,
  investmentType: 'SIP',
  planName: 'Index fund SIP',
  monthlyAmount: '5000.00',
  installmentDay: 5,
  originalStartDate: '2024-01-05',
  trackingStartDate: '2024-01-05',
  plannedEndDate: null,
  actualEndedDate: null,
  status: 'ACTIVE',
  createdAtUtc: '2024-01-05T10:00:00Z',
  updatedAtUtc: '2024-01-05T10:00:00Z',
};

const INSTALLMENT: SipInstallment = {
  sipPlanId: 7,
  planName: 'Index fund SIP',
  period: currentMonthKey(),
  dueDate: `${currentMonthKey()}-05`,
  amount: '5000.00',
  status: 'DUE',
  paidMoneyEntryId: null,
  paidAtUtc: null,
  paidDate: null,
};

const PAID_INSTALLMENT: SipInstallment = {
  ...INSTALLMENT,
  period: previousMonth(currentMonthKey()),
  dueDate: `${previousMonth(currentMonthKey())}-05`,
  status: 'PAID',
  paidMoneyEntryId: 91,
  paidAtUtc: '2026-09-05T10:00:00Z',
  paidDate: '2026-09-05',
};

const MONEY_ENTRY: MoneyEntry = {
  moneyEntryId: 91,
  entryAtUtc: '2026-10-05T10:00:00Z',
  entryType: 'INVESTMENT',
  bucket: 'INVESTMENTS',
  categoryCode: 'SIP',
  amount: '5000.00',
  paymentMethod: null,
  note: 'Auto-debit',
  status: 'POSTED',
  clientRequestId: null,
  sipPlanId: 7,
  sipInstallmentPeriod: currentMonthKey(),
  voidedAtUtc: null,
  voidReason: null,
  createdAtUtc: '2026-10-05T10:00:00Z',
  updatedAtUtc: '2026-10-05T10:00:00Z',
};

function summary(
  overrides: Partial<SipCommitmentSummary> = {},
): SipCommitmentSummary {
  return {
    month: currentMonthKey(),
    investmentsAmount: '17500.00',
    activeMonthlyCommitment: '5000.00',
    withinAllocation: true,
    overAllocationAmount: '0.00',
    activePlanCount: 1,
    message: 'Your SIPs fit within this month’s Investments allocation.',
    ...overrides,
  };
}

function previousMonth(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 2, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function errorBody(status: number, code: string, message: string, fieldErrors: unknown[] = []) {
  return { timestamp: '2026-10-20T07:00:00Z', status, code, message, fieldErrors, traceId: 't' };
}

describe('SipPlansPageComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SipPlansPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  async function flushInitial(options: {
    plans?: SipPlan[];
    summary?: SipCommitmentSummary;
    plan?: SipPlan;
    installments?: SipInstallment[];
  } = {}): Promise<void> {
    const plans = options.plans ?? [PLAN];
    const activeCommitment = plans
      .filter((plan) => plan.status === 'ACTIVE')
      .reduce((total, plan) => total + Number(plan.monthlyAmount), 0)
      .toFixed(2);
    httpMock
      .expectOne((r) => r.url === '/api/v1/sip-plans' && r.method === 'GET')
      .flush({ content: plans, activeMonthlyCommitment: activeCommitment });
    httpMock
      .expectOne((r) => r.url === '/api/v1/sip-plans/summary')
      .flush(options.summary ?? summary());
    await settle();

    if (plans.length > 0) {
      httpMock
        .expectOne((r) => r.url === `/api/v1/sip-plans/${plans[0].sipPlanId}`)
        .flush(options.plan ?? plans[0]);
      httpMock
        .expectOne(
          (r) =>
            r.url === `/api/v1/sip-plans/${plans[0].sipPlanId}/installments` &&
            r.method === 'GET',
        )
        .flush({
          fromDate: '2026-08-01',
          toDate: '2027-01-31',
          content: options.installments ?? [PAID_INSTALLMENT, INSTALLMENT],
        });
    }
    await settle();
  }

  async function flushRefresh(
    plan: SipPlan,
    installments: SipInstallment[] = [PAID_INSTALLMENT, INSTALLMENT],
  ): Promise<void> {
    httpMock
      .expectOne((r) => r.url === '/api/v1/sip-plans' && r.method === 'GET')
      .flush({ content: [plan], activeMonthlyCommitment: plan.monthlyAmount });
    httpMock
      .expectOne((r) => r.url === '/api/v1/sip-plans/summary')
      .flush(
        summary({
          activeMonthlyCommitment: plan.monthlyAmount,
          activePlanCount: plan.status === 'ACTIVE' ? 1 : 0,
        }),
      );
    await settle();
    httpMock
      .expectOne((r) => r.url === `/api/v1/sip-plans/${plan.sipPlanId}`)
      .flush(plan);
    httpMock
      .expectOne(
        (r) =>
          r.url === `/api/v1/sip-plans/${plan.sipPlanId}/installments` &&
          r.method === 'GET',
      )
      .flush({
        fromDate: '2026-08-01',
        toDate: '2027-01-31',
        content: installments,
      });
    await settle();
  }

  it('loads plans, summary, selected plan details and installments', async () => {
    const fixture = TestBed.createComponent(SipPlansPageComponent);
    fixture.detectChanges();
    await settle();
    await flushInitial();
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Index fund SIP');
    expect(text).toContain('Active monthly commitment');
    expect(text).toContain('5,000.00');
    expect(text).toContain('Mark as paid');
    expect(text).toContain('Recorded');
    expect(text).toContain('Two months back through three months ahead.');
  });

  it('shows an empty state when there are no plans', async () => {
    const fixture = TestBed.createComponent(SipPlansPageComponent);
    fixture.detectChanges();
    await settle();
    await flushInitial({ plans: [] });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No SIP plans yet');
    expect(fixture.nativeElement.querySelector('button')).toBeTruthy();
  });

  it('warns when the active SIP commitment exceeds the Investments allocation', async () => {
    const fixture = TestBed.createComponent(SipPlansPageComponent);
    fixture.detectChanges();
    await settle();
    await flushInitial({
      summary: summary({
        activeMonthlyCommitment: '19000.00',
        withinAllocation: false,
        overAllocationAmount: '1500.00',
        message: 'SIPs exceed the Investments allocation for this month.',
      }),
    });
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('SIPs exceed the Investments allocation for this month.');
    expect(text).toContain('Over by');
    expect(text).toContain('1,500.00');
  });

  it('creates a plan with the canonical amount and backend dates', async () => {
    const fixture = TestBed.createComponent(SipPlansPageComponent);
    fixture.detectChanges();
    await settle();
    await flushInitial();
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    component.openCreateForm();
    fixture.detectChanges();
    component.form.patchValue({
      planName: 'Nifty 50 SIP',
      monthlyAmount: '₹12,500',
      installmentDay: 10,
      originalStartDate: '2026-04-10',
      trackingStartDate: '2026-05-10',
      plannedEndDate: '',
    });
    component.submitForm();
    await settle();

    const request = httpMock.expectOne(
      (r) => r.url === '/api/v1/sip-plans' && r.method === 'POST',
    );
    expect(request.request.body).toEqual({
      planName: 'Nifty 50 SIP',
      monthlyAmount: '12500.00',
      installmentDay: 10,
      originalStartDate: '2026-04-10',
      trackingStartDate: '2026-05-10',
      plannedEndDate: null,
    });

    const created: SipPlan = {
      ...PLAN,
      sipPlanId: 8,
      planName: 'Nifty 50 SIP',
      monthlyAmount: '12500.00',
      installmentDay: 10,
      originalStartDate: '2026-04-10',
      trackingStartDate: '2026-05-10',
    };
    request.flush(created);
    await settle();
    await flushRefresh(created);
    fixture.detectChanges();

    expect(component.formMode()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Nifty 50 SIP was created.');
  });

  it('maps a backend field error when creating a plan', async () => {
    const fixture = TestBed.createComponent(SipPlansPageComponent);
    fixture.detectChanges();
    await settle();
    await flushInitial();
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    component.openCreateForm();
    component.form.patchValue({
      planName: 'Bad SIP',
      monthlyAmount: '5000',
      installmentDay: 5,
      originalStartDate: '2026-04-05',
      trackingStartDate: '2026-04-05',
      plannedEndDate: '',
    });
    component.submitForm();
    await settle();

    httpMock
      .expectOne((r) => r.url === '/api/v1/sip-plans' && r.method === 'POST')
      .flush(
        errorBody(400, 'REQUEST_INVALID', 'Request validation failed.', [
          {
            field: 'monthlyAmount',
            code: 'DecimalMin',
            message: 'monthlyAmount must be greater than 0.00',
          },
        ]),
        { status: 400, statusText: 'Bad Request' },
      );
    await settle();
    fixture.detectChanges();

    expect(component.fieldErrors()['monthlyAmount']).toContain('greater than 0.00');
    expect(fixture.nativeElement.textContent).toContain('Check the highlighted fields');
  });

  it('marks an installment as paid and reports the recorded entry', async () => {
    const fixture = TestBed.createComponent(SipPlansPageComponent);
    fixture.detectChanges();
    await settle();
    await flushInitial();
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    component.requestPay(INSTALLMENT);
    component.setPayNote('Auto-debit');
    component.confirmPay();
    await settle();

    const request = httpMock.expectOne(
      (r) =>
        r.url === `/api/v1/sip-plans/7/installments/${currentMonthKey()}/pay` &&
        r.method === 'POST',
    );
    const body = request.request.body as any;
    expect(body.note).toBe('Auto-debit');
    expect(body.paymentDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    request.flush({
      installment: { ...INSTALLMENT, status: 'PAID', paidDate: body.paymentDate },
      moneyEntry: MONEY_ENTRY,
      idempotentReplay: false,
    });
    await settle();
    await flushRefresh(PLAN, [
      PAID_INSTALLMENT,
      { ...INSTALLMENT, status: 'PAID', paidDate: body.paymentDate },
    ]);
    fixture.detectChanges();

    expect(component.payTarget()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain(
      'Investments/SIP entry was recorded',
    );
  });

  it('stops an active plan with the selected stop date', async () => {
    const fixture = TestBed.createComponent(SipPlansPageComponent);
    fixture.detectChanges();
    await settle();
    await flushInitial();
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    component.requestStop(PLAN);
    const stopDate = component.stopDate() as string;
    component.confirmStop();
    await settle();

    const request = httpMock.expectOne(
      (r) => r.url === '/api/v1/sip-plans/7/stop' && r.method === 'POST',
    );
    expect(request.request.body).toEqual({ stopDate });

    const stopped: SipPlan = {
      ...PLAN,
      status: 'STOPPED',
      actualEndedDate: stopDate,
    };
    request.flush(stopped);
    await settle();
    await flushRefresh(stopped);
    fixture.detectChanges();

    expect(component.stopTarget()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain(
      'Index fund SIP was stopped on',
    );
  });
});
