import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the reconstructed locked public interface", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Rupantar Homes<\/title>/i);
  assert.match(html, /Transforming/);
  assert.match(html, /Recent Works/);
  assert.match(html, /Crafted for Nepali Homes/);
  assert.match(html, /Send Estimate Request/);
  assert.match(html, /\/assets\/rupantar-logo\.jpg/);
  assert.doesNotMatch(html, /src="\/baseline\/rupantar-latest\.html"/i);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("keeps every public and admin surface in maintainable source components", async () => {
  const [site, home, publicPages, admin] = await Promise.all([
    readFile(new URL("../app/rupantar/site.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/rupantar/home-page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/rupantar/public-pages.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/rupantar/admin.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(site, /rupantar_works/);
  assert.match(site, /rupantar_reviews/);
  assert.match(home, /Have a Query\?/);
  assert.match(home, /How We Work/);
  assert.match(publicPages, /All Works/);
  assert.match(publicPages, /Project Overview/);
  assert.match(publicPages, /About Rupantar Homes/);
  assert.match(admin, /Admin Login/);
  assert.match(admin, /Dashboard/);
  assert.match(admin, /Manage Works/);
  assert.match(admin, /Manage Reviews/);
  assert.match(admin, /Save Settings/);
});

test("preserves the supplied HTML as an immutable visual reference", async () => {
  const baseline = await readFile(
    new URL("../public/baseline/rupantar-latest.html", import.meta.url),
  );

  assert.equal(
    createHash("sha256").update(baseline).digest("hex"),
    "74483ad7c3a1f04fe06914dc9be17b075ab4d066d4790ce5311b44ae3d9eff16",
  );
});
