// Run against local Vite with VITE_SUPABASE_URL=http://127.0.0.1:54322,
// VITE_SUPABASE_PUBLISHABLE_KEY=test-publishable-key and
// VITE_CLOUDINARY_API_BASE=http://127.0.0.1:54322/cloudinary.
// Playwright is supplied by the test environment; no production dependency.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const origin = process.env.GALLERY_TEST_URL || "http://127.0.0.1:5178";
assert.ok(/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin), "local test only");
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || "msedge", headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const user = { id: "00000000-0000-4000-8000-000000000001", email: "gallery@example.test", role: "authenticated", aud: "authenticated" };
const work = { id: 1, title: "Gallery fixture", slug: "gallery-fixture", category: "interior", location: "Kathmandu", short_description: "Fixture overview", long_description: "Fixture details", featured: false, blog_url: "https://rupantarhomes.com/blog/gallery-story" };
const makeImage = (i, publicId = `rupantar-homes/works/fixture-${i}`) => ({ id: i, work_id: 1, cloudinary_public_id: publicId, secure_url: `https://res.cloudinary.com/gallery-test/image/upload/v1/${publicId}.webp`, alt_text: `Fixture ${i}`, sort_order: i - 1, width: 1672, height: 941, byte_size: 30000 });
let images = Array.from({ length: 6 }, (_, i) => makeImage(i + 1));
const deleted = [];
let savedPayload;
let signedId;
let uploads = 0;
const imageBytes = await readFile(new URL("../../public/hero-real-1-v2.webp", import.meta.url));
await context.addInitScript(() => sessionStorage.setItem("rupantar-brand-intro-seen", "1"));
await context.route("**/*", async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  const json = (body, status = 200, extra = {}) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body), headers: { "access-control-allow-origin": "*", "access-control-expose-headers": "content-range", ...extra } });
  if (url.hostname === "res.cloudinary.com") return route.fulfill({ contentType: "image/webp", body: imageBytes });
  if (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") return route.abort();
  if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "GET,POST,HEAD,OPTIONS" } });
  if (url.pathname === "/auth/v1/token") return json({ access_token: "fixture-token", refresh_token: "fixture-refresh", expires_in: 3600, token_type: "bearer", user });
  if (url.pathname === "/auth/v1/user") return json(user);
  if (url.pathname === "/api/cloudinary-signature") {
    signedId = `rupantar-homes/works/${randomUUID()}`;
    return json({ signature: "fixture-signature", apiKey: "fixture-key", cloudName: "gallery-test", assetFolder: "rupantar-homes/works", publicId: signedId, timestamp: 123, format: "webp", transformation: "c_limit,h_1080,w_1920/q_auto:good" });
  }
  if (url.pathname.includes("/image/upload")) { uploads++; return json({ public_id: signedId, secure_url: makeImage(1, signedId).secure_url, width: 1672, height: 941, bytes: 30000, format: "webp" }); }
  if (url.pathname === "/api/cloudinary-delete") { deleted.push(...request.postDataJSON().publicIds); return json({ deleted }); }
  if (url.pathname === "/rest/v1/rpc/save_work_with_images") {
    savedPayload = request.postDataJSON();
    assert.ok(savedPayload.p_images.length <= 6);
    images = savedPayload.p_images.map((image, i) => ({ ...image, id: i + 1, work_id: 1, sort_order: i }));
    return json(1);
  }
  if (url.pathname.startsWith("/rest/v1/rpc/")) return json([]);
  if (url.pathname.startsWith("/rest/v1/")) {
    const tables = { works: [work], work_images: images, admin_users: [{ user_id: user.id, is_active: true }], blogs: [{ id: 1, title: "Exact linked Blog title", slug: "gallery-story", category: "interior", body: "Story", created_at: new Date().toISOString(), updated_at: new Date().toISOString() }], reviews: [], leads: [], queries: [], estimate_requests: [], site_settings: [{ id: 1, slogan: "Fixture", phone: "9745941799", address: "Kathmandu, Nepal", workshop_note: "Fixture", instagram_url: "https://www.instagram.com/", tiktok_url: "https://www.tiktok.com/" }] };
    const table = url.pathname.split("/").pop();
    assert.ok(table in tables, `unexpected table ${table}`);
    const rows = tables[table];
    if (request.method() === "HEAD") return route.fulfill({ status: 200, headers: { "content-range": `0-0/${rows.length}`, "access-control-expose-headers": "content-range", "access-control-allow-origin": "*" } });
    return json(request.headers().accept?.includes("vnd.pgrst.object") ? rows[0] ?? null : rows, 200, { "content-range": `0-${rows.length - 1}/${rows.length}` });
  }
  return route.continue();
});
const widths = [320, 375, 390, 393, 414, 430, 1280, 1440];
const artifactDir = process.env.GALLERY_ARTIFACTS;
if (artifactDir) await mkdir(artifactDir, { recursive: true });
const noOverflow = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "horizontal overflow");
const visible = (selector) => page.locator(selector).waitFor({ state: "visible" });
try {
  await page.goto(`${origin}/works/interior/gallery-fixture`);
  await visible(".rh-native-work-front img");
  await page.getByRole("heading", { name: "Exact linked Blog title", exact: true }).waitFor();
  for (const width of widths) {
    await page.setViewportSize({ width, height: width < 500 ? 844 : 900 });
    await noOverflow();
    assert.equal(await page.locator(".rh-native-work-rear").count(), 5);
    const geometry = await page.locator(".rh-native-work-gallery").evaluate((element) => ({ bottom: element.getBoundingClientRect().bottom, rear: [...element.querySelectorAll(".rh-native-work-rear")].map((x) => x.getBoundingClientRect().bottom), width: element.getBoundingClientRect().width }));
    assert.ok(geometry.rear.every((bottom) => bottom <= geometry.bottom + 1));
    for (let i = 1; i < 5; i++) assert.ok(geometry.rear[i] > geometry.rear[i - 1]);
    if (width >= 1024) assert.equal(geometry.width, 520);
    await page.locator(".rh-native-work-front").scrollIntoViewIfNeeded();
    if (artifactDir && [390, 1440].includes(width)) await page.screenshot({ path: resolve(artifactDir, `public-${width}.png`), fullPage: true });
    const scrollBefore = await page.evaluate(() => scrollY);
    await page.getByRole("button", { name: "Open Gallery fixture image gallery", exact: true }).click();
    await visible(".rh-native-work-viewer");
    assert.equal(await page.getByRole("dialog").count(), 1, "legacy viewer must not also open");
    assert.equal(await page.locator(".rh-native-work-counter").textContent(), "1 / 6");
    assert.equal(await page.locator(".rh-native-work-viewer-photo img").evaluate((img) => getComputedStyle(img).objectFit), "contain");
    assert.equal(await page.getByRole("button", { name: "Previous image", exact: true }).isDisabled(), true);
    await page.keyboard.press("ArrowRight");
    await page.waitForFunction(() => document.querySelector(".rh-native-work-counter")?.textContent === "2 / 6");
    await page.getByRole("button", { name: "Next image", exact: true }).click();
    await page.waitForFunction(() => document.querySelector(".rh-native-work-counter")?.textContent === "3 / 6");
    await page.locator(".rh-native-work-stage").dispatchEvent("touchstart", { touches: [{ identifier: 1, clientX: 260, clientY: 200 }] });
    await page.locator(".rh-native-work-stage").dispatchEvent("touchend", { touches: [], changedTouches: [{ identifier: 1, clientX: 140, clientY: 205 }] });
    await page.waitForFunction(() => document.querySelector(".rh-native-work-counter")?.textContent === "4 / 6");
    await page.locator(".rh-native-work-stage").dispatchEvent("touchstart", { touches: [{ identifier: 1, clientX: 260, clientY: 200 }] });
    await page.locator(".rh-native-work-stage").dispatchEvent("touchend", { touches: [], changedTouches: [{ identifier: 1, clientX: 240, clientY: 380 }] });
    assert.equal(await page.locator(".rh-native-work-counter").textContent(), "4 / 6");
    for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowRight");
    assert.equal(await page.locator(".rh-native-work-counter").textContent(), "6 / 6");
    assert.equal(await page.getByRole("button", { name: "Next image", exact: true }).isDisabled(), true);
    await page.getByRole("button", { name: "Close image viewer", exact: true }).focus();
    await page.keyboard.press("Shift+Tab");
    assert.equal(await page.getByRole("button", { name: "Previous image", exact: true }).evaluate((el) => el === document.activeElement), true);
    await page.keyboard.press("Tab");
    assert.equal(await page.getByRole("button", { name: "Close image viewer", exact: true }).evaluate((el) => el === document.activeElement), true);
    assert.equal(await page.evaluate(() => document.body.style.position), "fixed");
    if (artifactDir && width === 390) await page.screenshot({ path: resolve(artifactDir, "viewer-390.png") });
    await page.keyboard.press("Escape");
    await page.locator(".rh-native-work-viewer").waitFor({ state: "detached" });
    assert.equal(await page.evaluate(() => document.body.style.position), "");
    assert.ok(Math.abs(await page.evaluate(() => scrollY) - scrollBefore) < 2);
    assert.equal(await page.locator(".rh-native-work-front").evaluate((el) => el === document.activeElement), true);
    console.log(`Public stack/viewer PASS ${width}`);
  }
  images = [makeImage(1)];
  await page.reload();
  await visible(".rh-native-work-front");
  assert.equal(await page.locator(".rh-native-work-rear").count(), 0);
  await page.locator(".rh-native-work-front").click();
  await visible(".rh-native-work-viewer");
  assert.equal(await page.locator(".rh-native-work-prev").count(), 0);
  await page.locator(".rh-native-work-viewer").click({ position: { x: 2, y: 70 } });
  await page.locator(".rh-native-work-viewer").waitFor({ state: "detached" });

  await page.goto(`${origin}/admin`);
  await page.getByPlaceholder("Email", { exact: true }).fill("gallery@example.test");
  await page.getByPlaceholder("Password", { exact: true }).fill("local-fixture-only");
  await page.locator('button[type="submit"]').click();
  await page.getByRole("button", { name: "Works", exact: true }).filter({ visible: true }).click();
  await visible(".rh-admin-work-images");
  assert.equal(await page.locator(".rh-admin-work-empty").count(), 6);
  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Upload image 4", exact: true }).click();
  const chooser = await chooserPromise;
  const jpeg = await readFile(new URL("../../public/assets/rupantar-logo.jpg", import.meta.url));
  await chooser.setFiles(Array.from({ length: 6 }, (_, i) => ({ name: `fixture-${i}.jpg`, mimeType: "image/jpeg", buffer: jpeg })));
  await page.waitForFunction(() => document.querySelectorAll(".rh-admin-work-thumb").length === 6);
  assert.equal(uploads, 6);
  for (const width of widths) {
    await page.setViewportSize({ width, height: width < 500 ? 844 : 900 });
    await noOverflow();
    const cells = await page.locator(".rh-admin-work-slot").evaluateAll((elements) => elements.map((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width }; }));
    assert.equal(cells.length, 6);
    for (let i = 0; i < 6; i += 2) { assert.equal(cells[i].y, cells[i + 1].y); assert.ok(cells[i].x < cells[i + 1].x); }
    assert.ok(cells[0].y < cells[2].y && cells[2].y < cells[4].y);
    assert.ok(await page.locator(".rh-admin-work-remove").evaluateAll((buttons) => buttons.every((button) => {
      const r = button.getBoundingClientRect(), p = button.parentElement.getBoundingClientRect();
      return r.top >= p.top && r.bottom <= p.bottom + 1 && r.left >= p.left && r.right <= p.right + 1;
    })), "Remove controls stay inside their own slots");
    await page.locator(".rh-admin-work-images").scrollIntoViewIfNeeded();
    if (artifactDir && [390, 1440].includes(width)) await page.screenshot({ path: resolve(artifactDir, `admin-${width}.png`), fullPage: true });
    if (artifactDir) await page.locator(".rh-admin-work-images").screenshot({ path: resolve(artifactDir, `slots-${width}.png`) });
    await page.getByRole("button", { name: "Preview image 6", exact: true }).click();
    await visible(".rh-native-work-viewer");
    assert.equal(await page.locator(".rh-native-work-counter").textContent(), "1 / 1");
    await page.getByRole("button", { name: "Close image viewer", exact: true }).click();
    await page.locator(".rh-native-work-viewer").waitFor({ state: "detached" });
    console.log(`Admin six slots/preview PASS ${width}`);
  }
  await page.getByPlaceholder("Title", { exact: true }).fill("Gallery fixture");
  await page.getByRole("button", { name: "Save Work", exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll(".rh-admin-work-empty").length === 6);
  assert.equal(savedPayload.p_images.length, 6);
  assert.equal(deleted.length, 0);
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll(".rh-admin-work-thumb").length === 6);
  await page.getByRole("button", { name: "Remove image", exact: true }).last().click();
  await page.waitForFunction(() => document.querySelectorAll(".rh-admin-work-thumb").length === 5);
  assert.equal(deleted.length, 0, "persisted removal remains draft-only");
  await page.getByRole("button", { name: "Update Work", exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll(".rh-admin-work-empty").length === 6);
  assert.equal(savedPayload.p_images.length, 5);
  assert.equal(deleted.length, 1, "obsolete image cleans up after successful save");
  assert.deepEqual(errors, []);
  console.log("PASS: six-image local upload/save/edit/remove lifecycle; no production requests");
} finally { await browser.close(); }
