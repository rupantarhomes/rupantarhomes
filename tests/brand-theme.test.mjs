import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("applies the saved Rupantar theme before first paint through the production CSP", async () => {
  const index = await read("../index.html");
  const bootstrap = await read("../public/theme-bootstrap.js");
  const headers = await read("../public/_headers");

  assert.match(index, /<script src="\/theme-bootstrap\.js"><\/script>/);
  assert.ok(
    index.indexOf('<script src="/theme-bootstrap.js"></script>') < index.indexOf("<style>"),
    "Saved theme bootstrap must run before first-paint theme styles",
  );
  assert.doesNotMatch(index, /<script>\s*\(\(\) =>/);
  assert.match(headers, /script-src 'self'/);
  assert.match(bootstrap, /let theme = "light"/);
  assert.match(bootstrap, /localStorage\.getItem\("rupantar-theme"\) === "dark"/);
  assert.match(bootstrap, /document\.documentElement\.dataset\.rhTheme = theme/);
  assert.match(index, /html\[data-rh-theme="dark"\][\s\S]*background: #151412/);
  assert.match(index, /html\.brand-intro-pending[\s\S]*background: #ff1a3d/);
});

test("loads one shared theme control system beside public navigation and throughout Admin", async () => {
  const entry = await read("../app/client-entry.tsx");
  const theme = await read("../app/rupantar/brand-theme.tsx");
  assert.match(entry, /import "\.\/brand-charcoal-theme\.css"/);
  assert.match(entry, /<BrandThemeControls \/>/);
  assert.match(entry, /<SiteErrorBoundary fallback=\{null\}>\s*<BrandThemeControls \/>\s*<\/SiteErrorBoundary>/);
  assert.match(theme, /themeStorageKey = "rupantar-theme"/);
  assert.match(theme, /aria-label=\{label\}/);
  assert.match(theme, /nav button\[aria-label="Open menu"\]/);
  assert.match(theme, /button\.textContent\?\.trim\(\)\.includes\("Logout"\)/);
  assert.match(theme, /window\.location\.pathname\.startsWith\("\/admin"\) && !nextAdminTarget/);
  assert.match(theme, /createPortal\(<ThemeToggle placement="login" \/>, document\.body\)/);
});

test("charcoal skin changes surfaces only and keeps the approved red brand intro isolated", async () => {
  const css = await read("../app/brand-charcoal-theme.css");
  assert.match(css, /--rh-theme-canvas: #151412/);
  assert.match(css, /--rh-theme-surface: #1c1a18/);
  assert.match(css, /--rh-theme-surface-soft: #23211e/);
  assert.match(css, /--rh-theme-text: #f6f1ea/);
  assert.match(css, /#root > \.min-h-screen\.bg-white\.text-zinc-950/);
  assert.ok(css.includes('#root > [class~="min-h-screen"][class~="bg-[#fbfbfb]"]'), "Admin charcoal root selector is missing");
  assert.match(css, /#root input:not\(\[type="file"\]\)/);
  assert.match(css, /nav \.rh-theme-toggle--public[\s\S]*order: 1/);
  assert.match(css, /nav button\[aria-label="Open menu"\][\s\S]*order: 2/);
  assert.match(css, /\.brand-intro,[\s\S]*color-scheme: light/);
  assert.doesNotMatch(css, /filter:\s*(?:invert|brightness)\([^)]*\).*img/i);
});
