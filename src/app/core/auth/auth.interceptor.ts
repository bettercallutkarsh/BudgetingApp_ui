import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { toAuthApiError } from './auth.models';

export const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
export const CSRF_HEADER_NAME = 'X-XSRF-TOKEN';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Requests whose CSRF token has already been refreshed and retried once.
 * A WeakSet keyed by the original request object guarantees the refresh
 * path can never retry more than once per request (no retry loops).
 */
const csrfRetriedRequests = new WeakSet<HttpRequest<unknown>>();

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  const initial =
    MUTATING_METHODS.has(req.method) && req.url.startsWith('/api/')
      ? attachCsrfHeader(req)
      : req;

  return next(initial).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }

      const apiError = toAuthApiError(error);

      // 401 on a protected API call: clear in-memory auth state and route to
      // login when the user is on a protected page. Auth endpoints and the
      // session probe (/api/v1/me) are excluded — a 401 from /auth/login is
      // just bad credentials, and a 401 from /me is the normal "not signed in"
      // signal during bootstrap (never an unexpected session expiry).
      if (
        apiError.status === 401 &&
        req.url.startsWith('/api/') &&
        !req.url.startsWith('/api/v1/auth/') &&
        !req.url.endsWith('/api/v1/me')
      ) {
        auth.handleUnauthorized();
      }

      // Missing/rejected CSRF token on a state-changing call: fetch a fresh
      // token (sets a new XSRF-TOKEN cookie) and retry this request exactly once.
      if (
        apiError.status === 403 &&
        apiError.code === 'CSRF_TOKEN_INVALID' &&
        MUTATING_METHODS.has(req.method) &&
        !req.url.endsWith('/auth/csrf') &&
        !csrfRetriedRequests.has(req)
      ) {
        csrfRetriedRequests.add(req);
        return from(auth.fetchCsrf()).pipe(
          switchMap((csrf) =>
            next(
              req.clone({
                setHeaders: { [csrf.headerName || CSRF_HEADER_NAME]: csrf.token },
              }),
            ),
          ),
          catchError((retryError: unknown) => {
            // Failed refresh or failed retry — surface the original CSRF error.
            if (retryError instanceof HttpErrorResponse && retryError.status !== 403) {
              return throwError(() => retryError);
            }
            return throwError(() => error);
          }),
        );
      }

      return throwError(() => error);
    }),
  );
};

function attachCsrfHeader(req: HttpRequest<unknown>): HttpRequest<unknown> {
  if (req.headers.has(CSRF_HEADER_NAME)) {
    return req;
  }
  const token = readCookie(CSRF_COOKIE_NAME);
  return token ? req.clone({ setHeaders: { [CSRF_HEADER_NAME]: token } }) : req;
}

export function readCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const prefix = `${name}=`;
  const entry = document.cookie.split('; ').find((cookie) => cookie.startsWith(prefix));
  if (!entry) {
    return null;
  }
  return decodeURIComponent(entry.slice(prefix.length));
}
