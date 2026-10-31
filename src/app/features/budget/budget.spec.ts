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
    expect(component.form.get('incomeAmount').value).toBe('50,000.00');
    expect(component.form.get('essentialsPercentage').value).toBe('55.00');
    expect(component.existingBudget()).not.toBeNull();
  });

  it('defaults new budgets to MANUAL + AMOUNT with empty bucket amounts', async () => {
    const fixture = TestBed.createComponent(BudgetPageComponent);
    fixture.detectChanges();
    await settle();
    await flushExisting(null);
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    expect(component.form.get('allocationMode').value).toBe('MANUAL');
    expect(component.inputMode()).toBe('AMOUNT');
    expect(component.form.get('essentialsAmount').value).toBe('');
    expect(component.form.get('safetyAmount').value).toBe('');
    expect(component.form.get('investmentsAmount').value).toBe('');
  });

  it('marks the active preset with a group label and pressed state', async () => {
    const fixture = TestBed.createComponent(BudgetPageComponent);
    fixture.detectChanges();
    await settle();
    await flushExisting(BUDGET);
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
    await flushExisting(BUDGET);
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    component.selectManual();
    component.form.patchValue({
      incomeAmount: '40000',
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
    await flushExisting(BUDGET);
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
    await flushExisting(BUDGET);
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
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

  it('shows the Emergency Fund label instead of Safety', async () => {
    const fixture = TestBed.createComponent(BudgetPageComponent);
    fixture.detectChanges();
    await settle();
    await flushExisting(null);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Emergency Fund');
    expect(compiled.textContent).not.toContain('Safety');
  });

  it('switching to amount mode converts percentages using the entered income', async () => {
    const fixture = TestBed.createComponent(BudgetPageComponent);
    fixture.detectChanges();
    await settle();
    await flushExisting(BUDGET);
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    component.selectInputMode('AMOUNT');
    await settle();

    expect(component.inputMode()).toBe('AMOUNT');
    expect(component.form.get('allocationMode').value).toBe('BALANCED');
    expect(component.presetMode()).toBe('BALANCED');
    expect(component.form.get('essentialsAmount').value).toBe('27,500.00');
    expect(component.form.get('safetyAmount').value).toBe('5,000.00');
    expect(component.form.get('investmentsAmount').value).toBe('17,500.00');
    expect(component.amountTotalValid()).toBe('exact');
  });

  it('blocks saving in amount mode when buckets exceed income', async () => {
    const fixture = TestBed.createComponent(BudgetPageComponent);
    fixture.detectChanges();
    await settle();
    await flushExisting(BUDGET);
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    component.selectInputMode('AMOUNT');
    await settle();
    component.form.patchValue({ essentialsAmount: '50,000.00' });
    component.submit();
    await settle();

    expect(component.formError()).toContain('exceeds your monthly income');
    httpMock.expectNone(`/api/v1/budgets/${MONTH}`);
  });

  it('blocks saving in amount mode when income remains unallocated', async () => {
    const fixture = TestBed.createComponent(BudgetPageComponent);
    fixture.detectChanges();
    await settle();
    await flushExisting(BUDGET);
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    component.selectInputMode('AMOUNT');
    await settle();
    component.form.patchValue({ essentialsAmount: '20,000.00' });
    component.submit();
    await settle();

    expect(component.formError()).toContain('still unallocated');
    httpMock.expectNone(`/api/v1/budgets/${MONTH}`);
  });

  it('sends amount-mode payload while preserving the Balanced template identity', async () => {
    setCookie('XSRF-TOKEN', 'csrf-abc123');
    const fixture = TestBed.createComponent(BudgetPageComponent);
    fixture.detectChanges();
    await settle();
    await flushExisting(BUDGET);
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    component.selectInputMode('AMOUNT');
    await settle();
    component.submit();
    await settle();

    const req = httpMock.expectOne(`/api/v1/budgets/${MONTH}`);
    const body = req.request.body as any;
    expect(body.allocationInputMode).toBe('AMOUNT');
    expect(body.allocationMode).toBe('BALANCED');
    expect(body.essentialsAmount).toBe('27500.00');
    expect(body.safetyAmount).toBe('5000.00');
    expect(body.investmentsAmount).toBe('17500.00');
    req.flush(BUDGET);
    await settle();
  });

  it('sends percentage-mode payload with percentages and no amounts', async () => {
    setCookie('XSRF-TOKEN', 'csrf-abc123');
    const fixture = TestBed.createComponent(BudgetPageComponent);
    fixture.detectChanges();
    await settle();
    await flushExisting(BUDGET);
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    component.submit();
    await settle();

    const req = httpMock.expectOne(`/api/v1/budgets/${MONTH}`);
    const body = req.request.body as any;
    expect(body.allocationInputMode).toBe('PERCENTAGE');
    expect(body.essentialsPercentage).toBe('55.00');
    expect(body.safetyPercentage).toBe('10.00');
    expect(body.investmentsPercentage).toBe('35.00');
    expect(body.essentialsAmount).toBeUndefined();
    req.flush(BUDGET);
    await settle();
  });

  it('disables the named presets when investments are switched off', async () => {
    const fixture = TestBed.createComponent(BudgetPageComponent);
    fixture.detectChanges();
    await settle();
    await flushExisting(BUDGET);
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    component.toggleInvestments();
    await settle();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const cards = Array.from(compiled.querySelectorAll('.preset-card') as unknown as HTMLElement[]);
    const balanced = cards.find((btn) => btn.textContent?.includes('Balanced'))!;
    const manual = cards.find((btn) => btn.textContent?.includes('Manual'))!;
    expect((balanced as HTMLButtonElement).disabled).toBe(true);
    expect((manual as HTMLButtonElement).disabled).toBe(false);
    expect(component.presetMode()).toBe('MANUAL');
    expect(component.form.get('investmentsPercentage').value).toBe('0.00');
  });

  it('re-enables presets when investments are switched back on without restoring stale values', async () => {
    const fixture = TestBed.createComponent(BudgetPageComponent);
    fixture.detectChanges();
    await settle();
    await flushExisting(BUDGET);
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    component.toggleInvestments();
    await settle();
    component.toggleInvestments();
    await settle();

    expect(component.investmentsEnabled()).toBe(true);
    expect(component.form.get('investmentsPercentage').value).toBe('0.00');
    expect(component.presetMode()).toBe('MANUAL');
  });

  it('restores the last valid toggle state when the server blocks a toggle', async () => {
    const fixture = TestBed.createComponent(BudgetPageComponent);
    fixture.detectChanges();
    await settle();
    await flushExisting(BUDGET);
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    component.toggleInvestments();
    await settle();
    expect(component.investmentsEnabled()).toBe(false);

    component.form.patchValue({ essentialsPercentage: '90.00', safetyPercentage: '10.00' });
    component.submit();
    await settle();
    httpMock
      .expectOne(`/api/v1/budgets/${MONTH}`)
      .flush(
        errorBody(409, 'INVESTMENT_TOGGLE_BLOCKED', 'Investments cannot be switched off.'),
        { status: 409, statusText: 'Conflict' },
      );
    await settle();

    expect(component.investmentsEnabled()).toBe(true);
    expect(component.form.get('investmentsEnabled').value).toBe(true);
    expect(component.presetMode()).toBe('BALANCED');
    expect(component.form.get('allocationMode').value).toBe('BALANCED');
    expect(component.form.get('investmentsPercentage').value).toBe('35.00');
    expect(component.form.get('investmentsAmount').value).toBe('17,500.00');
  });

  it('applies a preset in amount mode and keeps the template identity', async () => {
    const fixture = TestBed.createComponent(BudgetPageComponent);
    fixture.detectChanges();
    await settle();
    await flushExisting(null);
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    component.form.patchValue({ incomeAmount: '24,500.00' });
    component.selectPreset(component.presets[1]);
    await settle();

    expect(component.inputMode()).toBe('AMOUNT');
    expect(component.presetMode()).toBe('BALANCED');
    expect(component.form.get('allocationMode').value).toBe('BALANCED');
    expect(component.form.get('essentialsAmount').value).toBe('13,475.00');
    expect(component.form.get('safetyAmount').value).toBe('2,450.00');
    expect(component.form.get('investmentsAmount').value).toBe('8,575.00');
    expect(component.amountTotalValid()).toBe('exact');
  });

  it('keeps the preset identity and marks the distribution as Customized after an amount edit', async () => {
    const fixture = TestBed.createComponent(BudgetPageComponent);
    fixture.detectChanges();
    await settle();
    await flushExisting(null);
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    component.form.patchValue({ incomeAmount: '24,500.00' });
    component.selectPreset(component.presets[1]);
    component.form.patchValue({ essentialsAmount: '13,000.00' });
    await settle();

    expect(component.presetMode()).toBe('BALANCED');
    expect(component.form.get('allocationMode').value).toBe('BALANCED');
    expect(component.presetIndicator()).toEqual({
      label: 'Based on Balanced · Customized',
      customized: true,
    });
    expect(component.amountTotalValid()).toBe('under');
  });

  it('converts amount mode back to percentages and preserves the preset when amounts still match', async () => {
    const fixture = TestBed.createComponent(BudgetPageComponent);
    fixture.detectChanges();
    await settle();
    await flushExisting(BUDGET);
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    component.selectInputMode('AMOUNT');
    await settle();
    component.selectInputMode('PERCENTAGE');
    await settle();

    expect(component.inputMode()).toBe('PERCENTAGE');
    expect(component.presetMode()).toBe('BALANCED');
    expect(component.form.get('essentialsPercentage').value).toBe('55.00');
    expect(component.form.get('safetyPercentage').value).toBe('10.00');
    expect(component.form.get('investmentsPercentage').value).toBe('35.00');
  });

  it('falls back to MANUAL when converting customized amounts back to percentages', async () => {
    const fixture = TestBed.createComponent(BudgetPageComponent);
    fixture.detectChanges();
    await settle();
    await flushExisting(BUDGET);
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    component.selectInputMode('AMOUNT');
    await settle();
    component.form.patchValue({ essentialsAmount: '27,000.00' });
    component.selectInputMode('PERCENTAGE');
    await settle();

    expect(component.presetMode()).toBe('MANUAL');
    expect(component.form.get('allocationMode').value).toBe('MANUAL');
    expect(component.percentageTotal()).toBe('100.00');
  });

  it('allocates the remaining income to a chosen bucket and supports undo', async () => {
    const fixture = TestBed.createComponent(BudgetPageComponent);
    fixture.detectChanges();
    await settle();
    await flushExisting(BUDGET);
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    component.selectInputMode('AMOUNT');
    await settle();
    component.form.patchValue({ safetyAmount: '4,000.00' });
    await settle();
    expect(component.unallocatedRemainder()).toBe('1000.00');

    component.allocateUnallocated('SAFETY');
    await settle();
    expect(component.form.get('safetyAmount').value).toBe('5,000.00');
    expect(component.unallocatedRemainder()).toBeNull();

    component.undoUnallocated();
    await settle();
    expect(component.form.get('safetyAmount').value).toBe('4,000.00');
    expect(component.unallocatedRemainder()).toBe('1000.00');
  });

  it('renders the unallocated prompt with Essentials and Emergency Fund choices', async () => {
    const fixture = TestBed.createComponent(BudgetPageComponent);
    fixture.detectChanges();
    await settle();
    await flushExisting(BUDGET);
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    component.selectInputMode('AMOUNT');
    component.form.patchValue({ safetyAmount: '4,000.00' });
    await settle();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('is still unallocated. Where would you like to add it?');
    const options = Array.from(compiled.querySelectorAll('#unallocated-target option') as unknown as HTMLOptionElement[]);
    expect(options.map((option) => option.textContent?.trim())).toEqual([
      'Choose a bucket',
      'Essentials',
      'Emergency Fund',
    ]);
  });

  it('turns investments off to zero in amount mode and forces MANUAL', async () => {
    const fixture = TestBed.createComponent(BudgetPageComponent);
    fixture.detectChanges();
    await settle();
    await flushExisting(null);
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    component.form.patchValue({ incomeAmount: '24,500.00' });
    component.selectPreset(component.presets[1]);
    component.toggleInvestments();
    await settle();

    expect(component.investmentsEnabled()).toBe(false);
    expect(component.presetMode()).toBe('MANUAL');
    expect(component.form.get('investmentsAmount').value).toBe('0.00');
    expect(component.form.get('investmentsPercentage').value).toBe('0.00');
  });

  it('restores amount-mode server values on reload', async () => {
    const amountBudget: MonthlyBudget = {
      ...BUDGET,
      allocationMode: 'MANUAL',
      allocationInputMode: 'AMOUNT',
      essentialsAmount: '27000.00',
      safetyAmount: '5000.00',
      investmentsAmount: '17500.00',
    };
    const fixture = TestBed.createComponent(BudgetPageComponent);
    fixture.detectChanges();
    await settle();
    await flushExisting(amountBudget);
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    expect(component.inputMode()).toBe('AMOUNT');
    expect(component.form.get('essentialsAmount').value).toBe('27,000.00');
    expect(component.form.get('incomeAmount').value).toBe('50,000.00');
  });
});
