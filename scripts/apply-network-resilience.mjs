import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readFile, writeFile, unlink } from "node:fs/promises";

const root = fileURLToPath(new URL("../", import.meta.url));
const fileUrl = (path) => new URL(`../${path}`, import.meta.url);

function git(...args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

async function replace(path, before, after) {
  const url = fileUrl(path);
  const source = await readFile(url, "utf8");
  if (!source.includes(before)) throw new Error(`${path}: expected source fragment was not found`);
  const next = source.replace(before, after);
  if (next === source) throw new Error(`${path}: replacement made no change`);
  await writeFile(url, next);
}

async function update(path, transform) {
  const url = fileUrl(path);
  const source = await readFile(url, "utf8");
  const next = transform(source);
  if (next === source) throw new Error(`${path}: transform made no change`);
  await writeFile(url, next);
}

await replace(
  "app/network-policy.ts",
  `export function readNetworkProfile(): NetworkProfile {\n  const current = connection();\n  const effectiveType = String(current?.effectiveType ?? "").toLowerCase();\n  const saveData = current?.saveData === true;\n  const constrained = saveData || effectiveType === "slow-2g" || effectiveType === "2g";\n  const slow = constrained || effectiveType === "3g" || (typeof current?.downlink === "number" && current.downlink > 0 && current.downlink < 1.5);\n  return { saveData, effectiveType, constrained, slow };\n}`,
  `export function readNetworkProfile(): NetworkProfile {\n  const current = connection();\n  const effectiveType = String(current?.effectiveType ?? "").toLowerCase();\n  const saveData = current?.saveData === true;\n  const constrained = saveData || effectiveType === "slow-2g" || effectiveType === "2g";\n  const unknownMobile = !effectiveType && typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;\n  const slow = constrained || effectiveType === "3g" || unknownMobile\n    || (typeof current?.downlink === "number" && current.downlink > 0 && current.downlink < 1.5);\n  return { saveData, effectiveType, constrained, slow };\n}`,
);

await replace(
  "app/network-policy.ts",
  `export function heroPreloadDelayMs(): number | null {\n  const profile = readNetworkProfile();\n  if (profile.constrained) return null;\n  return profile.slow ? 7000 : 1800;\n}\n\nexport function homeCoverPreloadCount(): number {\n  const profile = readNetworkProfile();\n  if (profile.constrained) return 1;\n  if (profile.slow) return 2;\n  if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) return 3;\n  return 2;\n}`,
  `export function heroPreloadDelayMs(): number {\n  const profile = readNetworkProfile();\n  if (profile.constrained) return 12_000;\n  return profile.slow ? 6_000 : 1_800;\n}\n\nexport function homeCoverPreloadCount(): number {\n  const profile = readNetworkProfile();\n  if (profile.constrained) return 0;\n  if (profile.slow) return 1;\n  if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) return 3;\n  return 2;\n}`,
);

await replace(
  "app/rupantar/home-page.tsx",
  `import { categories, interiorDesignCategories } from "./data";\nimport { categoryIcons, PhotoPlaceholder, WorkPhoto } from "./shared";`,
  `import { heroPreloadDelayMs } from "../network-policy";\nimport { categories, interiorDesignCategories } from "./data";\nimport { categoryIcons, PhotoPlaceholder, WorkPhoto } from "./shared";`,
);

await replace(
  "app/rupantar/home-page.tsx",
  `    const timer = window.setTimeout(() => {\n      if (heroSlidesReady.has(nextSource)) return;\n      const image = new window.Image();\n      image.onload = () => {`,
  `    const timer = window.setTimeout(() => {\n      if (heroSlidesReady.has(nextSource)) return;\n      const image = new window.Image();\n      image.decoding = "async";\n      image.fetchPriority = "low";\n      image.onload = () => {`,
);

await replace(
  "app/rupantar/home-page.tsx",
  `      image.src = nextSource;\n    }, 1800);`,
  `      image.src = nextSource;\n    }, heroPreloadDelayMs());`,
);

await replace(
  "app/home-bootstrap-early.js",
  `function preloadHomeCovers(payload) {\n  if (!payload || !Array.isArray(payload.works)) return payload;\n\n  for (const work of payload.works) {`,
  `function homeCoverPreloadCount() {\n  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;\n  const effectiveType = String(connection?.effectiveType || "").toLowerCase();\n  const constrained = connection?.saveData === true || effectiveType === "slow-2g" || effectiveType === "2g";\n  const unknownMobile = !effectiveType && window.matchMedia("(max-width: 767px)").matches;\n  const slow = constrained || effectiveType === "3g" || unknownMobile\n    || (typeof connection?.downlink === "number" && connection.downlink > 0 && connection.downlink < 1.5);\n  if (constrained) return 0;\n  if (slow) return 1;\n  return window.matchMedia("(min-width: 1024px)").matches ? 3 : 2;\n}\n\nfunction preloadHomeCovers(payload) {\n  if (!payload || !Array.isArray(payload.works)) return payload;\n\n  for (const work of payload.works.slice(0, homeCoverPreloadCount())) {`,
);

await replace(
  "app/home-bootstrap-early.js",
  `Date.now() - storedHome.confirmedAt <= 86_400_000`,
  `Date.now() - storedHome.confirmedAt <= 604_800_000`,
);

await replace(
  "app/rupantar/home-bootstrap.ts",
  `const maximumStoredAgeMs = 24 * 60 * 60 * 1000;`,
  `const maximumStoredAgeMs = 7 * 24 * 60 * 60 * 1000;`,
);

await replace(
  "app/rupantar/public-data.ts",
  `export const publicFreshnessMs = 30_000;`,
  `export const publicFreshnessMs = 2 * 60_000;`,
);

await update("app/public-performance.ts", (source) => {
  source = source.replace(
    `function warmPublicChunks() {\n  void import("./rupantar/public-pages").catch((error) => console.error("Unable to prefetch public pages", error));\n  void import("./rupantar/blog-pages").catch((error) => console.error("Unable to prefetch blog pages", error));\n}\n\ntype IdleWindow = Window & typeof globalThis & {\n  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;\n  cancelIdleCallback?: (handle: number) => void;\n};\n\n`,
    "",
  );
  source = source.replace(
    `  const idleWindow = window as IdleWindow;\n  let chunkTimer = 0;\n  let idleHandle: number | undefined;\n  const scheduleChunkWarm = () => {\n    chunkTimer = window.setTimeout(() => {\n      if (idleWindow.requestIdleCallback) idleHandle = idleWindow.requestIdleCallback(warmPublicChunks, { timeout: 2500 });\n      else warmPublicChunks();\n    }, 900);\n  };\n  if (document.readyState === "complete") scheduleChunkWarm();\n  else window.addEventListener("load", scheduleChunkWarm, { once: true });\n\n`,
    "",
  );
  source = source.replace(
    `  window.addEventListener("pagehide", () => {\n    if (chunkTimer) window.clearTimeout(chunkTimer);\n    if (idleHandle !== undefined) idleWindow.cancelIdleCallback?.(idleHandle);\n    window.removeEventListener("load", scheduleChunkWarm);\n    document.removeEventListener("click", onClick, true);\n  }, { once: true });`,
    `  window.addEventListener("pagehide", () => {\n    document.removeEventListener("click", onClick, true);\n  }, { once: true });`,
  );
  if (source.includes("warmPublicChunks") || source.includes("scheduleChunkWarm") || source.includes("IdleWindow")) {
    throw new Error("app/public-performance.ts: duplicate chunk warming was not fully removed");
  }
  return source;
});

await replace(
  "app/rupantar/site.tsx",
  `import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";`,
  `import { lazy, startTransition, Suspense, useCallback, useEffect, useRef, useState } from "react";`,
);

await replace(
  "app/rupantar/site.tsx",
  `import { HomePage } from "./home-page";\nimport { earlyHomeContent, storedHomeContent } from "./home-bootstrap";`,
  `import { shouldWarmPublicRoutes } from "../network-policy";\nimport { HomePage } from "./home-page";\nimport { earlyHomeContent, storedHomeContent } from "./home-bootstrap";`,
);

await replace(
  "app/rupantar/site.tsx",
  `const adminWorksLimit = 1000;\nconst adminVerificationIntervalMs = 5 * 60 * 1000;`,
  `const adminWorksLimit = 1000;\nconst adminVerificationIntervalMs = 5 * 60 * 1000;\nconst transitionablePublicPages = new Set<Page>(["about", "contact", "privacy", "interior-design", "blog"]);`,
);

await replace(
  "app/rupantar/site.tsx",
  `function prefetchPublicPageModules() {\n  void loadPublicPages().catch((error) => console.error("Unable to prefetch public pages", error));\n  void loadBlogPages().catch((error) => console.error("Unable to prefetch blog pages", error));\n}\n\nfunction prefetchPublicRoute(page: Page) {\n  if (page === "blog" || page === "blog-detail") {\n    void loadBlogPages().catch((error) => console.error("Unable to prefetch blog pages", error));\n    void loadPublicBlogs().catch((error) => console.error("Unable to prefetch blog posts", error));\n  }\n  else if (publicPages.includes(page) && page !== "home") void loadPublicPages().catch((error) => console.error("Unable to prefetch public pages", error));\n}`,
  `function prefetchPublicPageModules() {\n  if (!shouldWarmPublicRoutes()) return;\n  void loadPublicPages().catch((error) => console.error("Unable to prefetch public pages", error));\n  void loadBlogPages().catch((error) => console.error("Unable to prefetch blog pages", error));\n}\n\nfunction prefetchPublicRoute(page: Page) {\n  if (page === "blog" || page === "blog-detail") {\n    void loadBlogPages().catch((error) => console.error("Unable to prefetch blog pages", error));\n    if (shouldWarmPublicRoutes()) void loadPublicBlogs().catch((error) => console.error("Unable to prefetch blog posts", error));\n  }\n  else if (publicPages.includes(page) && page !== "home") void loadPublicPages().catch((error) => console.error("Unable to prefetch public pages", error));\n}`,
);

await replace(
  "app/rupantar/site.tsx",
  `    const timer = window.setTimeout(prefetchPublicPageModules, 150);`,
  `    const timer = window.setTimeout(prefetchPublicPageModules, 1200);`,
);

await replace(
  "app/rupantar/site.tsx",
  `      setPage(nextPage);\n      if (nextPage === "blog") {`,
  `      if (transitionablePublicPages.has(nextPage)) startTransition(() => setPage(nextPage));\n      else setPage(nextPage);\n      if (nextPage === "blog") {`,
);

await replace(
  "app/rupantar/site.tsx",
  `      if (nextPage === "admin-dashboard") void refreshAdminStats();\n    }\n    window.scrollTo({ top: 0, behavior: "smooth" });\n  };\n\n  const goToEstimate`,
  `      if (nextPage === "admin-dashboard") void refreshAdminStats();\n    }\n    window.scrollTo({ top: 0, behavior: "auto" });\n  };\n\n  const goToEstimate`,
);

await replace(
  "app/rupantar/site.tsx",
  `    setFilter(category);\n    setPage("works");\n    void loadWorks(category, 0, categoryChanged).catch((error) => console.error("Unable to load category", error));\n    window.scrollTo({ top: 0, behavior: "smooth" });\n  };`,
  `    setFilter(category);\n    setPage("works");\n    void loadWorks(category, 0, categoryChanged).catch((error) => console.error("Unable to load category", error));\n    window.scrollTo({ top: 0, behavior: "auto" });\n  };`,
);

await replace(
  "app/rupantar/site.tsx",
  `    pushPath(blogArticlePath(blog.slug));\n    setSelectedBlog(blog);\n    setPage("blog-detail");\n    window.scrollTo({ top: 0, behavior: "smooth" });`,
  `    pushPath(blogArticlePath(blog.slug));\n    startTransition(() => {\n      setSelectedBlog(blog);\n      setPage("blog-detail");\n    });\n    window.scrollTo({ top: 0, behavior: "auto" });`,
);

await replace(
  "app/rupantar/site.tsx",
  `    pushPath(workPath(work));\n    setSelectedWork(work);\n    setPage("work-detail");\n    window.scrollTo({ top: 0, behavior: "smooth" });`,
  `    pushPath(workPath(work));\n    startTransition(() => {\n      setSelectedWork(work);\n      setPage("work-detail");\n    });\n    window.scrollTo({ top: 0, behavior: "auto" });`,
);

await replace(
  "index.html",
  `    <link rel="preconnect" href="https://gmtdqeskyvdvyibccxwt.supabase.co" crossorigin />\n`,
  "",
);

await update("functions/api/public-home.ts", (source) => {
  source = source.replace(
    `  "Cache-Control": "public, max-age=30, s-maxage=30",`,
    `  "Cache-Control": "public, max-age=30, s-maxage=30, stale-while-revalidate=86400",`,
  );
  source = source.replace(
    `  return Response.json({ works, reviews, settings: mapSettings(settingsRows[0] as PublicSettingsRow), confirmedAt: Date.now() }, { headers: responseHeaders });`,
    `  const confirmedAt = Date.now();\n  return Response.json(\n    { works, reviews, settings: mapSettings(settingsRows[0] as PublicSettingsRow), confirmedAt },\n    { headers: { ...responseHeaders, "X-Rupantar-Generated-At": String(confirmedAt) } },\n  );`,
  );
  source = source.replace(
    `export const onRequestGet: PagesFunction<RuntimeEnv> = async ({ request, env, waitUntil }) => {\n  const cache = (caches as CacheStorage & { default: Cache }).default;\n  const cacheKey = new Request(new URL("/api/public-home", request.url), { method: "GET" });\n  const cached = await cache.match(cacheKey);\n  if (cached) return cached;\n\n  try {\n    const response = await fetchHomeWorks(env);\n    waitUntil(cache.put(cacheKey, response.clone()));\n    return response;\n  } catch (error) {\n    console.error("Public Home bootstrap failed", error);\n    return Response.json({ works: [], confirmedAt: Date.now() }, {\n      status: 503,\n      headers: { ...responseHeaders, "Cache-Control": "no-store" },\n    });\n  }\n};`,
    `function storedResponse(response: Response, cacheControl: string): Promise<Response> {\n  const headers = new Headers(response.headers);\n  headers.set("Cache-Control", cacheControl);\n  return response.clone().arrayBuffer().then((body) => new Response(body, { status: response.status, headers }));\n}\n\nasync function populateHomeCaches(cache: Cache, freshKey: Request, staleKey: Request, response: Response): Promise<void> {\n  const [fresh, stale] = await Promise.all([\n    storedResponse(response, "public, max-age=30, s-maxage=30"),\n    storedResponse(response, "public, max-age=0, s-maxage=86400"),\n  ]);\n  await Promise.all([cache.put(freshKey, fresh), cache.put(staleKey, stale)]);\n}\n\nfunction clientStaleResponse(response: Response): Response {\n  const headers = new Headers(response.headers);\n  headers.set("Cache-Control", "public, max-age=0, s-maxage=30, stale-while-revalidate=86400");\n  headers.set("X-Rupantar-Stale", "1");\n  return new Response(response.body, { status: response.status, headers });\n}\n\nexport const onRequestGet: PagesFunction<RuntimeEnv> = async ({ request, env, waitUntil }) => {\n  const cache = (caches as CacheStorage & { default: Cache }).default;\n  const freshKey = new Request(new URL("/api/public-home", request.url), { method: "GET" });\n  const staleKey = new Request(new URL("/api/public-home-stale", request.url), { method: "GET" });\n  const cached = await cache.match(freshKey);\n  if (cached) return cached;\n\n  const stale = await cache.match(staleKey);\n  if (stale) {\n    waitUntil(\n      fetchHomeWorks(env)\n        .then((response) => populateHomeCaches(cache, freshKey, staleKey, response))\n        .catch((error) => console.error("Public Home background refresh failed", error)),\n    );\n    return clientStaleResponse(stale);\n  }\n\n  try {\n    const response = await fetchHomeWorks(env);\n    waitUntil(populateHomeCaches(cache, freshKey, staleKey, response));\n    return response;\n  } catch (error) {\n    console.error("Public Home bootstrap failed", error);\n    return Response.json({ works: [], confirmedAt: Date.now() }, {\n      status: 503,\n      headers: { ...responseHeaders, "Cache-Control": "no-store" },\n    });\n  }\n};`,
  );
  if (!source.includes("/api/public-home-stale") || !source.includes("Public Home background refresh failed")) {
    throw new Error("functions/api/public-home.ts: stale-while-revalidate patch was incomplete");
  }
  return source;
});

const resilienceTest = `import assert from "node:assert/strict";\nimport { readFile } from "node:fs/promises";\nimport test from "node:test";\n\nconst read = (path) => readFile(new URL(\`../\${path}\`, import.meta.url), "utf8");\n\ntest("public delivery adapts speculative work to slow and unknown mobile networks", async () => {\n  const [policy, early, hero, runtime, site] = await Promise.all([\n    read("app/network-policy.ts"),\n    read("app/home-bootstrap-early.js"),\n    read("app/rupantar/home-page.tsx"),\n    read("app/public-performance.ts"),\n    read("app/rupantar/site.tsx"),\n  ]);\n\n  assert.match(policy, /effectiveType === "slow-2g"/);\n  assert.match(policy, /effectiveType === "2g"/);\n  assert.match(policy, /effectiveType === "3g"/);\n  assert.match(policy, /unknownMobile/);\n  assert.match(policy, /if \(profile\.constrained\) return 12_000/);\n  assert.match(policy, /if \(profile\.constrained\) return 0/);\n  assert.match(early, /payload\.works\.slice\(0, homeCoverPreloadCount\(\)\)/);\n  assert.match(hero, /heroPreloadDelayMs/);\n  assert.match(hero, /image\.fetchPriority = "low"/);\n  assert.doesNotMatch(runtime, /warmPublicChunks|scheduleChunkWarm/);\n  assert.match(site, /if \(!shouldWarmPublicRoutes\(\)\) return/);\n  assert.match(site, /if \(shouldWarmPublicRoutes\(\)\) void loadPublicBlogs\(\)/);\n  assert.match(site, /startTransition/);\n});\n\ntest("last-known-good public content survives brief network and origin slowness", async () => {\n  const [bootstrap, publicData, edge, html] = await Promise.all([\n    read("app/rupantar/home-bootstrap.ts"),\n    read("app/rupantar/public-data.ts"),\n    read("functions/api/public-home.ts"),\n    read("index.html"),\n  ]);\n\n  assert.match(bootstrap, /7 \* 24 \* 60 \* 60 \* 1000/);\n  assert.match(publicData, /publicFreshnessMs = 2 \* 60_000/);\n  assert.match(edge, /\\/api\\/public-home-stale/);\n  assert.match(edge, /X-Rupantar-Stale/);\n  assert.match(edge, /Public Home background refresh failed/);\n  assert.doesNotMatch(html, /rel="preconnect" href="https:\\/\\/gmtdqeskyvdvyibccxwt\\.supabase\\.co"/);\n  assert.match(html, /rel="dns-prefetch" href="\\/\\/gmtdqeskyvdvyibccxwt\\.supabase\\.co"/);\n});\n`;
await writeFile(fileUrl("tests/network-resilience.test.mjs"), resilienceTest);

const baselinePath = fileUrl("docs/PRODUCTION-BASELINE.md");
const baseline = await readFile(baselinePath, "utf8");
const baselineHeading = "## Network resilience and slow-link delivery — 2026-09-14";
if (baseline.includes(baselineHeading)) throw new Error("docs/PRODUCTION-BASELINE.md already contains the network-resilience acceptance block");
await writeFile(baselinePath, `${baseline.trimEnd()}\n\n${baselineHeading}\n\nScope is limited to public delivery performance and resilience; the visual design, image quality, content, Admin security, Supabase schema/RLS/Auth, Cloudinary upload lifecycle, and inquiry behavior remain unchanged.\n\n- keep the exact existing hero and portfolio image sources/quality while delaying only optional next-image and card-cover preloads on constrained links;\n- treat mobile browsers without the Network Information API conservatively so iOS does not flood weak Wi-Fi/mobile data with speculative requests;\n- remove duplicate background chunk warming and suppress idle route warming on slow links while retaining intent-driven route prefetch;\n- retain the previous page during lazy public-route transitions so a delayed JavaScript chunk does not present an empty page;\n- keep a seven-day last-known-good Home snapshot for immediate repeat rendering while live content revalidates;\n- keep short browser freshness for the Home API, add a one-day edge stale fallback, and refresh that fallback in the background instead of blocking a visitor on Supabase during a brief origin slowdown;\n- extend the in-document public read freshness window to two minutes to prevent repeated reads during route thrash without affecting Admin cache invalidation;\n- preserve Supabase DNS warm-up but remove the unconditional Supabase TLS preconnect from first paint because Home now prefers the same-origin edge path.\n\nVerification requirement: \`npm run verify\`, Cloudflare Pages preview, and post-merge production smoke must all pass.\n`);

// Remove the temporary patch machinery before creating the reviewed branch commit.
await unlink(fileUrl("scripts/apply-network-resilience.mjs"));
await unlink(fileUrl(".github/workflows/network-resilience-patch.yml"));

git("add", "-A");
const tree = git("write-tree");
const productionLockPath = fileUrl(".github/production-lock.json");
const productionLock = JSON.parse(await readFile(productionLockPath, "utf8"));
for (const path of ["app", "functions", "index.html", "tests"]) {
  productionLock.objects[path] = git("rev-parse", `${tree}:${path}`);
}
await writeFile(productionLockPath, `${JSON.stringify(productionLock, null, 2)}\n`);
git("add", ".github/production-lock.json");

console.log(JSON.stringify({\n  app: productionLock.objects.app,\n  functions: productionLock.objects.functions,\n  index: productionLock.objects["index.html"],\n  tests: productionLock.objects.tests,\n}, null, 2));
