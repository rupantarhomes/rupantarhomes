import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createRequire } from "node:module";

const phase = process.argv[2] || "all";
const allowedPhases = new Set(["all", "public", "persistence", "admin-state", "admin-surface", "admin-errors", "restore"]);
if (!allowedPhases.has(phase)) throw new Error(`Unknown theme UX phase: ${phase}`);

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

async function createContext(browser, savedCharcoal = false) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  if (savedCharcoal) {
    await context.addInitScript(() => {
      try { localStorage.setItem("rupantar-theme", "charcoal"); } catch { /* origin storage is resolved on navigation */ }
    });
  }
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
  return context;
}

async function homeReady(page) {
  await page.goto(origin, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Recent Works", exact: true }).waitFor();
}

async function adminReady(page) {
  await page.goto(`${origin}/admin`, { waitUntil: "domcontentloaded" });
  const heading = page.getByRole("heading", { name: "Admin Login", exact: true });
  await heading.waitFor();
  return heading;
}

async function waitThemeSettled(page) {
  await page.waitForFunction(() => !document.documentElement.classList.contains("rh-theme-changing"));
}

async function assertNoErrors(errors) {
  assert.deepEqual(errors, [], errors.join("\n"));
}

async function runPublic(browser) {
  const context = await createContext(browser);
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await homeReady(page);
    assert.equal(await page.evaluate(() => document.documentElement.dataset.rhTheme), "light");
    const charcoalButton = page.getByRole("button", { name: "Switch to charcoal theme", exact: true });
    await charcoalButton.waitFor({ state: "visible" });
    await charcoalButton.click();
    assert.equal(await page.evaluate(() => document.documentElement.dataset.rhTheme), "charcoal");
    assert.equal(await page.evaluate(() => localStorage.getItem("rupantar-theme")), "charcoal");
    await waitThemeSettled(page);
    assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), "rgb(21, 20, 18)");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, "theme control introduced horizontal drift");
    await page.getByRole("button", { name: "Switch to light theme", exact: true }).waitFor({ state: "visible" });
    await assertNoErrors(errors);
  } finally {
    await context.close();
  }
}

async function runPersistence(browser) {
  const context = await createContext(browser, true);
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await homeReady(page);
    assert.equal(await page.evaluate(() => document.documentElement.dataset.rhTheme), "charcoal", "saved charcoal theme was not applied on entry");
    assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), "rgb(21, 20, 18)");
    await page.getByRole("button", { name: "Switch to light theme", exact: true }).waitFor({ state: "visible" });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Recent Works", exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.dataset.rhTheme), "charcoal", "saved charcoal theme did not survive reload");
    await assertNoErrors(errors);
  } finally {
    await context.close();
  }
}

async function runAdminState(browser) {
  const context = await createContext(browser, true);
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  try {
    await adminReady(page);
    assert.equal(await page.evaluate(() => document.documentElement.dataset.rhTheme), "charcoal", "Admin did not inherit the shared theme preference");
    await page.getByRole("button", { name: "Switch to light theme", exact: true }).waitFor({ state: "visible" });
  } finally {
    await context.close();
  }
}

async function runAdminSurface(browser) {
  const context = await createContext(browser, true);
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  try {
    const heading = await adminReady(page);
    const adminCard = heading.locator("xpath=ancestor::div[contains(concat(' ', normalize-space(@class), ' '), ' bg-white ')][1]");
    await adminCard.waitFor({ state: "visible" });
    assert.equal(await adminCard.evaluate((node) => getComputedStyle(node).backgroundColor), "rgb(28, 26, 24)");
    const email = page.getByPlaceholder("Email");
    assert.equal(await email.evaluate((node) => getComputedStyle(node).backgroundColor), "rgb(28, 26, 24)");
  } finally {
    await context.close();
  }
}

async function runAdminErrors(browser) {
  const context = await createContext(browser, true);
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await adminReady(page);
    await page.waitForTimeout(250);
    await assertNoErrors(errors);
  } finally {
    await context.close();
  }
}

async function runRestore(browser) {
  const context = await createContext(browser, true);
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await adminReady(page);
    const lightButton = page.getByRole("button", { name: "Switch to light theme", exact: true });
    await lightButton.waitFor({ state: "visible" });
    await lightButton.click();
    assert.equal(await page.evaluate(() => document.documentElement.dataset.rhTheme), "light");
    assert.equal(await page.evaluate(() => localStorage.getItem("rupantar-theme")), null);
    await waitThemeSettled(page);
    await homeReady(page);
    assert.equal(await page.evaluate(() => document.documentElement.dataset.rhTheme), "light", "light mode did not remain the default after clearing charcoal preference");
    await page.getByRole("button", { name: "Switch to charcoal theme", exact: true }).waitFor({ state: "visible" });
    await assertNoErrors(errors);
  } finally {
    await context.close();
  }
}

await waitForServer();
let browser;
try {
  browser = await chromium.launch(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL, headless: true } : { headless: true });
  if (phase === "all" || phase === "public") await runPublic(browser);
  if (phase === "all" || phase === "persistence") await runPersistence(browser);
  if (phase === "all" || phase === "admin-state") await runAdminState(browser);
  if (phase === "all" || phase === "admin-surface") await runAdminSurface(browser);
  if (phase === "all" || phase === "admin-errors") await runAdminErrors(browser);
  if (phase === "all" || phase === "restore") await runRestore(browser);
  console.log(`Rupantar charcoal theme UX PASS (${phase})`);
} finally {
  if (browser) await browser.close();
  vite.kill("SIGTERM");
}
