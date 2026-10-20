import { Routes } from '@angular/router';
import { DesignPreviewPageComponent } from '../app/features/design-preview/design-preview';

export const environment = {
  production: false,
  designPreviewEnabled: true,
  extraRoutes: [
    { path: 'design-preview', component: DesignPreviewPageComponent },
  ] satisfies Routes,
};
