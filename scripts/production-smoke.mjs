import assert from "node:assert/strict";
import { chromium } from "playwright";

const productionUrl = new URL(process.env.PRODUCTION_URL || "https://rupantarhomes.com");
assert.equal(productionUrl.protocol, "https:");

async function get(path, accept = "application/json") {
  const response = await fetch(new URL(path, productionUrl), {
    headers: {
      accept,
      "cache-control": "no-cache",
      // Some edge bot policies reject Node's default user agent even though the
      // same public route is healthy for a browser. Keep the probe browser-like.
      "user-agent": "Mozilla/5.0 (compatible; RupantarHomesProductionMonitor/1.0)",
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (response.status === 401 || response.status === 403) {
    console.log(`SKIP direct ${path} probe: edge returned ${response.status}; browser smoke remains authoritative`);
    return null;
  }
  assert.equal(response.status, 200, `${path} returned ${response.status}`);
  return response;
}

const healthResponse = await get("/api/health");
if (healthResponse) {
  const health = await healthResponse.json();
  assert.deepEqual({ ok: health.ok, database: health.database }, { ok: true, database: "ok" });
  assert.ok(Number.isFinite(health.elapsed_ms) && health.elapsed_ms < 10_000, "health latency is invalid");
}

const homeResponse = await get("/api/public-home");
if (homeResponse) {
  const homePayload = await homeResponse.json();
  assert.equal(homePayload.works?.length, 6, "public Home endpoint must return six Works");
  await Promise.all(homePayload.works.map(async (work) => {
    const image = work.images?.[0];
    if (!image?.url) return;
    const response = await fetch(image.url, { method: "HEAD", signal: AbortSignal.timeout(8_000) });
    assert.ok(response.ok, `Work cover is unavailable: ${work.slug}`);
    assert.match(response.headers.get("content-type") || "", /^image\//, `Work cover is not an image: ${work.slug}`);
  }));
}
console.log("PASS available direct API and Work-cover probes");

const browser = await chromium.launch({ headless: true });
const failures = [];
try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 1000 }]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    page.setDefaultTimeout(15_000);
    page.setDefaultNavigationTimeout(20_000);
    page.on("pageerror", (error) => failures.push(`${viewport.width}px page error: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error") failures.push(`${viewport.width}px console error: ${message.text()}`);
    });

    await page.goto(productionUrl.href, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Recent Works", exact: true }).waitFor();
    await page.waitForFunction(() => document.querySelectorAll(".rh-recent-work-card").length === 6);
    assert.equal(await page.locator(".rh-recent-work-card").count(), 6);
    const recentImages = page.locator(".rh-recent-work-card img");
    await recentImages.first().waitFor();
    await page.waitForFunction(() => [...document.querySelectorAll(".rh-recent-work-card img")].every((image) => image.complete && image.naturalWidth > 0));

    await page.goto(new URL("/works", productionUrl).href, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "All Works", exact: true }).waitFor();
    await page.waitForFunction(() => document.querySelectorAll("main img").length > 0);
    const workImages = page.locator("main img");
    const imageCount = await workImages.count();
    for (let index = 0; index < Math.min(3, imageCount); index++) {
      assert.equal(await workImages.nth(index).getAttribute("loading"), "eager");
      assert.equal(await workImages.nth(index).getAttribute("fetchpriority"), "high");
      assert.equal(await workImages.nth(index).evaluate((image) => image.complete && image.naturalWidth > 0), true, `Work image ${index + 1} did not decode`);
    }
    if (imageCount > 3) assert.equal(await workImages.nth(3).getAttribute("loading"), "lazy");

    await page.locator('main [role="button"]').first().click();
    await page.getByRole("button", { name: "Back to Works", exact: true }).waitFor();
    const gallery = page.locator("main img").first();
    await gallery.waitFor();
    assert.equal(await gallery.getAttribute("loading"), "eager");

    await page.goto(new URL("/blog", productionUrl).href, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Blog", exact: true }).waitFor();
    const article = page.locator('main article[role="button"]').first();
    await article.waitFor();
    await article.click();
    const backButtons = page.getByRole("button", { name: "Back to Posts", exact: true });
    await backButtons.first().waitFor();
    assert.equal(await backButtons.count(), 2);
    await backButtons.first().click();
    await page.getByRole("heading", { name: "Blog", exact: true }).waitFor();
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Blog", exact: true }).waitFor();

    await context.close();
    console.log(`PASS browser smoke ${viewport.width}px`);
  }
} finally {
  await browser.close();
}

assert.deepEqual(failures, [], failures.join("\n"));
console.log(`Production smoke passed: ${productionUrl.origin}`);
