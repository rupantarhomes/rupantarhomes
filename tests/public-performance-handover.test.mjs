import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("critical public origins and first hero asset are warmed from the entry document", async () => {
  const html = await read("../index.html");
  assert.match(html, /rel="dns-prefetch" href="\/\/gmtdqeskyvdvyibccxwt\.supabase\.co"/);
  assert.doesNotMatch(html, /rel="preconnect" href="https:\/\/gmtdqeskyvdvyibccxwt\.supabase\.co"/);
  assert.match(html, /rel="preconnect" href="https:\/\/res\.cloudinary\.com"/);
  assert.match(html, /href="\/hero-real-1-mobile\.webp"[^>]*fetchpriority="high"/);
  assert.match(html, /href="\/hero-real-1-v2\.webp"[^>]*fetchpriority="high"/);
  assert.ok(html.indexOf("/app/public-performance.ts") < html.indexOf("/app/client-entry.tsx"));
});

test("first-visit brand intro follows the calm red, reveal, hold, and upward-exit sequence", async () => {
  const intro = await read("../app/rupantar/brand-intro.tsx");
  const css = await read("../app/globals.css");
  const html = await read("../index.html");
  assert.match(intro, /const blankDelay = 400/);
  assert.match(intro, /const revealDuration = reduceMotion \? 0 : 700/);
  assert.match(intro, /const holdDuration = 1_800/);
  assert.match(intro, /const exitDuration = reduceMotion \? 40 : 1_000/);
  assert.match(intro, /const exitDelay = blankDelay \+ revealDuration \+ holdDuration/);
  assert.match(intro, /const removeDelay = exitDelay \+ exitDuration/);
  assert.match(intro, /document\.documentElement\.classList\.remove\("brand-intro-pending"\)/);
  assert.match(intro, /style=\{\{ pointerEvents: "none" \}\}/);
  assert.match(html, /<html lang="en" class="brand-intro-pending">/);
  assert.match(html, /html\.brand-intro-pending body \{ margin: 0; background: #ff1a3d; \}/);
  assert.match(css, /\.brand-intro--leaving \{[\s\S]*?transform: translateY\(-108%\) scale\(1\.015\)/);
  assert.match(css, /transform 950ms cubic-bezier\(0\.76, 0, 0\.24, 1\)/);
  assert.match(css, /brand-intro-content-reveal 700ms 400ms/);
  assert.doesNotMatch(css, /\.brand-intro--leaving \.brand-intro__content/);
  assert.doesNotMatch(css, /@keyframes brand-intro-(?:mark|copy)/);
});

test("public delivery has one network-aware route warmer and React-owned detail cross-links", async () => {
  const [runtime, site, html, blogs, pages, navigation] = await Promise.all([read("../app/public-performance.ts"), read("../app/rupantar/site.tsx"), read("../index.html"), read("../app/rupantar/blog-pages.tsx"), read("../app/rupantar/public-pages.tsx"), read("../app/public-navigation.ts")]);
  assert.doesNotMatch(runtime, /import\("\.\/rupantar\/public-pages"\)|import\("\.\/rupantar\/blog-pages"\)/);
  assert.match(site, /function prefetchPublicPageModules\(\)[\s\S]*shouldWarmPublicRoutes\(\)[\s\S]*loadPublicPages\(\)[\s\S]*loadBlogPages\(\)/);
  assert.match(site, /requestIdleCallback\(prefetchPublicPageModules, \{ timeout: 900 \}\)/);
  assert.match(site, /window\.setTimeout\(prefetchPublicPageModules, 450\)/);
  assert.doesNotMatch(runtime, /\.rh-recent-work-card img|image\.loading = "eager"/);
  assert.doesNotMatch(html, /public-performance\.ts/);
  assert.doesNotMatch(blogs, /onWork/);
  assert.doesNotMatch(pages, /onBlog/);
  assert.match(navigation, /document\.addEventListener\("click", onDedicatedLink/);
  assert.match(navigation, /window\.dispatchEvent\(new PopStateEvent\("popstate"\)\)/);
});

test("public pages do not run admin scans and DOM observers stay inside the app root", async () => {
  const adminEnhancer = await read("../app/rupantar/admin-leads-enhancer.ts");
  assert.match(adminEnhancer, /if \(window\.location\.pathname !== "\/admin"\) return;/);
  for (const path of ["../app/rupantar/work-media-enhancer.ts", "../app/rupantar/social-links-enhancer.ts"]) {
    const source = await read(path);
    assert.match(source, /if \(window\.location\.pathname\.startsWith\("\/admin"\)\) return;/);
    assert.match(source, /const root = document\.getElementById\("root"\)/);
    assert.match(source, /observer\.observe\(root, \{ childList: true, subtree: true \}\)/);
    assert.doesNotMatch(source, /observer\.observe\(document\.body/);
  }
  const footer = await read("../app/footer-admin-link.ts");
  assert.match(footer, /observer\.observe\(root, \{ childList: true, subtree: true \}\)/);
  assert.doesNotMatch(footer, /observer\.observe\(document\.body/);
});

test("non-Home routes warm Blog data and prioritize only the visible Works row", async () => {
  const [site, pages] = await Promise.all([
    read("../app/rupantar/site.tsx"),
    read("../app/rupantar/public-pages.tsx"),
  ]);
  assert.match(site, /if \(page === "blog" \|\| page === "blog-detail"\) \{[\s\S]*?loadPublicBlogs\(\)/);
  assert.match(pages, /visibleWorks\.map\(\(work, index\) =>/);
  assert.match(pages, /eager=\{index < 3\}/);
  assert.match(pages, /widths=\{\[320, 480, 768\]\}/);
  assert.match(pages, /fetchPriority="high"[\s\S]*?decoding="async"/);
});
