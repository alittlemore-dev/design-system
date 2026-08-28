import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';

import type { DemoRequestContext } from './app/app.config.server';

const browserDistFolder = join(import.meta.dirname, '../browser');
const app = express();
const angularApp = new AngularNodeAppEngine();
const serveBrowserAsset = express.static(browserDistFolder, {
  maxAge: '1y',
  index: false,
  redirect: false,
});

function createContentSecurityPolicy(nonce: string): string {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    `script-src 'self' 'nonce-${nonce}'`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "form-action 'self'",
  ].join('; ');
}

async function addScriptNonce(angularResponse: Response, nonce: string): Promise<Response> {
  if (!angularResponse.headers.get('content-type')?.includes('text/html')) return angularResponse;
  const html = await angularResponse.text();
  const nonceHtml = html.replace(/<script(?![^>]*\bnonce=)(?=[\s>])/g, `<script nonce="${nonce}"`);
  const headers = new Headers(angularResponse.headers);
  headers.delete('content-length');
  return new Response(nonceHtml, {
    status: angularResponse.status,
    statusText: angularResponse.statusText,
    headers,
  });
}

app.disable('x-powered-by');
app.use((request, response, next) => {
  const cspNonce = randomBytes(18).toString('base64');
  response.locals['cspNonce'] = cspNonce;
  response.setHeader('Content-Security-Policy', createContentSecurityPolicy(cspNonce));
  next();
});

app.use((request, response, next) => {
  if (request.path.endsWith('.html')) {
    response.status(404).type('text/plain').send('Not Found');
    return;
  }
  serveBrowserAsset(request, response, next);
});

app.use((request, response, next) => {
  const cspNonce = response.locals['cspNonce'];
  if (typeof cspNonce !== 'string') {
    next(new Error('CSP nonce middleware did not initialize the request.'));
    return;
  }
  const requestContext: DemoRequestContext = { cspNonce };
  angularApp
    .handle(request, requestContext)
    .then(async (angularResponse) => {
      if (angularResponse === null) {
        next();
        return;
      }
      const nonceResponse = await addScriptNonce(angularResponse, cspNonce);
      writeResponseToNodeResponse(nonceResponse, response);
    })
    .catch(next);
});

if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = Number(process.env['PORT'] ?? 4000);
  app.listen(port, '127.0.0.1', (error) => {
    if (error) throw error;
    console.log(`Design-system demo listening on http://127.0.0.1:${port}`);
  });
}

export const reqHandler = createNodeRequestHandler(app);
