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
  const source = readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  const localRequire = (name) => {
    if (name in mocks) return mocks[name];
    if (!name.startsWith(".")) return require(name);
    const next = resolve(dirname(filename), name);
    return load(next.endsWith(".ts") ? next : `${next}.ts`, mocks, globals);
  };
  new Function("require", "module", "exports", ...Object.keys(globals), output)(localRequire, module, module.exports, ...Object.values(globals));
  return module.exports;
}

const rows = [{
  id: 7,
  title: "Latest Work",
  slug: "latest-work",
  category: "interior",
  location: "Kathmandu",
  short_description: "Short",
  long_description: "Long",
  featured: true,
  blog_url: null,
  work_images: [
    { id: 2, work_id: 7, secure_url: "https://res.cloudinary.com/test/image/upload/two.webp", cloudinary_public_id: "two", alt_text: "Two", sort_order: 1, width: 800, height: 1200, byte_size: 20 },
    { id: 1, work_id: 7, secure_url: "https://res.cloudinary.com/test/image/upload/one.webp", cloudinary_public_id: "one", alt_text: "One", sort_order: 0, width: 800, height: 1200, byte_size: 10 },
  ],
}];

test("public Home endpoint joins six Works and images behind one edge-cached browser request", async () => {
  let dependencyCalls = 0;
  const requestedUrls = [];
  let cachedResponse;
  const cache = { match: async () => null, put: async (_key, response) => { cachedResponse = response; } };
  const endpoint = load("functions/api/public-home.ts", {
    "../_lib/env": { requireRuntimeEnv: (env) => env },
    "../_lib/http": { fetchWithTimeout: async (url) => {
      dependencyCalls++;
      requestedUrls.push(url);
      if (url.pathname.endsWith("/works")) return Response.json(rows);
      if (url.pathname.endsWith("/reviews")) return Response.json([{ id: 1, name: "Client", location: "Kathmandu", message: "Excellent", rating: 5, instagram_url: null }]);
      return Response.json([{ slogan: "Spaces", phone: "9745941799", instagram_url: "https://instagram.com/", tiktok_url: "https://tiktok.com/", address: "Kathmandu", workshop_note: "Visit" }]);
    } },
  }, { caches: { default: cache } });
  const pending = [];
  const response = await endpoint.onRequestGet({
    request: new Request("https://rupantarhomes.com/api/public-home"),
    env: { SUPABASE_URL: "https://example.supabase.co", SUPABASE_PUBLISHABLE_KEY: "public-key" },
    waitUntil: (promise) => pending.push(promise),
  });
  await Promise.all(pending);
  assert.equal(response.status, 200);
  assert.equal(dependencyCalls, 3);
  const requestedUrl = requestedUrls.find((url) => url.pathname.endsWith("/works"));
  assert.equal(requestedUrl.searchParams.get("limit"), "6");
  assert.match(requestedUrl.searchParams.get("select"), /work_images\(id,work_id,secure_url/);
  assert.equal(requestedUrl.searchParams.get("work_images.order"), "sort_order.asc");
  const payload = await response.json();
  assert.equal(payload.works[0].id, "7");
  assert.deepEqual(payload.works[0].images.map((image) => image.publicId), ["one", "two"]);
  assert.equal(payload.reviews[0].name, "Client");
  assert.equal(payload.settings.phone, "9745941799");
  assert.match(cachedResponse.headers.get("cache-control"), /s-maxage=30/);
});

test("public Home endpoint serves an edge hit without touching Supabase", async () => {
  const cached = Response.json({ works: rows, confirmedAt: 1 });
  const endpoint = load("functions/api/public-home.ts", {
    "../_lib/env": { requireRuntimeEnv: (env) => env },
    "../_lib/http": { fetchWithTimeout: async () => { throw new Error("must not run"); } },
  }, { caches: { default: { match: async () => cached, put: async () => {} } } });
  const response = await endpoint.onRequestGet({ request: new Request("https://rupantarhomes.com/api/public-home"), env: {}, waitUntil: () => {} });
  assert.equal(response, cached);
});

test("stored and early Home bootstraps accept confirmed live Works and reject malformed data", async () => {
  const store = new Map();
  const window = {
    localStorage: { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) },
  };
  const module = load("app/rupantar/home-bootstrap.ts", {}, { window, fetch: async () => Response.json({ works: [], reviews: [], settings: settings(), confirmedAt: Date.now() }) });
  assert.equal(module.storedHomeContent(), null);
  window.__RUPANTAR_HOME_BOOTSTRAP__ = Promise.resolve({ works: [{
    id: "7", title: "Latest Work", slug: "latest-work", category: "interior", location: "Kathmandu",
    shortDesc: "Short", longDesc: "Long", featured: true, images: [{ id: "1", url: "https://res.cloudinary.com/test/image/upload/one.webp", publicId: "one", altText: "One", sortOrder: 0 }],
  }], reviews: [], settings: settings(), confirmedAt: Date.now() });
  assert.equal((await module.earlyHomeContent()).works[0].id, "7");
  assert.equal(module.storedHomeContent().works[0].id, "7");
  window.__RUPANTAR_HOME_BOOTSTRAP__ = Promise.resolve({ works: [{ id: "bad" }], reviews: [], settings: settings(), confirmedAt: Date.now() });
  await assert.rejects(module.earlyHomeContent(), /invalid/);
});

test("CSP-safe early Home module falls back to public Supabase configuration before React", async () => {
  const html = readFileSync(resolve(root, "index.html"), "utf8");
  let source = readFileSync(resolve(root, "app/home-bootstrap-early.js"), "utf8");
  source = source
    .replace('String(import.meta.env.VITE_SUPABASE_URL || "").trim()', '"https://example.supabase.co"')
    .replace('String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "").trim()', '"public-key"');

  const calls = [];
  const links = [];
  const window = { location: { pathname: "/" }, localStorage: { getItem: () => null } };
  const document = { createElement: () => ({ setAttribute(name, value) { this[name] = value; } }), head: { appendChild: (link) => links.push(link) } };
  const fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    if (url === "/api/public-home") return Response.json({}, { status: 503 });
    if (String(url).includes("/works?")) return Response.json(rows);
    if (String(url).includes("/reviews?")) return Response.json([{ id: 1, name: "Client", location: "Kathmandu", message: "Excellent", rating: 5 }]);
    return Response.json([{ slogan: "Spaces", phone: "9745941799", address: "Kathmandu", workshop_note: "Visit" }]);
  };

  new Function("window", "document", "fetch", source)(window, document, fetch);
  const payload = await window.__RUPANTAR_HOME_BOOTSTRAP__;
  assert.equal(calls.length, 4);
  assert.equal(payload.works[0].images[0].publicId, "one");
  assert.equal(payload.settings.phone, "9745941799");
  assert.equal(links.length, 1);
  assert.match(links[0].imagesrcset, /w_160/);
  assert.doesNotMatch(html, /<script>\s*[\s\S]*__RUPANTAR_HOME_BOOTSTRAP__/);
  assert.ok(html.indexOf('/app/home-bootstrap-early.js') < html.indexOf('/app/client-entry.tsx'));
});

function settings() {
  return { slogan: "Spaces", phone: "9745941799", instagram: "", tiktok: "", address: "Kathmandu", workshopNote: "Visit" };
}

test("Home starts six stable slots and requests correctly sized Recent Work covers", () => {
  const home = readFileSync(resolve(root, "app/rupantar/home-page.tsx"), "utf8");
  const html = readFileSync(resolve(root, "index.html"), "utf8");
  const early = readFileSync(resolve(root, "app/home-bootstrap-early.js"), "utf8");
  const site = readFileSync(resolve(root, "app/rupantar/site.tsx"), "utf8");
  assert.match(home, /featured\.length === 0 && Array\.from\(\{ length: 6 \}/);
  assert.match(home, /sizes="\(min-width: 1024px\) 33vw, \(min-width: 640px\) 50vw, 33vw" widths=\{\[160, 320, 480, 768\]\}/);
  assert.ok(html.indexOf("/app/home-bootstrap-early.js") < html.indexOf("/app/client-entry.tsx"));
  assert.match(html, /<script type="module" src="\/app\/home-bootstrap-early\.js"><\/script>/);
  assert.doesNotMatch(html, /<script>\s*[\s\S]*__RUPANTAR_HOME_BOOTSTRAP__/);
  assert.match(early, /window\.location\.pathname === "\/"/);
  assert.match(early, /localStorage\.getItem\("rupantar-home-bootstrap-v1"\)/);
  assert.match(early, /link\.fetchPriority = "low"/);
  assert.match(early, /link\.setAttribute\("imagesrcset"/);
  assert.match(early, /VITE_SUPABASE_URL/);
  assert.match(early, /VITE_SUPABASE_PUBLISHABLE_KEY/);
  assert.match(early, /\.catch\(\(\) => directHomeBootstrap\(\)\)/);
  assert.match(early, /work_images\(id,work_id,secure_url/);
  assert.match(early, /work_images\.order=sort_order\.asc&limit=6/);
  assert.match(site, /earlyHomeContent\(\)/);
  assert.match(site, /primePublicContent\(/);
  assert.match(site, /liveHomeContentConfirmedRef\.current/);
});
