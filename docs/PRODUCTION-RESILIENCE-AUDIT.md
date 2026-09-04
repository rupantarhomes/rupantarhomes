# Production resilience audit and review candidate

Baseline: `fb79c3347228e956943ff8cecba9c52653733792` (remote main, rechecked before finalization).
Branch: `codex/production-resilience-hardening`. **Not a production deployment or a merge approval.**

## Scope and evidence

Inspected entry HTML/module order, React startup, intro, enhancers, public/Admin route handling, lazy imports, repository adapters and writes, Work media/gallery, Blog links, public forms, auth/session checks, Cloudflare Functions and headers, migration history, production lock, workflow and regression contracts. Repository references confirm project `gmtdqeskyvdvyibccxwt` and Work folder `rupantar-homes/works`. No live database definition, credential, account setting or production record was changed; repository contracts are not a fresh attestation of live provider settings.

The following is the failure map at the starting SHA. Protection describes the existing code, not a guarantee against all outages.

| Failure mode / evidence | Severity / type | Protection at baseline | Disposition |
| --- | --- | --- | --- |
| Public page render or lazy-import rejection reaches the sole root boundary (`client-entry.tsx`, `site.tsx`) and replaces navigation/footer | High / runtime, network | Partially protected: visible root recovery, but whole-app blast radius | Add a page boundary; retain shell and parent state; reset only on route change |
| Optional `BrandIntro` render/effect failure also replaces the whole app | High / startup, browser compatibility | Unprotected at optional-surface level | Nested null fallback, existing console diagnostics; timing and healthy DOM unchanged |
| Admin tab render failure reaches root, unmounting sibling tabs and parent drafts (`admin.tsx`) | High / runtime | Partially protected: root fallback, no tab containment | Tab boundary below navigation plus lazy-portal boundary below parent state; no persistence changes |
| Rejected idle/intent/early chunk warming has no rejection handler (`site.tsx`, `public-performance.ts`) | Medium / network | Unprotected | Log and handle speculative rejection; real lazy imports still reject into a visible boundary |
| Unexpected rejection of initial session discovery lacks a catch (`site.tsx`) | Medium / auth, network | Partially protected: normal SDK error responses handled in repository | Catch/log while mounted; do not grant access, change credentials or invent a session |
| Empty/missing protected-object manifest can pass `verify-production-lock.mjs` without checking omitted paths | High / build-time, operational | Unprotected: only supplied keys checked | Require all existing protected paths, schema and literal SHA values before Git comparison |
| Vite output/declared local media missing; previous tests checked entry markup, not every literal asset/chunk | High / deploy-time, media | Partially protected: compiler resolves imports, not all public asset strings | New artifact reference tests, including dynamic chunk/preload literals and all 16 hero image paths |
| Direct-entry/refresh fallback regresses while route strings still exist | High / navigation, deploy-time | Partially protected: parser/source tests, no built deep-link serving test | Execute parser and serve built SPA locally on 11 route shapes twice; hosting rules remain external |
| Existing browser upload fixture returns shared last-issued ID for simultaneous uploads | Medium / test reliability | Unprotected against concurrency introduced by current uploader | Fixture returns each request's submitted public ID; no application/upload changes |
| Missing root/initial entry download or exception above inner boundaries | High / startup | Partially protected: root existence check and root boundary; no JS can recover if JS never loads | Keep root fallback; artifact checks help, external availability monitoring still needed |
| Homepage shell reads use one `Promise.all` for Works/Reviews/Settings (`loadPublicContent`) | Medium / network, data | Partially protected: rejection logged, current shell retained; optional failure prevents other fresh results applying | Leave data freshness/fallback policy unchanged rather than silently substitute invented results |
| Works/Blog list and direct-detail reads fail, or stale reads resolve after navigation | Medium / network, navigation | Protected: request generations, pinned details, Works cache/in-flight dedupe, explicit list/detail failure states | Preserve; existing regressions remain green |
| Missing linked Work/Blog or no Work images | Low / data, media | Protected: conditional Blog project card, nullable link resolution, gallery empty state; errors logged | Preserve Work.blog_url and existing URL resolution; no guessed relationships |
| Runtime malformed text/row reaches a render consumer (for example Blog body split) | Medium / data | Partially protected: DB constraints/types and adapter normalization are not universal runtime validation | Surface containment now limits impact; do not invent public copy or rewrite adapters/schema |
| Review carousel/enhancer or hero fails inside HomePage | Medium / runtime, media | Partially protected: hero fallback/preloading and timer cleanup; page-level boundary only | Hero/review code and appearance unchanged; homepage failure preserves navigation, not every homepage section |
| Admin session expiry, revocation, focus storms or provider outage | High / auth | Protected: membership verification, single-flight revalidation, interval/focus cleanup, transient failure distinct from revocation | Keep existing authorization and session behavior; add only startup rejection diagnosis |
| Work save/delete races, overlapping mutation/upload, ambiguous save failure or abandoned draft | High / data, media | Protected: immutable snapshots, mutual-exclusion refs, atomic RPC, claims/advisory locks, draft registry/expiry, DB-first cleanup | No repository, RPC, migration, Cloudinary or timing changes |
| Partial upload batch failure or unexpected Cloudinary response | High / network, media | Protected: six cap, ordered bounded concurrency, response validation, rollback; cleanup failure logged/retried | Preserve; real browser mocked lifecycle and Node upload tests pass |
| Blog/Review/Settings/Lead write fails or returns no saved row | High / data | Protected: checked writes, errors shown, state updated only on confirmation; Settings require confirmed live row | No write changes; tests are local fixtures/source contracts, not production content testing |
| Inquiry retries duplicate leads or notification failure loses accepted inquiry | High / network, data | Protected: server mediation, bounded calls, idempotency key/RPC, DB authoritative before secondary Web3Forms notification | No form/API change; no test inquiries sent to production |
| Missing build-time Supabase env renders existing defaults rather than live content | High / deploy-time | Partially protected: configured flag, server require-env, health endpoint; build itself can run without production keys | Report external env verification; do not add CI secrets or change existing fallback content policy |
| DOM enhancement runtime and browser lifecycle | Medium / runtime | Partially protected: public/Admin isolation and idempotent insertion; document/root scans remain; public click handler is removed on pagehide without pageshow reinstall | Leave behavior-sensitive enhancer/BFCache changes for a separately scoped follow-up; no observer rewrite |
| Browser-specific rendering/scroll/keyboard regressions | Medium / browser compatibility | Partially protected: scoped mobile/iOS rules, gallery keyboard/swipe/scroll contracts | Existing mocked browser suite passes at eight widths; Edge emulation is not physical Safari verification |
| Deploy proceeds outside checks; stale open tabs request removed hashed chunks; production data/provider outage | High / operational, deploy-time | Partially protected: workflow/lock, recoverable lazy failure, health/runbook | External branch/Pages gates, deploy SHA and uptime checks remain necessary; no account/config changes |
| Dependency graph varies between installs | Medium / build-time | Partially protected: direct versions pinned; no committed npm lockfile; ESLint config references packages not installed by package.json | No dependency changes; record this limitation rather than claiming reproducible dependency resolution or lint success |

## Small changes and blast radius

- `app/rupantar/error-boundary.tsx`: reuse the existing fallback; optional fallback and route/tab reset. No new DOM on the healthy path, no retry loop or new library.
- `app/client-entry.tsx`: isolate only the optional intro. Original root boundary, intro timing and initialization order retained.
- `app/rupantar/site.tsx`: public-content/lazy Admin containment under parent form/session state; catch rejected speculative loads and initial session discovery. Routes, fetches, handlers, validation and data values unchanged.
- `app/rupantar/admin.tsx`: one DOM-transparent boundary around the existing tab body. Navigation/logout and parent-owned drafts stay mounted when a tab throws.
- `app/public-performance.ts`: handle the two existing warm-import rejections. Same schedule, modules and image warming.
- `scripts/verify-production-lock.mjs`: reject omitted protection/schema/fingerprint corruption before the existing HEAD comparisons. New protected paths can still be added; existing ones cannot silently disappear.
- New Node tests cover the above plus built local references and direct entries. New optional browser test injects page/tab/intro/chunk failures through local request interception. The existing gallery fixture now models concurrent IDs correctly.

All implementation changes are one small frontend containment/gate risk class; no separate backend, database, media contract or deployment architecture change is bundled into the candidate.

## Verification record

- Six new assertions failed against vulnerable baseline behavior before implementation; all pass after the fix. Existing tests were not deleted or relaxed.
- `npm run verify`: TypeScript PASS, production build PASS, **105/105 Node tests PASS**.
- `node scripts/check-frontend-behavior-diff.mjs --self-test`: PASS. Exact committed-head comparison and lock must also pass before PR publication.
- Built SPA deep visits/refresh: `/`, `/about`, `/contact`, `/privacy`, `/works`, `/works/interior-design`, `/works/interior`, `/works/interior/fixture-project`, `/blog`, `/blog/fixture-story`, `/admin`. These confirm local serving/parser contracts, not live fixture records or external Cloudflare routing rules.
- Browser `tests/e2e/runtime-resilience.mjs`: PASS at 390/1440 public failure/back/forward; optional intro failure; rejected chunk failure with no unhandled rejection; Admin tab navigation and unsaved sibling draft preserved.
- Browser `tests/e2e/work-image-gallery.mjs`: PASS at 320, 375, 390, 393, 414, 430, 1280 and 1440 widths. Square stack, contained viewer, controls/scroll/focus and six Admin slots preserved. Synthetic six-image upload/save/edit/remove lifecycle passes. No production request or asset created.
- Browser runner is environment-supplied Playwright/Edge, not a new dependency or mandatory network-sensitive CI job. Node gates run in existing `npm test`/Production Baseline workflow.
- First baseline test run found Windows checkout CRLF conversion of the immutable HTML reference. Restoring its exact committed LF bytes restored the existing hash test; no reference asset/test assertion is changed in the commit.
- Initial JS: **336.95 -> 337.73 kB**, gzip **104.96 -> 105.12 kB** (Vite-reported values; about +0.16 kB compressed). Admin chunk 35.50 -> 35.54 kB. All CSS artifact hashes unchanged. Same chunk count; no new dependency, startup fetch or synchronous data work. These are build measurements, not device speed benchmarks.
- No standalone lint script/dependencies are present; lint is not claimed. Strict TypeScript and all supported existing gates run.

## Release/incident checklist (read-only production verification)

1. Before any separately approved merge, record exact PR head, base SHA, changed paths and the successful Production Baseline run for that head. If main advances, update/review the candidate and recompute only changed fingerprints; do not accept stale green checks.
2. Confirm externally that main requires review and Production Baseline, and that Cloudflare production deployments cannot promote a failed/unreviewed candidate. Repository workflow alone cannot enforce account settings.
3. In Cloudflare's deployment record, compare deployment environment, Git commit and successful status with approved main. Record the immutable deployment URL. A 200 homepage or health response alone does not identify the deployed SHA.
4. Read homepage and `/api/health`, check served index script/CSS URLs against the approved build, and visit/refresh existing public Work/Blog URLs and `/admin`. Use only existing records, no disposable production writes. Check mobile/desktop and console/network failures.
5. If this frontend-only candidate causes an incident, use Cloudflare's existing rollback to the recorded last-good deployment, or a reviewed Git revert through the normal main workflow. Do not reset main, change DB data, replay migrations or delete media. The starting main SHA above is the code comparison/rollback reference, not proof of which deployment was live.
6. Attach error/stack and failing chunk URL, browser version, route, deployment SHA and status to the incident. No keys, session tokens or private form payloads in reports. Existing console diagnostics are retained, not a new monitoring vendor.

The artifact scanner checks literal local references and emitted chunks, not arbitrary computed URLs, external image existence or provider configuration. React boundaries do not catch event-handler/async exceptions generally, and cached rejected lazy modules may still require the existing Reload action. Core Site/header failures still use the root fallback. These limits are explicit; the candidate is not a claim that the site cannot break.
