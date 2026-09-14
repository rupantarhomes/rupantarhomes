# Production Monitor Edge Compatibility

Date: 2026-09-14

Scope: Rupantar Homes production monitoring only. This change does not modify the public or Admin UI, application data flow, Supabase schema/RLS/RPC/Auth behavior, Cloudinary lifecycle, forms, content, or Cloudflare application runtime.

## Incident

After operational hardening was merged, the production baseline workflow passed, and the direct production health/Home/Work-cover probes passed. The GitHub-hosted Playwright browser nevertheless timed out waiting for the Home `Recent Works` marker on every retry. This opened production-monitor incident #148 even though the direct production checks were healthy.

## Accepted monitor behavior

The monitor remains read-only and fail-closed for real production failures.

- `/api/health` must return a healthy database result when direct access is available.
- `/api/public-home` must return exactly six Home Works when direct access is available.
- returned Work cover URLs must resolve as images.
- the production root must return an HTML application shell with the React root mount.
- a same-origin production application entry script must resolve as non-empty JavaScript.
- the mobile and desktop browser smoke still checks Home, six Recent Work cards and decoded images, Works/list/detail behavior, Blog/post navigation, direct refresh, and both Back-to-Posts controls whenever the GitHub browser is admitted by the edge.
- a browser timeout is not accepted as an edge-policy event by itself. The monitor must observe a 401/403 edge response or a recognizable Cloudflare challenge page.
- the edge-aware fallback may pass only when all strict direct evidence is green: health, Home payload/Work covers, application shell, and application entry script.
- if that strict fallback evidence is incomplete, an edge-blocked browser run still fails and opens/keeps the incident.
- console/page errors from routes that were not the edge-blocked route remain failures.
- no production write method is introduced.

## Protected fingerprints

The intentional protected-object changes for this follow-up are:

- `scripts`: `f985c4b200cf1d5a96766b12f193c8913be937f1`
- `tests`: `504cb56e443a062ed6dc98ee14d7067672db5f9f`

All application/UI, backend, Supabase, Cloudinary, package, public-asset, and workflow fingerprints remain unchanged from production main at the start of this branch.

## Acceptance

Before merge, the exact PR head must pass the Production Baseline workflow. After merge and Cloudflare deployment, the scheduled/push Production Monitor must pass. A successful recovery run is expected to close incident #148 automatically through the existing monitor workflow.
