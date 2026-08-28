import {
  CSP_NONCE,
  type ApplicationConfig,
  REQUEST_CONTEXT,
  inject,
  mergeApplicationConfig,
} from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';

import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';

export interface DemoRequestContext {
  readonly cspNonce: string;
}

function requestCspNonce(): string | null {
  const context: unknown = inject(REQUEST_CONTEXT);
  if (typeof context !== 'object' || context === null || !('cspNonce' in context)) return null;
  const cspNonce = context.cspNonce;
  return typeof cspNonce === 'string' ? cspNonce : null;
}

const serverOnlyConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    { provide: CSP_NONCE, useFactory: requestCspNonce },
  ],
};

export const serverConfig = mergeApplicationConfig(appConfig, serverOnlyConfig);
