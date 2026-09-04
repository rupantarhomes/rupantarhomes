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

test("first-visit brand intro never hides the site for multiple seconds", async () => {
  const intro = await read("../app/rupantar/brand-intro.tsx");
  assert.match(intro, /const revealDelay = reduceMotion \? 60 : 180/);
  assert.match(intro, /const removeDelay = reduceMotion \? 120 : 720/);
  assert.doesNotMatch(intro, /1500|2500/);
});

test("public runtime warms route chunks, first Work covers and keeps detail cross-links inside the SPA", async () => {
  const runtime = await read("../app/public-performance.ts");
  assert.match(runtime, /import\("\.\/rupantar\/public-pages"\)/);
  assert.match(runtime, /import\("\.\/rupantar\/blog-pages"\)/);
  assert.match(runtime, /\.rh-recent-work-card img/);
  assert.match(runtime, /\.slice\(0, 3\)/);
  assert.match(runtime, /image\.loading = "eager"/);
  assert.match(runtime, /image\.fetchPriority = index === 0 \? "high" : "auto"/);
  assert.match(runtime, /route\.kind !== "blog-detail" && route\.kind !== "work-detail"/);
  assert.match(runtime, /window\.history\.pushState\(null, "", path\)/);
  assert.match(runtime, /window\.dispatchEvent\(new PopStateEvent\("popstate"\)\)/);
});
