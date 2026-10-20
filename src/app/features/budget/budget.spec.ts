import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { Component } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BudgetPageComponent } from './budget';
import { authInterceptor } from '../../core/auth/auth.interceptor';
import { MonthlyBudget } from '../../core/budget/budget.models';

@Component({ selector: 'app-home-stub', template: '' })
class HomeStubComponent {}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const MONTH = '2026-10';

const BUDGET: MonthlyBudget = {
  month: MONTH,
  incomeType: 'SALARY',
  incomeSourceLabel: 'Primary salary',
  incomeAmount: '50000.00',
  allocationMode: 'BALANCED',
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

function errorBody(status: number, code: string, message: string, fieldErrors: unknown[] = []) {
  return { timestamp: '2026-10-20T07:00:00Z', status, code, message, fieldErrors, traceId: 't' };
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}`;
}

function clearCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

describe('BudgetPageComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    clearCookie('XSRF-TOKEN');
    await TestBed.configureTestingModule({
      imports: [BudgetPageComponent],
      providers: [
        provideRouter([{ path: 'home', component: HomeStubComponent }]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({ month: MONTH }) } },
        },
      ],
    })
      .overrideComponent(BudgetPageComponent, {
        set: {
          providers: [
            {
              provide: ActivatedRoute,
              useValue: {
                snapshot: { queryParamMap: convertToParamMap({ month: MONTH }) },
                navigate: () => Promise.resolve(true),
              },
            },
          ],
        },
      })
      .compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    clearCookie('XSRF-TOKEN');
    httpMock.verify();
  });
  async function flushExisting(budget: MonthlyBudget | null): Promise<void> {
    const req = httpMock.expectOne(`/api/v1/budgets/${MONTH}`);
    if (budget) {
      req.flush(budget);
    } else {
      req.flush(errorBody(404, 'BUDGET_NOT_SET', 'No budget is set.'), {
        status: 404,
        statusText: 'Not Found',
      });
    }
    await settle();
  }

  it('loads an existing budget into the form', async () => {
    const fixture = TestBed.createComponent(BudgetPageComponent);
    fixture.detectChanges();
    await settle();
    await flushExisting(BUDGET);
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    expect(component.form.get('incomeAmount').value).toBe('50000.00');
    expect(component.form.get('essentialsPercentage').value).toBe('55.00');
    expect(component.existingBudget()).not.toBeNull();
  });

  it('defaults to the Balanced preset when no budget exists', async () => {
    const fixture = TestBed.createComponent(BudgetPageComponent);
    fixture.detectChanges();
    await settle();
    await flushExisting(null);
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    expect(component.form.get('allocationMode').value).toBe('BALANCED');
    expect(component.form.get('essentialsPercentage').value).toBe('55.00');
  });

  it('marks the active preset with a group label and pressed state', async () => {
    const fixture = TestBed.createComponent(BudgetPageComponent);
    fixture.detectChanges();
    await settle();
    await flushExisting(null);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const group = compiled.querySelector('.preset-cards');
    expect(group?.getAttribute('role')).toBe('group');
    expect(group?.getAttribute('aria-labelledby')).toBe('preset-label');

    const cards = Array.from(compiled.querySelectorAll('.preset-card') as unknown as HTMLElement[]);
    const balanced = cards.find((btn) => btn.textContent?.includes('Balanced'))!;
    expect(balanced.getAttribute('aria-pressed')).toBe('true');
    expect(balanced.textContent).toContain('Selected');

    const conservative = cards.find((btn) => btn.textContent?.includes('Conservative'))!;
    expect(conservative.getAttribute('aria-pressed')).toBe('false');
    expect(conservative.textContent).not.toContain('Selected');
  });

  it('marking a percentage by hand switches the mode to MANUAL', async () => {
    const fixture = TestBed.createComponent(BudgetPageComponent);
    fixture.detectChanges();
    await settle();
    await flushExisting(BUDGET);
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    component.form.get('essentialsPercentage').setValue('60.00');
    await settle();
    expect(component.form.get('allocationMode').value).toBe('MANUAL');
  });

  it('blocks saving when manual percentages do not total 100%', async () => {
    const fixture = TestBed.createComponent(BudgetPageComponent);
    fixture.detectChanges();
    await settle();
    await flushExisting(null);
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    component.form.patchValue({
      incomeAmount: '40000',
      allocationMode: 'MANUAL',
      essentialsPercentage: '50',
      safetyPercentage: '20',
      investmentsPercentage: '20',
    });
    component.submit();
    await settle();

    expect(component.formError()).toContain('100%');
    httpMock.expectNone(`/api/v1/budgets/${MONTH}`);
  });

  it('switching investments off forces investments to 0 percent', async () => {
    const fixture = TestBed.createComponent(BudgetPageComponent);
    fixture.detectChanges();
    await settle();
    await flushExisting(null);
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    component.toggleInvestments();
    await settle();
    expect(component.investmentsEnabled()).toBe(false);
    expect(component.form.get('investmentsPercentage').value).toBe('0.00');
  });

  it('saves the budget and attaches CSRF on the PUT', async () => {
    setCookie('XSRF-TOKEN', 'csrf-abc123');
    const fixture = TestBed.createComponent(BudgetPageComponent);
    fixture.detectChanges();
    await settle();
    await flushExisting(null);
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    component.form.patchValue({
      incomeType: 'SALARY',
      incomeAmount: '50000',
      essentialsPercentage: '55',
      safetyPercentage: '10',
      investmentsPercentage: '35',
    });
    component.submit();
    await settle();

    const req = httpMock.expectOne(`/api/v1/budgets/${MONTH}`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.headers.has('X-XSRF-TOKEN')).toBe(true);
    expect((req.request.body as any).incomeAmount).toBe('50000.00');
    expect((req.request.body as any).essentialsPercentage).toBe('55.00');
    req.flush(BUDGET);
    await settle();
  });

  it('maps INVESTMENT_TOGGLE_BLOCKED to a conflict message', async () => {
    const fixture = TestBed.createComponent(BudgetPageComponent);
    fixture.detectChanges();
    await settle();
    await flushExisting(BUDGET);
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    component.submit();
    await settle();
    httpMock
      .expectOne(`/api/v1/budgets/${MONTH}`)
      .flush(
        errorBody(409, 'INVESTMENT_TOGGLE_BLOCKED', 'Investments cannot be switched off.'),
        { status: 409, statusText: 'Conflict' },
      );
    await settle();

    expect(component.conflictMessage()).toContain('Investments cannot be switched off');
  });

  it('maps server field errors onto the form', async () => {
    const fixture = TestBed.createComponent(BudgetPageComponent);
    fixture.detectChanges();
    await settle();
    await flushExisting(null);
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    component.form.patchValue({ incomeAmount: '1000' });
    component.submit();
    await settle();
    httpMock
      .expectOne(`/api/v1/budgets/${MONTH}`)
      .flush(
        errorBody(400, 'ALLOCATION_INVALID', 'Invalid allocation.', [
          { field: 'essentialsPercentage', code: 'SUM', message: 'Must total 100%.' },
        ]),
        { status: 400, statusText: 'Bad Request' },
      );
    await settle();

    expect(component.fieldErrors()['essentialsPercentage']).toBe('Must total 100%.');
  });
});
