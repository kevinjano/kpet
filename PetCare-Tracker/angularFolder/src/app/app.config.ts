import { ApplicationConfig } from '@angular/core';
import { PreloadAllModules, provideRouter, withPreloading } from '@angular/router';
import { routes } from './app.routes';
import {provideHttpClient, withInterceptors} from '@angular/common/http';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { authInterceptor } from './auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptors([authInterceptor])),
    // Routes are lazy-loaded (see app.routes.ts) to keep the initial bundle small;
    // PreloadAllModules then fetches those chunks in the background right after
    // first paint, so later navigation feels instant instead of round-tripping.
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideNoopAnimations(),
  ]
};
