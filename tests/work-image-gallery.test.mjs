import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFileSync(resolve(root, path), "utf8").replace(/\r\n/g, "\n");
const require = createRequire(import.meta.url);
function load(path, mocks = {}, globals = {}) {
  const filename = resolve(root, path);
  const source = readFileSync(filename, "utf8").replace(/import\.meta\.env/g, "({})");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  const localRequire = (name) => {
    if (name in mocks) return mocks[name];
    if (name.endsWith(".css")) return {};
    if (!name.startsWith(".")) return require(name);
    const next = resolve(dirname(filename), name);
    return load(existsSync(next + ".tsx") ? next + ".tsx" : next + ".ts", mocks, globals);
  };
  new Function("require", "module", "exports", ...Object.keys(globals), output)(localRequire, module, module.exports, ...Object.values(globals));
  return module.exports;
}
const images = Array.from({ length: 6 }, (_, i) => ({ id: String(i), publicId: `work/${i}`, url: `https://res.cloudinary.com/test/image/upload/v1/${i}.webp`, altText: `Image ${i + 1}`, sortOrder: i }));

test("native gallery renders exactly the available layers and keeps the first image primary", () => {
  const { WorkImageGallery } = load("app/rupantar/work-image-gallery.tsx");
  for (const count of [1, 2, 3, 6]) {
    const html = renderToStaticMarkup(React.createElement(WorkImageGallery, { images: images.slice(0, count), title: "Kitchen" }));
    assert.equal((html.match(/class="rh-native-work-rear"/g) ?? []).length, count - 1);
    assert.match(html, /class="rh-native-work-front"[^>]*>[\s\S]*alt="Image 1"/);
    assert.match(html, new RegExp(`padding-bottom:${(count - 1) * 10}${count === 1 ? "" : "px"}`));
    assert.equal((html.match(/loading="eager"/g) ?? []).length, 1);
    assert.equal((html.match(/loading="lazy"/g) ?? []).length, count - 1);
    assert.doesNotMatch(html, /rh-native-work-viewer-photo/);
  }
});

test("only the page stack is square and cropped; fullscreen remains contained", () => {
  const css = read("app/rupantar/work-image-gallery.css");
  const rule = (selector) => css.slice(css.indexOf(selector + " {"), css.indexOf("}", css.indexOf(selector + " {")) + 1);
  assert.match(rule(".rh-native-work-stack"), /aspect-ratio: 1 \/ 1/);
  assert.match(rule(".rh-native-work-rear"), /aspect-ratio: 1 \/ 1/);
  assert.match(rule(".rh-native-work-stack-photo img"), /object-fit: cover/);
  assert.match(rule(".rh-native-work-viewer-photo img"), /object-fit: contain/);
  assert.doesNotMatch(css.split("\n").filter((line) => /viewer|stage/.test(line)).join("\n"), /aspect-ratio/);
  const { WorkImageGallery } = load("app/rupantar/work-image-gallery.tsx");
  for (const [width, height] of [[1920, 1080], [608, 1080]]) {
    const html = renderToStaticMarkup(React.createElement(WorkImageGallery, { images: [{ ...images[0], width, height }], title: "Work" }));
    assert.match(html, /class="rh-native-work-stack">/);
    assert.doesNotMatch(html, /aspect-ratio:/);
  }
});

test("Work detail metadata preserves values without displaying Featured", () => {
  const { WorkDetailPage } = load("app/rupantar/public-pages.tsx", { "./repository": {} });
  for (const featured of [false, true]) {
    const work = { id: "1", title: "Work", category: "interior", location: "Kapan, Kathmandu", images: images.slice(0, 1), featured };
    const html = renderToStaticMarkup(React.createElement(WorkDetailPage, { work, works: [] }));
    assert.doesNotMatch(html, />Featured<\/span>/);
    assert.match(html, /background-color:#FF1A3D;color:#fff;border-radius:8px;padding:4px 8px;max-width:100%;overflow-wrap:anywhere/);
    assert.match(html, /Kapan, Kathmandu<\/span>/);
    assert.match(html, /data-native-work-gallery/);
    assert.match(html, /Related Works/);
  }
});

test("Admin renders six compact slots using the existing upload/remove lifecycle", () => {
  const mocks = { "./supabase": {}, "./repository": {} };
  const { AdminPortal } = load("app/rupantar/admin.tsx", mocks);
  const { emptyWork } = load("app/rupantar/data.ts");
  for (const count of [0, 1, 3, 6]) {
    const html = renderToStaticMarkup(React.createElement(AdminPortal, { page: "admin-works", works: [], blogs: [], workForm: { ...emptyWork, images: images.slice(0, count) }, busy: false, uploadingImages: false }));
    assert.equal((html.match(/class="rh-admin-work-slot(?: rh-admin-work-empty)?"/g) ?? []).length, 6);
    assert.equal((html.match(/aria-label="Preview image/g) ?? []).length, count);
    assert.equal((html.match(/aria-label="Remove image"/g) ?? []).length, count);
    assert.equal((html.match(/type="file"/g) ?? []).length, 1);
  }
  const admin = read("app/rupantar/admin.tsx");
  assert.match(admin, /void onUploadImages\(files\)/);
  assert.match(admin, /onClick=\{\(\) => void onRemoveWorkImage\(index\)\}/);
  assert.match(admin, /images=\{\[previewImage\]\}/);
  const css = read("app/rupantar/work-image-gallery.css");
  assert.match(css, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /grid-template-rows: repeat\(3, auto\)/);
});

test("one through six validated uploads preserve order; seven rejects before any request", async () => {
  let calls = 0;
  let serial = 0;
  let currentId;
  const fakeFetch = async (url, init) => {
    calls++;
    if (url === "/api/cloudinary-signature") {
      currentId = `rupantar-homes/works/00000000-0000-4000-8000-${String(++serial).padStart(12, "0")}`;
      return Response.json({ signature: "signature", timestamp: 123, apiKey: "key", cloudName: "test", assetFolder: "rupantar-homes/works", publicId: currentId, format: "webp", transformation: "c_limit,h_1080,w_1920/q_auto:good" });
    }
    assert.equal(init.body.get("format"), "webp");
    return Response.json({ secure_url: `https://res.cloudinary.com/test/image/upload/v1/${currentId}.webp`, public_id: currentId, width: 1920, height: 1080, bytes: 1000, format: "webp" });
  };
  const { maximumWorkImages, uploadWorkImages } = load("app/rupantar/cloudinary.ts", { "./supabase": { getAccessToken: async () => "local-test-token" } }, { fetch: fakeFetch, window: { setTimeout, clearTimeout } });
  assert.equal(maximumWorkImages, 6);
  const files = Array.from({ length: 7 }, (_, i) => new File(["local fixture"], `${i}.jpg`, { type: "image/jpeg" }));
  for (const count of [1, 2, 3, 4, 5, 6]) {
    const result = await uploadWorkImages(files.slice(0, count));
    assert.equal(result.length, count);
    assert.deepEqual(result.map((image) => image.sortOrder), Array.from({ length: count }, (_, i) => i));
  }
  const before = calls;
  await assert.rejects(uploadWorkImages(files), /up to 6 images/);
  assert.equal(calls, before);
});

test("forward migration changes ONLY the canonical count and matching error wording", () => {
  const previous = read("supabase/migrations/20260904013000_restore_work_images_to_three.sql");
  const filename = readdirSync(resolve(root, "supabase/migrations")).find((name) => name.endsWith("_native_six_work_images.sql"));
  assert.ok(filename);
  assert.ok(filename > "20260904013000_restore_work_images_to_three.sql");
  const proposed = read(`supabase/migrations/${filename}`);
  const definition = (sql) => sql.slice(sql.indexOf("create or replace function"), sql.indexOf("$function$;") + "$function$;".length);
  assert.equal(definition(proposed), definition(previous).replace("normalized_images) > 3", "normalized_images) > 6").replace("at most three images", "at most six images"));
  assert.doesNotMatch(proposed, /drop |alter table|create table/i);
  const max = Number(proposed.match(/jsonb_array_length\(normalized_images\) > (\d+)/)[1]);
  for (let count = 0; count <= 7; count++) assert.equal(count > max, count === 7);
});

test("viewer has portal isolation, contained delivery, safe close, keyboard and directional swipe", () => {
  const source = read("app/rupantar/work-image-gallery.tsx");
  assert.match(source, /createPortal\(/);
  assert.match(source, /document\.body/);
  assert.match(source, /role="dialog" aria-modal="true"/);
  for (const key of ["Escape", "ArrowLeft", "ArrowRight", "Tab"]) assert.ok(source.includes(`"${key}"`));
  assert.match(source, /document\.removeEventListener\("keydown", onKeyDown\)/);
  assert.match(source, /Object\.assign\(body\.style, saved\)/);
  assert.match(source, /previousFocus\.focus/);
  assert.match(source, /Math\.abs\(dx\) >= 48 && Math\.abs\(dx\) > Math\.abs\(dy\) \* 1\.5/);
  assert.match(source, /onTouchCancel/);
  assert.match(source, /selectedIndex \+ 1\} \/ \{images\.length/);
  assert.doesNotMatch(source, /MutationObserver|document\.createElement|appendChild/);
  const css = read("app/rupantar/work-image-gallery.css");
  assert.match(css, /position: fixed; inset: 0/);
  assert.match(css, /z-index: 2147483647/);
  assert.match(css, /object-fit: contain/);
  assert.match(read("app/rupantar/work-media-enhancer.ts"), /!image\.closest\("\[data-native-work-gallery\]"\)/);
});
