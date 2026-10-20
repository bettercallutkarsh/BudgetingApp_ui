import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  AuthApiError,
  AuthStatus,
  CsrfTokenResponse,
  RegisterPayload,
  UserProfile,
  toAuthApiError,
} from './auth.models';

const API_BASE = '/api/v1';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly userSignal = signal<UserProfile | null>(null);
  private readonly statusSignal = signal<AuthStatus>('unknown');
  private readonly sessionExpiredSignal = signal(false);

  readonly user = this.userSignal.asReadonly();
  readonly status = this.statusSignal.asReadonly();
  readonly sessionExpired = this.sessionExpiredSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.statusSignal() === 'authenticated');

  private bootstrapPromise: Promise<void> | null = null;

  /**
   * Single-flight session bootstrap: fetches the CSRF token (so the XSRF-TOKEN
   * cookie exists before any state-changing call) and then verifies the current
   * session with GET /me. Safe to call many times — only one /me is issued.
   * Always resolves; failures resolve to the "anonymous" state.
   */
  ensureBootstrapped(): Promise<void> {
    if (!this.bootstrapPromise) {
      this.bootstrapPromise = this.runBootstrap();
    }
    return this.bootstrapPromise;
  }

  private async runBootstrap(): Promise<void> {
    try {
      await this.fetchCsrf();
    } catch {
      // CSRF bootstrap failure is survivable: a later state-changing call will
      // refresh the token through the interceptor if the cookie is missing.
    }

    try {
      const profile = await firstValueFrom(
        this.http.get<UserProfile>(`${API_BASE}/me`),
      );
      this.applyAuthenticated(profile);
    } catch {
      // 401 is handled by the interceptor; any failure here means "no session".
      this.applyAnonymous();
    }
  }

  fetchCsrf(): Promise<CsrfTokenResponse> {
    return firstValueFrom(
      this.http.get<CsrfTokenResponse>(`${API_BASE}/auth/csrf`),
    ).catch((error: unknown) => {
      throw toAuthApiError(error);
    });
  }

  async login(email: string, password: string): Promise<UserProfile> {
    let profile: UserProfile;
    try {
      profile = await firstValueFrom(
        this.http.post<UserProfile>(`${API_BASE}/auth/login`, { email, password }),
      );
    } catch (error) {
      throw toAuthApiError(error);
    }

    this.applyAuthenticated(profile);

    // Verify the rotated session cookie with /me (as required by the spec);
    // fall back to the login response body if /me fails for a non-auth reason.
    try {
      const verified = await firstValueFrom(
        this.http.get<UserProfile>(`${API_BASE}/me`),
      );
      this.applyAuthenticated(verified);
      return verified;
    } catch (error) {
      const apiError = toAuthApiError(error);
      if (apiError.status === 401) {
        this.applyAnonymous();
        throw new AuthApiError(
          401,
          'SESSION_VERIFICATION_FAILED',
          'Signed in, but the session could not be verified. Please try again.',
        );
      }
      return profile;
    }
  }

  async register(payload: RegisterPayload): Promise<UserProfile> {
    try {
      return await firstValueFrom(
        this.http.post<UserProfile>(`${API_BASE}/auth/register`, payload),
      );
    } catch (error) {
      throw toAuthApiError(error);
    }
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post<{ message: string }>(`${API_BASE}/auth/logout`, {}),
      );
      this.applyAnonymous();
    } catch (error) {
      const apiError = toAuthApiError(error);
      // 401/403 mean the server-side session is already unusable: treat as signed out.
      if (apiError.status === 401 || apiError.status === 403) {
        this.applyAnonymous();
        return;
      }
      throw apiError;
    }
  }

  /**
   * Called by the HTTP interceptor when a protected /api request returns 401.
   * Clears in-memory auth state and, when the user is sitting on a protected
   * page, routes to login preserving a safe return URL.
   */
  handleUnauthorized(): void {
    const wasAuthenticated = this.statusSignal() === 'authenticated';
    if (wasAuthenticated) {
      this.sessionExpiredSignal.set(true);
    }
    this.applyAnonymous();

    const currentUrl = this.router.url;
    if (!isPublicPath(currentUrl)) {
      void this.router.navigate(['/login'], {
        queryParams: {
          returnUrl: safeReturnUrl(currentUrl),
          ...(wasAuthenticated ? { reason: 'expired' } : {}),
        },
      });
    }
  }

  private applyAuthenticated(profile: UserProfile): void {
    this.userSignal.set(profile);
    this.statusSignal.set('authenticated');
    this.sessionExpiredSignal.set(false);
  }

  private applyAnonymous(): void {
    this.userSignal.set(null);
    this.statusSignal.set('anonymous');
  }
}

const PUBLIC_PATHS = new Set(['/', '/login', '/register', '/design-preview']);

export function isPublicPath(url: string): boolean {
  const path = normalizePath(url);
  // "" is the URL before the first navigation commits — never treat it as a
  // protected page, otherwise a deep-link bootstrap 401 would race the guard.
  return path === '' || PUBLIC_PATHS.has(path);
}

export function safeReturnUrl(url: string | null | undefined): string {
  if (url && url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/\\')) {
    return normalizePath(url) || '/';
  }
  return '/home';
}

function normalizePath(url: string): string {
  const withoutQuery = url.split('?')[0].split('#')[0];
  if (withoutQuery.length > 1 && withoutQuery.endsWith('/')) {
    return withoutQuery.slice(0, -1);
  }
  return withoutQuery;
}
