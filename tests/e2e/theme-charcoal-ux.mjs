import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = resolve(new URL("../../", import.meta.url).pathname);
const origin = "http://127.0.0.1:5181";
const vite = spawn(process.execPath, [resolve(root, "node_modules/vite/bin/vite.js"), "--host", "127.0.0.1", "--port", "5181", "--strictPort"], {
  cwd: root,
  env: { ...process.env, VITE_SUPABASE_URL: "", VITE_SUPABASE_PUBLISHABLE_KEY: "" },
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

await waitForServer();
let browser;
try {
  browser = await chromium.launch(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL, headless: true } : { headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === "res.cloudinary.com") {
      return route.fulfill({ status: 200, contentType: "image/webp", body: imageBytes });
    }
    if (url.hostname.endsWith("googleapis.com") || url.hostname.endsWith("gstatic.com")) {
      return route.fulfill({ status: 200, contentType: "text/css", body: "" });
    }
    if (url.origin === origin || url.hostname === "127.0.0.1" || url.hostname === "localhost") return route.continue();
    return route.abort();
  });

  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto(origin, { waitUntil: "domcontentloaded" });
  const intro = page.locator(".brand-intro");
  if (await intro.count()) await intro.waitFor({ state: "detached" });
  await page.getByRole("heading", { name: "Recent Works", exact: true }).waitFor();

  const charcoalButton = page.getByRole("button", { name: "Switch to charcoal theme", exact: true });
  await charcoalButton.waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.dataset.rhTheme), "light");
  await charcoalButton.click();
  assert.equal(await page.evaluate(() => document.documentElement.dataset.rhTheme), "charcoal");
  assert.equal(await page.evaluate(() => localStorage.getItem("rupantar-theme")), "charcoal");
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), "rgb(21, 20, 18)");
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, "theme control introduced horizontal drift");
  await page.getByRole("button", { name: "Switch to light theme", exact: true }).waitFor();

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Recent Works", exact: true }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.dataset.rhTheme), "charcoal", "saved charcoal theme did not survive reload");
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), "rgb(21, 20, 18)");
  await page.getByRole("button", { name: "Switch to light theme", exact: true }).waitFor();

  await page.goto(`${origin}/admin`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Admin Login", exact: true }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.dataset.rhTheme), "charcoal", "Admin did not inherit the public theme preference");
  await page.getByRole("button", { name: "Switch to light theme", exact: true }).waitFor();
  const adminCard = page.getByRole("heading", { name: "Admin Login", exact: true }).locator('xpath=ancestor::div[contains(@class,"max-w-[420px]")][1]');
  assert.equal(await adminCard.evaluate((node) => getComputedStyle(node).backgroundColor), "rgb(28, 26, 24)");

  await page.getByRole("button", { name: "Switch to light theme", exact: true }).click();
  assert.equal(await page.evaluate(() => document.documentElement.dataset.rhTheme), "light");
  assert.equal(await page.evaluate(() => localStorage.getItem("rupantar-theme")), null);

  await page.goto(origin, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Recent Works", exact: true }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.dataset.rhTheme), "light", "light preference did not remain the default");
  assert.deepEqual(errors, [], errors.join("\n"));
  console.log("Rupantar charcoal theme UX PASS");
} finally {
  if (browser) await browser.close();
  vite.kill("SIGTERM");
}
