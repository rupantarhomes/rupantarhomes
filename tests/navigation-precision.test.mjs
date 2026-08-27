import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const clientEntry = fs.readFileSync(new URL("../app/client-entry.tsx", import.meta.url), "utf8");
const navigationPrecision = fs.readFileSync(new URL("../app/navigation-precision.ts", import.meta.url), "utf8");
const indexHtml = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("public route changes reset to the top without browser-restoration drift", () => {
  assert.match(clientEntry, /history\.scrollRestoration\s*=\s*"manual"/);
  assert.match(clientEntry, /window\.history\.pushState\s*=\s*function/);
  assert.match(clientEntry, /window\.addEventListener\("popstate",\s*resetPageScroll\)/);
  assert.match(clientEntry, /window\.scrollTo\(\{\s*top:\s*0,\s*left:\s*0,\s*behavior:\s*"auto"\s*\}\)/);
});

test("cross-page Get Estimate navigation waits for the rendered target, not a timer", () => {
  assert.match(navigationPrecision, /#estimate/);
  assert.match(navigationPrecision, /requestAnimationFrame/);
  assert.match(navigationPrecision, /scrollIntoView\(\{\s*behavior:\s*"smooth",\s*block:\s*"start"\s*\}\)/);
  assert.doesNotMatch(navigationPrecision, /setTimeout/);
  assert.match(navigationPrecision, /window\.location\.pathname\s*!==\s*"\/"/);
});

test("navigation precision helper loads before the React entry", () => {
  const navigationIndex = indexHtml.indexOf('/app/navigation-precision.ts');
  const appIndex = indexHtml.indexOf('/app/client-entry.tsx');
  assert.ok(navigationIndex >= 0, "navigation precision helper should be loaded");
  assert.ok(appIndex >= 0, "React entry should be loaded");
  assert.ok(navigationIndex < appIndex, "navigation helper should initialize before React entry");
});
