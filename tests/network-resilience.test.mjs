import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("public delivery adapts to reported slow networks without penalizing unknown iPhone connections", async () => {
  const [policy, early, routeBootstrap, hero, runtime, site] = await Promise.all([
    read("app/network-policy.ts"), read("app/home-bootstrap-early.js"), read("app/public-route-bootstrap.ts"), read("app/rupantar/home-page.tsx"),
    read("app/public-performance.ts"), read("app/rupantar/site.tsx"),
  ]);
  assert.ok(policy.includes('effectiveType === "slow-2g"'));
  assert.ok(policy.includes('effectiveType === "2g"'));
  assert.ok(policy.includes('effectiveType === "3g"'));
  assert.doesNotMatch(policy, /unknownMobile/);
  assert.match(policy, /Missing information is normal/);
  assert.match(policy, /current\.downlink > 0 && current\.downlink < 1\.5/);
  assert.ok(policy.includes("if (profile.constrained) return 12_000;"));
  assert.ok(policy.includes("if (profile.constrained) return 0;"));
  assert.ok(early.includes("payload.works.slice(0, homeCoverPreloadCount())"));
  assert.ok(early.includes("if (slow) return 2;"));
  assert.ok(early.includes("return 6;"));
  assert.match(routeBootstrap, /if \(speculative && networkProfile\(\)\.slow\) return;/);
  assert.match(routeBootstrap, /if \(speculative && profile\.constrained\) return;/);
  assert.match(routeBootstrap, /desktop \? 3 : tablet \? 2 : 1/);
  assert.ok(hero.includes("heroPreloadDelayMs"));
  assert.ok(hero.includes('image.fetchPriority = "low"'));
  assert.doesNotMatch(runtime, /warmPublicChunks|scheduleChunkWarm/);
  assert.ok(site.includes("if (!shouldWarmPublicRoutes()) return;"));
  assert.ok(site.includes("if (shouldWarmPublicRoutes()) void loadPublicBlogs()"));
  assert.doesNotMatch(site, /startTransition/);
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
