import assert from "node:assert/strict";
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
  assert.ok(publicData.includes("publicFreshnessMs = 30_000"));
  assert.ok(edge.includes("/api/public-home-stale"));
  assert.ok(edge.includes("X-Rupantar-Stale"));
  assert.ok(edge.includes("Public Home background refresh failed"));
  assert.doesNotMatch(html, /rel="preconnect" href="https:\/\/gmtdqeskyvdvyibccxwt\.supabase\.co"/);
  assert.match(html, /rel="dns-prefetch" href="\/\/gmtdqeskyvdvyibccxwt\.supabase\.co"/);
});
