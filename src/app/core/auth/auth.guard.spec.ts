import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, UrlTree } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { authGuard, guestGuard } from './auth.guard';
import { AuthService, isPublicPath, safeReturnUrl } from './auth.service';
import { authInterceptor } from './auth.interceptor';

describe('Auth guards and helpers', () => {
  let auth: AuthService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    auth['bootstrapPromise'] = null;
    auth['userSignal'].set(null);
    auth['statusSignal'].set('unknown');
    auth['sessionExpiredSignal'].set(false);
  });

  describe('isPublicPath', () => {
    it('returns true for root, login, register, and design-preview', () => {
      expect(isPublicPath('/')).toBe(true);
      expect(isPublicPath('/login')).toBe(true);
      expect(isPublicPath('/register')).toBe(true);
      expect(isPublicPath('/design-preview')).toBe(true);
    });

    it('treats empty string as public to avoid bootstrap races', () => {
      expect(isPublicPath('')).toBe(true);
    });

    it('normalizes paths with query strings and trailing slashes', () => {
      expect(isPublicPath('/login?returnUrl=%2Fhome')).toBe(true);
      expect(isPublicPath('/register/')).toBe(true);
    });

    it('returns false for protected paths', () => {
      expect(isPublicPath('/home')).toBe(false);
      expect(isPublicPath('/budget')).toBe(false);
      expect(isPublicPath('/profile')).toBe(false);
    });
  });

  describe('safeReturnUrl', () => {
    it('returns the normalized internal path when valid', () => {
      expect(safeReturnUrl('/budget/2026-10')).toBe('/budget/2026-10');
      expect(safeReturnUrl('/home/')).toBe('/home');
    });

    it('returns /home for null, undefined, empty, external, or protocol-relative URLs', () => {
      expect(safeReturnUrl(null)).toBe('/home');
      expect(safeReturnUrl(undefined)).toBe('/home');
      expect(safeReturnUrl('')).toBe('/home');
      expect(safeReturnUrl('https://evil.example.com')).toBe('/home');
      expect(safeReturnUrl('//evil.example.com/path')).toBe('/home');
      expect(safeReturnUrl('/\\evil')).toBe('/home');
    });
  });

  describe('guestGuard', () => {
    it('allows unauthenticated users through', async () => {
      auth['bootstrapPromise'] = Promise.resolve();
      auth['statusSignal'].set('anonymous');
      const result = await TestBed.runInInjectionContext(() => guestGuard({} as any, {} as any));
      expect(result).toBe(true);
    });

    it('allows the public welcome page through when the backend is unavailable', async () => {
      // Bootstrap failed entirely (csrf + /me unreachable): state must resolve
      // to anonymous, and guestGuard must still let the public page render
      // rather than leaving it blank or looping.
      const httpMock = TestBed.inject(
        (await import('@angular/common/http/testing')).HttpTestingController,
      );
      const bootstrap = auth.ensureBootstrapped();
      await new Promise((resolve) => setTimeout(resolve, 0));
      httpMock.expectOne('/api/v1/auth/csrf').error(new ProgressEvent('error'));
      await new Promise((resolve) => setTimeout(resolve, 0));
      httpMock.expectOne('/api/v1/me').error(new ProgressEvent('error'));
      await bootstrap;

      const result = await TestBed.runInInjectionContext(() => guestGuard({} as any, {} as any));
      expect(result).toBe(true);
    });

    it('redirects authenticated users to /home', async () => {
      auth['bootstrapPromise'] = Promise.resolve();
      auth['statusSignal'].set('authenticated');
      auth['userSignal'].set({
        userId: 1,
        fullName: 'A',
        email: 'a@b.com',
        phoneNumber: '+919876543210',
        employmentType: 'SALARIED',
        accountStatus: 'ACTIVE',
        createdAtUtc: '2026-01-01T00:00:00Z',
      } as any);

      const result = await TestBed.runInInjectionContext(() => guestGuard({} as any, {} as any));
      expect(result instanceof UrlTree).toBe(true);
      expect(router.serializeUrl(result as UrlTree)).toBe('/home');
    });
  });

  describe('authGuard', () => {
    it('allows authenticated users through', async () => {
      auth['bootstrapPromise'] = Promise.resolve();
      auth['statusSignal'].set('authenticated');

      const result = await TestBed.runInInjectionContext(() => authGuard({} as any, { url: '/budget' } as any));
      expect(result).toBe(true);
    });

    it('redirects anonymous users to /login with returnUrl', async () => {
      auth['bootstrapPromise'] = Promise.resolve();
      auth['statusSignal'].set('anonymous');
      auth['sessionExpiredSignal'].set(false);

      const result = await TestBed.runInInjectionContext(() => authGuard({} as any, { url: '/budget/2026-10' } as any));
      expect(result instanceof UrlTree).toBe(true);
      const serialized = router.serializeUrl(result as UrlTree);
      expect(serialized).toContain('/login');
      expect(serialized).toContain('returnUrl=%2Fbudget%2F2026-10');
      expect(serialized).not.toContain('reason=');
    });

    it('includes reason=expired when the session expired', async () => {
      auth['bootstrapPromise'] = Promise.resolve();
      auth['statusSignal'].set('anonymous');
      auth['sessionExpiredSignal'].set(true);

      const result = await TestBed.runInInjectionContext(() => authGuard({} as any, { url: '/home' } as any));
      expect(result instanceof UrlTree).toBe(true);
      const serialized = router.serializeUrl(result as UrlTree);
      expect(serialized).toContain('/login');
      expect(serialized).toContain('returnUrl=%2Fhome');
      expect(serialized).toContain('reason=expired');
    });

    it('waits for bootstrap before making a decision', async () => {
      let resolveBootstrap!: () => void;
      auth['bootstrapPromise'] = new Promise<void>((resolve) => {
        resolveBootstrap = resolve;
      });
      auth['statusSignal'].set('anonymous');

      auth['statusSignal'].set('anonymous');

      const runGuard = () => TestBed.runInInjectionContext(() => authGuard({} as any, { url: '/profile' } as any));
      const guardPromise = Promise.resolve(runGuard());
      await Promise.resolve();
      let resolved = false;
      void guardPromise.then(() => {
        resolved = true;
      });
      await Promise.resolve();
      expect(resolved).toBe(false);

      auth['statusSignal'].set('authenticated');
      resolveBootstrap();
      const result = await guardPromise;
      expect(result).toBe(true);
    });
  });
});
