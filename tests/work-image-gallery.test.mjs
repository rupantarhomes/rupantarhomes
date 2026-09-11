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

test("native Work gallery renders a swipe-only image track with dots and no fullscreen trigger", () => {
  const { WorkImageGallery } = load("app/rupantar/work-image-gallery.tsx");
  for (const count of [1, 2, 3, 6]) {
    const html = renderToStaticMarkup(React.createElement(WorkImageGallery, { images: images.slice(0, count), title: "Kitchen" }));
    assert.match(html, /class="rh-native-work-track"/);
    assert.equal((html.match(/class="rh-native-work-slide"/g) ?? []).length, count);
    assert.equal((html.match(/loading="eager"/g) ?? []).length, 1);
    assert.equal((html.match(/loading="lazy"/g) ?? []).length, Math.max(0, count - 1));
    assert.doesNotMatch(html, /rh-native-work-front|Open Kitchen image gallery|rh-native-work-viewer-photo/);
    assert.doesNotMatch(html, /Previous gallery image|Next gallery image/);
    if (count === 1) {
      assert.doesNotMatch(html, /rh-native-work-page-dots|Swipe to view more images|rh-native-work-gesture-cue|rh-native-work-desktop-nav/);
    } else {
      assert.match(html, /class="rh-native-work-gesture-cue" aria-hidden="true"><span><\/span><\/div>/);
      assert.match(html, /class="rh-native-work-dots rh-native-work-page-dots"/);
      assert.match(html, /class="rh-native-work-desktop-nav"/);
      assert.equal((html.match(/class="rh-native-work-dot(?: is-active)?"/g) ?? []).length, count);
      assert.equal((html.match(/aria-current="true"/g) ?? []).length, 1);
      assert.match(html, /aria-label="Previous Work photo"/);
      assert.match(html, /aria-label="Next Work photo"/);
      assert.match(html, />Swipe to view more images<\/div>/);
    }
  }
});

test("the page gallery keeps 9:16 framing, fluid manual slide motion and branded liquid-glass cue", () => {
  const css = read("app/rupantar/work-image-gallery.css");
  const rule = (selector) => css.slice(css.indexOf(selector + " {"), css.indexOf("}", css.indexOf(selector + " {")) + 1);
  assert.match(rule(".rh-native-work-stack"), /aspect-ratio: 9 \/ 16/);
  assert.match(rule(".rh-native-work-stack"), /overflow: hidden/);
  assert.match(rule(".rh-native-work-stack"), /-webkit-tap-highlight-color: transparent/);
  assert.match(rule(".rh-native-work-track"), /transition: transform 560ms cubic-bezier\(\.22,\.8,\.24,1\)/);
  assert.match(rule(".rh-native-work-track.is-dragging"), /transition: none/);
  assert.match(rule(".rh-native-work-stack-photo img"), /object-fit: cover/);
  assert.match(rule(".rh-native-work-slide"), /pointer-events: none/);
  assert.match(rule(".rh-native-work-gesture-cue"), /pointer-events: none/);
  assert.match(rule(".rh-native-work-gesture-cue"), /rgb\(255 71 96 \/ \.92\)/);
  assert.match(rule(".rh-native-work-gesture-cue"), /backdrop-filter: blur\(13px\) saturate\(180%\)/);
  assert.match(rule(".rh-native-work-viewer-photo img"), /object-fit: contain/);
  assert.match(rule("main:has([data-native-work-gallery]) > button:first-child"), /display: none/);
  assert.match(css, /scroll-snap-type: y proximity/);
  assert.match(css, /scroll-snap-align: start/);
  assert.match(css, /width: min\(100%, calc\(\(100dvh - 210px\) \* 9 \/ 16\)\)/);
  const { WorkImageGallery } = load("app/rupantar/work-image-gallery.tsx");
  const html = renderToStaticMarkup(React.createElement(WorkImageGallery, { images: images.slice(0, 2), title: "Work" }));
  assert.match(html, /transform:translate3d\(calc\(-0% \+ 0px\), 0, 0\)/);
  assert.doesNotMatch(html, /type="button" class="rh-native-work-front"/);
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
  const fakeFetch = async (url, init) => {
    calls++;
    if (url === "/api/cloudinary-signature") {
      const publicId = `rupantar-homes/works/00000000-0000-4000-8000-${String(++serial).padStart(12, "0")}`;
      return Response.json({ signature: "signature", timestamp: 123, apiKey: "key", cloudName: "test", assetFolder: "rupantar-homes/works", publicId, format: "webp", transformation: "c_limit,h_1080,w_1920/q_auto:good" });
    }
    if (url === "/api/cloudinary-delete") return Response.json({ ok: true });
    assert.ok(init.body instanceof FormData);
    assert.equal(init.body.get("format"), "webp");
    const publicId = init.body.get("public_id");
    assert.equal(typeof publicId, "string");
    return Response.json({ secure_url: `https://res.cloudinary.com/test/image/upload/v1/${publicId}.webp`, public_id: publicId, width: 1920, height: 1080, bytes: 1000, format: "webp" });
  };
  const { maximumWorkImages, uploadWorkImages } = load("app/rupantar/cloudinary.ts", { "./supabase": { getAccessToken: async () => "local-test-token" } }, { fetch: fakeFetch, window: { setTimeout, clearTimeout } });
  assert.equal(maximumWorkImages, 6);
  const files = Array.from({ length: 7 }, (_, i) => new File(["local fixture"], `${i}.jpg`, { type: "image/jpeg" }));
  for (const count of [1, 2, 3, 4, 5, 6]) {
    const result = await uploadWorkImages(files.slice(0, count));
    assert.equal(result.length, count);
    assert.deepEqual(result.map((image) => image.sortOrder), Array.from({ length: count }, (_, i) => i));
    assert.equal(new Set(result.map((image) => image.publicId)).size, count);
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

test("Admin viewer keeps safe portal behavior while public Work gallery stays inline", () => {
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
  assert.match(source, /onPointerDown/);
  assert.match(source, /pageTouchStart/);
  assert.match(source, /pagePointerStart/);
  assert.match(source, /onTouchMove/);
  assert.match(source, /onPointerMove/);
  assert.match(source, /dragOffset/);
  assert.match(source, /rh-native-work-track/);
  assert.match(source, /rh-native-work-gesture-cue/);
  assert.match(source, /rh-native-work-page-dots/);
  assert.match(source, /rh-native-work-desktop-nav/);
  assert.match(source, /rh-native-work-viewer-dots/);
  assert.match(source, /Swipe to view more images/);
  assert.doesNotMatch(source, /Previous gallery image|Next gallery image|rh-native-work-prev|rh-native-work-next|rh-native-work-rear/);
  assert.match(source, /selectedIndex \+ 1\} \/ \{images\.length/);
  assert.doesNotMatch(source, /MutationObserver|document\.createElement|appendChild/);
  const publicGallery = source.slice(source.indexOf("export function WorkImageGallery"));
  assert.doesNotMatch(publicGallery, /WorkImageViewer|setSelectedIndex|createPortal/);
  const css = read("app/rupantar/work-image-gallery.css");
  assert.match(css, /position: fixed; inset: 0/);
  assert.match(css, /z-index: 2147483647/);
  assert.match(css, /object-fit: contain/);
  assert.match(css, /\.rh-native-work-dot\.is-active::before/);
  assert.match(css, /\.rh-native-work-swipe-hint \{ margin-top: 11px;/);
  assert.match(css, /\.rh-native-work-viewer-dots \{ bottom:/);
  assert.match(css, /\.rh-native-work-stage \.rh-native-work-viewer-photo \{[^\n]*box-shadow: none !important;[^\n]*--tw-ring-color: transparent/);
  assert.doesNotMatch(css, /rh-native-work-page-prev|rh-native-work-page-next|rh-native-work-prev|rh-native-work-next/);
  assert.match(read("app/rupantar/work-media-enhancer.ts"), /!image\.closest\("\[data-native-work-gallery\]"\)/);
});

test("public gallery has no autoplay, keeps cue until final image, and adds desktop arrow controls", () => {
  const source = read("app/rupantar/work-image-gallery.tsx");
  const publicGallery = source.slice(source.indexOf("export function WorkImageGallery"));
  assert.doesNotMatch(source, /galleryAutoplayDelayMs/);
  assert.doesNotMatch(publicGallery, /visibilitychange|document\.hidden|prefers-reduced-motion/);
  assert.doesNotMatch(publicGallery, /hasSwiped|setHasSwiped/);
  assert.match(publicGallery, /images\.length > 1 && currentPageIndex < lastIndex/);
  assert.match(publicGallery, /aria-label="Previous Work photo"/);
  assert.match(publicGallery, /aria-label="Next Work photo"/);
  assert.match(publicGallery, /disabled=\{currentPageIndex === 0\}/);
  assert.match(publicGallery, /disabled=\{currentPageIndex === lastIndex\}/);
  assert.match(publicGallery, /translate3d\(calc\(-\$\{currentPageIndex \* 100\}% \+ \$\{dragOffset\}px\), 0, 0\)/);
  assert.match(publicGallery, /isDragging \? " is-dragging" : ""/);
});

test("gallery preloads exact Cloudinary variants without delaying the first image", () => {
  const source = read("app/rupantar/work-image-gallery.tsx");
  assert.match(source, /function useGalleryPreload/);
  assert.match(source, /fetchPriority = "low"/);
  assert.match(source, /preload\.decode\(\)/);
  assert.match(source, /requestIdleCallback/);
  assert.match(source, /setTimeout\(\(\) => \{/);
  assert.match(source, /activeIndex \+ 1, activeIndex - 1, activeIndex \+ 2/);
  assert.match(source, /saveData === true/);
  assert.match(source, /effectiveType === "slow-2g"/);
  assert.match(source, /effectiveType === "2g"/);
  assert.match(source, /c_limit,w_\$\{width\}\/f_auto\/q_auto:good/);
  assert.match(source, /useGalleryPreload\(images, currentPageIndex, "\(min-width: 1024px\) 520px, 100vw", pageGalleryWidths\)/);
  assert.match(source, /useGalleryPreload\(images, selectedIndex, "100vw", viewerGalleryWidths\)/);
  assert.doesNotMatch(source, /fetchPriority = "high"/);
});