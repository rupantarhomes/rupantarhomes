# Public Media Performance Audit

Date: 2026-09-12
Branch: `reliability/public-navigation-cache`

## Reported behavior

The client reported slow image display, general responsiveness and lag while swiping Work galleries. The investigation treated initial image readiness, background network competition and finger-tracking work as separate paths.

## Production evidence before the change

- The Home hero requested its second slideshow image immediately after mount.
- A separate runtime changed the first three Recent Work covers from lazy to eager and warmed two route chunks near startup.
- The checked five-image Work gallery mounted all five image elements. It preloaded the next two variants immediately and scheduled all remaining variants after 900 ms.
- After 2.5 seconds in the live desktop session, the first three gallery images were complete while the last two were still in progress.
- Work gallery touch movement called two React state setters repeatedly as the finger moved. The track then used a 560 ms settle transition.
- Admin enhancement logic was initialized on public routes, and Work/social/footer enhancers observed the full document body.
- Cloudinary responsive delivery was active. The checked gallery displayed at about 408 px wide and used a responsive transformed URL; this audit did not find a missing responsive-image pipeline.

## Implemented controls

| Area | Accepted behavior |
| --- | --- |
| Finger tracking | At most one direct transform write per animation frame; no React state update during touch/pointer movement |
| Gesture completion | React page index changes only after a successful swipe or explicit dot/arrow action |
| Settle animation | 320 ms using the existing easing |
| Mounted media | Current slide and one adjacent slide on each side only |
| Visible image | Eager loading with high fetch priority |
| Gallery preload | Next image only; disabled when Save-Data, 2G or slow-2G is reported |
| Home competition | Second hero request delayed 1.8 seconds; Recent Work covers keep native lazy loading |
| Code warming | Public route chunks warm after document load, a 900 ms delay and an idle callback when supported |
| DOM observers | Public observers are rooted at `#root`; Admin enhancement exits outside `/admin` |

## Preserved contracts

- Work gallery remains manual, 9:16, touch/pointer swipeable, keyboard accessible, and controllable by dots and desktop arrows.
- The branded cue, captions, metadata, layout, colors and responsive breakpoints are unchanged.
- Cloudinary continues to use `c_limit`, responsive `srcset`, `f_auto` and `q_auto:good`.
- Admin Work image upload, ordering, removal and preview behavior are unchanged.

## Verification boundary

Automated coverage verifies the frame-based drag path, absence of move-time React setters, adjacent-only mounting, next-only preload policy, visible-image priority, delayed startup work and public/Admin observer isolation. TypeScript and the production build must pass with the full suite. Browser preview checks cover rendered image attributes, arrows/dots, drag completion, vertical scrolling, route navigation and console errors. A physical mobile-device trace remains the only valid basis for device-specific frame-rate or network timing claims.

## Cold Home bootstrap

The original production Home created no Recent Work cards until the browser completed a Works query followed by a dependent Work Images query. The browser could not discover or request a cover before both database round trips finished. It also declared each compact mobile card as `100vw`, which encouraged a larger Cloudinary candidate than the three-column mobile slot required.

The Home entry now starts one `/api/public-home` request before the React entry. The Cloudflare endpoint joins each Work with its images in one PostgREST query, loads Reviews and Settings in parallel, and caches the complete validated response at the edge for 30 seconds. A successful bootstrap primes the document cache, so the browser does not repeat the original public-content request. The six current cover URLs are preloaded at low priority behind the hero with the same responsive candidates used by the rendered cards. Mobile Home cards declare `33vw` with a 160 px candidate; tablet and desktop retain their matching 50/33 percent sizing.

A validated prior response is retained locally for up to 24 hours so returning visitors render confirmed content and start its cover requests synchronously. The edge response then replaces it and remains subject to the existing 30-second freshness policy. A first-time visitor receives six fixed card shells immediately; if the edge bootstrap fails, the existing direct Supabase path remains the fallback. No demo Work is used in a configured production deployment.

The first PR #138 preview exposed a deployment-specific resilience gap: Cloudflare Preview did not inherit the production Function variables, so both `/api/public-home` and the existing `/api/health` returned 503 while the browser's configured Supabase client still worked. The early script now falls back immediately to one joined public Works/Image request plus parallel Reviews and Settings requests using the same public Vite configuration already shipped to the browser. This fallback still runs before React, validates and maps the response into the same bootstrap contract, and preloads the six covers. Production continues to prefer the cached same-origin edge response; the browser fallback exists for missing Function configuration or a transient edge failure.
