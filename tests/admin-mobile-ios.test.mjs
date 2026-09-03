import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const mobileLock = await readFile(new URL("../app/admin-mobile-lock.ts", import.meta.url), "utf8");
const adminManifest = await readFile(new URL("../public/admin.webmanifest", import.meta.url), "utf8");
const publicManifest = await readFile(new URL("../public/site.webmanifest", import.meta.url), "utf8");
const indexHtml = await readFile(new URL("../index.html", import.meta.url), "utf8");

test("Admin mobile lock is scoped to the /admin route", () => {
  assert.match(mobileLock, /window\.location\.pathname === "\/admin"/);
  assert.match(mobileLock, /rh-admin-mobile-lock/);
  assert.match(mobileLock, /syncInstallMetadata\(locked\)/);
  assert.match(mobileLock, /locked \? "\/admin\.webmanifest" : defaultManifestHref/);
});

test("Admin mobile layout respects iOS safe areas and avoids Safari form zoom", () => {
  assert.match(mobileLock, /env\(safe-area-inset-top/);
  assert.match(mobileLock, /env\(safe-area-inset-bottom/);
  assert.match(mobileLock, /env\(safe-area-inset-left/);
  assert.match(mobileLock, /env\(safe-area-inset-right/);
  assert.match(mobileLock, /font-size: 16px !important/);
  assert.match(mobileLock, /touch-action: pan-x/);
  assert.match(mobileLock, /-webkit-overflow-scrolling: touch/);
});

test("Admin Work list titles wrap instead of truncating off-screen", () => {
  assert.match(mobileLock, /rh-admin-work-title/);
  assert.match(mobileLock, /white-space: normal !important/);
  assert.match(mobileLock, /text-overflow: clip !important/);
  assert.match(mobileLock, /rh-admin-work-row/);
  assert.match(mobileLock, /flex-direction: column !important/);
});

test("Admin has a standalone home-screen manifest without changing the public manifest", () => {
  const admin = JSON.parse(adminManifest);
  const publicSite = JSON.parse(publicManifest);

  assert.equal(admin.start_url, "/admin");
  assert.equal(admin.scope, "/admin");
  assert.equal(admin.display, "standalone");
  assert.equal(admin.short_name, "Rupantar Admin");

  assert.equal(publicSite.start_url, "/");
  assert.equal(publicSite.scope, "/");
  assert.equal(publicSite.short_name, "Rupantar Homes");
  assert.match(indexHtml, /href="\/site\.webmanifest"/);
});
