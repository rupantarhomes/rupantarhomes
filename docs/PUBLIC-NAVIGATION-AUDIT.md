# Public navigation reliability audit — 2026-09-11

Baseline inspected: `3426a984b15292995340b8a843fdc7380788ab04` (current main at audit start).
Its production-lock verifier, TypeScript, production build and all 110 existing regression tests passed before edits.
Branch: `reliability/public-navigation-cache`.

## Evidence and limits

The production browser was used to inspect Home, All Works, a Work detail, and its linked Blog article. Home showed live Works after its initial read. Home → All Works briefly showed the existing content-area `Loading page` fallback while the header/footer remained. Work → linked article navigated successfully. These observations do not quantify latency.

The available browser API supports DOM, screenshots and navigation, but has no advertised viewport emulation, throttling, network tracing or profiler. Its read-only evaluation scope does not expose `performance` (attempt returned undefined). No desktop/mobile timing, React render counts, long-task, image-decode or layout-shift measurements are claimed. The Node tests below execute actual application handler closures with controlled promises and state; they are not browser or React-renderer tests. Optional standalone Playwright suites were not run because this session requires the provided browser surface.

## Root-cause map

| Path / issue | Baseline code evidence | Change and deterministic evidence |
| --- | --- | --- |
| Works → Home → Works | `refreshContent` cleared both Works page cache and pending-request map on every Home visit. | Home no longer evicts Works; the repeated fresh route renders the original complete page with no additional repository read. |
| Cold non-Home → Home before shell completion | Startup called `loadPublicContent` independently of `refreshContent`; neither deduplicated. | Both use `refreshContent` and one shared pending public read. Controlled baseline: 2 shell reads; fix: 1. |
| Rapid Blog navigation | `refreshBlogs` had a request ID but no shared pending read. | Controlled baseline: 2 Blog list reads; fix: 1. Request IDs still protect view state. |
| Work → Home → browser Back | Work history searched only `worksRef`, now replaced by six Home records. Previously fetched Work outside that list was unavailable. | Confirmed list and Home reads seed per-Work records in the data layer. History restores the correct record without network when fresh. |
| Detail A → uncached B via history/cross-link | `setPage('work-detail'/'blog-detail')` did not clear the previous selected record before awaiting B. | Destination selection is synchronously its cached record or null; obsolete requests cannot replace a newer route. |
| Pending category → another public route | Some navigation paths did not advance the list request ID. An old list could update shared Works after departure. | All public route entry handlers invalidate obsolete list consumers; data can still fill cache for a later visit. |
| Blog list refresh → Post | `openBlog` invalidated the Blog request, potentially preventing its `finally` from clearing loading. | Navigation no longer cancels shared Blog list ownership; only mutations invalidate the list response. |
| Work project story → Blog article | Work detail read article data only for its title, bypassing the site's article cache. | Both consume the same public article resource. |
| Revisit Blog post | Reverse Work link lookup ran on each article mount and began at null. | Shared deduplicated resource, cached initial value, 30-second freshness and invalidation after Work mutation. |

Four focused handler tests were also run against the original main's actual `site.tsx` using `NAVIGATION_BASE_REF=3426a984b15292995340b8a843fdc7380788ab04`: all four failed for the expected concrete assertions (lost Works page, previous selected detail retained, duplicate Blog read, duplicate shell read). They pass with the changed source. Existing tests were not weakened or removed.

## Navigation and rendering pipeline

- `routes.ts` owns unchanged URL parsing/encoding. React handlers push the URL and set page state synchronously. Neither the original nor changed ordinary navigation awaits a remote request before changing page state; the proven faults concern lost/duplicated data and selected content, not a universal blocking `navigate()`.
- `applyBrowserRoute` handles startup, `popstate`, and the existing public cross-link bridge. Its request ID prevents old detail completions from changing the destination. It now also invalidates old list consumers and immediately selects cached detail data.
- `public-performance.ts` bridges ordinary, unmodified internal Work/Blog detail anchor clicks to pushState/popstate. External links, modifiers, downloads and new tabs retain their existing behavior. Existing Admin exits and explicit error-page Retry remain document reloads by design.
- `client-entry.tsx` wraps pushState and handles popstate with the accepted double-animation-frame top reset. Route handlers retain the existing smooth scroll. `navigation-precision.ts` separately waits for the estimate target; this is unchanged. Back/Forward continue the accepted top-of-page behavior, not native per-entry scroll-position restoration.
- Home and destination components still unmount/mount according to page selection. Gallery retains its Work ID key. No kept-alive hidden Home, router dependency or animation changes were introduced. Fewer repeated data completions can avoid associated state updates, but no measured render/remount reduction is claimed.
- Existing effects use stable callback dependencies. The independent startup shell implementation is removed. Data freshness/dedupe belongs to `public-data.ts`; React state and refs are displayed snapshots and current-route guards.

## Public read ownership and freshness

`public-data.ts` is the single owner for document-local public read caching. It wraps the existing repository functions without changing queries, Supabase configuration, schema, RPC, RLS or Auth.

- Freshness is **30 seconds from confirmation**, tested with an injected clock. Fresh entries make no remote read. Cached Works lists and details remain visible during stale revalidation. Home always restores its confirmed snapshot before starting revalidation; initial production Home remains empty until live content is confirmed.
- Identical pending keys share one promise. Entries are scoped by category, offset or slug, with separate Home and Blog-list keys. Failed cold reads are retryable; failed refreshes retain the previous snapshot.
- Entry identity rejects invalidated pending reads. Monotonic revisions prevent an older list response from overwriting a newer detail. A newer confirmed list can satisfy an older detail request safely.
- Confirmed Work save/delete invalidates Work pages, Work details, reverse Blog links and Home. Blog save/delete invalidates Blog resources. Review/Settings mutations invalidate Home. Existing mutation request IDs still protect view state. The Admin complete Works collection bypasses public caching; Admin Blog refresh also uses the raw repository.
- There is no persisted/localStorage cache. A document reload starts empty. Up to 128 settled entries are retained; pending entries may temporarily exceed that bound and are trimmed on settlement. Evicted destinations can require a cold read.
- Obsolete requests are invalidated logically, not physically aborted at the network layer, because other route consumers may share them. No speculative data-prefetch traffic was added.

## Broader performance inspection and preserved behavior

| Area | Inspection result / action |
| --- | --- |
| Supabase query graph | Home starts Works, reviews and Settings concurrently. Works and direct Work reads then fetch images after IDs are known. These cold-request dependencies are unchanged; warm cached reads avoid invoking that graph. Home confirmation still requires the full existing content result. |
| Request accounting | A normal nonempty raw Home read executes Works + images + reviews + Settings (4 reads); raw Works/detail executes Works + images (2). Repeated fresh Home/Works now avoid those read invocations. These counts are derived from unchanged repository code and controlled loader tests, not captured production network logs. |
| Modules | Admin UI is already lazy. Public and Blog chunks are warmed by two existing entry points; ESM deduplicates the modules. No evidence supported replacing this with more prefetch or eager loading. First-ever lazy route resolution can still show the existing localized fallback. |
| Build size | Baseline entry: 337.99 kB raw / 105.16 kB gzip. Changed entry: 339.87 kB / 105.85 kB. Total new cache logic is small; no dependency added. Main CSS remains 98.73 kB / 16.08 kB, with the same content hash. |
| Global Admin helpers | Mobile-lock script and Admin enhancer are still globally loaded; paths/guards and history wrappers inspected. Admin UI chunk remains 35.54 kB raw. No measured main-thread cost justified a risky extraction. |
| Images | Existing responsive Home hero, Work cover transforms, bounded gallery preload and 9:16 gallery retained. Images decode/load independently of route state. Device and network delays remain possible. |
| Fonts | Existing external Google Fonts stylesheet, preconnects and `display=swap` retained. No font substitutions or typography changes. |
| Observers/listeners | Work media enhancer batches scans into animation frames; copy/review/footer/Admin observers also run on DOM changes. Existing idempotency and routing hooks inspected. No long-task evidence available to justify rewriting visual enhancers. |
| CSS/rendering | Existing hover filters, shadows, motion and scroll-linked effects retained. No layout, animation or GPU-performance improvement claimed without profiling. |
| Browser cache | Vite assets are content-hashed; existing asset response policy is one day. Cache configuration and security headers unchanged. |
| Forms/security | No changes to form payloads, submission handlers, backend Functions, Supabase, Cloudinary uploads/deletes, security headers or credentials. Cache invalidation occurs only after the already-authorized application mutation succeeds. |

## Verification matrix

| Scenario | Controlled handler/data tests | Browser preview |
| --- | --- | --- |
| Home → Recent Work → Home | Confirmed content and immediate route selection tested | Passed at desktop viewport |
| Home → All Works → Work → Back | Fresh lists/detail reuse and history tested | Passed at desktop viewport |
| Home → Category → Work → Home | List request ordering and Home protection tested | Passed at desktop viewport |
| Blog → Post → Blog/Home | Reuse, loading completion and history tested | Passed at desktop viewport |
| Work → linked Blog / Blog → linked Work | Article/resource sharing and reverse-link invalidation tested | Passed at desktop viewport |
| Work → related Work | Same `openWork` path; related construction Work clicked | Passed at desktop viewport |
| Back/Forward through routes | Handler state and URL sequence tested | Passed at desktop viewport |
| Rapid repeated navigation | Shared in-flight requests and obsolete response protection tested | Passed at desktop viewport |
| Slow/unresolved requests | Controlled unresolved/rejected promises; no network throttling claim | Unavailable in browser API |
| Cached/expired data | Immediate snapshots, clock-controlled expiry, failure retention, no double pagination append | Cached routes passed; expiry tested in controlled tests only |
| Mobile viewport | Logic is viewport-independent; no device rendering claim | Unavailable in browser API |

Local final verification: TypeScript, production build and 125 tests pass. The under-100-ms target is not established by these tests.

## PR and desktop preview verification

PR #137, implementation head `751e7aaf6c10424ce9a83f8c8fc1bb4e8a513596`: GitHub Build and tests **SUCCESS**; Cloudflare Pages **SUCCESS**. Preview tested: https://99958839.rupantarhomes.pages.dev/ at **1348 × 936**.

Passed by actual browser interaction and destination DOM/URL checks:

- Home → Recent Work (22 × 14 ft living room) → Home, with all six confirmed Home cards restored.
- Home → All Works → construction Work → related Kapan Work → Back to Works → Home.
- Home → Home Construction category (four projects) → Ramkot Work outside Home's six → Home.
- Browser Back to the Ramkot Work and category, then Forward to the Ramkot Work and Home; each restored the expected destination.
- Home → Blog → living-room Post → Back to Blog; revisit Post → Home.
- Post → View Project Images → Work → Read More → Post. Both anchor directions stayed on the preview origin despite the stored production URL on Read More.
- Repeated Home/Blog switches ended on the requested route with confirmed data.
- A new tab opened a cold direct Ramkot Work URL: navigation shell appeared with the existing localized loader before the detail loaded; returning Home restored six confirmed cards.

The captured error log returned no non-extension errors (200-entry query). Browser extension metadata errors and a browser-session disconnect/timeout occurred; these were not classified as website errors. Checks resumed with shorter calls after reconnecting. A timed-out batch was not counted as a successful matrix run; history was checked again explicitly.

Rapid request races and expired-cache behavior are proven in controlled tests. The browser repetition check is a functional interaction check, not sub-100-ms stress testing. No mobile emulation or network throttling was available. No source code or protected object changed after this preview verification; this follow-up records evidence only. Final main build/deployment verification remains a post-merge gate.
