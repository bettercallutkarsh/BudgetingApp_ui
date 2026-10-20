import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors, withXsrfConfiguration } from '@angular/common/http';
import {
  provideTablerIcons,
  IconHome,
  IconWallet,
  IconReceipt,
  IconChartBar,
  IconUser,
  IconCreditCard,
  IconMenu2,
  IconX,
  IconPalette,
  IconEye,
  IconEyeOff,
  IconCheck,
  IconLogout,
} from '@tabler/icons-angular';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([authInterceptor]),
      withXsrfConfiguration({
        cookieName: 'XSRF-TOKEN',
        headerName: 'X-XSRF-TOKEN',
      }),
    ),
    provideTablerIcons({
      IconHome,
      IconWallet,
      IconReceipt,
      IconChartBar,
      IconUser,
      IconCreditCard,
      IconMenu2,
      IconX,
      IconPalette,
      IconEye,
      IconEyeOff,
      IconCheck,
      IconLogout,
    }),
  ],
};
