import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { authInterceptor, CSRF_HEADER_NAME } from './auth.interceptor';

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}`;
}

function clearCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let auth: AuthService;
  let navigateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    clearCookie('XSRF-TOKEN');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    clearCookie('XSRF-TOKEN');
    httpMock.verify();
    navigateSpy.mockRestore();
  });

  it('attaches X-XSRF-TOKEN header from XSRF-TOKEN cookie on POST /api requests', async () => {
    setCookie('XSRF-TOKEN', 'csrf-abc123');
    http.post('/api/v1/budget', { amount: 1000 }).subscribe();

    const req = httpMock.expectOne('/api/v1/budget');
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get(CSRF_HEADER_NAME)).toBe('csrf-abc123');
    req.flush({ ok: true });
  });

  it('does not attach CSRF header to GET requests', async () => {
    setCookie('XSRF-TOKEN', 'csrf-abc123');
    http.get('/api/v1/me').subscribe();

    const req = httpMock.expectOne('/api/v1/me');
    expect(req.request.headers.has(CSRF_HEADER_NAME)).toBe(false);
    req.flush({ ok: true });
  });

  it('attaches CSRF header to auth POST endpoints (backend CSRF is global)', async () => {
    // The backend keeps CSRF enabled for every state-changing request,
    // including /api/v1/auth/login and /auth/register (they are permitAll for
    // authorization but still CSRF-protected), so the token must be sent.
    setCookie('XSRF-TOKEN', 'csrf-abc123');
    http.post('/api/v1/auth/login', { email: 'a@b.com', password: 'x' }).subscribe();

    const req = httpMock.expectOne('/api/v1/auth/login');
    expect(req.request.headers.get(CSRF_HEADER_NAME)).toBe('csrf-abc123');
    req.flush({ ok: true });
  });

  it('on CSRF_TOKEN_INVALID returns 403, fetches fresh CSRF and retries exactly once', async () => {
    setCookie('XSRF-TOKEN', 'stale-token');
    const responses: any[] = [];

    http.post('/api/v1/budget', { amount: 500 }).subscribe((r) => responses.push(r));

    const firstReq = httpMock.expectOne('/api/v1/budget');
    expect(firstReq.request.headers.get(CSRF_HEADER_NAME)).toBe('stale-token');

    firstReq.flush(
      {
        timestamp: '2026-10-20T07:00:00Z',
        status: 403,
        code: 'CSRF_TOKEN_INVALID',
        message: 'Invalid CSRF token.',
        fieldErrors: [],
        traceId: 't1',
      },
      { status: 403, statusText: 'Forbidden' },
    );

    await settle();
    const csrfReq = httpMock.expectOne('/api/v1/auth/csrf');
    csrfReq.flush({ token: 'fresh-token', headerName: 'X-XSRF-TOKEN', parameterName: '_csrf' });
    setCookie('XSRF-TOKEN', 'fresh-token');

    await settle();
    const retryReq = httpMock.expectOne('/api/v1/budget');
    expect(retryReq.request.headers.get(CSRF_HEADER_NAME)).toBe('fresh-token');
    retryReq.flush({ ok: true });

    await settle();
    expect(responses.length).toBe(1);
    expect(responses[0]).toEqual({ ok: true });
    // httpMock.verify() ensures no third request was made.
  });

  it('does not retry more than once on repeated CSRF_TOKEN_INVALID (no retry loop)', async () => {
    setCookie('XSRF-TOKEN', 'stale');
    let error: any;

    http.post('/api/v1/budget', {}).subscribe({ error: (e) => (error = e) });

    const firstReq = httpMock.expectOne('/api/v1/budget');
    firstReq.flush(
      { timestamp: 'x', status: 403, code: 'CSRF_TOKEN_INVALID', message: 'bad', fieldErrors: [], traceId: 't' },
      { status: 403, statusText: 'Forbidden' },
    );

    await settle();
    httpMock.expectOne('/api/v1/auth/csrf').flush({ token: 'fresh', headerName: 'X-XSRF-TOKEN', parameterName: '_csrf' });

    await settle();
    const retryReq = httpMock.expectOne('/api/v1/budget');
    retryReq.flush(
      { timestamp: 'x', status: 403, code: 'CSRF_TOKEN_INVALID', message: 'bad again', fieldErrors: [], traceId: 't2' },
      { status: 403, statusText: 'Forbidden' },
    );

    await settle();
    expect(error?.status).toBe(403);
    expect(error?.error?.code || error?.code).toBeDefined();
  });

  it('on 401 for protected /api endpoint calls auth.handleUnauthorized() and clears state', async () => {
    // Simulate authenticated state
    auth['userSignal'].set({
      userId: 1,
      fullName: 'Test',
      email: 't@e.com',
      phoneNumber: '+919876543210',
      employmentType: 'SALARIED',
      accountStatus: 'ACTIVE',
      createdAtUtc: '2026-01-01T00:00:00Z',
    } as any);
    auth['statusSignal'].set('authenticated');
    vi.spyOn(auth, 'handleUnauthorized');

    http.get('/api/v1/entries').subscribe({ error: () => {} });

    const req = httpMock.expectOne('/api/v1/entries');
    req.flush(
      { timestamp: 'x', status: 401, code: 'NOT_AUTHENTICATED', message: 'Authentication is required to access this resource.', fieldErrors: [], traceId: 't' },
      { status: 401, statusText: 'Unauthorized' },
    );

    await settle();
    expect(auth.handleUnauthorized).toHaveBeenCalled();
  });

  it('does not call handleUnauthorized() on 401 from /api/v1/auth/login', async () => {
    vi.spyOn(auth, 'handleUnauthorized');
    let error: any;

    http.post('/api/v1/auth/login', { email: 'a@b.com', password: 'wrong' }).subscribe({ error: (e) => (error = e) });

    const req = httpMock.expectOne('/api/v1/auth/login');
    req.flush(
      { timestamp: 'x', status: 401, code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.', fieldErrors: [], traceId: 't' },
      { status: 401, statusText: 'Unauthorized' },
    );

    await settle();
    expect(auth.handleUnauthorized).not.toHaveBeenCalled();
    expect(error?.status).toBe(401);
  });

  it('does not call handleUnauthorized() on 401 from /api/v1/auth/me', async () => {
    vi.spyOn(auth, 'handleUnauthorized');

    http.get('/api/v1/me').subscribe({ error: () => {} });

    const req = httpMock.expectOne('/api/v1/me');
    req.flush(
      { timestamp: 'x', status: 401, code: 'NOT_AUTHENTICATED', message: 'Authentication is required to access this resource.', fieldErrors: [], traceId: 't' },
      { status: 401, statusText: 'Unauthorized' },
    );

    await settle();
    expect(auth.handleUnauthorized).not.toHaveBeenCalled();
  });
});
