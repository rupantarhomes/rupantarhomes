import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("critical public origins and first hero asset are warmed from the entry document", async () => {
  const html = await read("../index.html");
  assert.match(html, /rel="preconnect" href="https:\/\/gmtdqeskyvdvyibccxwt\.supabase\.co"/);
  assert.match(html, /rel="preconnect" href="https:\/\/res\.cloudinary\.com"/);
  assert.match(html, /href="\/hero-real-1-mobile\.webp"[^>]*fetchpriority="high"/);
  assert.match(html, /href="\/hero-real-1-v2\.webp"[^>]*fetchpriority="high"/);
  assert.ok(html.indexOf("/app/public-performance.ts") < html.indexOf("/app/client-entry.tsx"));
});

test("first-visit brand intro keeps the original timing but cannot block interaction", async () => {
  const intro = await read("../app/rupantar/brand-intro.tsx");
  assert.match(intro, /const revealDelay = reduceMotion \? 180 : 1500/);
  assert.match(intro, /const removeDelay = reduceMotion \? 320 : 2500/);
  assert.match(intro, /style=\{\{ pointerEvents: "none" \}\}/);
});

test("public runtime warms route chunks after initial image work and keeps detail cross-links inside the SPA", async () => {
  const runtime = await read("../app/public-performance.ts");
  assert.match(runtime, /import\("\.\/rupantar\/public-pages"\)/);
  assert.match(runtime, /import\("\.\/rupantar\/blog-pages"\)/);
  assert.match(runtime, /requestIdleCallback\(warmPublicChunks, \{ timeout: 2500 \}\)/);
  assert.match(runtime, /}, 900\)/);
  assert.doesNotMatch(runtime, /\.rh-recent-work-card img|image\.loading = "eager"/);
  assert.match(runtime, /route\.kind !== "blog-detail" && route\.kind !== "work-detail"/);
  assert.match(runtime, /window\.history\.pushState\(null, "", path\)/);
  assert.match(runtime, /window\.dispatchEvent\(new PopStateEvent\("popstate"\)\)/);
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
