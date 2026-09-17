import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = resolve(new URL("../../", import.meta.url).pathname);
const origin = "http://127.0.0.1:5180";
const vite = spawn(process.execPath, [resolve(root, "node_modules/vite/bin/vite.js"), "--host", "127.0.0.1", "--port", "5180", "--strictPort"], {
  cwd: root,
  env: {
    ...process.env,
    VITE_SUPABASE_URL: "",
    VITE_SUPABASE_PUBLISHABLE_KEY: "",
  },
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
  throw new Error(`Theme UX Vite server did not start.\n${viteOutput}`);
}

async function installThemeFixture(context) {
  await context.route("**/api/public-home", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      works: [],
      reviews: [],
      settings: {
        slogan: "Transforming Spaces Inspiring Lives",
        phone: "+9779745941799",
        instagram: "https://instagram.com/",
        tiktok: "https://tiktok.com/",
        address: "Kathmandu, Nepal",
        workshopNote: "Visit",
      },
      confirmedAt: Date.now(),
    }),
  }));
}

await waitForServer();
let browser;
try {
  browser = await chromium.launch(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL, headless: true } : { headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await installThemeFixture(context);
  await context.addInitScript(() => {
    try { sessionStorage.setItem("rupantar-brand-intro-seen", "1"); } catch { /* ignore */ }
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });

  await page.goto(origin, { waitUntil: "domcontentloaded" });
  const charcoal = page.getByRole("button", { name: "Switch to charcoal theme", exact: true });
  const menu = page.getByRole("button", { name: "Open menu", exact: true });
  await charcoal.waitFor({ state: "visible" });
  await menu.waitFor({ state: "visible" });

  const themeBox = await charcoal.boundingBox();
  const menuBox = await menu.boundingBox();
  assert.ok(themeBox && menuBox, "Theme/menu controls must have measurable geometry");
  assert.ok(themeBox.x < menuBox.x, "Theme control must sit immediately before the three-line menu on mobile");
  assert.ok(menuBox.x - (themeBox.x + themeBox.width) <= 16, "Theme control drifted away from the menu");
  assert.ok(Math.abs((themeBox.y + themeBox.height / 2) - (menuBox.y + menuBox.height / 2)) <= 2, "Theme/menu controls are not vertically aligned");

  await charcoal.click();
  await page.getByRole("button", { name: "Switch to light theme", exact: true }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.dataset.rhTheme), "dark");
  assert.equal(await page.evaluate(() => localStorage.getItem("rupantar-theme")), "dark");
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), "rgb(21, 20, 18)");
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, "Charcoal theme introduced horizontal drift");

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Switch to light theme", exact: true }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.dataset.rhTheme), "dark", "Saved charcoal theme did not survive reload");
  assert.equal(await page.evaluate(() => document.querySelector('meta[name="theme-color"]')?.getAttribute("content")), "#151412");

  await page.goto(`${origin}/admin`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Admin Login", exact: true }).waitFor();
  const adminTheme = page.getByRole("button", { name: "Switch to light theme", exact: true });
  await adminTheme.waitFor({ state: "visible" });
  assert.equal(await page.evaluate(() => document.documentElement.dataset.rhTheme), "dark");
  const loginCardBackground = await page.locator("form").locator("..").evaluate((node) => getComputedStyle(node).backgroundColor);
  assert.notEqual(loginCardBackground, "rgb(255, 255, 255)", "Admin login remained a white island in charcoal mode");

  await adminTheme.click();
  await page.getByRole("button", { name: "Switch to charcoal theme", exact: true }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.dataset.rhTheme), "light");
  assert.equal(await page.evaluate(() => localStorage.getItem("rupantar-theme")), "light");

  assert.deepEqual(errors, [], errors.join("\n"));
  await context.close();

  const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await installThemeFixture(desktopContext);
  await desktopContext.addInitScript(() => {
    try {
      sessionStorage.setItem("rupantar-brand-intro-seen", "1");
      localStorage.setItem("rupantar-theme", "dark");
    } catch { /* ignore */ }
  });
  const desktop = await desktopContext.newPage();
  await desktop.goto(origin, { waitUntil: "domcontentloaded" });
  const desktopTheme = desktop.getByRole("button", { name: "Switch to light theme", exact: true });
  await desktopTheme.waitFor({ state: "visible" });
  assert.equal(await desktopTheme.isVisible(), true, "Desktop lost access to the theme control");
  assert.equal(await desktop.getByRole("button", { name: "Open menu", exact: true }).isVisible(), false, "Desktop unexpectedly exposed the mobile menu");
  assert.equal(await desktop.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, "Desktop charcoal theme introduced horizontal drift");

  const topbar = desktop.locator("#root .min-h-screen > .w-full.bg-black.text-white").first();
  await topbar.waitFor({ state: "visible" });
  assert.equal(await topbar.evaluate((node) => getComputedStyle(node).borderBottomWidth), "0px", "Top utility strip red divider returned");
  const topbarLocation = topbar.getByText("Kathmandu, Nepal", { exact: true });
  assert.equal(await topbarLocation.evaluate((node) => getComputedStyle(node).color), "rgb(255, 255, 255)", "Dark topbar location is not white");
  assert.equal(await topbarLocation.evaluate((node) => getComputedStyle(node).opacity), "1", "Dark topbar location is still faded");
  const topbarPhone = topbar.getByRole("link", { name: "Call Rupantar Homes at +9779745941799", exact: true });
  assert.equal(await topbarPhone.evaluate((node) => getComputedStyle(node).color), "rgb(255, 255, 255)", "Dark topbar phone is not white");
  assert.equal(await topbarPhone.locator("svg").evaluate((node) => getComputedStyle(node).color), "rgb(255, 255, 255)", "Dark topbar phone icon is not white");

  const footer = desktop.locator("footer");
  await footer.scrollIntoViewIfNeeded();
  const instagram = footer.getByRole("link", { name: "Instagram", exact: true });
  const tiktok = footer.getByRole("link", { name: "TikTok", exact: true });
  const facebook = footer.getByRole("link", { name: "Facebook", exact: true });
  const maps = footer.getByRole("link", { name: "Open Kathmandu, Nepal in Google Maps", exact: true });
  assert.equal(await instagram.evaluate((node) => getComputedStyle(node).color), "rgb(255, 255, 255)", "Instagram footer icon lost white contrast");
  assert.equal(await facebook.evaluate((node) => getComputedStyle(node).color), "rgb(255, 255, 255)", "Facebook footer icon lost white contrast");
  assert.equal(await tiktok.evaluate((node) => getComputedStyle(node).backgroundColor), "rgb(254, 254, 254)", "TikTok footer control is not white");
  assert.equal(await tiktok.evaluate((node) => getComputedStyle(node).color), "rgb(17, 17, 17)", "TikTok footer icon is not dark on white");
  assert.equal(await maps.evaluate((node) => getComputedStyle(node).backgroundColor), "rgb(254, 254, 254)", "Google Maps footer control is not white");
  assert.equal(await maps.evaluate((node) => getComputedStyle(node).color), "rgb(17, 17, 17)", "Google Maps footer text is not dark on white");

  await desktopContext.close();

  console.log("Brand charcoal theme UX PASS");
} finally {
  if (browser) await browser.close();
  vite.kill("SIGTERM");
}
