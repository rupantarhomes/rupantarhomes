import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("dedicated Work hides Featured while homepage six-card geometry stays equal", async () => {
  const [css, home] = await Promise.all([
    read("app/recent-works-mobile-readable.css"),
    read("app/rupantar/home-page.tsx"),
  ]);

  assert.match(home, /works\.filter\(\(work\) => work\.featured\)/);
  assert.match(home, /slice\(0, 6\)/);
  assert.match(css, /main\.max-w-\\\[1280px\\\] > div\.grid > div:first-child:has\(\[data-native-work-gallery\]\)[\s\S]*?span:nth-child\(3\)[\s\S]*?display: none !important/);
  assert.match(css, /main > section:first-child > div\.grid \{[\s\S]*?grid-auto-rows: 1fr !important[\s\S]*?align-items: stretch !important/);
  assert.match(css, /main > section:first-child > div\.grid > \.rh-work-card \{[\s\S]*?height: 100% !important/);
  assert.match(css, /\.rh-work-media-slot \{[\s\S]*?aspect-ratio: 4 \/ 3 !important/);
  assert.match(css, /\.rh-work-media-slot > img \{[\s\S]*?height: 100% !important[\s\S]*?object-fit: cover !important/);
});
