import assert from "node:assert/strict";
import { chromium } from "playwright";

const productionUrl = new URL(process.env.PRODUCTION_URL || "https://rupantarhomes.com");
assert.equal(productionUrl.protocol, "https:");

const browserUserAgent = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36";
const edgeBlockStatuses = new Set([401, 403]);
const edgeChallengePattern = /(?:just a moment|attention required|cloudflare ray id|verify you are human|enable javascript and cookies|cf-chl)/i;
const browserGeneratedResourceError = /^Failed to load resource:/i;
const cloudflareTelemetryCspError = /static\.cloudflareinsights\.com\/beacon\.min\.js[\s\S]*Content Security Policy/i;
const edgeInjectedInlineCspError = /^Executing inline script violates the following Content Security Policy directive: "script-src 'self'"/i;
const directEvidence = {
  health: false,
  home: false,
  shell: false,
  appEntry: false,
};

function sameProductionOrigin(rawUrl) {
  try {
    return new URL(rawUrl).origin === productionUrl.origin;
  } catch {
    return false;
  }
}

function isKnownPlatformConsoleNoise(text) {
  return browserGeneratedResourceError.test(text)
    || cloudflareTelemetryCspError.test(text)
    || edgeInjectedInlineCspError.test(text);
}

async function get(path, accept = "application/json") {
  const response = await fetch(new URL(path, productionUrl), {
    headers: {
      accept,
      "accept-language": "en-US,en;q=0.9",
      "cache-control": "no-cache",
      "user-agent": browserUserAgent,
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (edgeBlockStatuses.has(response.status)) {
    console.log(`SKIP direct ${path} probe: edge returned ${response.status}`);
    return null;
  }
  assert.equal(response.status, 200, `${path} returned ${response.status}`);
  return response;
}

async function detectEdgeInterruption(page, navigationResponse, blockedResponses) {
  const navigationStatus = navigationResponse?.status();
  if (edgeBlockStatuses.has(navigationStatus)) return `navigation returned ${navigationStatus}`;

  const [title, bodyText, html] = await Promise.all([
    page.title().catch(() => ""),
    page.locator("body").innerText({ timeout: 2_000 }).catch(() => ""),
    page.content().catch(() => ""),
  ]);
  if (edgeChallengePattern.test(`${title}\n${bodyText.slice(0, 4_000)}\n${html.slice(0, 12_000)}`)) {
    return `Cloudflare challenge page (${title || "untitled"})`;
  }

  const blocked = blockedResponses.find(({ status, url }) => edgeBlockStatuses.has(status) && sameProductionOrigin(url));
  return blocked ? `${blocked.status} from ${blocked.url}` : null;
}

async function waitForMarkerOrClassifyEdge(page, navigationResponse, marker, label, blockedResponses) {
  try {
    await marker.waitFor({ state: "visible", timeout: 20_000 });
    return { visible: true, edgeReason: null };
  } catch (error) {
    const edgeReason = await detectEdgeInterruption(page, navigationResponse, blockedResponses);
    if (edgeReason) {
      console.log(`EDGE browser ${label}: GitHub runner hit edge policy (${edgeReason})`);
      return { visible: false, edgeReason };
    }

    const title = await page.title().catch(() => "");
    const currentUrl = page.url();
    throw new Error(
      `${label} did not reach its expected UI marker within 20s (url=${currentUrl}, title=${JSON.stringify(title)}): ${error.message}`,
      { cause: error },
    );
  }
}

async function waitForImageDecode(page, selector, index, label) {
  await page.waitForFunction(
    ({ selector: imageSelector, index: imageIndex }) => {
      const image = document.querySelectorAll(imageSelector)[imageIndex];
      return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0;
    },
    { selector, index },
    { timeout: 15_000 },
  ).catch((error) => {
    throw new Error(`${label} did not decode within 15s`, { cause: error });
  });
}

const healthResponse = await get("/api/health");
if (healthResponse) {
  const health = await healthResponse.json();
  assert.deepEqual({ ok: health.ok, database: health.database }, { ok: true, database: "ok" });
  assert.ok(Number.isFinite(health.elapsed_ms) && health.elapsed_ms < 10_000, "health latency is invalid");
  directEvidence.health = true;
}

const homeResponse = await get("/api/public-home");
if (homeResponse) {
  const homePayload = await homeResponse.json();
  assert.equal(homePayload.works?.length, 6, "public Home endpoint must return six Works");
  await Promise.all(homePayload.works.map(async (work) => {
    const image = work.images?.[0];
    if (!image?.url) return;
    const response = await fetch(image.url, {
      method: "HEAD",
      headers: { "user-agent": browserUserAgent },
      signal: AbortSignal.timeout(8_000),
    });
    assert.ok(response.ok, `Work cover is unavailable: ${work.slug}`);
    assert.match(response.headers.get("content-type") || "", /^image\//, `Work cover is not an image: ${work.slug}`);
  }));
  directEvidence.home = true;
}

const shellResponse = await get("/", "text/html,application/xhtml+xml");
if (shellResponse) {
  assert.match(shellResponse.headers.get("content-type") || "", /text\/html/i, "production root is not HTML");
  const shell = await shellResponse.text();
  assert.match(shell, /<div[^>]+id=["']root["']/i, "production root mount is missing");

  const sameOriginScripts = [...shell.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)]
    .map((match) => new URL(match[1], productionUrl))
    .filter((url) => url.origin === productionUrl.origin);
  assert.ok(sameOriginScripts.length > 0, "production app entry script is missing");
  directEvidence.shell = true;

  const appEntryResponse = await get(sameOriginScripts[0].href, "text/javascript,application/javascript,*/*;q=0.1");
  if (appEntryResponse) {
    assert.match(
      appEntryResponse.headers.get("content-type") || "",
      /(?:java|ecma)script|text\/plain/i,
      "production app entry is not JavaScript",
    );
    const appEntry = await appEntryResponse.text();
    assert.ok(appEntry.length > 500, "production app entry is unexpectedly empty");
    directEvidence.appEntry = true;
  }
}

const strictFallbackReady = Object.values(directEvidence).every(Boolean);
console.log(`PASS direct production probes: ${JSON.stringify(directEvidence)}`);

const browser = await chromium.launch({ headless: true });
const failures = [];
try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 1000 }]) {
    const context = await browser.newContext({
      viewport,
      userAgent: browserUserAgent,
      locale: "en-US",
    });
    const page = await context.newPage();
    const blockedResponses = [];
    const observedFailures = [];
    let activeRoute = "Home";
    let blockedRoute = null;

    page.setDefaultTimeout(15_000);
    page.setDefaultNavigationTimeout(20_000);
    page.on("response", (response) => {
      const status = response.status();
      const url = response.url();
      if (edgeBlockStatuses.has(status)) {
        blockedResponses.push({ status, url, route: activeRoute });
      }
      if (status >= 500 && sameProductionOrigin(url)) {
        observedFailures.push({ route: activeRoute, message: `${viewport.width}px ${activeRoute} production response ${status}: ${url}` });
      }
    });
    page.on("pageerror", (error) => observedFailures.push({ route: activeRoute, message: `${viewport.width}px page error: ${error.message}` }));
    page.on("console", (message) => {
      if (message.type() !== "error") return;
      const text = message.text();
      if (isKnownPlatformConsoleNoise(text)) {
        console.log(`INFO ignored platform/browser console noise on ${activeRoute}: ${text.slice(0, 180)}`);
        return;
      }
      observedFailures.push({ route: activeRoute, message: `${viewport.width}px console error: ${text}` });
    });

    let browserBlocked = false;

    activeRoute = "Home";
    blockedResponses.length = 0;
    let navigationResponse = await page.goto(productionUrl.href, { waitUntil: "domcontentloaded" });
    let markerResult = await waitForMarkerOrClassifyEdge(
      page,
      navigationResponse,
      page.getByRole("heading", { name: "Recent Works", exact: true }),
      "Home",
      blockedResponses,
    );
    if (!markerResult.visible) {
      browserBlocked = true;
      blockedRoute = activeRoute;
    } else {
      assert.ok(navigationResponse?.ok(), `Home returned ${navigationResponse?.status() ?? "no response"}`);
      await page.waitForFunction(() => document.querySelectorAll(".rh-recent-work-card").length === 6);
      assert.equal(await page.locator(".rh-recent-work-card").count(), 6);
      const recentImages = page.locator(".rh-recent-work-card img");
      await recentImages.first().waitFor();
      await page.waitForFunction(
        () => [...document.querySelectorAll(".rh-recent-work-card img")].every((image) => image.complete && image.naturalWidth > 0),
        undefined,
        { timeout: 15_000 },
      );
    }

    if (!browserBlocked) {
      activeRoute = "Works";
      blockedResponses.length = 0;
      navigationResponse = await page.goto(new URL("/works", productionUrl).href, { waitUntil: "domcontentloaded" });
      markerResult = await waitForMarkerOrClassifyEdge(
        page,
        navigationResponse,
        page.getByRole("heading", { name: "All Works", exact: true }),
        "Works",
        blockedResponses,
      );
      if (!markerResult.visible) {
        browserBlocked = true;
        blockedRoute = activeRoute;
      } else {
        assert.ok(navigationResponse?.ok(), `Works returned ${navigationResponse?.status() ?? "no response"}`);
        await page.waitForFunction(() => document.querySelectorAll("main img").length > 0);
        const workImages = page.locator("main img");
        const imageCount = await workImages.count();
        for (let index = 0; index < Math.min(3, imageCount); index++) {
          assert.equal(await workImages.nth(index).getAttribute("loading"), "eager");
          assert.equal(await workImages.nth(index).getAttribute("fetchpriority"), "high");
          await waitForImageDecode(page, "main img", index, `Work image ${index + 1}`);
        }
        if (imageCount > 3) assert.equal(await workImages.nth(3).getAttribute("loading"), "lazy");

        await page.locator('main [role="button"]').first().click();
        await page.getByRole("button", { name: "Back to Works", exact: true }).waitFor();
        const gallery = page.locator("main img").first();
        await gallery.waitFor();
        assert.equal(await gallery.getAttribute("loading"), "eager");
        await waitForImageDecode(page, "main img", 0, "Work detail image");
      }
    }

    if (!browserBlocked) {
      activeRoute = "Blog";
      blockedResponses.length = 0;
      navigationResponse = await page.goto(new URL("/blog", productionUrl).href, { waitUntil: "domcontentloaded" });
      markerResult = await waitForMarkerOrClassifyEdge(
        page,
        navigationResponse,
        page.getByRole("heading", { name: "Blog", exact: true }),
        "Blog",
        blockedResponses,
      );
      if (!markerResult.visible) {
        browserBlocked = true;
        blockedRoute = activeRoute;
      } else {
        assert.ok(navigationResponse?.ok(), `Blog returned ${navigationResponse?.status() ?? "no response"}`);
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
      }
    }

    if (browserBlocked) {
      assert.equal(
        strictFallbackReady,
        true,
        `GitHub browser was edge-blocked on ${blockedRoute}, but strict direct fallback evidence was incomplete: ${JSON.stringify(directEvidence)}`,
      );
      failures.push(...observedFailures.filter(({ route }) => route !== blockedRoute).map(({ message }) => message));
      console.log(`PASS edge-aware fallback ${viewport.width}px: strict direct probes passed; browser blocked on ${blockedRoute}`);
    } else {
      failures.push(...observedFailures.map(({ message }) => message));
      console.log(`PASS browser smoke ${viewport.width}px`);
    }

    await context.close();
  }
} finally {
  await browser.close();
}

assert.deepEqual(failures, [], failures.join("\n"));
console.log(`Production smoke passed: ${productionUrl.origin}`);
