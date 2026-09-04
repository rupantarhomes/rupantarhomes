import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import { resolve, dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";
import { preview } from "vite";

const root = fileURLToPath(new URL("../", import.meta.url));
const dist = resolve(root, "dist");
const asset = /\.(?:js|css|webp|png|jpe?g|svg|ico|mp4|woff2?|webmanifest)(?:[?#].*)?$/i;

function localReferences(source, filename) {
  const refs = new Set();
  if (/\.(?:tsx?|js)$/.test(filename)) {
    const file = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true);
    const visit = (node) => {
      if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
        && /^(?:\/(?!\/)|\.\.?\/|assets\/)/.test(node.text) && asset.test(node.text)) refs.add(node.text);
      ts.forEachChild(node, visit);
    };
    visit(file);
  } else if (/\.css$/.test(filename)) {
    for (const match of source.matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/g)) {
      if (!/^(?:data:|https?:|\/\/|#)/.test(match[1])) refs.add(match[1]);
    }
  } else if (/\.html$/.test(filename)) {
    for (const match of source.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
      if (!/^(?:https?:|\/\/|#)/.test(match[1]) && asset.test(match[1])) refs.add(match[1]);
    }
  }
  return [...refs];
}

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => entry.isDirectory()
    ? filesUnder(resolve(directory, entry.name)) : resolve(directory, entry.name)))).flat();
}

test("production build contains every emitted local chunk, stylesheet and declared public image", async () => {
  // Source literals cover all 16 responsive hero images; emitted literals also
  // cover Vite's dynamic import/preload dependency table. No remote requests.
  const files = [resolve(dist, "index.html"), ...await filesUnder(resolve(dist, "assets")), ...await filesUnder(resolve(root, "app"))];
  for (const file of files.filter((path) => /\.(?:tsx?|js|css|html)$/.test(path))) {
    const source = await readFile(file, "utf8");
    for (const ref of localReferences(source, file)) {
      const path = ref.split(/[?#]/)[0];
      const destination = path.startsWith("/") || path.startsWith("assets/")
        ? resolve(dist, path.replace(/^\//, "")) : resolve(dirname(file), path);
      const allowedRoot = file.startsWith(resolve(root, "app") + sep) ? root : dist;
      assert.ok(!relative(allowedRoot, destination).startsWith(`..${sep}`), `asset escapes its source/build root: ${ref}`);
      assert.ok((await stat(destination).catch(() => null))?.isFile(), `${relative(root, file)} references missing asset ${ref}`);
    }
  }
});

test("asset scanner detects missing-chunk forms without interpreting remote URLs as local files", () => {
  assert.deepEqual(localReferences('import("./missing.js"); const deps=["assets/shared.js"]; const image="/hero.webp"; const remote="https://example.test/image.webp";', "chunk.js"), ["./missing.js", "assets/shared.js", "/hero.webp"]);
  assert.deepEqual(localReferences('url("/missing.woff2") url(data:image/svg+xml,test)', "styles.css"), ["/missing.woff2"]);
});

const routeCases = [
  ["/", { kind: "home" }], ["/about", { kind: "about" }],
  ["/contact", { kind: "contact" }], ["/privacy", { kind: "privacy" }],
  ["/works", { kind: "works", category: "all" }],
  ["/works/interior-design", { kind: "interior-design" }],
  ["/works/interior", { kind: "works", category: "interior" }],
  ["/works/interior/fixture-project", { kind: "work-detail", category: "interior", slug: "fixture-project" }],
  ["/blog", { kind: "blog" }], ["/blog/fixture-story", { kind: "blog-detail", slug: "fixture-story" }],
  ["/admin", { kind: "admin" }],
];

test("real route parser preserves direct entry and encoded Work/Blog cross-link contracts", async () => {
  const source = await readFile(resolve(root, "app/rupantar/routes.ts"), "utf8");
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
  const exports = {};
  new Function("exports", outputText)(exports);
  for (const [path, route] of routeCases) assert.deepEqual(exports.parseRoute(path), route);
  const work = { category: "interior", slug: "space & light" };
  assert.deepEqual(exports.parseRoute(exports.workPath(work)), { kind: "work-detail", ...work });
  assert.deepEqual(exports.parseRoute(exports.blogArticlePath(work.slug)), { kind: "blog-detail", slug: work.slug });
  assert.doesNotThrow(() => exports.parseRoute("/blog/%E0%A4%A"));
});

test("built SPA serves the same entry document on direct route visits and refreshes", async () => {
  // Deterministic local fallback check, not a claim about external Pages rules
  // or production records. Never send test writes to production.
  const server = await preview({ configFile: false, root, build: { outDir: dist }, preview: { host: "127.0.0.1", port: 0, open: false } });
  try {
    const address = server.httpServer.address();
    const origin = `http://127.0.0.1:${address.port}`;
    const html = await readFile(resolve(dist, "index.html"), "utf8");
    for (const [path] of routeCases) {
      for (let refresh = 0; refresh < 2; refresh++) {
        const response = await fetch(`${origin}${path}`, { headers: { accept: "text/html" }, signal: AbortSignal.timeout(5000) });
        assert.equal(response.status, 200, path);
        assert.match(response.headers.get("content-type"), /text\/html/);
        assert.equal(await response.text(), html, path);
      }
    }
  } finally {
    await server.close();
  }
});
