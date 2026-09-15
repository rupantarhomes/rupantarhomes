import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("critical public bootstrap starts before React and warms exact route payloads", async () => {
  const [html, bootstrap] = await Promise.all([
    read("index.html"),
    read("app/public-route-bootstrap.ts"),
  ]);
  const homeIndex = html.indexOf('/app/home-bootstrap-early.js');
  const routeIndex = html.indexOf('/app/public-route-bootstrap.ts');
  const reactIndex = html.indexOf('/app/client-entry.tsx');
  assert.ok(homeIndex >= 0 && routeIndex > homeIndex && reactIndex > routeIndex);
  assert.match(bootstrap, /resource=works&offset=0&limit=12&category=/);
  assert.match(bootstrap, /resource=work&category=/);
  assert.match(bootstrap, /resource=blogs/);
  assert.match(bootstrap, /resource=blog&slug=/);
  assert.match(bootstrap, /document\.addEventListener\("pointerover"/);
  assert.match(bootstrap, /document\.addEventListener\("pointerdown"/);
  assert.match(bootstrap, /document\.addEventListener\("focusin"/);
  assert.match(bootstrap, /history\.pushState =/);
  assert.match(bootstrap, /window\.addEventListener\("popstate"/);
});

test("prepared public reads are adopted by the existing cache instead of duplicated", async () => {
  const data = await read("app/rupantar/public-data.ts");
  assert.match(data, /function preparedRead<T>/);
  assert.match(data, /__RUPANTAR_PUBLIC_BOOTSTRAP__/);
  assert.match(data, /preparedRead\(key, \(\) => repository\.loadPublicWorksPage/);
  assert.match(data, /preparedRead\(key, \(\) => repository\.loadPublicWorkBySlug/);
  assert.match(data, /preparedRead<repository\.PublicBlogsPayload>\("blogs:payload"/);
  assert.match(data, /preparedRead\(key, \(\) => fetchLinkedWork\(slug\)\)/);
  assert.match(data, /cache\.read\("blogs:list"/);
  assert.match(data, /persist\("blogs:list", blogs\)/);
});

test("Home prepares all six covers on normal links while weak links stay protected", async () => {
  const early = await read("app/home-bootstrap-early.js");
  assert.match(early, /if \(constrained\) return 0;/);
  assert.match(early, /if \(slow\) return 2;/);
  assert.match(early, /return 6;/);
  assert.match(early, /payload\.works\.slice\(0, homeCoverPreloadCount\(\)\)/);
  assert.match(early, /link\.fetchPriority = "low"/);
  assert.match(early, /imagesrcset/);
});

test("Works warm only first-frame media and Blog warming remains text-first", async () => {
  const bootstrap = await read("app/public-route-bootstrap.ts");
  assert.match(bootstrap, /desktop \? 3 : tablet \? 2 : 1/);
  assert.match(bootstrap, /\[320, 480, 768\], index === 0 \? "high" : "auto"/);
  assert.match(bootstrap, /\[480, 768, 1200, 1600\], "high"/);
  const blogsBody = bootstrap.match(/function warmBlogs\(\) \{([\s\S]*?)\n\}\n\nfunction warmBlog/)?.[1] ?? "";
  assert.ok(blogsBody.length > 0);
  assert.doesNotMatch(blogsBody, /preloadResponsive/);
});
