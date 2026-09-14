# Production Monitor Edge Compatibility

Date: 2026-09-14

Scope: Rupantar Homes production monitoring only. These changes do not modify the public or Admin UI, application data flow, Supabase schema/RLS/RPC/Auth behavior, Cloudinary lifecycle, forms, content, or Cloudflare application runtime.

## Incident

After operational hardening was merged, the production baseline workflow passed, and the direct production health/Home/Work-cover probes passed. The GitHub-hosted Playwright browser nevertheless timed out waiting for the Home `Recent Works` marker on every retry. This opened production-monitor incident #148 even though the direct production checks were healthy.

The first edge-compatibility follow-up fixed that original render timeout. Its post-merge monitor then demonstrated that both the 390px mobile and 1440px desktop application flows could pass repeatedly, but the workflow still failed because of two monitor-only defects:

1. Playwright `extraHTTPHeaders` sent `cache-control`/`pragma` to cross-origin Google Font requests, causing CORS errors that the site itself did not generate.
2. the Works image assertion checked `complete`/`naturalWidth` immediately instead of waiting for network decode, producing intermittent false failures.

The run also showed Cloudflare Browser Insights/edge-injected script attempts being blocked by the site's existing `script-src 'self'` CSP. The CSP remains unchanged; the monitor must not weaken production security merely to silence platform telemetry.

## Accepted monitor behavior

The monitor remains read-only and fail-closed for real production failures.

- `/api/health` must return a healthy database result when direct access is available.
- `/api/public-home` must return exactly six Home Works when direct access is available.
- returned Work cover URLs must resolve as images.
- the production root must return an HTML application shell with the React root mount.
- a same-origin production application entry script must resolve as non-empty JavaScript.
- the mobile and desktop browser smoke checks Home, six Recent Work cards and decoded images, Works/list/detail behavior, Blog/post navigation, direct refresh, and both Back-to-Posts controls whenever the GitHub browser is admitted by the edge.
- Playwright no longer injects global cache-control headers into third-party requests.
- critical Works/detail images are given up to 15 seconds to decode before the monitor fails them.
- same-origin HTTP 5xx responses remain explicit failures.
- JavaScript `pageerror` events remain explicit failures.
- application console errors remain failures, while only narrowly identified browser/platform noise is ignored: browser-generated `Failed to load resource` messages (network health is checked with URL-aware probes), Cloudflare Browser Insights CSP messages, and edge-injected inline-script CSP messages. The application HTML contains no inline scripts.
- a browser timeout is not accepted as an edge-policy event by itself. The monitor must observe a 401/403 edge response or a recognizable Cloudflare challenge page.
- the edge-aware fallback may pass only when all strict direct evidence is green: health, Home payload/Work covers, application shell, and application entry script.
- if that strict fallback evidence is incomplete, an edge-blocked browser run still fails and opens/keeps the incident.
- no production write method is introduced.

## Protected fingerprints

The currently accepted monitor-only protected-object fingerprints are:

- `scripts`: `834a3e512b6bc44c7066ee0cafedeaa94e666c61`
- `tests`: `23c6895fb7ca0aefc3ac853e715850b8ac9e3783`

All application/UI, backend, Supabase, Cloudinary, package, public-asset, and workflow fingerprints remain unchanged from production main at the start of the clean-signal follow-up.

## Acceptance

Before merge, the exact PR head must pass the Production Baseline workflow. After merge, the push-triggered Production Monitor must pass against production. A successful recovery run is expected to comment on and close incident #148 automatically through the existing monitor workflow.
