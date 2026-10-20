import { inject } from '@angular/core';
import { CanActivateFn, Params, Router } from '@angular/router';
import { AuthService, safeReturnUrl } from './auth.service';

/**
 * Allows access only to signed-in users; otherwise redirects to login while
 * preserving a safe return URL (plus a "session expired" reason when the
 * user was signed in and lost the session mid-visit).
 */
export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.ensureBootstrapped();
  if (auth.status() === 'authenticated') {
    return true;
  }

  const queryParams: Params = { returnUrl: safeReturnUrl(state.url) };
  if (auth.sessionExpired()) {
    queryParams['reason'] = 'expired';
  }
  return router.createUrlTree(['/login'], { queryParams });
};

/**
 * Keeps signed-in users off the welcome/login/register screens by sending
 * them to the protected home screen instead. No redirect loops: /home is
 * guarded by authGuard and allows authenticated users through.
 */
export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.ensureBootstrapped();
  if (auth.status() === 'authenticated') {
    return router.createUrlTree(['/home']);
  }
  return true;
};
