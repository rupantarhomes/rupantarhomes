import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFileSync(resolve(root, path), "utf8").replace(/\r\n/g, "\n");

test("final Work gallery polish keeps natural vertical scrolling, restores Back to Works, and keeps a dark glass cue with red line", () => {
  const css = read("public/work-gallery-final-polish.css");
  const index = read("index.html");

  assert.match(index, /href="\/work-gallery-final-polish\.css"/);
  assert.match(css, /scroll-snap-type: none !important/);
  assert.match(css, /scroll-behavior: auto !important/);
  assert.match(css, /scroll-snap-align: none !important/);
  assert.match(css, /main:has\(\[data-native-work-gallery\]\) > button:first-child/);
  assert.match(css, /display: inline-flex !important/);
  assert.match(css, /background: linear-gradient\(180deg, rgb\(20 20 22 \/ \.64\), rgb\(20 20 22 \/ \.46\)\) !important/);
  assert.match(css, /\.rh-native-work-gesture-cue > span/);
  assert.match(css, /background: #ff1a3d !important/);
});
