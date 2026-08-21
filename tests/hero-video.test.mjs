import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("hero video defers loading and preserves a poster fallback", async () => {
  const source = await readFile(new URL("../app/rupantar/home-page.tsx", import.meta.url), "utf8");

  assert.match(source, /requestAnimationFrame\(\(\) => setHeroVideoRequested\(true\)\)/);
  assert.match(source, /src="\/rupantar-hero-poster\.webp"/);
  assert.match(source, /heroVideoRequested &&/);
  assert.match(source, /<video[\s\S]*autoPlay[\s\S]*loop[\s\S]*muted[\s\S]*playsInline[\s\S]*controls=\{false\}/);
  assert.match(source, /preload="none"/);
  assert.match(source, /onCanPlay=\{\(\) => setHeroVideoReady\(true\)\}/);
  assert.match(source, /absolute inset-0 w-full h-full object-cover pointer-events-none/);
  assert.match(source, /transition-opacity duration-300/);
  assert.match(source, /<source src="\/rupantar-hero-loop-web\.mp4" type="video\/mp4" \/>/);
});
