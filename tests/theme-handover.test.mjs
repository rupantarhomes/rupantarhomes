import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("applies the saved charcoal preference before React paints without changing the light default", async () => {
  const index = await read("../index.html");
  const prepaint = index.indexOf('window.localStorage.getItem("rupantar-theme") === "charcoal"');
  const client = index.indexOf('/app/client-entry.tsx');
  assert.ok(prepaint >= 0 && prepaint < client, "saved theme is not resolved before the client entry");
  assert.match(index, /document\.documentElement\.dataset\.rhTheme = "charcoal"/);
  assert.match(index, /background: #151412; color-scheme: dark/);
  assert.match(index, /html\.brand-intro-pending[\s\S]*background: #ff1a3d/);
  assert.doesNotMatch(index, /prefers-color-scheme/);
});

test("loads one shared theme runtime and the charcoal skin after the approved style layers", async () => {
  const entry = await read("../app/client-entry.tsx");
  const guard = entry.indexOf('import "./public-handover-guard.css"');
  const theme = entry.indexOf('import "./brand-charcoal-theme.css"');
  assert.ok(guard >= 0 && theme > guard, "charcoal theme must remain the final visual skin");
  assert.match(entry, /import \{ initRupantarTheme \} from "\.\/theme-runtime"/);
  assert.match(entry, /initRupantarTheme\(\);/);
});

test("keeps the theme control beside the public hamburger and inside the Admin header", async () => {
  const runtime = await read("../app/theme-runtime.ts");
  assert.match(runtime, /nav button\[aria-label=\\?"Open menu\\?"\]/);
  assert.match(runtime, /button\.textContent\?\.trim\(\)\.includes\("Logout"\)/);
  assert.match(runtime, /host\.insertBefore\(button, menu\)/);
  assert.match(runtime, /admin\.host\.insertBefore\(button, admin\.before\)/);
  assert.match(runtime, /data-rh-theme-toggle|rhThemeToggle/);
  assert.match(runtime, /Switch to charcoal theme/);
  assert.match(runtime, /Switch to light theme/);
});

test("persists only explicit charcoal choice and shares it between public and Admin routes", async () => {
  const runtime = await read("../app/theme-runtime.ts");
  assert.match(runtime, /window\.localStorage\.setItem\(themeStorageKey, charcoalTheme\)/);
  assert.match(runtime, /window\.localStorage\.removeItem\(themeStorageKey\)/);
  assert.match(runtime, /window\.location\.pathname\.startsWith\("\/admin"\)/);
  assert.match(runtime, /window\.addEventListener\("storage"/);
  assert.match(runtime, /meta\[name="theme-color"\]/);
});

test("uses the locked warm-charcoal brand palette and never filters project photography", async () => {
  const css = await read("../app/brand-charcoal-theme.css");
  assert.match(css, /--rh-charcoal-canvas: #151412/);
  assert.match(css, /--rh-charcoal-surface: #1c1a18/);
  assert.match(css, /--rh-charcoal-raised: #23211e/);
  assert.match(css, /--rh-charcoal-line: #36322d/);
  assert.match(css, /--rh-charcoal-text: #f6f1ea/);
  assert.match(css, /--rh-charcoal-text-muted: #b8b0a5/);
  assert.match(css, /html\[data-rh-theme="charcoal"\] img[\s\S]*filter: none !important/);
});

test("covers public and Admin surfaces, forms, text hierarchy and controls without layout overrides", async () => {
  const css = await read("../app/brand-charcoal-theme.css");
  assert.match(css, /\[class~="bg-white"\]/);
  assert.match(css, /\[class~="bg-\[#fbfbfb\]"\]/);
  assert.match(css, /input:not\(\[type="checkbox"\]\):not\(\[type="radio"\]\)/);
  assert.match(css, /textarea/);
  assert.match(css, /select option/);
  assert.match(css, /\[class~="text-zinc-900"\]/);
  assert.match(css, /\[class~="border-zinc-200"\]/);
  assert.match(css, /\.rh-theme-toggle/);
  assert.doesNotMatch(css, /grid-template|position:\s*absolute|margin-left|margin-right|padding-left|padding-right/);
});
