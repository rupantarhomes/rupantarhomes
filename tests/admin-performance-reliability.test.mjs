import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("loads the complete admin works collection without changing public pagination", async () => {
  const site = await read("../app/rupantar/site.tsx");

  assert.match(site, /const adminWorksLimit = 1000;/);
  assert.match(site, /const refreshAdminWorks = useCallback\(async \(\) => \{/);
  assert.match(site, /loadPublicWorksPage\(0, adminWorksLimit, "all"\)/);
  assert.match(site, /loadPublicWorksPage\(offset, 12, category\)/);
});

test("opens Admin immediately after authorization and avoids full Admin reloads on tab switches", async () => {
  const site = await read("../app/rupantar/site.tsx");
  const login = site.indexOf("const handleLogin = async");
  const dashboard = site.indexOf('setPage("admin-dashboard")', login);
  const backgroundLoad = site.indexOf("Promise.allSettled([refreshAdminWorks(), refreshContent(), refreshAdminStats(), refreshLeads(), refreshBlogs()])", dashboard);
  const navigate = site.slice(site.indexOf("const navigate = (nextPage: Page) =>"), site.indexOf("const goToEstimate"));

  assert.ok(login >= 0);
  assert.ok(dashboard > login);
  assert.ok(backgroundLoad > dashboard);
  assert.doesNotMatch(navigate, /if \(nextPage\.startsWith\("admin-"\) && nextPage !== "admin-login"\) \{/);
  assert.doesNotMatch(navigate, /refreshContent\(|refreshLeads\(/);
  assert.equal((navigate.match(/refreshBlogs\(/g) ?? []).length, 1);
  assert.match(navigate, /nextPage === "admin-dashboard"[\s\S]*refreshAdminStats/);
});

test("keeps public-content refreshes from overwriting the Admin works list", async () => {
  const site = await read("../app/rupantar/site.tsx");
  const refresh = site.slice(site.indexOf("const refreshContent = useCallback"), site.indexOf("const refreshAdminWorks"));

  assert.match(refresh, /if \(route\.kind !== "home"\) return;/);
  assert.doesNotMatch(refresh, /route\.kind !== "home" && route\.kind !== "admin"/);
});

test("pins persisted image ownership for the lifetime of an edit", async () => {
  const site = await read("../app/rupantar/site.tsx");

  assert.match(site, /const persistedDraftImageIdsRef = useRef\(new Set<string>\(\)\)/);
  assert.match(site, /persistedDraftImageIdsRef\.current = new Set\(work\.images\.map\(\(image\) => image\.publicId\)\)/);
  assert.match(site, /const removed = Array\.from\(persistedDraftImageIdsRef\.current\)\.filter/);
  assert.match(site, /const persisted = persistedDraftImageIdsRef\.current\.has\(image\.publicId\)/);
});

test("refreshes only Admin works after a work save and keeps public refresh off the critical path", async () => {
  const site = await read("../app/rupantar/site.tsx");
  const save = site.slice(site.indexOf("const handleSaveWork = async"), site.indexOf("const editWork"));

  assert.match(save, /await refreshAdminWorks\(\)/);
  assert.match(save, /void refreshContent\(\)\.catch/);
  assert.ok(save.indexOf("await refreshAdminWorks()") < save.indexOf("void refreshContent().catch"));
});

test("makes every empty work image slot open the existing approved file picker", async () => {
  const enhancer = await read("../app/rupantar/admin-leads-enhancer.ts");

  assert.match(enhancer, /function enhanceWorkImageSlots\(\)/);
  assert.match(enhancer, /label\.textContent\?\.trim\(\) === "Empty"/);
  assert.match(enhancer, /slot\.setAttribute\("role", "button"\)/);
  assert.match(enhancer, /slot\.setAttribute\("tabindex", "0"\)/);
  assert.match(enhancer, /if \(!fileInput\.disabled\) fileInput\.click\(\)/);
  assert.match(enhancer, /enhanceWorkImageSlots\(\)/);
});

test("landing page requests the six newest works instead of letting older featured works crowd out a new save", async () => {
  const repository = await read("../app/rupantar/repository.ts");

  assert.match(repository, /loadPublicWorksPage\(0, 6, "all"\)/);
  assert.match(repository, /\.order\("created_at", \{ ascending: false \}\)/);
  assert.match(repository, /works: initialWorks\.slice\(0, 6\)/);
});

test("View Site performs a fresh public load so saved works and images cannot be hidden by stale Admin memory", async () => {
  const enhancer = await read("../app/rupantar/admin-leads-enhancer.ts");

  assert.match(enhancer, /function enhanceViewSiteButton\(\)/);
  assert.match(enhancer, /candidate\.textContent\?\.trim\(\) === "View Site"/);
  assert.match(enhancer, /event\.stopImmediatePropagation\(\)/);
  assert.match(enhancer, /window\.location\.assign\("\/"\)/);
  assert.match(enhancer, /enhanceViewSiteButton\(\)/);
});
