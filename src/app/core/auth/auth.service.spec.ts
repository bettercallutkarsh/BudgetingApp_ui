import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { authInterceptor } from './auth.interceptor';
import { AuthApiError, UserProfile } from './auth.models';

const CSRF_BODY = {
  token: 'csrf-token-1',
  headerName: 'X-XSRF-TOKEN',
  parameterName: '_csrf',
};

const PROFILE: UserProfile = {
  userId: 7,
  fullName: 'Ada Lovelace',
  email: 'ada@example.com',
  phoneNumber: '+919876543210',
  employmentType: 'SALARIED',
  accountStatus: 'ACTIVE',
  createdAtUtc: '2026-01-15T10:00:00Z',
};

function errorBody(status: number, code: string, message: string) {
  return {
    timestamp: '2026-10-20T07:00:00Z',
    status,
    code,
    message,
    fieldErrors: [],
    traceId: 'trace-1',
  };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('AuthService', () => {
  let httpMock: HttpTestingController;
  let auth: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  async function bootstrapAuthenticated(): Promise<void> {
    const promise = auth.ensureBootstrapped();
    await settle();
    httpMock.expectOne('/api/v1/auth/csrf').flush(CSRF_BODY);
    await settle();
    httpMock.expectOne('/api/v1/me').flush(PROFILE);
    await promise;
  }

  it('bootstraps the session with GET /auth/csrf followed by GET /me', async () => {
    const promise = auth.ensureBootstrapped();
    await settle();
    httpMock.expectOne('/api/v1/auth/csrf').flush(CSRF_BODY);
    await settle();
    httpMock.expectOne('/api/v1/me').flush(PROFILE);
    await promise;

    expect(auth.status()).toBe('authenticated');
    expect(auth.user()?.userId).toBe(7);
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('issues a single /me even when bootstrapped concurrently', async () => {
    const first = auth.ensureBootstrapped();
    const second = auth.ensureBootstrapped();
    expect(first).toBe(second);

    await settle();
    httpMock.expectOne('/api/v1/auth/csrf').flush(CSRF_BODY);
    await settle();
    httpMock.expectOne('/api/v1/me').flush(PROFILE);
    await Promise.all([first, second]);
    // httpMock.verify() in afterEach fails if extra /me requests were issued.
  });

  it('marks the session anonymous when /me returns 401', async () => {
    const promise = auth.ensureBootstrapped();
    await settle();
    httpMock.expectOne('/api/v1/auth/csrf').flush(CSRF_BODY);
    await settle();
    httpMock
      .expectOne('/api/v1/me')
      .flush(errorBody(401, 'NOT_AUTHENTICATED', 'Authentication is required to access this resource.'), {
        status: 401,
        statusText: 'Unauthorized',
      });
    await promise;

    expect(auth.status()).toBe('anonymous');
    expect(auth.user()).toBeNull();
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('resolves bootstrap to anonymous when the network is unreachable', async () => {
    const promise = auth.ensureBootstrapped();
    await settle();
    httpMock.expectOne('/api/v1/auth/csrf').error(new ProgressEvent('error'));
    await settle();
    httpMock.expectOne('/api/v1/me').error(new ProgressEvent('error'));
    await promise;

    expect(auth.status()).toBe('anonymous');
  });

  it('login posts credentials then verifies identity with /me', async () => {
    const promise = auth.login('ada@example.com', 'correct horse battery');
    await settle();

    const loginRequest = httpMock.expectOne('/api/v1/auth/login');
    expect(loginRequest.request.method).toBe('POST');
    expect(loginRequest.request.body).toEqual({
      email: 'ada@example.com',
      password: 'correct horse battery',
    });
    loginRequest.flush(PROFILE);

    await settle();
    const meRequest = httpMock.expectOne('/api/v1/me');
    expect(meRequest.request.method).toBe('GET');
    meRequest.flush(PROFILE);

    const result = await promise;
    expect(result.userId).toBe(7);
    expect(auth.status()).toBe('authenticated');
    expect(auth.user()?.email).toBe('ada@example.com');
  });

  it('login failure surfaces the generic server message and keeps the user signed out', async () => {
    const promise = auth.login('ada@example.com', 'wrong-password');
    await settle();

    httpMock
      .expectOne('/api/v1/auth/login')
      .flush(errorBody(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.'), {
        status: 401,
        statusText: 'Unauthorized',
      });

    await expect(promise).rejects.toThrow('Email or password is incorrect.');
    expect(auth.status()).not.toBe('authenticated');
    expect(auth.user()).toBeNull();
  });

  it('register posts the exact DTO and never a client-side userId', async () => {
    const payload = {
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      phoneNumber: '+919876543210',
      employmentType: 'SALARIED' as const,
      password: 'a secret passphrase',
    };

    const promise = auth.register(payload);
    await settle();

    const request = httpMock.expectOne('/api/v1/auth/register');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    expect(request.request.body.userId).toBeUndefined();
    // The register endpoint responds with the UserProfile body (HTTP 201).
    request.flush(PROFILE, { status: 201, statusText: 'Created' });

    const result = await promise;
    expect(result.userId).toBe(7);
    // Registration must not authenticate the client by itself.
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('logout clears the in-memory session', async () => {
    await bootstrapAuthenticated();

    const promise = auth.logout();
    await settle();
    httpMock.expectOne('/api/v1/auth/logout').flush({ message: 'Signed out successfully.' });
    await promise;

    expect(auth.status()).toBe('anonymous');
    expect(auth.user()).toBeNull();
  });

  it('logout still signs the user out locally when the server session is already gone', async () => {
    await bootstrapAuthenticated();

    const promise = auth.logout();
    await settle();
    httpMock
      .expectOne('/api/v1/auth/logout')
      .flush(errorBody(401, 'NOT_AUTHENTICATED', 'Authentication is required to access this resource.'), {
        status: 401,
        statusText: 'Unauthorized',
      });
    await promise;

    expect(auth.status()).toBe('anonymous');
    expect(auth.user()).toBeNull();
  });

  it('handleUnauthorized clears state without navigating from public pages', async () => {
    await bootstrapAuthenticated();

    auth.handleUnauthorized();

    expect(auth.status()).toBe('anonymous');
    expect(auth.user()).toBeNull();
    expect(auth.sessionExpired()).toBe(true);
  });

  it('login failure with rate limiting exposes the server message', async () => {
    const promise = auth.login('ada@example.com', 'wrong-password');
    await settle();

    httpMock
      .expectOne('/api/v1/auth/login')
      .flush(errorBody(429, 'LOGIN_RATE_LIMITED', 'Too many failed login attempts. Please try again later.'), {
        status: 429,
        statusText: 'Too Many Requests',
      });

    await expect(promise).rejects.toThrow('Too many failed login attempts');
  });

  it('wraps transport failures in a user-safe AuthApiError', async () => {
    const promise = auth.login('ada@example.com', 'password');
    await settle();

    httpMock.expectOne('/api/v1/auth/login').error(new ProgressEvent('error'));

    const error = await promise.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AuthApiError);
    expect((error as AuthApiError).status).toBe(0);
    expect((error as AuthApiError).message).toContain("Can't reach the server");
  });
});
