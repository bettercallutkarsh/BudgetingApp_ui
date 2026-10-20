import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { EntriesService } from './entries.service';
import { authInterceptor } from '../auth/auth.interceptor';
import { MoneyEntry, MoneyEntryCreateRequest } from '../budget/budget.models';

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

const CREATE_PAYLOAD: MoneyEntryCreateRequest = {
  entryDate: '2026-10-05',
  entryTime: '10:00:00',
  entryType: 'EXPENSE',
  bucket: 'ESSENTIALS',
  categoryCode: 'GROCERIES',
  amount: '1200.00',
  paymentMethod: 'UPI',
  note: 'Weekly groceries',
  clientRequestId: '11111111-2222-4333-8444-555555555555',
};

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}`;
}

function clearCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('EntriesService', () => {
  let httpMock: HttpTestingController;
  let service: EntriesService;

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
    service = TestBed.inject(EntriesService);
  });

  afterEach(() => {
    clearCookie('XSRF-TOKEN');
    httpMock.verify();
  });

  it('lists entries with pagination and filter query params only when provided', async () => {
    const promise = service.listEntries({ entryType: 'EXPENSE', status: 'POSTED', page: 2, size: 10 });
    await settle();
    const req = httpMock.expectOne(
      (r) =>
        r.url === '/api/v1/money-entries' &&
        r.params.get('entryType') === 'EXPENSE' &&
        r.params.get('status') === 'POSTED' &&
        r.params.get('page') === '2' &&
        r.params.get('size') === '10' &&
        !r.params.has('bucket') &&
        !r.params.has('fromDate'),
    );
    expect(req.request.method).toBe('GET');
    req.flush({ content: [ENTRY], page: 2, size: 10, totalElements: 21, totalPages: 3 });
    await expect(promise).resolves.toMatchObject({ totalPages: 3 });
  });

  it('omits empty filter values entirely', async () => {
    const promise = service.listEntries({ page: 0, size: 10 });
    await settle();
    const req = httpMock.expectOne((r) => r.url === '/api/v1/money-entries');
    expect(req.request.params.keys().sort()).toEqual(['page', 'size']);
    req.flush({ content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 });
    await expect(promise).resolves.toMatchObject({ content: [] });
  });

  it('creates an entry with a CSRF header and the client request id', async () => {
    setCookie('XSRF-TOKEN', 'csrf-abc123');
    const promise = service.createEntry(CREATE_PAYLOAD);
    await settle();
    const req = httpMock.expectOne('/api/v1/money-entries');
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('X-XSRF-TOKEN')).toBe('csrf-abc123');
    expect((req.request.body as any).clientRequestId).toBe('11111111-2222-4333-8444-555555555555');
    req.flush(ENTRY);
    await expect(promise).resolves.toEqual(ENTRY);
  });

  it('gets a single entry by id', async () => {
    const promise = service.getEntry(1);
    await settle();
    const req = httpMock.expectOne('/api/v1/money-entries/1');
    expect(req.request.method).toBe('GET');
    req.flush(ENTRY);
    await expect(promise).resolves.toEqual(ENTRY);
  });

  it('voids an entry with a reason and posts to the void sub-resource', async () => {
    setCookie('XSRF-TOKEN', 'csrf-abc123');
    const promise = service.voidEntry(1, 'Duplicate');
    await settle();
    const req = httpMock.expectOne('/api/v1/money-entries/1/void');
    expect(req.request.method).toBe('POST');
    expect((req.request.body as any).voidReason).toBe('Duplicate');
    req.flush({ ...ENTRY, status: 'VOID', voidedAtUtc: '2026-10-06T00:00:00Z', voidReason: 'Duplicate' });
    await expect(promise).resolves.toMatchObject({ status: 'VOID' });
  });

  it('voids an entry without a reason using an empty body', async () => {
    setCookie('XSRF-TOKEN', 'csrf-abc123');
    const promise = service.voidEntry(1, '   ');
    await settle();
    const req = httpMock.expectOne('/api/v1/money-entries/1/void');
    expect(req.request.body).toEqual({});
    req.flush({ ...ENTRY, status: 'VOID' });
    await promise;
  });
});
