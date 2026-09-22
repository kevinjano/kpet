import { ApplicationConfig, LOCALE_ID } from '@angular/core';
import { PreloadAllModules, provideRouter, withInMemoryScrolling, withPreloading } from '@angular/router';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { routes } from './app.routes';
import {provideHttpClient, withInterceptors} from '@angular/common/http';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { authInterceptor } from './auth.interceptor';

// Without this, Angular's `date` pipe silently defaults to en-US — mostly
// unnoticeable (numeric/abbreviated formats read the same either way) until
// a spelled-out month shows up, e.g. blog-post-detail-modal's 'd MMMM yyyy'
// rendering "10 September 2026" instead of "10 septiembre 2026" on an
// otherwise fully-Spanish site.
registerLocaleData(localeEs);

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: LOCALE_ID, useValue: 'es' },
    provideHttpClient(withInterceptors([authInterceptor])),
    // Routes are lazy-loaded (see app.routes.ts) to keep the initial bundle small;
    // PreloadAllModules then fetches those chunks in the background right after
    // first paint, so later navigation feels instant instead of round-tripping.
    // withInMemoryScrolling handles plain same-page anchors; HomeComponent still
    // does its own scrollIntoView for the #conocenos link specifically, since
    // that section is behind an *ngIf and may not exist yet when Angular's own
    // fragment scroll runs.
    provideRouter(routes, withPreloading(PreloadAllModules), withInMemoryScrolling({scrollPositionRestoration: 'enabled'})),
    provideNoopAnimations(),
  ]
};
