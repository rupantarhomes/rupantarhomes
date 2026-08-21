import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("hero video replaces the full hero background without changing hero geometry", async () => {
  const source = await readFile(new URL("../app/rupantar/home-page.tsx", import.meta.url), "utf8");

  assert.match(source, /className="max-w-\[1280px\] mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10 sm:pt-20 sm:pb-16 min-h-\[30vh\] sm:min-h-\[56vh\] md:min-h-\[72vh\] grid lg:grid-cols-\[1\.15fr_0\.85fr\] gap-6 sm:gap-8 items-start"/);
  assert.match(source, /data-hero-background="true"/);
  assert.match(source, /width: "100%"/);
  assert.match(source, /height: "100%"/);
  assert.doesNotMatch(source, /width: "100vw"/);
  assert.doesNotMatch(source, /aspect-\[16\/9\]/);
  assert.doesNotMatch(source, /rounded-\[1\.25rem\]/);
  assert.match(source, /requestAnimationFrame\(\(\) => setHeroVideoRequested\(true\)\)/);
  assert.match(source, /const heroVideoRef = useRef<HTMLVideoElement \| null>\(null\);/);
  assert.match(source, /ref=\{heroVideoRef\}/);
  assert.match(source, /video\.load\(\);/);
  assert.match(source, /const maybePromise = video\.play\(\);/);
  assert.match(source, /video\.addEventListener\("playing", handlePlaying\)/);
  assert.match(source, /setHeroVideoReady\(true\)/);
  assert.match(source, /src="\/rupantar-hero-poster\.webp"/);
  assert.match(source, /src="\/rupantar-hero-loop-web\.mp4"/);
  assert.match(source, /preload="none"/);
  assert.match(source, /autoPlay/);
  assert.match(source, /muted/);
  assert.match(source, /playsInline/);
  assert.match(source, /controls=\{false\}/);
  assert.match(source, /position: "absolute"/);
  assert.match(source, /inset: 0/);
  assert.match(source, /height: "100%"/);
  assert.match(source, /objectFit: "cover"/);
  assert.match(source, /pointerEvents: "none"/);
  assert.match(source, /opacity: heroVideoReady \? 1 : 0/);
  assert.match(source, /transition: "opacity 300ms ease"/);
  assert.match(source, /background: "rgba\(0, 0, 0, 0\.38\)"/);
  assert.match(source, /onError=\{\(\) => setHeroVideoReady\(false\)\}/);
  assert.match(source, /style=\{\{ color: "#FFFFFF" \}\}/);
  assert.match(source, /style=\{\{ color: "rgba\(255, 255, 255, 0\.88\)" \}\}/);
  assert.match(source, /className=\{`inline-block text-\[#FF1A3D\]/);
  assert.match(source, /bg-\[#FF1A3D\] text-white/);
  assert.match(source, /bg-white border border-zinc-200 text-zinc-900/);
});

