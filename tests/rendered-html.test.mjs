import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const routes = await readFile(new URL("../app/rupantar/routes.ts", import.meta.url), "utf8");
const site = await readFile(new URL("../app/rupantar/site.tsx", import.meta.url), "utf8");
const repository = await readFile(new URL("../app/rupantar/repository.ts", import.meta.url), "utf8");

test("dedicated public route shapes are defined", () => {
  for (const expected of ["/about", "/works", "/admin", "workPath", "categoryPath", "parseRoute"]) {
    assert.ok(routes.includes(expected), `missing ${expected}`);
  }
});

test("browser navigation uses history and popstate", () => {
  assert.match(site, /history\.pushState/);
  assert.match(site, /popstate/);
  assert.match(site, /applyBrowserRoute/);
});

test("work detail routes load by category and slug", () => {
  assert.match(repository, /loadPublicWorkBySlug/);
  assert.match(repository, /\.eq\("category", category\)/);
  assert.match(repository, /\.eq\("slug", slug\)/);
});