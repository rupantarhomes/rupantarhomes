// Optional real-browser fault injection, using the same environment-supplied
// Playwright and local Vite environment as work-image-gallery.mjs. No live writes.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const origin = process.env.GALLERY_TEST_URL || "http://127.0.0.1:5178";
assert.match(origin, /^http:\/\/(?:localhost|127\.0\.0\.1):\d+$/);
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || "msedge", headless: true });
const user = { id: "00000000-0000-4000-8000-000000000001", email: "resilience@example.test", role: "authenticated", aud: "authenticated" };
const failureText = "Rupantar Homes could not finish loading";

async function fixture(width, fault) {
  const context = await browser.newContext({ viewport: { width, height: 844 } });
  await context.addInitScript(() => {
    window.__unhandled = [];
    window.addEventListener("unhandledrejection", (event) => window.__unhandled.push(String(event.reason)));
  });
  await context.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    // Every service request is synthetic, even when the page's config points
    // at the localhost Supabase fixture. Anything external is blocked.
    if (!["localhost", "127.0.0.1"].includes(url.hostname)) return route.abort();
    const json = (body) => route.fulfill({ contentType: "application/json", body: JSON.stringify(body), headers: { "access-control-allow-origin": "*" } });
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "GET,POST,HEAD,OPTIONS" } });
    if (url.pathname === "/auth/v1/token") return json({ access_token: "local-fixture-token", refresh_token: "local-fixture-refresh", expires_in: 3600, token_type: "bearer", user });
    if (url.pathname === "/auth/v1/user") return json(user);
    if (url.pathname.startsWith("/rest/v1/")) {
      if (request.method() === "HEAD") return route.fulfill({ status: 200, headers: { "content-range": "0-0/0", "access-control-expose-headers": "content-range", "access-control-allow-origin": "*" } });
      const table = url.pathname.split("/").pop();
      if (table === "admin_users") return json([{ user_id: user.id, is_active: true }]);
      if (table === "site_settings") return json({ id: 1, slogan: "Fixture", phone: "9745941799", address: "Kathmandu", workshop_note: "Fixture", instagram_url: "", tiktok_url: "" });
      return json([]);
    }
    if (fault === "chunk" && /\/app\/rupantar\/(public-pages|blog-pages)\.tsx$/.test(url.pathname)) return route.abort();
    const target = fault === "public" && url.pathname.endsWith("/public-pages.tsx") ? "AboutPage"
      : fault === "admin" && url.pathname.endsWith("/admin.tsx") ? "AdminWorks"
      : fault === "intro" && url.pathname.endsWith("/brand-intro.tsx") ? "BrandIntro" : null;
    if (target) {
      const response = await route.fetch();
      const body = await response.text();
      const pattern = new RegExp(`(function ${target}\\([^\\n]*\\) \\{)`);
      assert.match(body, pattern, `fault injection must match ${target}`);
      return route.fulfill({ response, body: body.replace(pattern, "$1 throw new Error('controlled render fixture');") });
    }
    // No unmocked write may reach even the local Functions development server.
    assert.ok(["GET", "HEAD"].includes(request.method()), `unmocked write: ${url.pathname}`);
    return route.continue();
  });
  const page = await context.newPage();
  const diagnostics = [];
  page.on("console", (message) => { if (message.type() === "error") diagnostics.push(message.text()); });
  return { context, page, diagnostics };
}

const navigate = (page, path) => page.evaluate((path) => {
  history.pushState(null, "", path);
  dispatchEvent(new PopStateEvent("popstate"));
}, path);

try {
  for (const width of [390, 1440]) {
    const { context, page, diagnostics } = await fixture(width, "public");
    await page.goto(`${origin}/about`);
    await page.getByRole("heading", { name: failureText }).waitFor();
    assert.equal(await page.locator("nav").count(), 1);
    assert.equal(await page.locator("footer").count(), 1);
    await navigate(page, "/contact");
    await page.getByRole("heading", { name: "Contact Rupantar Homes", exact: true }).waitFor();
    assert.equal(await page.getByRole("heading", { name: failureText }).count(), 0);
    await page.goBack();
    await page.getByRole("heading", { name: failureText }).waitFor();
    await page.goForward();
    await page.getByRole("heading", { name: "Contact Rupantar Homes", exact: true }).waitFor();
    assert.ok(diagnostics.some((message) => message.includes("Rupantar Homes render failure")));
    await context.close();
    console.log(`PASS public failure containment/navigation/back/forward ${width}`);
  }
  {
    const { context, page, diagnostics } = await fixture(390, "intro");
    await page.goto(`${origin}/contact`);
    await page.getByRole("heading", { name: "Contact Rupantar Homes", exact: true }).waitFor();
    assert.equal(await page.getByRole("heading", { name: failureText }).count(), 0);
    assert.ok(diagnostics.some((message) => message.includes("Rupantar Homes render failure")));
    await context.close();
    console.log("PASS optional intro failure does not replace public app");
  }
  {
    const { context, page, diagnostics } = await fixture(390, "chunk");
    await page.goto(origin);
    await page.getByRole("heading", { name: "Recent Works", exact: true }).waitFor();
    await page.waitForFunction(() => document.querySelector("footer"));
    // Wait on the observable failure, not a fixed arbitrary sleep.
    await page.waitForFunction(() => document.querySelector("nav"));
    await navigate(page, "/about");
    await page.getByRole("heading", { name: failureText }).waitFor();
    assert.equal(await page.locator("nav").count(), 1);
    assert.deepEqual(await page.evaluate(() => window.__unhandled), []);
    assert.ok(diagnostics.some((message) => message.includes("Unable to prefetch")));
    await context.close();
    console.log("PASS rejected warm/lazy chunks remain diagnosed and contained");
  }
  {
    const { context, page } = await fixture(390, "admin");
    await page.goto(`${origin}/admin`);
    await page.getByPlaceholder("Email", { exact: true }).fill(user.email);
    await page.getByPlaceholder("Password", { exact: true }).fill("local-fixture-only");
    await page.locator('button[type="submit"]').click();
    await page.getByRole("button", { name: "Blogs", exact: true }).filter({ visible: true }).click();
    await page.getByPlaceholder("Title", { exact: true }).fill("Unsaved local draft stays intact");
    await page.getByRole("button", { name: "Works", exact: true }).filter({ visible: true }).click();
    await page.getByRole("heading", { name: failureText }).waitFor();
    await page.getByRole("button", { name: "Blogs", exact: true }).filter({ visible: true }).click();
    await page.getByPlaceholder("Title", { exact: true }).waitFor();
    assert.equal(await page.getByPlaceholder("Title", { exact: true }).inputValue(), "Unsaved local draft stays intact");
    assert.equal(await page.getByRole("heading", { name: failureText }).count(), 0);
    await context.close();
    console.log("PASS Admin tab failure keeps navigation/session and recovers another tab");
  }
} finally { await browser.close(); }
