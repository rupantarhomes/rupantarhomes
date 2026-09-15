import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const clientEntry = fs.readFileSync(new URL("../app/client-entry.tsx", import.meta.url), "utf8");
const navigationPrecision = fs.readFileSync(new URL("../app/navigation-precision.ts", import.meta.url), "utf8");
const publicNavigation = fs.readFileSync(new URL("../app/public-navigation.ts", import.meta.url), "utf8");
const handoverGuard = fs.readFileSync(new URL("../app/public-handover-guard.css", import.meta.url), "utf8");
const site = fs.readFileSync(new URL("../app/rupantar/site.tsx", import.meta.url), "utf8");
const indexHtml = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("public route changes reset to the top-left without browser-restoration drift", () => {
  assert.match(clientEntry, /initPublicRouteScroll\(\)/);
  assert.match(clientEntry, /import "\.\/public-handover-guard\.css"/);
  assert.match(publicNavigation, /history\.scrollRestoration\s*=\s*"manual"/);
  assert.match(publicNavigation, /window\.addEventListener\("popstate", onHistoryRoute, \{ capture: true \}\)/);
  assert.match(publicNavigation, /window\.addEventListener\("pageshow", onHistoryRoute\)/);
  assert.match(publicNavigation, /document\.documentElement\.scrollTop = 0/);
  assert.match(publicNavigation, /document\.documentElement\.scrollLeft = 0/);
  assert.match(publicNavigation, /document\.body\.scrollTop = 0/);
  assert.match(publicNavigation, /document\.body\.scrollLeft = 0/);
  assert.match(publicNavigation, /window\.scrollTo\(\{ top: 0, left: 0, behavior: "auto" \}\)/);
  assert.match(site, /const pushPath[\s\S]*resetPublicRouteScroll\(\)/);
  assert.doesNotMatch(site, /startTransition/);
  assert.match(publicNavigation, /document\.addEventListener\("click", onDedicatedLink/);
  assert.match(publicNavigation, /\^\\\/\(\?:blog/);
  assert.match(publicNavigation, /resetPublicRouteScroll\(\);[\s\S]*history\.pushState[\s\S]*resetPublicRouteScroll\(\)/);
  assert.match(publicNavigation, /window\.dispatchEvent\(new PopStateEvent\("popstate"\)\)/);
});

test("public document cannot drift horizontally while local scrollers remain independent", () => {
  assert.match(handoverGuard, /html,[\s\S]*body,[\s\S]*#root[\s\S]*overflow-x: hidden/);
  assert.match(handoverGuard, /@supports \(overflow: clip\)[\s\S]*overflow-x: clip/);
  assert.match(handoverGuard, /overscroll-behavior-x: none/);
  assert.match(handoverGuard, /scroll-behavior: auto !important/);
  assert.doesNotMatch(handoverGuard, /\.rh-native-work-track[\s\S]*overflow-x:\s*(?:hidden|clip)/);
  assert.doesNotMatch(handoverGuard, /\.scrollbar-none[\s\S]*overflow-x:\s*(?:hidden|clip)/);
});

test("cross-page Get Estimate navigation waits for the rendered target, not a timer", () => {
  assert.match(navigationPrecision, /scrollEstimateWhenReady/);
  assert.match(publicNavigation, /requestAnimationFrame/);
  assert.match(publicNavigation, /scrollIntoView\(\{ behavior: "smooth", block: "start" \}\)/);
  assert.doesNotMatch(navigationPrecision, /setTimeout/);
  assert.doesNotMatch(site, /setTimeout\(\(\) => document\.getElementById\("estimate"\)/);
  assert.match(navigationPrecision, /window\.location\.pathname\s*!==\s*"\/"/);
});

test("navigation precision helper loads before the React entry", () => {
  const navigationIndex = indexHtml.indexOf('/app/navigation-precision.ts');
  const appIndex = indexHtml.indexOf('/app/client-entry.tsx');
  assert.ok(navigationIndex >= 0, "navigation precision helper should be loaded");
  assert.ok(appIndex >= 0, "React entry should be loaded");
  assert.ok(navigationIndex < appIndex, "navigation helper should initialize before React entry");
});
