import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Admin startup loads Reviews and Settings without issuing the public six-Work request", async () => {
  const [site, repository] = await Promise.all([
    read("../app/rupantar/site.tsx"),
    read("../app/rupantar/repository.ts"),
  ]);

  const adminContent = repository.slice(
    repository.indexOf("export async function loadAdminContent"),
    repository.indexOf("export async function signInAdmin"),
  );
  assert.match(adminContent, /from\("reviews"\)/);
  assert.match(adminContent, /from\("site_settings"\)/);
  assert.doesNotMatch(adminContent, /loadPublicWorksPage/);

  const refreshAdminContent = site.slice(
    site.indexOf("const refreshAdminContent = useCallback"),
    site.indexOf("const refreshAdminWorks"),
  );
  assert.match(refreshAdminContent, /await loadAdminContent\(\)/);
  assert.doesNotMatch(refreshAdminContent, /loadPublicContent|loadPublicWorksPage/);

  const refreshAdminData = site.slice(
    site.indexOf("const refreshAdminData = useCallback"),
    site.indexOf("const loadOlderLeads"),
  );
  assert.match(refreshAdminData, /refreshAdminWorks\(\)/);
  assert.match(refreshAdminData, /refreshAdminContent\(\)/);
  assert.doesNotMatch(refreshAdminData, /refreshContent\(\)/);
});
