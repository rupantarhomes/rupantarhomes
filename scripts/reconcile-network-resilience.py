from pathlib import Path
import json
import subprocess


def replace(path: str, before: str, after: str) -> None:
    target = Path(path)
    source = target.read_text()
    if before not in source:
        raise RuntimeError(f"{path}: expected fragment not found")
    target.write_text(source.replace(before, after, 1))


# Keep the early bootstrap compatible with browsers/test shims that do not expose matchMedia.
replace(
    "app/home-bootstrap-early.js",
    'const unknownMobile = !effectiveType && window.matchMedia("(max-width: 767px)").matches;',
    'const unknownMobile = !effectiveType && typeof window.matchMedia === "function" && window.matchMedia("(max-width: 767px)").matches;',
)
replace(
    "app/home-bootstrap-early.js",
    'return window.matchMedia("(min-width: 1024px)").matches ? 3 : 2;',
    'return typeof window.matchMedia === "function" && window.matchMedia("(min-width: 1024px)").matches ? 3 : 2;',
)

# Model the new React transition primitive and network policy in the navigation harness.
replace(
    "tests/helpers/public-navigation-harness.mjs",
    'useCallback(fn) { return fn; }, useEffect(fn) { effects.push(fn); }, lazy() { return () => null; },',
    'useCallback(fn) { return fn; }, useEffect(fn) { effects.push(fn); }, startTransition(fn) { fn(); }, lazy() { return () => null; },',
)
replace(
    "tests/helpers/public-navigation-harness.mjs",
    "'./cloudinary': {}, './types': {}, './shared': {}, './home-page': {}, './error-boundary': {},",
    "'./cloudinary': {}, './types': {}, './shared': {}, './home-page': {}, './error-boundary': {}, '../network-policy': { shouldWarmPublicRoutes: () => true },",
)

# The Home endpoint now owns a short fresh cache plus a longer stale safety copy.
replace(
    "tests/public-home-bootstrap.test.mjs",
    '  let cachedResponse;\n  const cache = { match: async () => null, put: async (_key, response) => { cachedResponse = response; } };',
    '  const cachedResponses = [];\n  const cache = { match: async () => null, put: async (key, response) => { cachedResponses.push({ key, response }); } };',
)
replace(
    "tests/public-home-bootstrap.test.mjs",
    '  assert.match(cachedResponse.headers.get("cache-control"), /s-maxage=30/);',
    '  assert.equal(cachedResponses.length, 2);\n  const cacheControls = cachedResponses.map(({ response }) => response.headers.get("cache-control") || "");\n  assert.ok(cacheControls.some((value) => /s-maxage=30/.test(value)));\n  assert.ok(cacheControls.some((value) => /s-maxage=86400/.test(value)));',
)

# Entry-document contract: keep DNS warm-up for the fallback Supabase path, but no unconditional TLS preconnect.
replace(
    "tests/public-performance-handover.test.mjs",
    '  assert.match(html, /rel="preconnect" href="https:\\/\\/gmtdqeskyvdvyibccxwt\\.supabase\\.co"/);',
    '  assert.match(html, /rel="dns-prefetch" href="\\/\\/gmtdqeskyvdvyibccxwt\\.supabase\\.co"/);\n  assert.doesNotMatch(html, /rel="preconnect" href="https:\\/\\/gmtdqeskyvdvyibccxwt\\.supabase\\.co"/);',
)

old_runtime_test = '''test("public runtime warms route chunks after initial image work and keeps detail cross-links inside the SPA", async () => {
  const runtime = await read("../app/public-performance.ts");
  assert.match(runtime, /import\\("\\.\\/rupantar\\/public-pages"\\)/);
  assert.match(runtime, /import\\("\\.\\/rupantar\\/blog-pages"\\)/);
  assert.match(runtime, /requestIdleCallback\\(warmPublicChunks, \\{ timeout: 2500 \\}\\)/);
  assert.match(runtime, /}, 900\\)/);
  assert.doesNotMatch(runtime, /\\.rh-recent-work-card img|image\\.loading = "eager"/);
  assert.match(runtime, /route\\.kind !== "blog-detail" && route\\.kind !== "work-detail"/);
  assert.match(runtime, /window\\.history\\.pushState\\(null, "", path\\)/);
  assert.match(runtime, /window\\.dispatchEvent\\(new PopStateEvent\\("popstate"\\)\\)/);
});'''
new_runtime_test = '''test("public delivery has one network-aware route warmer and keeps detail cross-links inside the SPA", async () => {
  const [runtime, site] = await Promise.all([read("../app/public-performance.ts"), read("../app/rupantar/site.tsx")]);
  assert.doesNotMatch(runtime, /import\\("\\.\\/rupantar\\/public-pages"\\)|import\\("\\.\\/rupantar\\/blog-pages"\\)/);
  assert.match(site, /function prefetchPublicPageModules\\(\\)[\\s\\S]*shouldWarmPublicRoutes\\(\\)[\\s\\S]*loadPublicPages\\(\\)[\\s\\S]*loadBlogPages\\(\\)/);
  assert.match(site, /window\\.setTimeout\\(prefetchPublicPageModules, 1200\\)/);
  assert.doesNotMatch(runtime, /\\.rh-recent-work-card img|image\\.loading = "eager"/);
  assert.match(runtime, /route\\.kind !== "blog-detail" && route\\.kind !== "work-detail"/);
  assert.match(runtime, /window\\.history\\.pushState\\(null, "", path\\)/);
  assert.match(runtime, /window\\.dispatchEvent\\(new PopStateEvent\\("popstate"\\)\\)/);
});'''
replace("tests/public-performance-handover.test.mjs", old_runtime_test, new_runtime_test)

# Standalone function tests inject the network-policy decision just like they already inject loaders.
replace(
    "tests/runtime-resilience.test.mjs",
    'new Function("loadPublicPages", "loadBlogPages", "loadPublicBlogs", "publicPages", "console",',
    'new Function("loadPublicPages", "loadBlogPages", "loadPublicBlogs", "publicPages", "shouldWarmPublicRoutes", "console",',
)
replace(
    "tests/runtime-resilience.test.mjs",
    'loader("public"), loader("blog"), loader("posts"), ["home", "works", "blog-detail"], { error: (...args) => logs.push(args) },',
    'loader("public"), loader("blog"), loader("posts"), ["home", "works", "blog-detail"], () => true, { error: (...args) => logs.push(args) },',
)
old_warm_test = '''test("early chunk warming and startup session discovery have rejection handlers", () => {
  const runtime = read("app/public-performance.ts");
  assert.match(runtime, /import\\("\\.\\/rupantar\\/public-pages"\\)\\.catch\\(/);
  assert.match(runtime, /import\\("\\.\\/rupantar\\/blog-pages"\\)\\.catch\\(/);
  const site = read("app/rupantar/site.tsx");
  assert.match(site, /getCurrentAdminSession\\(\\)\\.then\\([\\s\\S]*?cleanupExpiredWorkDrafts\\(\\);\\s*\\}\\)\\.catch\\(/);
});'''
new_warm_test = '''test("single route warming owner and startup session discovery have rejection handlers", () => {
  const runtime = read("app/public-performance.ts");
  const site = read("app/rupantar/site.tsx");
  assert.doesNotMatch(runtime, /import\\("\\.\\/rupantar\\/public-pages"\\)|import\\("\\.\\/rupantar\\/blog-pages"\\)/);
  assert.match(site, /void loadPublicPages\\(\\)\\.catch\\(/);
  assert.match(site, /void loadBlogPages\\(\\)\\.catch\\(/);
  assert.match(site, /getCurrentAdminSession\\(\\)\\.then\\([\\s\\S]*?cleanupExpiredWorkDrafts\\(\\);\\s*\\}\\)\\.catch\\(/);
});'''
replace("tests/runtime-resilience.test.mjs", old_warm_test, new_warm_test)

# Literal assertions avoid accidental regex interpretation of source-code punctuation.
Path("tests/network-resilience.test.mjs").write_text('''import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("public delivery adapts speculative work to slow and unknown mobile networks", async () => {
  const [policy, early, hero, runtime, site] = await Promise.all([
    read("app/network-policy.ts"), read("app/home-bootstrap-early.js"), read("app/rupantar/home-page.tsx"),
    read("app/public-performance.ts"), read("app/rupantar/site.tsx"),
  ]);
  assert.ok(policy.includes('effectiveType === "slow-2g"'));
  assert.ok(policy.includes('effectiveType === "2g"'));
  assert.ok(policy.includes('effectiveType === "3g"'));
  assert.ok(policy.includes("unknownMobile"));
  assert.ok(policy.includes("if (profile.constrained) return 12_000;"));
  assert.ok(policy.includes("if (profile.constrained) return 0;"));
  assert.ok(early.includes("payload.works.slice(0, homeCoverPreloadCount())"));
  assert.ok(early.includes('typeof window.matchMedia === "function"'));
  assert.ok(hero.includes("heroPreloadDelayMs"));
  assert.ok(hero.includes('image.fetchPriority = "low"'));
  assert.doesNotMatch(runtime, /warmPublicChunks|scheduleChunkWarm/);
  assert.ok(site.includes("if (!shouldWarmPublicRoutes()) return;"));
  assert.ok(site.includes("if (shouldWarmPublicRoutes()) void loadPublicBlogs()"));
  assert.ok(site.includes("startTransition"));
});

test("last-known-good public content survives brief network and origin slowness", async () => {
  const [bootstrap, publicData, edge, html] = await Promise.all([
    read("app/rupantar/home-bootstrap.ts"), read("app/rupantar/public-data.ts"),
    read("functions/api/public-home.ts"), read("index.html"),
  ]);
  assert.ok(bootstrap.includes("7 * 24 * 60 * 60 * 1000"));
  assert.ok(publicData.includes("publicFreshnessMs = 2 * 60_000"));
  assert.ok(edge.includes("/api/public-home-stale"));
  assert.ok(edge.includes("X-Rupantar-Stale"));
  assert.ok(edge.includes("Public Home background refresh failed"));
  assert.doesNotMatch(html, /rel="preconnect" href="https:\/\/gmtdqeskyvdvyibccxwt\.supabase\.co"/);
  assert.match(html, /rel="dns-prefetch" href="\/\/gmtdqeskyvdvyibccxwt\.supabase\.co"/);
});
''')

# Remove this temporary reconciliation helper before the final branch commit.
Path("scripts/reconcile-network-resilience.py").unlink()

# Refresh fingerprints affected after the primary patch's production-lock snapshot.
subprocess.run(["git", "add", "-A"], check=True)
tree = subprocess.check_output(["git", "write-tree"], text=True).strip()
lock_path = Path(".github/production-lock.json")
lock = json.loads(lock_path.read_text())
for path in ("app", "tests"):
    lock["objects"][path] = subprocess.check_output(["git", "rev-parse", f"{tree}:{path}"], text=True).strip()
lock_path.write_text(json.dumps(lock, indent=2) + "\n")
subprocess.run(["git", "add", ".github/production-lock.json"], check=True)
