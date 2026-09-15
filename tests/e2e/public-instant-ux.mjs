import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = resolve(new URL("../../", import.meta.url).pathname);
const origin = "http://127.0.0.1:5179";
const apiOrigin = "http://127.0.0.1:54322";
const vite = spawn(process.execPath, [resolve(root, "node_modules/vite/bin/vite.js"), "--host", "127.0.0.1", "--port", "5179", "--strictPort"], {
  cwd: root,
  env: { ...process.env, VITE_SUPABASE_URL: apiOrigin, VITE_SUPABASE_PUBLISHABLE_KEY: "public-e2e-key" },
  stdio: ["ignore", "pipe", "pipe"],
});
let viteOutput = "";
vite.stdout.on("data", (chunk) => { viteOutput += chunk; });
vite.stderr.on("data", (chunk) => { viteOutput += chunk; });

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt++) {
    try {
      const response = await fetch(origin);
      if (response.ok) return;
    } catch { /* still starting */ }
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  throw new Error(`Vite did not start.\n${viteOutput}`);
}

const imageBytes = await readFile(resolve(root, "public/hero-real-1-mobile.webp"));
const image = (workId, index) => ({
  id: `${workId}-image-${index}`, workId: String(workId),
  url: `https://res.cloudinary.com/ux-test/image/upload/v1/work-${workId}-${index}.webp`,
  publicId: `rupantar-homes/works/work-${workId}-${index}`, altText: `Project ${workId} image ${index}`,
  sortOrder: index - 1, width: 1080, height: 1920, bytes: imageBytes.length,
});
const categories = ["modular-kitchen", "architect", "interior", "tv-cabinet", "home-construction", "wardrobe"];
const works = categories.map((category, index) => ({
  id: String(index + 1), title: index === 0 ? "Instant Kitchen Project" : `Instant Project ${index + 1}`,
  slug: index === 0 ? "instant-kitchen" : `instant-project-${index + 1}`, category, location: "Kathmandu",
  shortDesc: "A production-quality project fixture.", longDesc: "Full project details remain immediately available.",
  featured: index < 3, blogUrl: index === 0 ? "https://rupantarhomes.com/blog/instant-kitchen-story" : "",
  images: Array.from({ length: index === 0 ? 3 : 1 }, (_, imageIndex) => image(index + 1, imageIndex + 1)),
}));
const blogs = [
  { id: "1", title: "Instant Kitchen Story", slug: "instant-kitchen-story", body: "Planning details for this kitchen.\n\nExecution details without a second visible request.", category: "interior-design", createdAt: "2026-09-01", updatedAt: "2026-09-02" },
  { id: "2", title: "Architecture Planning", slug: "architecture-planning", body: "Architecture guidance.", category: "architecture", createdAt: "2026-08-01", updatedAt: "2026-08-02" },
];
const linkedWork = { id: works[0].id, title: works[0].title, slug: works[0].slug, category: works[0].category };
const reviews = [{ id: "1", name: "Client", location: "Kathmandu", message: "Excellent work.", rating: 5, instagramLink: "" }];
const settings = { slogan: "Transforming Spaces Inspiring Lives", phone: "+9779745941799", instagram: "https://instagram.com/", tiktok: "https://tiktok.com/", address: "Kathmandu, Nepal", workshopNote: "Visit" };

function rawWork(work) {
  return {
    id: Number(work.id), title: work.title, slug: work.slug, category: work.category, location: work.location,
    short_description: work.shortDesc, long_description: work.longDesc, featured: work.featured, blog_url: work.blogUrl,
  };
}
function rawImage(value) {
  return { id: value.id, work_id: Number(value.workId), secure_url: value.url, cloudinary_public_id: value.publicId, alt_text: value.altText, sort_order: value.sortOrder, width: value.width, height: value.height, byte_size: value.bytes };
}

async function installNetwork(context, delayMs, counters) {
  await context.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const json = async (body, status = 200, headers = {}) => {
      if (delayMs && (url.pathname.startsWith("/api/") || url.hostname === "res.cloudinary.com")) await new Promise((resolveWait) => setTimeout(resolveWait, delayMs));
      return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body), headers });
    };
    if (url.hostname === "res.cloudinary.com") {
      counters.images++;
      if (delayMs) await new Promise((resolveWait) => setTimeout(resolveWait, delayMs));
      return route.fulfill({ status: 200, contentType: "image/webp", body: imageBytes, headers: { "cache-control": "public,max-age=31536000" } });
    }
    if (url.hostname.endsWith("googleapis.com") || url.hostname.endsWith("gstatic.com")) return route.fulfill({ status: 200, contentType: "text/css", body: "" });
    if (url.origin === origin && url.pathname === "/api/public-home") {
      counters.home++;
      return json({ works, reviews, settings, confirmedAt: Date.now() });
    }
    if (url.origin === origin && url.pathname === "/api/public-content") {
      const resource = url.searchParams.get("resource");
      counters[resource] = (counters[resource] || 0) + 1;
      if (resource === "works") {
        const category = url.searchParams.get("category") || "all";
        const filtered = category === "all" ? works : works.filter((work) => work.category === category);
        return json({ works: filtered, total: filtered.length });
      }
      if (resource === "work") return json({ work: works.find((work) => work.category === url.searchParams.get("category") && work.slug === url.searchParams.get("slug")) ?? null });
      if (resource === "blogs") return json({ blogs, linkedWorks: { "instant-kitchen-story": linkedWork, "architecture-planning": null } });
      if (resource === "blog") {
        const blog = blogs.find((value) => value.slug === url.searchParams.get("slug")) ?? null;
        return json({ blog, linkedWork: blog?.slug === "instant-kitchen-story" ? linkedWork : null });
      }
      return json({ error: "unknown" }, 400);
    }
    if (url.origin === apiOrigin && url.pathname.startsWith("/rest/v1/")) {
      if (url.pathname.endsWith("/reviews")) return json(reviews.map((review) => ({ ...review, instagram_url: review.instagramLink })));
      if (url.pathname.endsWith("/site_settings")) return json([{ id: 1, slogan: settings.slogan, phone: settings.phone, instagram_url: settings.instagram, tiktok_url: settings.tiktok, address: settings.address, workshop_note: settings.workshopNote }]);
      if (url.pathname.endsWith("/works")) return json(works.map(rawWork), 200, { "content-range": `0-${works.length - 1}/${works.length}` });
      if (url.pathname.endsWith("/work_images")) return json(works.flatMap((work) => work.images.map(rawImage)));
      if (url.pathname.endsWith("/blogs")) return json(blogs.map((blog) => ({ ...blog, created_at: blog.createdAt, updated_at: blog.updatedAt })));
      if (url.pathname.endsWith("/admin_users")) return json([]);
    }
    if (url.origin === apiOrigin && url.pathname.startsWith("/auth/v1/")) return json({}, 401);
    if (url.origin === origin || url.hostname === "127.0.0.1" || url.hostname === "localhost") return route.continue();
    return route.abort();
  });
}

const atTop = async (page, label) => assert.ok(await page.evaluate(() => Math.abs(scrollY) <= 2), `${label} did not open at top`);
const decoded = async (locator, label) => {
  await locator.waitFor({ state: "visible" });
  await locator.evaluate((node) => node.decode ? node.decode() : Promise.resolve());
  assert.equal(await locator.evaluate((node) => node.complete && node.naturalWidth > 0), true, `${label} did not decode`);
};
async function mobileMenu(page, width, label) {
  if (width < 1024) {
    await page.getByRole("button", { name: "Open menu", exact: true }).click();
    await page.getByRole("button", { name: label, exact: true }).filter({ visible: true }).first().click();
  } else {
    await page.getByRole("button", { name: label, exact: true }).filter({ visible: true }).first().click();
  }
}
async function tapVisible(page, locator, marker, metrics, label) {
  await locator.scrollIntoViewIfNeeded();
  const started = Date.now();
  await locator.click();
  await marker.waitFor({ state: "visible" });
  metrics[label] = Date.now() - started;
  await atTop(page, label);
  assert.ok(await page.locator("main").count(), `${label} left a blank route`);
}

async function runJourney(browser, config) {
  const counters = { home: 0, works: 0, work: 0, blogs: 0, blog: 0, images: 0 };
  const context = await browser.newContext({ viewport: { width: config.width, height: config.height }, hasTouch: config.width < 500, isMobile: config.width < 500 });
  await context.addInitScript(() => {
    try { Object.defineProperty(navigator, "connection", { configurable: true, value: undefined }); } catch { /* browser-owned */ }
  });
  await installNetwork(context, config.delayMs, counters);
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  const session = await context.newCDPSession(page);
  if (config.cpuRate > 1) await session.send("Emulation.setCPUThrottlingRate", { rate: config.cpuRate });
  const metrics = {};

  try {
    const homeStarted = Date.now();
    await page.goto(origin, { waitUntil: "domcontentloaded" });
    const intro = page.locator(".brand-intro");
    await intro.waitFor({ state: "visible" });
    assert.equal(await intro.evaluate((node) => getComputedStyle(node).pointerEvents), "none");
    assert.ok(await page.locator("main").count(), "Brand Intro blocked the public content render");
    const introStarted = Date.now();
    await intro.waitFor({ state: "detached" });
    metrics.brandIntro = Date.now() - introStarted;
    assert.ok(metrics.brandIntro >= 1_700, `Brand Intro held for only ${metrics.brandIntro}ms after display`);
    assert.ok(metrics.brandIntro < 2_600, `Brand Intro remained for ${metrics.brandIntro}ms after display`);
    await page.getByRole("heading", { name: "Recent Works", exact: true }).waitFor();
    await page.waitForFunction(() => document.querySelectorAll(".rh-recent-work-card").length === 6);
    metrics.homeCold = Date.now() - homeStarted;
    assert.equal(await page.locator(".rh-recent-work-card").count(), 6);
    await decoded(page.locator(".rh-recent-work-card img").first(), "Recent Work cover");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, "Home drifted horizontally");

    await page.locator("footer").scrollIntoViewIfNeeded();
    await tapVisible(page, page.getByRole("button", { name: "All Works", exact: true }).filter({ visible: true }).last(), page.getByRole("heading", { name: "All Works", exact: true }), metrics, "homeToWorks");
    await decoded(page.locator("main .rh-work-card img").first(), "first Works cover");

    await page.getByRole("button", { name: "Modular Kitchen", exact: true }).filter({ visible: true }).first().click();
    await page.waitForURL("**/works/modular-kitchen");
    await page.getByText("Instant Kitchen Project", { exact: true }).first().waitFor();
    await atTop(page, "Works category");

    await tapVisible(page, page.locator('main [role="button"]').filter({ hasText: "Instant Kitchen Project" }).first(), page.getByRole("heading", { name: "Instant Kitchen Project", exact: true }), metrics, "workDetail");
    await decoded(page.locator(".rh-native-work-track img").first(), "active Work image");
    assert.equal(await page.locator(".rh-native-work-track").evaluate((node) => getComputedStyle(node).scrollSnapType.startsWith("x")), true);
    assert.equal(await page.locator("html").evaluate((node) => getComputedStyle(node).scrollSnapType === "none"), true, "page-wide snap remained enabled");

    const track = page.locator(".rh-native-work-track");
    const swipeStarted = Date.now();
    await track.evaluate((node) => node.scrollTo({ left: node.clientWidth, behavior: "auto" }));
    await page.waitForFunction(() => document.querySelectorAll(".rh-native-work-dot")[1]?.getAttribute("aria-current") === "true");
    metrics.gallerySwipe = Date.now() - swipeStarted;
    await decoded(track.locator("img").nth(1), "next Work image");
    await track.evaluate((node) => node.scrollTo({ left: node.clientWidth * 2, behavior: "auto" }));
    await page.waitForFunction(() => document.querySelectorAll(".rh-native-work-dot")[2]?.getAttribute("aria-current") === "true");
    assert.ok(metrics.gallerySwipe < 500, `gallery index response was ${metrics.gallerySwipe}ms`);
    await page.evaluate(() => scrollTo(0, 700));
    assert.ok(await page.evaluate(() => scrollY > 100), "Work page vertical scrolling is locked");

    await page.evaluate(() => history.back());
    await page.getByRole("heading", { name: "All Works", exact: true }).waitFor();
    await atTop(page, "back from Work detail");

    const blogStart = Date.now();
    await mobileMenu(page, config.width, "Blog");
    await page.getByRole("heading", { name: "Blog", exact: true }).waitFor();
    metrics.blogList = Date.now() - blogStart;
    await atTop(page, "Blog list");
    const article = page.locator('main article[role="button"]').filter({ hasText: "Instant Kitchen Story" });
    await tapVisible(page, article, page.getByRole("heading", { name: "Instant Kitchen Story", exact: true }), metrics, "blogArticle");
    assert.equal(await page.getByRole("button", { name: "Back to Posts", exact: true }).count(), 2);
    await page.getByRole("link", { name: "View Project Images", exact: true }).waitFor();

    await page.evaluate(() => history.back());
    await page.getByRole("heading", { name: "Blog", exact: true }).waitFor();
    await atTop(page, "back to Blog");

    await mobileMenu(page, config.width, "About");
    await page.getByText("About Rupantar Homes", { exact: true }).waitFor();
    await atTop(page, "About");
    await mobileMenu(page, config.width, "Contact");
    await page.getByRole("heading", { name: "Contact Rupantar Homes", exact: true }).waitFor();
    await atTop(page, "Contact");

    await page.goto(`${origin}/works/modular-kitchen/instant-kitchen`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Instant Kitchen Project", exact: true }).waitFor();
    await atTop(page, "direct Work URL");
    await decoded(page.locator(".rh-native-work-track img").first(), "direct Work image");
    const workCalls = counters.work;
    const warmWorkStarted = Date.now();
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Instant Kitchen Project", exact: true }).waitFor();
    metrics.workWarmReload = Date.now() - warmWorkStarted;
    assert.equal(counters.work, workCalls, "fresh persisted Work made another edge detail request");

    await page.goto(`${origin}/blog/instant-kitchen-story`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Instant Kitchen Story", exact: true }).waitFor();
    await atTop(page, "direct Blog URL");
    await page.getByRole("link", { name: "View Project Images", exact: true }).waitFor();
    const blogCalls = counters.blog;
    const warmBlogStarted = Date.now();
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Instant Kitchen Story", exact: true }).waitFor();
    metrics.blogWarmReload = Date.now() - warmBlogStarted;
    assert.equal(counters.blog, blogCalls, "fresh persisted Blog made another edge detail request");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, "page-wide horizontal drift");
    assert.deepEqual(errors, [], errors.join("\n"));
    assert.ok(metrics.blogList < config.maximumRouteMs, `Blog list took ${metrics.blogList}ms`);
    assert.ok(metrics.blogArticle < config.maximumRouteMs, `Blog article took ${metrics.blogArticle}ms`);
    return { viewport: config.width, constrained: config.delayMs > 0, counters, metrics };
  } finally {
    await context.close();
  }
}

await waitForServer();
let browser;
try {
  browser = await chromium.launch(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL, headless: true } : { headless: true });
  const results = [];
  results.push(await runJourney(browser, { width: 390, height: 844, delayMs: 120, cpuRate: 4, maximumRouteMs: 4_000 }));
  results.push(await runJourney(browser, { width: 1440, height: 1000, delayMs: 0, cpuRate: 1, maximumRouteMs: 1_500 }));
  console.log(`Public instant UX PASS ${JSON.stringify(results)}`);
} finally {
  if (browser) await browser.close();
  vite.kill("SIGTERM");
}
