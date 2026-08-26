import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("hero uses the eight-image dissolve slideshow without changing hero geometry", async () => {
  const source = await readFile(new URL("../app/rupantar/home-page.tsx", import.meta.url), "utf8");
  const required = [
    "/hero-real-1-v2.webp", "/hero-real-2-v2.webp", "/hero-real-3-v2.webp", "/hero-real-4-v2.webp",
    "/hero-real-5-v2.webp", "/hero-real-6-v2.webp", "/hero-real-7-v2.webp", "/hero-real-8-v2.webp",
    "const heroSlides", "new window.Image()", "setHeroSlideIndex(nextIndex)",
    "2000", "opacity 800ms ease-in-out", "data-hero-background=\"true\"",
    "position: \"absolute\"", "inset: 0", "width: \"100%\"",
    "height: \"100%\"", "objectFit: \"cover\"",
    "background: \"rgba(0, 0, 0, 0.38)\"",
    "min-height: calc(100vh - 201px)", "min-height: calc(100vh - 261px)"
  ];
  for (const value of required) assert.equal(source.includes(value), true, value);
  assert.equal(source.includes("<video"), false);
  assert.equal(source.includes("rupantar-hero-loop-web.mp4"), false);
  assert.equal(source.includes("heroVideo"), false);
});
