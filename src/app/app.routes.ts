import { Routes } from '@angular/router';
import { environment } from '../environments/environment';
import { AuthLayoutComponent } from './shared/components/auth-layout/auth-layout';
import { AppShellComponent } from './shell/shell';
import { WelcomePageComponent } from './features/welcome/welcome';
import { LoginPageComponent } from './features/login/login';
import { RegisterPageComponent } from './features/register/register';
import { HomePageComponent } from './features/home/home';
import { BudgetPageComponent } from './features/budget/budget';
import { EntriesPageComponent } from './features/entries/entries';
import { ReportsPageComponent } from './features/reports/reports';
import { CreditCardPageComponent } from './features/credit-card/credit-card';
import { ProfilePageComponent } from './features/profile/profile';
import { authGuard, guestGuard } from './core/auth/auth.guard';

/**
 * Public area — welcome for signed-out users, login and registration.
 * guestGuard sends already-signed-in users to the protected home screen,
 * so the root path ("/") gives a public welcome exactly when signed out.
 */
const publicRoutes: Routes = [
  { path: '', component: WelcomePageComponent, canActivate: [guestGuard] },
  { path: 'login', component: LoginPageComponent, canActivate: [guestGuard] },
  { path: 'register', component: RegisterPageComponent, canActivate: [guestGuard] },
];

/**
 * Protected app shell — every primary screen requires a live session.
 */
const protectedRoutes: Routes = [
  { path: 'home', component: HomePageComponent, canActivate: [authGuard] },
  { path: 'budget', component: BudgetPageComponent, canActivate: [authGuard] },
  { path: 'entries', component: EntriesPageComponent, canActivate: [authGuard] },
  {
    path: 'sip-plans',
    loadComponent: () =>
      import('./features/sip-plans/sip-plans').then((m) => m.SipPlansPageComponent),
    canActivate: [authGuard],
  },
  { path: 'reports', component: ReportsPageComponent, canActivate: [authGuard] },
  { path: 'credit-card', component: CreditCardPageComponent, canActivate: [authGuard] },
  { path: 'profile', component: ProfilePageComponent, canActivate: [authGuard] },
  // Internal-only design system gallery. The route itself only exists in
  // development builds (environment file replacement), so production bundles
  // contain neither the route nor the component.
  ...environment.extraRoutes,
];

export const routes: Routes = [
  { path: '', component: AuthLayoutComponent, children: publicRoutes },
  { path: '', component: AppShellComponent, children: protectedRoutes },
  { path: '**', redirectTo: '' },
];
