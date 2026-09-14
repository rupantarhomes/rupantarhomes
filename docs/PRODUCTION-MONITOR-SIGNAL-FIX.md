# Production Monitor Signal Fix — 2026-09-14

## Scope

This is an operational-only Rupantar Homes change. It does not change the public UI, application behavior, database schema, authentication, Cloudinary behavior, or Cloudflare security policy.

## Observed failure

The post-merge production monitor could complete the real Home, Works, Work detail, and Blog browser journeys but still fail because the synthetic Playwright context was adding global `cache-control` / `pragma` headers to every request. Those headers reached cross-origin font requests and caused CORS failures. The monitor also treated all browser console errors as production failures, including Content Security Policy noise from blocked third-party Cloudflare Insights/injected scripts.

The direct Node probes can independently receive HTTP 403 from edge bot policy while the normal Playwright browser is admitted and successfully exercises the site.

## Accepted correction

- Remove global extra HTTP headers from the Playwright browser context so cross-origin resources use normal browser request headers.
- Keep page/runtime exceptions fatal.
- Keep same-origin HTTP 4xx/5xx responses fatal, except 401/403 responses that are already handled by the explicit edge-policy classifier.
- Treat browser-console errors as diagnostic warnings instead of authoritative failures when the explicit functional assertions pass.
- Wait for the first eager Works images to finish decoding before asserting their decoded state, removing a race without weakening the image checks.
- Preserve the strict edge fallback: if the browser itself is blocked, all direct health/home/shell/app-entry evidence must be present before a fallback can pass.

## Verification requirement

The production baseline workflow must pass before merge. After merge, the scheduled/push production monitor must pass against `https://rupantarhomes.com`; the existing production-monitor incident can then be closed by the workflow.

Accepted `scripts` fingerprint for this scoped change: `26e276627e7989c36e2bb192a263071f1bab4389`.
