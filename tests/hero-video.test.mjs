import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("hero video explicitly loads and attempts playback after deferred mount", async () => {
  const source = await readFile(new URL("../app/rupantar/home-page.tsx", import.meta.url), "utf8");

  assert.match(source, /requestAnimationFrame\(\(\) => setHeroVideoRequested\(true\)\)/);
  assert.match(source, /const heroVideoRef = useRef<HTMLVideoElement \| null>\(null\);/);
  assert.match(source, /ref=\{heroVideoRef\}/);
  assert.match(source, /video\.load\(\);/);
  assert.match(source, /const maybePromise = video\.play\(\);/);
  assert.match(source, /maybePromise && typeof maybePromise\.then === "function"/);
  assert.match(source, /setHeroVideoReady\(true\)/);
  assert.match(source, /src="\/rupantar-hero-poster\.webp"/);
  assert.match(source, /src="\/rupantar-hero-loop-web\.mp4"/);
  assert.match(source, /preload="none"/);
  assert.match(source, /autoPlay/);
  assert.match(source, /muted/);
  assert.match(source, /playsInline/);
  assert.match(source, /controls=\{false\}/);
  assert.match(source, /transition-opacity duration-300/);
  assert.match(source, /pointer-events-none/);
  assert.match(source, /onError=\{\(\) => setHeroVideoReady\(false\)\}/);
});
