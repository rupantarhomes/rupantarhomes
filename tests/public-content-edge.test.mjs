import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);

function load(path, mocks = {}, globals = {}) {
  const filename = resolve(root, path);
  const output = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  const localRequire = (name) => {
    if (name in mocks) return mocks[name];
    if (!name.startsWith(".")) return require(name);
    return load(`${resolve(dirname(filename), name)}.ts`, mocks, globals);
  };
  new Function("require", "module", "exports", ...Object.keys(globals), output)(localRequire, module, module.exports, ...Object.values(globals));
  return module.exports;
}

const workRow = {
  id: 7, title: "Latest Work", slug: "latest-work", category: "interior", location: "Kathmandu",
  short_description: "Short", long_description: "Long", featured: true,
  blog_url: "https://rupantarhomes.com/blog/latest-story",
  work_images: [{ id: 2, work_id: 7, secure_url: "https://res.cloudinary.com/test/image/upload/two.webp", cloudinary_public_id: "two", alt_text: "Two", sort_order: 1 },
    { id: 1, work_id: 7, secure_url: "https://res.cloudinary.com/test/image/upload/one.webp", cloudinary_public_id: "one", alt_text: "One", sort_order: 0 }],
};
const blogRow = { id: 3, title: "Latest Story", slug: "latest-story", body: "Story", category: "interior-design", created_at: "2026-09-01", updated_at: "2026-09-02" };

function memoryCache() {
  const values = new Map();
  return {
    values,
    async match(request) { return values.get(request.url)?.clone() ?? null; },
    async put(request, response) { values.set(request.url, response.clone()); },
  };
}

test("edge-first Works and Blog payloads are mapped, linked, cached and reusable", async () => {
  const cache = memoryCache();
  const calls = [];
  const endpoint = load("functions/api/public-content.ts", {
    "../_lib/env": { requirePublicRuntimeEnv: (env) => env },
    "../_lib/http": { fetchWithTimeout: async (url) => {
      calls.push(new URL(url));
      if (url.pathname.endsWith("/blogs")) return Response.json([blogRow]);
      if (url.searchParams.get("select") === "id,title,slug,category,blog_url") return Response.json([workRow]);
      return new Response(JSON.stringify([workRow]), { status: 200, headers: { "content-type": "application/json", "content-range": "0-0/1" } });
    } },
  }, { caches: { default: cache }, console: { error() {} } });
  const env = { SUPABASE_URL: "https://example.supabase.co", SUPABASE_PUBLISHABLE_KEY: "public-key" };

  const workPending = [];
  const workRequest = new Request("https://rupantarhomes.com/api/public-content?resource=works&offset=0&limit=12&category=all");
  const workResponse = await endpoint.onRequestGet({ request: workRequest, env, waitUntil: (promise) => workPending.push(promise) });
  await Promise.all(workPending);
  const workPayload = await workResponse.json();
  assert.equal(workPayload.total, 1);
  assert.deepEqual(workPayload.works[0].images.map((image) => image.publicId), ["one", "two"]);
  assert.equal(calls[0].searchParams.get("limit"), "12");
  assert.equal(calls[0].searchParams.get("work_images.order"), "sort_order.asc");
  assert.equal(cache.values.size, 2, "fresh and last-known-good snapshots are stored");

  const cachedResponse = await endpoint.onRequestGet({ request: workRequest, env, waitUntil: () => {} });
  assert.equal((await cachedResponse.json()).works[0].slug, "latest-work");
  assert.equal(calls.length, 1, "fresh edge hit avoids Supabase");

  const blogPending = [];
  const blogResponse = await endpoint.onRequestGet({
    request: new Request("https://rupantarhomes.com/api/public-content?resource=blog&slug=latest-story"), env,
    waitUntil: (promise) => blogPending.push(promise),
  });
  await Promise.all(blogPending);
  const blogPayload = await blogResponse.json();
  assert.equal(blogPayload.blog.title, "Latest Story");
  assert.deepEqual(blogPayload.linkedWork, { id: "7", title: "Latest Work", slug: "latest-work", category: "interior" });
  const linkedWorkRequest = calls.find((url) => url.searchParams.get("select") === "id,title,slug,category,blog_url");
  assert.match(linkedWorkRequest.searchParams.get("blog_url"), /^in\.\(https:\/\/rupantarhomes\.com\/blog\/latest-story/);
  assert.equal(linkedWorkRequest.searchParams.get("limit"), "1");
});

test("edge public content serves last-known-good data while origin refresh fails", async () => {
  const stale = Response.json({ blog: { ...blogRow }, linkedWork: null });
  const cache = { match: async (request) => new URL(request.url).searchParams.has("__stale") ? stale.clone() : null, put: async () => {} };
  const endpoint = load("functions/api/public-content.ts", {
    "../_lib/env": { requirePublicRuntimeEnv: (env) => env },
    "../_lib/http": { fetchWithTimeout: async () => { throw new Error("origin offline"); } },
  }, { caches: { default: cache }, console: { error() {} } });
  const pending = [];
  const response = await endpoint.onRequestGet({
    request: new Request("https://rupantarhomes.com/api/public-content?resource=blog&slug=latest-story"),
    env: { SUPABASE_URL: "https://example.supabase.co", SUPABASE_PUBLISHABLE_KEY: "public-key" },
    waitUntil: (promise) => pending.push(promise),
  });
  await Promise.all(pending);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-rupantar-stale"), "1");
  assert.equal((await response.json()).blog.slug, "latest-story");
});

test("public edge reads do not depend on unrelated Cloudinary secrets", () => {
  const { requirePublicRuntimeEnv, requireRuntimeEnv } = load("functions/_lib/env.ts");
  const publicOnly = {
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_PUBLISHABLE_KEY: "public-key",
  };

  assert.equal(requirePublicRuntimeEnv(publicOnly), publicOnly);
  assert.throws(() => requirePublicRuntimeEnv({ SUPABASE_URL: publicOnly.SUPABASE_URL }), /SUPABASE_PUBLISHABLE_KEY/);
  assert.throws(() => requireRuntimeEnv(publicOnly), /CLOUDINARY_CLOUD_NAME/);
});
