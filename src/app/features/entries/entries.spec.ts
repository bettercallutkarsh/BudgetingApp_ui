import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { EntriesPageComponent } from './entries';
import { authInterceptor } from '../../core/auth/auth.interceptor';
import { MoneyEntry } from '../../core/budget/budget.models';

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const CREATE_CATEGORY = {
  code: 'GROCERIES',
  label: 'Groceries',
  allowedEntryTypes: ['EXPENSE'],
  allowedBuckets: ['ESSENTIALS'],
};

const SIP_ENTRY: MoneyEntry = {
  moneyEntryId: 2,
  entryAtUtc: '2026-10-05T04:30:00Z',
  entryType: 'INVESTMENT',
  bucket: 'INVESTMENTS',
  categoryCode: 'SIP',
  amount: '5000.00',
  paymentMethod: null,
  note: 'Auto-debit',
  status: 'POSTED',
  clientRequestId: null,
  sipPlanId: 7,
  sipInstallmentPeriod: '2026-10-01',
  voidedAtUtc: null,
  voidReason: null,
  createdAtUtc: '2026-10-05T04:30:00Z',
  updatedAtUtc: '2026-10-05T04:30:00Z',
};

const GOLD_SIP_ENTRY: MoneyEntry = {
  ...SIP_ENTRY,
  moneyEntryId: 3,
  categoryCode: 'GOLD_SIP',
  sipPlanId: null,
  sipInstallmentPeriod: null,
};

const ENTRY: MoneyEntry = {
  moneyEntryId: 1,
  entryAtUtc: '2026-10-05T04:30:00Z',
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
  createdAtUtc: '2026-10-05T04:30:00Z',
  updatedAtUtc: '2026-10-05T04:30:00Z',
};

function page(content: MoneyEntry[], totalPages = 1) {
  return { content, page: 0, size: 10, totalElements: content.length, totalPages };
}

function errorBody(status: number, code: string, message: string, fieldErrors: unknown[] = []) {
  return { timestamp: '2026-10-20T07:00:00Z', status, code, message, fieldErrors, traceId: 't' };
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}`;
}

function clearCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

describe('EntriesPageComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    clearCookie('XSRF-TOKEN');
    await TestBed.configureTestingModule({
      imports: [EntriesPageComponent],
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

  async function flushInitialLoad(options: { categories?: unknown; page?: unknown } = {}): Promise<void> {
    const catReq = httpMock.expectOne((r) => r.url === '/api/v1/reference-data/categories');
    catReq.flush(options.categories ?? [CREATE_CATEGORY]);
    const listReq = httpMock.expectOne((r) => r.url === '/api/v1/money-entries');
    listReq.flush(options.page ?? page([]));
    await settle();
  }

  it('loads categories and history on init', async () => {
    const fixture = TestBed.createComponent(EntriesPageComponent);
    fixture.detectChanges();
    await settle();
    await flushInitialLoad();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No entries match your filters yet.');
  });

  it('shows a category load error without falling back to hardcoded options', async () => {
    const fixture = TestBed.createComponent(EntriesPageComponent);
    fixture.detectChanges();
    await settle();

    httpMock
      .expectOne((r) => r.url === '/api/v1/reference-data/categories')
      .flush(errorBody(500, 'INTERNAL_ERROR', 'Boom'), { status: 500, statusText: 'Server Error' });
    httpMock.expectOne((r) => r.url === '/api/v1/money-entries').flush(page([]));
    await settle();
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    expect(component.categories()).toEqual([]);
    expect(component.categoriesError()).toBeTruthy();
  });

  it('resets the category and reloads it when the entry type changes', async () => {
    const fixture = TestBed.createComponent(EntriesPageComponent);
    fixture.detectChanges();
    await settle();
    await flushInitialLoad();
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    component.form.get('categoryCode').setValue('GROCERIES');
    component.form.get('entryType').setValue('INVESTMENT');
    await settle();

    const req = httpMock.expectOne(
      (r) => r.url === '/api/v1/reference-data/categories' && r.params.get('entryType') === 'INVESTMENT',
    );
    req.flush([{ code: 'SIP', label: 'SIP', allowedEntryTypes: ['INVESTMENT'], allowedBuckets: ['INVESTMENTS'] }]);
    await settle();

    expect(component.form.get('categoryCode').value).toBe('');
    expect(component.bucket()).toBe('INVESTMENTS');
  });

  it('blocks submit when the form is invalid', async () => {
    const fixture = TestBed.createComponent(EntriesPageComponent);
    fixture.detectChanges();
    await settle();
    await flushInitialLoad();
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    component.form.get('amount').setValue('');
    component.submit();
    await settle();
    httpMock.expectNone((r) => r.method === 'POST');
  });

  it('submits the exact payload with a UUID clientRequestId and CSRF header', async () => {
    setCookie('XSRF-TOKEN', 'csrf-abc123');
    const fixture = TestBed.createComponent(EntriesPageComponent);
    fixture.detectChanges();
    await settle();
    await flushInitialLoad();
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    component.form.patchValue({
      entryType: 'EXPENSE',
      bucket: 'ESSENTIALS',
      categoryCode: 'GROCERIES',
      amount: '1200',
      paymentMethod: 'UPI',
      entryDate: '2026-10-05',
      entryTime: '10:00',
      note: 'Weekly groceries',
    });
    component.submit();
    await settle();

    const req = httpMock.expectOne('/api/v1/money-entries');
    const body = req.request.body as any;
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('X-XSRF-TOKEN')).toBe('csrf-abc123');
    expect(body.entryType).toBe('EXPENSE');
    expect(body.bucket).toBe('ESSENTIALS');
    expect(body.categoryCode).toBe('GROCERIES');
    expect(body.amount).toBe('1200.00');
    expect(body.entryTime).toBe('10:00:00');
    expect(body.clientRequestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    req.flush(ENTRY);
    await settle();
    // History is refreshed after a confirmed create.
    httpMock.expectOne((r) => r.url === '/api/v1/money-entries' && r.method === 'GET').flush(page([ENTRY]));
    await settle();
  });

  it('prevents duplicate submission while a create is in flight', async () => {
    setCookie('XSRF-TOKEN', 'csrf-abc123');
    const fixture = TestBed.createComponent(EntriesPageComponent);
    fixture.detectChanges();
    await settle();
    await flushInitialLoad();
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    component.form.patchValue({
      categoryCode: 'GROCERIES',
      amount: '500',
      entryDate: '2026-10-05',
      entryTime: '10:00',
    });
    component.submit();
    component.submit();
    await settle();

    httpMock.expectOne('/api/v1/money-entries').flush(ENTRY);
    await settle();
    httpMock.expectOne((r) => r.url === '/api/v1/money-entries' && r.method === 'GET').flush(page([ENTRY]));
    await settle();
    httpMock.expectNone({ method: 'POST' });
  });

  it('maps backend field errors to the form', async () => {
    setCookie('XSRF-TOKEN', 'csrf-abc123');
    const fixture = TestBed.createComponent(EntriesPageComponent);
    fixture.detectChanges();
    await settle();
    await flushInitialLoad();
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    component.form.patchValue({
      categoryCode: 'GROCERIES',
      amount: '500',
      entryDate: '2026-10-05',
      entryTime: '10:00',
    });
    component.submit();
    await settle();
    httpMock
      .expectOne('/api/v1/money-entries')
      .flush(
        errorBody(400, 'REQUEST_INVALID', 'Request validation failed.', [
          { field: 'amount', code: 'DecimalMin', message: 'amount must be greater than 0.00' },
        ]),
        { status: 400, statusText: 'Bad Request' },
      );
    await settle();

    expect(component.fieldErrors()['amount']).toContain('greater than 0.00');
  });
  it('shows a specific message when investments are disabled (409 INVESTMENTS_DISABLED)', async () => {
    setCookie('XSRF-TOKEN', 'csrf-abc123');
    const fixture = TestBed.createComponent(EntriesPageComponent);
    fixture.detectChanges();
    await settle();
    await flushInitialLoad();
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    component.form.patchValue({
      entryType: 'INVESTMENT',
      categoryCode: 'SIP',
      amount: '5000',
      entryDate: '2026-10-05',
      entryTime: '10:00',
    });
    await settle();
    // category reload triggered by entry type change
    httpMock
      .expectOne((r) => r.url === '/api/v1/reference-data/categories')
      .flush([{ code: 'SIP', label: 'SIP', allowedEntryTypes: ['INVESTMENT'], allowedBuckets: ['INVESTMENTS'] }]);
    await settle();

    component.submit();
    await settle();
    httpMock
      .expectOne('/api/v1/money-entries')
      .flush(errorBody(409, 'INVESTMENTS_DISABLED', 'Investments are disabled.'), {
        status: 409,
        statusText: 'Conflict',
      });
    await settle();

    expect(component.createError()).toContain('Investments are switched off');
  });

  it('sends filter params and resets to page 0 on apply', async () => {
    const fixture = TestBed.createComponent(EntriesPageComponent);
    fixture.detectChanges();
    await settle();
    await flushInitialLoad({ page: page([], 3) });
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    component.goToPage(1);
    await settle();
    httpMock
      .expectOne((r) => r.url === '/api/v1/money-entries' && r.params.get('page') === '1')
      .flush(page([ENTRY], 3));
    await settle();

    component.setFilterEntryType('EXPENSE');
    component.setFilterStatus('VOID');
    component.applyFilters();
    await settle();
    const req = httpMock.expectOne(
      (r) =>
        r.url === '/api/v1/money-entries' &&
        r.params.get('page') === '0' &&
        r.params.get('entryType') === 'EXPENSE' &&
        r.params.get('status') === 'VOID',
    );
    req.flush(page([]));
    await settle();
  });

  it('renders the populated history with category label and void button', async () => {
    const fixture = TestBed.createComponent(EntriesPageComponent);
    fixture.detectChanges();
    await settle();
    await flushInitialLoad({ page: page([ENTRY]) });
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Groceries');
    expect(text).toContain('1,200.00');
    expect(fixture.nativeElement.querySelector('button[aria-label^="Void entry"]')).toBeTruthy();
  });

  it('renders SIP-managed entries with their installment and a reversible void action', async () => {
    const fixture = TestBed.createComponent(EntriesPageComponent);
    fixture.detectChanges();
    await settle();
    await flushInitialLoad({ page: page([SIP_ENTRY]) });
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('SIP plan');
    expect(text).toContain('SIP installment October 2026');
    expect(fixture.nativeElement.querySelector('a[href="/sip-plans"]')).toBeTruthy();

    const voidButton = fixture.nativeElement.querySelector(
      'button[aria-label^="Void entry"]',
    ) as HTMLButtonElement;
    expect(voidButton).toBeTruthy();
    voidButton.click();
    await settle();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'Voiding it marks the installment unpaid',
    );
  });

  it('keeps a readable label for legacy Gold SIP entries', async () => {
    const fixture = TestBed.createComponent(EntriesPageComponent);
    fixture.detectChanges();
    await settle();
    await flushInitialLoad({ page: page([GOLD_SIP_ENTRY]) });
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Gold SIP (legacy)');
    expect(
      fixture.nativeElement.querySelector('button[aria-label^="Void entry"]'),
    ).toBeTruthy();
  });

  it('offers only the eight supported investment categories', async () => {
    const fixture = TestBed.createComponent(EntriesPageComponent);
    fixture.detectChanges();
    await settle();
    await flushInitialLoad();
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    component.form.get('entryType').setValue('INVESTMENT');
    await settle();
    httpMock
      .expectOne(
        (r) =>
          r.url === '/api/v1/reference-data/categories' &&
          r.params.get('entryType') === 'INVESTMENT',
      )
      .flush([
        {
          code: 'GOLD_SIP',
          label: 'Gold SIP',
          allowedEntryTypes: ['INVESTMENT'],
          allowedBuckets: ['INVESTMENTS'],
        },
        {
          code: 'SIP',
          label: 'SIP',
          allowedEntryTypes: ['INVESTMENT'],
          allowedBuckets: ['INVESTMENTS'],
        },
      ]);
    await settle();

    expect(component.categories().map((category: { code: string }) => category.code)).toEqual([
      'SIP',
    ]);
  });

  it('opens a void confirmation and refuses a second running void', async () => {
    setCookie('XSRF-TOKEN', 'csrf-abc123');
    const fixture = TestBed.createComponent(EntriesPageComponent);
    fixture.detectChanges();
    await settle();
    await flushInitialLoad({ page: page([ENTRY]) });
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    component.requestVoid(ENTRY);
    fixture.detectChanges();
    expect(component.voidTarget()).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Void this entry?');

    component.confirmVoid();
    component.confirmVoid();
    await settle();
    httpMock
      .expectOne('/api/v1/money-entries/1/void')
      .flush({ ...ENTRY, status: 'VOID', voidedAtUtc: '2026-10-06T00:00:00Z' });
    await settle();
    // history refresh after confirmed void
    httpMock.expectOne((r) => r.url === '/api/v1/money-entries' && r.method === 'GET').flush(
      page([{ ...ENTRY, status: 'VOID' }]),
    );
    await settle();
    expect(component.voidTarget()).toBeNull();
  });

  it('handles ALREADY_VOIDED conflicts with a friendly message', async () => {
    setCookie('XSRF-TOKEN', 'csrf-abc123');
    const fixture = TestBed.createComponent(EntriesPageComponent);
    fixture.detectChanges();
    await settle();
    await flushInitialLoad({ page: page([ENTRY]) });
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    component.requestVoid(ENTRY);
    component.confirmVoid();
    await settle();
    httpMock
      .expectOne('/api/v1/money-entries/1/void')
      .flush(errorBody(409, 'ALREADY_VOIDED', 'Already void.'), { status: 409, statusText: 'Conflict' });
    await settle();
    // refresh after conflict
    httpMock.expectOne((r) => r.url === '/api/v1/money-entries' && r.method === 'GET').flush(page([]));
    await settle();

    expect(component.voidError()).toContain('already been voided');
  });

  it('shows an empty history state when filters return nothing', async () => {
    const fixture = TestBed.createComponent(EntriesPageComponent);
    fixture.detectChanges();
    await settle();
    await flushInitialLoad({ page: page([]) });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No entries match your filters yet.');
  });

  it('shows a history failure with retry', async () => {
    const fixture = TestBed.createComponent(EntriesPageComponent);
    fixture.detectChanges();
    await settle();

    httpMock.expectOne((r) => r.url === '/api/v1/reference-data/categories').flush([CREATE_CATEGORY]);
    httpMock
      .expectOne((r) => r.url === '/api/v1/money-entries')
      .flush(errorBody(500, 'INTERNAL_ERROR', 'Boom'), { status: 500, statusText: 'Server Error' });
    await settle();
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Boom');
    expect(fixture.nativeElement.querySelector('button')).toBeTruthy();
  });
});
