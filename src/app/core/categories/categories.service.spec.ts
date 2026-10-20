import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CategoriesService } from './categories.service';
import { authInterceptor } from '../auth/auth.interceptor';
import { CategoryRef } from '../budget/budget.models';

const CATEGORIES: CategoryRef[] = [
  {
    code: 'GROCERIES',
    label: 'Groceries',
    allowedEntryTypes: ['EXPENSE'],
    allowedBuckets: ['ESSENTIALS'],
  },
  {
    code: 'MEDICAL',
    label: 'Medical',
    allowedEntryTypes: ['EXPENSE'],
    allowedBuckets: ['ESSENTIALS', 'SAFETY'],
  },
];

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('CategoriesService', () => {
  let httpMock: HttpTestingController;
  let service: CategoriesService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(CategoriesService);
  });

  afterEach(() => httpMock.verify());

  it('loads categories with entry type and bucket filters', async () => {
    const promise = service.listCategories({ entryType: 'EXPENSE', bucket: 'ESSENTIALS' });
    await settle();
    const req = httpMock.expectOne(
      (r) =>
        r.url === '/api/v1/reference-data/categories' &&
        r.params.get('entryType') === 'EXPENSE' &&
        r.params.get('bucket') === 'ESSENTIALS',
    );
    expect(req.request.method).toBe('GET');
    req.flush(CATEGORIES);
    await expect(promise).resolves.toEqual(CATEGORIES);
  });

  it('omits filters when none are provided', async () => {
    const promise = service.listCategories();
    await settle();
    const req = httpMock.expectOne((r) => r.url === '/api/v1/reference-data/categories');
    expect(req.request.params.keys().length).toBe(0);
    req.flush([]);
    await expect(promise).resolves.toEqual([]);
  });

  it('propagates failures instead of substituting hardcoded categories', async () => {
    const promise = service.listCategories({ entryType: 'EXPENSE' });
    await settle();
    httpMock
      .expectOne((r) => r.url === '/api/v1/reference-data/categories')
      .flush(
        { timestamp: 't', status: 500, code: 'INTERNAL_ERROR', message: 'Boom', fieldErrors: [], traceId: 'x' },
        { status: 500, statusText: 'Server Error' },
      );
    await expect(promise).rejects.toMatchObject({ status: 500 });
  });
});
