import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("public copy/social/review enhancer never scans or observes Admin DOM", async () => {
  const entry = await read("../app/client-entry.tsx");
  const enhancer = entry.slice(entry.indexOf("function normalizeVisibleCopy()"));

  assert.match(enhancer, /const publicEnhancerEnabled = \(\) => !window\.location\.pathname\.startsWith\("\/admin"\)/);
  assert.match(enhancer, /if \(!publicEnhancerEnabled\(\)\) return;/);
  assert.match(enhancer, /const publicRoot = document\.getElementById\("root"\)/);
  assert.match(enhancer, /normalizeNode\(publicRoot\)/);
  assert.match(enhancer, /observer\.observe\(publicRoot, \{ childList: true, subtree: true \}\)/);
  assert.doesNotMatch(enhancer, /observer\.observe\(document\.body/);
  assert.doesNotMatch(enhancer, /normalizeNode\(document\.body\)/);

  const callback = enhancer.slice(enhancer.indexOf("const observer = new MutationObserver"), enhancer.indexOf("observer.observe(publicRoot"));
  assert.match(callback, /if \(!publicEnhancerEnabled\(\)\) return;/);
  assert.match(callback, /ensureFacebookLinks\(\)/);
  assert.match(callback, /ensureReviewCardClasses\(\)/);
});
